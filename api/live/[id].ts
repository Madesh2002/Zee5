import app from "../../server";

export default function handler(req: any, res: any) {
  const id = req.query?.id || "0-9-zeetamil";
  req.url = `/api/live/${id}`;
  return app(req, res);
}
