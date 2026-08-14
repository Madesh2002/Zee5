import app from "../server";

export default function handler(req: any, res: any) {
  try {
    const [pathPart, queryPart] = (req.url || "").split("?");
    const queryString = queryPart ? `?${queryPart}` : "";
    req.url = `/api/stream-proxy${queryString}`;
    return app(req, res);
  } catch (err: any) {
    console.error("Stream Proxy error:", err);
    return res.status(500).send(`Stream Proxy Error: ${err?.message || "Internal error"}`);
  }
}
