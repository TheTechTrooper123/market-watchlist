/**
 * Runs an async task over a list with a fixed number of workers. Results keep
 * the input order; a failing task yields `{ __error }` instead of rejecting the
 * whole batch, so one broken symbol cannot abort the run.
 */
export async function mapWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        results[index] = { __error: error.message };
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
