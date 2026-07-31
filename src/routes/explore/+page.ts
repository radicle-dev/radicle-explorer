import { HttpdClient, ResponseError } from "@http-client";
import { noReachableSeed, tryWithFailover } from "@app/views/explore/router";

export const load = async () => {
  const attempt = await tryWithFailover(async (seed, signal) => {
    const api = new HttpdClient(seed);
    // Prefer /info — it tells us whether the seed has a search backend
    // configured. Only fall back to /node on a 404/405 (older httpd that
    // doesn't ship /info yet). Any other failure — network error, abort,
    // 5xx — rethrows so the caller can mark the seed failed and try the
    // next one, instead of silently masking outages as "no search".
    try {
      const info = await api.getInfo({ abort: signal });
      return { searchAvailable: info.httpd.searchAvailable };
    } catch (err) {
      if (
        err instanceof ResponseError &&
        (err.status === 404 || err.status === 405)
      ) {
        await api.getNode({ abort: signal });
        return { searchAvailable: false };
      }
      throw err;
    }
  });

  if (!attempt) {
    noReachableSeed();
  }

  return {
    baseUrl: attempt.baseUrl,
    searchAvailable: attempt.result.searchAvailable,
  };
};
