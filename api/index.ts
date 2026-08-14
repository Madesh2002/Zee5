import app from "../server";

export default async function handler(req: any, res: any) {
  return new Promise<void>((resolve) => {
    try {
      const rawUrl = req.url || "/";
      const qIndex = rawUrl.indexOf("?");
      const pathPart = qIndex >= 0 ? rawUrl.substring(0, qIndex) : rawUrl;
      const queryPart = qIndex >= 0 ? rawUrl.substring(qIndex + 1) : "";

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
        // Clean __vercel_path from the query without destroying nested encoded tokens
        let cleanQuery = "";
        if (queryPart) {
          cleanQuery = queryPart.replace(/&?__vercel_path=[^&]*/g, "").replace(/^\?|^&/, "");
        }
        const formattedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
        req.url = formattedPath + (cleanQuery ? `?${cleanQuery}` : "");
      }
    } catch (e) {
      console.error("Vercel route normalization note:", e);
    }

    let isResolved = false;
    const finishHandler = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };

    res.once("finish", finishHandler);
    res.once("close", finishHandler);

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error("Express next error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error: " + (err.message || String(err)) });
          }
        }
        finishHandler();
      });
    } catch (err: any) {
      console.error("Express invocation error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Serverless Execution Error: " + (err.message || String(err)) });
      }
      finishHandler();
    }
  });
}

