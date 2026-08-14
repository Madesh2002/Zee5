import app from "../server";

export default function handler(req: any, res: any) {
  const [pathPart, queryPart] = (req.url || "").split("?");
  const queryString = queryPart ? `?${queryPart}` : "";
  req.url = `/api/playlist.m3u${queryString}`;
  return app(req, res);
}

