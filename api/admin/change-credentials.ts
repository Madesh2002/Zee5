import app from "../../server";

export default function handler(req: any, res: any) {
  const [pathPart, queryPart] = (req.url || "").split("?");
  const queryString = queryPart ? `?${queryPart}` : (req.query ? `?${new URLSearchParams(req.query).toString()}` : "");
  req.url = `/api/admin/change-credentials${queryString}`;
  return app(req, res);
}
