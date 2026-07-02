cat > api/app.js <<'EOF'
import quoteHandler from "../server/market/quote.js";
import historyHandler from "../server/market/history.js";
import historyDbHandler from "../server/market/history-db.js";
import technicalPatternsDbHandler from "../server/market/technical-patterns-db.js";
import dailyHistoryUpdateHandler from "../server/jobs/daily-history-update.js";
import detectTechnicalPatternsHandler from "../server/jobs/detect-technical-patterns.js";

const routeHandlers = {
  "health": healthHandler,
  "market/quote": quoteHandler,
  "market/history": historyHandler,
  "market/history-db": historyDbHandler,
  "market/technical-patterns-db": technicalPatternsDbHandler,
  "jobs/daily-history-update": dailyHistoryUpdateHandler,
  "jobs/detect-technical-patterns": detectTechnicalPatternsHandler
};

export default async function handler(req, res) {
  const route = getRoute(req);
  const selectedHandler = routeHandlers[route];

  if (!route) {
    return res.status(200).json({
      status: "ok",
      app: "Market Intelligence App",
      api_layer: "single Vercel Function router",
      message: "API router is working. Pass a valid API path.",
      available_routes: Object.keys(routeHandlers),
      fetched_at: new Date().toISOString()
    });
  }

  if (!selectedHandler) {
    return res.status(404).json({
      error: "API_ROUTE_NOT_FOUND",
      message: `Route API non trovata: ${route}`,
      available_routes: Object.keys(routeHandlers),
      fetched_at: new Date().toISOString()
    });
  }

  return selectedHandler(req, res);
}

function healthHandler(req, res) {
  return res.status(200).json({
    status: "ok",
    app: "Market Intelligence App",
    api_layer: "single Vercel Function router",
    message: "Health endpoint is working correctly.",
    fetched_at: new Date().toISOString()
  });
}

function getRoute(req) {
  const queryPath = req.query?.path;

  if (Array.isArray(queryPath)) {
    return normalizeRoute(queryPath.join("/"));
  }

  if (typeof queryPath === "string" && queryPath.trim()) {
    return normalizeRoute(queryPath);
  }

  const parsedUrl = new URL(req.url, "http://localhost");
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return normalizeRoute(pathname.replace("/api/", ""));
  }

  return "";
}

function normalizeRoute(route) {
  return String(route || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^app$/, "");
}
EOF