import app from "../server";

export default function handler(req: any, res: any) {
  try {
    const [pathPart, queryPart] = (req.url || "").split("?");
    const queryString = queryPart ? `?${queryPart}` : "";
    req.url = `/api/playlist.m3u${queryString}`;
    return app(req, res);
  } catch (err: any) {
    console.error("Playlist handler error:", err);
    return res.status(500).send(`#EXTM3U\n# Error: ${err?.message || "Internal error"}`);
  }
}

