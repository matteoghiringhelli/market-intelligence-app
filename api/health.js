export default function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    app: "Market Intelligence App",
    api_layer: "Vercel Functions",
    message: "Health endpoint is working correctly.",
    fetched_at: new Date().toISOString()
  });
}
