import app from "../server";

export default function handler(req: any, res: any) {
  req.url = req.method === "POST" ? "/api/channels/sync" : "/api/channels";
  return app(req, res);
}
