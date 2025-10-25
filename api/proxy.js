export default async function handler(req, res) {
  try {
    // 예: /api/proxy?path=event/110/player/3725
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = u.searchParams.get('path');
    if (!path) return res.status(400).json({ error: "missing 'path' query (e.g., ?path=event/110/player/3725)" });

    // CORS preflight (필요시)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      return res.status(204).end();
    }

    const upstream = `https://myresult.co.kr/api/${path}${u.searchParams.get('q') || ''}`;
    const r = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const body = await r.text();

    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    // 60초(1분) 캐싱으로 중복 호출 방지 (Function 비용 절감)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    // 외부 출처 허용 원하면 다음 줄 주석 해제
    // res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
