/**
 * Calling a server action without losing the user when the request never comes back.
 *
 * A server action can fail two ways. It can RETURN a failure — quota exhausted, invalid input —
 * which every form already handles. Or the request itself can die: the POST is aborted, the
 * connection drops, the tab goes offline. That rejects the promise, and inside
 * `startTransition` a rejection is not something the form sees.
 *
 * Measured on /ar/income/new: roughly 7% of submits under load, because the sidebar prefetches
 * every link and saturates the HTTP/1.1 connection pool, so the action POST is aborted
 * (net::ERR_ABORTED). What the freelancer got depended on the form — GigForm and the catalog
 * form showed nothing at all, ClientForm threw the whole page to the error boundary and lost
 * what they had typed. Neither told them whether their money had been recorded.
 *
 * `attempt` turns that into a value: `null` means "the request did not come back". The caller
 * renders its own message and keeps the form filled, so the work is not lost.
 *
 * The message must NOT say "try again". An aborted response may still have reached the server,
 * and a blind retry on a money path records the same income or invoice twice. Say the save is
 * unconfirmed and let the user check — `Common.saveUnconfirmed` is that sentence.
 */
export async function attempt<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
