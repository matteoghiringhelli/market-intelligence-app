export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    app: "Market Intelligence App",
    purpose: "Educational and informational only"
  });
}