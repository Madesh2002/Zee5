import app from "../server";

export default function handler(req: any, res: any) {
  req.url = req.url?.includes("m3u") ? "/api/playlist.m3u" : "/api/playlist";
  return app(req, res);
}
