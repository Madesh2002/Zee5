import app from "../../server";

export default function handler(req: any, res: any) {
  try {
    const rawId = (req.query?.id || "0-9-zeetamil").toString();
    const cleanId = rawId.replace(/\.m3u8$/i, "");
    const [pathPart, queryPart] = (req.url || "").split("?");
    const queryString = queryPart ? `?${queryPart}` : "";
    req.url = `/api/live/${cleanId}${queryString}`;
    req.query.id = cleanId;
    req.query.redirect = "true";
  } catch (e) {
    console.error("Live handler error:", e);
  }
  return app(req, res);
}
