import app from "../server";

export default function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || "/";
    const [pathPart, queryPart] = rawUrl.split("?");

    let targetPath = "";

    // 1. Check explicit __vercel_path parameter passed from vercel.json rewrite
    if (req.query?.__vercel_path) {
      targetPath = Array.isArray(req.query.__vercel_path) ? req.query.__vercel_path[0] : req.query.__vercel_path;
      delete req.query.__vercel_path;
    } 
    // 2. Check x-matched-path / x-invoke-path headers
    else if (req.headers?.["x-matched-path"] && !["/api", "/api/index", "/"].includes(req.headers["x-matched-path"])) {
      targetPath = req.headers["x-matched-path"];
    } else if (req.headers?.["x-invoke-path"] && !["/api", "/api/index", "/"].includes(req.headers["x-invoke-path"])) {
      targetPath = req.headers["x-invoke-path"];
    } 
    // 3. Check x-now-route-matches
    else if (req.headers?.["x-now-route-matches"]) {
      const match = req.headers["x-now-route-matches"].match(/1=([^&]+)/);
      if (match && match[1]) {
        targetPath = `/api/${decodeURIComponent(match[1])}`;
      }
    }

    if (targetPath) {
      const queryParams = new URLSearchParams();
      if (queryPart) {
        const parsed = new URLSearchParams(queryPart);
        parsed.delete("__vercel_path");
        for (const [k, v] of parsed.entries()) {
          queryParams.append(k, v);
        }
      }
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
      req.url = targetPath.startsWith("/") ? `${targetPath}${qs}` : `/${targetPath}${qs}`;
    }
  } catch (e) {
    console.error("Vercel route normalization note:", e);
  }

  return app(req, res);
}
