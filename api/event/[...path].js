export default async function handler(req, res) {
  // 예: /api/event/110/player/3725?x=1  ->  https://myresult.co.kr/api/event/110/player/3725?x=1
  const upstream = "https://myresult.co.kr/api/" +
    req.query.path.join("/") + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    return res.status(204).end();
  }

  const r = await fetch(upstream, { headers: { Accept: "application/json" } });
  const body = await r.text();

  res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
  res.setHeader("Cache-Control", "no-cache");
  // (필요하면 외부접속 허용) res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(r.status).send(body);
}
