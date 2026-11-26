export type Company = {
  rank: number;
  name: string;
  symbol: string;
  exchangeCode: string;
  exchange: string;
  country: string;
  sector: string;
  industry: string;
  marketCapUsd: number;
  price: number;
  currency: string;
  changePct: number | null;
  listingSince: string;
  yearsHistory: number;
  spark: number[];
};

export type Snapshot = {
  generatedAt: string;
  asOf: string;
  venues: { code: string; name: string; country: string }[];
  criteria: {
    minMarketCapUsd: number;
    minHistoryYears: number;
    venues: number;
  };
  stats: {
    companies: number;
    listingsScanned: number;
    companiesBeforeHistoryFilter: number;
    dropped: Record<string, number>;
  };
  companies: Company[];
};

/** Monthly closes of one company: first month and the values in listing currency. */
export type PriceSeries = {
  s: string;
  c: number[];
};

export type History = {
  generatedAt: string;
  series: Record<string, PriceSeries>;
};
