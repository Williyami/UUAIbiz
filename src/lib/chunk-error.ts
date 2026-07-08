import { useEffect } from "react";

// A dynamic import failing with one of these messages almost always means the
// open tab predates the latest deploy and its chunk URLs are gone. One reload
// fetches the new build. The timestamp guard stops a reload loop when the
// import keeps failing for a different reason (offline, real 500, …).
const CHUNK_ERROR_RE =
  /importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|dynamic import/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR_RE.test(error.message);
}

export function reloadOnceForStaleChunk(): boolean {
  const last = Number(sessionStorage.getItem("bh-chunk-reload") || 0);
  if (Date.now() - last < 30_000) return false;
  sessionStorage.setItem("bh-chunk-reload", String(Date.now()));
  window.location.reload();
  return true;
}

/** Call from an error boundary: reloads once when the error is a stale-chunk failure. */
export function useReloadOnChunkError(error: unknown) {
  useEffect(() => {
    if (isChunkLoadError(error)) reloadOnceForStaleChunk();
  }, [error]);
}
