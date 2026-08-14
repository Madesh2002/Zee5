import app from "../server";

export default function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || "/";
    const [pathPart, queryPart] = rawUrl.split("?");
    const queryString = queryPart ? `?${queryPart}` : "";

    // If x-matched-path is provided by Vercel routing
    const matchedPath = req.headers?.["x-matched-path"];
    if (matchedPath && typeof matchedPath === "string" && matchedPath !== "/api" && matchedPath !== "/api/index") {
      req.url = matchedPath + queryString;
    } else if (pathPart === "/api" || pathPart === "/" || pathPart === "/api/index") {
      // If path was collapsed to /api, check if route matches header exists
      const routeMatches = req.headers?.["x-now-route-matches"];
      if (routeMatches && typeof routeMatches === "string") {
        const match = routeMatches.match(/1=([^&]+)/);
        if (match && match[1]) {
          req.url = `/api/${decodeURIComponent(match[1])}${queryString}`;
        }
      } else if (req.query?.slug) {
        const slug = Array.isArray(req.query.slug) ? req.query.slug.join("/") : req.query.slug;
        req.url = `/api/${slug}${queryString}`;
      } else if (req.query?.id && !pathPart.includes("playback") && !pathPart.includes("live")) {
        req.url = `/api/playback${queryString}`;
      }
    }
  } catch (e) {
    console.error("Vercel route normalization note:", e);
  }

  return app(req, res);
}

