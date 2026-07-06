const routeLoaders = {
  "market/quote": () => import("../server/market/quote.js"),
  "market/history": () => import("../server/market/history.js"),
  "market/history-db": () => import("../server/market/history-db.js"),

  "market/technical-patterns-db": () =>
    import("../server/market/technical-patterns-db.js"),

  "market/data-quality-db": () =>
    import("../server/market/data-quality-db.js"),

  "market/peer-compare-db": () =>
    import("../server/market/peer-compare-db.js"),
  "market/fundamentals-db": () =>
    import("../server/market/fundamentals-db.js"),
  "market/universe-db": () =>
    import("../server/market/universe-db.js"),
  "market/top-bullish-signals-db": () =>
    import("../server/market/top-bullish-signals-db.js"),

  "market/congress-disclosures-db": () =>
    import("../server/market/congress-disclosures-db.js"),

  "market/congress-official-filings-db": () =>
    import("../server/market/congress-official-filings-db.js"),
  "market/congress-official-pdf-transactions-db": () =>
    import("../server/market/congress-official-pdf-transactions-db.js"),

  "jobs/daily-history-update": () =>
    import("../server/jobs/daily-history-update.js"),

  "jobs/detect-technical-patterns": () =>
    import("../server/jobs/detect-technical-patterns.js"),

  "jobs/fundamentals-lite-update": () =>
    import("../server/jobs/fundamentals-lite-update.js"),
};

export default async function handler(req, res) {
  try {
    const route = getRoute(req);

    if (!route || route === "health") {
      return healthHandler(req, res);
    }

    const loadRouteModule = routeLoaders[route];

    if (!loadRouteModule) {
      return res.status(404).json({
        error: "API_ROUTE_NOT_FOUND",
        message: `Route API non trovata: ${route}`,
        available_routes: ["health", ...Object.keys(routeLoaders)],
        fetched_at: new Date().toISOString()
      });
    }

    const routeModule = await loadRouteModule();
    const selectedHandler = routeModule.default;

    if (typeof selectedHandler !== "function") {
      return res.status(500).json({
        error: "API_HANDLER_NOT_FOUND",
        message: `Il modulo della route ${route} non esporta un default handler valido.`,
        fetched_at: new Date().toISOString()
      });
    }

    return await selectedHandler(req, res);
  } catch (error) {
    return res.status(500).json({
      error: "API_ROUTER_CRASH_CAUGHT",
      message: error.message,
      route: getRoute(req),
      fetched_at: new Date().toISOString(),
      diagnostic:
        "Il router unico ha intercettato un errore. Controlla path import, file spostati in server/, dipendenze npm e variabili ambiente."
    });
  }
}

function healthHandler(req, res) {
  return res.status(200).json({
    status: "ok",
    app: "Market Intelligence App",
    api_layer: "single Vercel Function router",
    message: "Health endpoint is working correctly.",
    available_routes: ["health", ...Object.keys(routeLoaders)],
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
    .replace(/^app$/, "")
    .replace(/^api\/+/, "");
}
