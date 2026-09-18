// Sec-Fetch-Site is set by the browser, not by page JavaScript. It preserves
// same-origin checks when a preview/HTTPS proxy rewrites the upstream Host.
export function isAllowedOrigin(req, publicOrigin) {
  const origin = req.headers.origin;
  if (!origin) return req.headers["sec-fetch-site"] !== "cross-site";
  if (origin === "null") return false;
  if (req.headers["sec-fetch-site"] === "same-origin") return true;
  const protocol = req.socket.encrypted ? "https" : "http";
  return origin === (publicOrigin || `${protocol}://${req.headers.host}`);
}
