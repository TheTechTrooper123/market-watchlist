/**
 * Minimal Yahoo Finance client: cookie/crumb handshake, retries with backoff and
 * the four endpoints the screener needs. Unofficial API, no key required.
 */

import { PAGE_SIZE, USER_AGENT, YAHOO } from "./config.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class YahooClient {
  #cookie = "";
  #crumb = "";

  /** Obtains the cookie and crumb every quote request is bound to. */
  async authenticate() {
    const bootstrap = await fetch(YAHOO.cookieBootstrapUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "manual",
    });
    const cookies = bootstrap.headers.getSetCookie?.() ?? [];
    this.#cookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");

    const crumbResponse = await fetch(`https://${YAHOO.apiHost}${YAHOO.crumbPath}`, {
      headers: { "User-Agent": USER_AGENT, cookie: this.#cookie },
    });
    this.#crumb = (await crumbResponse.text()).trim();
    if (!this.#crumb || this.#crumb.length > 24) {
      throw new Error("could not obtain Yahoo crumb");
    }
  }

  async #request(pathAndQuery, init = {}) {
    const url = `https://${YAHOO.apiHost}${pathAndQuery}`;
    let lastError;

    for (let attempt = 0; attempt < YAHOO.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            "User-Agent": USER_AGENT,
            cookie: this.#cookie,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(init.headers ?? {}),
          },
        });

        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`HTTP ${response.status} ${url}`);
          await sleep(800 * (attempt + 1) ** 2);
          if (response.status === 429) {
            await this.authenticate().catch(() => {});
          }
          continue;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
        return await response.json();
      } catch (error) {
        lastError = error;
        await sleep(400 * (attempt + 1));
      }
    }

    throw lastError;
  }

  /** Price chart for a symbol, e.g. one year of weekly closes. */
  async chart(symbol, range = "1y", interval = "1wk") {
    const query =
      `/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`;
    return this.#request(query);
  }

  /** Domicile and classification of an issuer. */
  async profile(symbol) {
    const query =
      `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?modules=assetProfile,price&crumb=${encodeURIComponent(this.#crumb)}&lang=en-US&region=US`;
    const payload = await this.#request(query);
    const summary = payload?.quoteSummary?.result?.[0];
    return {
      country: summary?.assetProfile?.country ?? null,
      sector: summary?.assetProfile?.sector ?? null,
      industry: summary?.assetProfile?.industry ?? null,
      quoteType: summary?.price?.quoteType ?? null,
    };
  }

  /** One page of the equity screener for a venue, sorted by market cap. */
  async screen(exchange, minLocalMarketCap, offset = 0) {
    const body = {
      size: PAGE_SIZE,
      offset,
      sortField: "intradaymarketcap",
      sortType: "DESC",
      quoteType: "EQUITY",
      topOperator: "AND",
      query: {
        operator: "AND",
        operands: [
          { operator: "eq", operands: ["exchange", exchange] },
          { operator: "gt", operands: ["intradaymarketcap", Math.round(minLocalMarketCap)] },
        ],
      },
      userId: "",
      userIdType: "guid",
    };

    const query =
      `/v1/finance/screener?crumb=${encodeURIComponent(this.#crumb)}&lang=en-US&region=US`;
    const payload = await this.#request(query, { method: "POST", body: JSON.stringify(body) });
    const result = payload?.finance?.result?.[0];
    return { total: result?.total ?? 0, quotes: result?.quotes ?? [] };
  }
}
