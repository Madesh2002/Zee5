import app from "../server";

export default function handler(req: any, res: any) {
  req.url = req.method === "POST" ? "/api/tokens/sync" : "/api/tokens";
  return app(req, res);
}
