// Turns a failed request into a message that says *why* it failed.
//
// "Something went wrong. Please try again." tells a patient nothing: they can't
// tell a dropped connection (retry works) from a server fault (retrying won't
// help) from a request that may already have gone through (retrying risks a
// duplicate). Every message below names the cause and, where it matters, says
// what to do about it. The HTTP status is included so a screenshot from a
// patient is enough to diagnose the problem.

type Options = {
  /** What the user was trying to do, e.g. 'save your booking'. */
  action: string;
  /** Appended when the safest next step is to reach a human. */
  fallback?: string;
};

function withFallback(reason: string, fallback?: string) {
  return fallback ? `${reason} ${fallback}` : reason;
}

// A fetch that never got a reply: no connection, DNS failure, blocked request.
export function describeNetworkError(error: unknown, { action, fallback }: Options) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return withFallback(`The request timed out before we could ${action}.`, fallback);
  }
  return withFallback(
    `We couldn't reach our server to ${action} — check your internet connection and try again.`,
    fallback,
  );
}

// A reply that carried an error status. `serverMessage` is the API's own
// `error` field, which is always more specific than anything we can guess.
export function describeResponseError(
  status: number,
  serverMessage: string | undefined,
  { action, fallback }: Options,
) {
  if (serverMessage) return withFallback(serverMessage, status >= 500 ? fallback : undefined);

  if (status === 404) {
    return withFallback(`We couldn't ${action}: the service is unavailable (404).`, fallback);
  }
  if (status === 429) {
    return `Too many attempts in a short time (429). Please wait a minute, then try again.`;
  }
  if (status === 408 || status === 502 || status === 503 || status === 504) {
    // The request may well have been processed — say so, so nobody submits twice.
    return withFallback(
      `Our server didn't respond in time (${status}). Your details may already have reached us, so please check before sending them again.`,
      fallback,
    );
  }
  if (status >= 500) {
    return withFallback(`Our server hit an error while trying to ${action} (${status}).`, fallback);
  }
  if (status === 401 || status === 403) {
    return withFallback(`This request wasn't authorised (${status}).`, fallback);
  }
  return withFallback(`We couldn't ${action} — the server rejected the request (${status}).`, fallback);
}
