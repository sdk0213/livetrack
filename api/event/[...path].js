// /api/event/[...path].js
export default async function handler(req, res) {
  try {
    // 1) URL 파싱(호스트가 없으니 임시 호스트 부여)
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // 2) /api/event/ 이하 경로 세그먼트 추출
    //    예: /api/event/110/player/3725  ->  "110/player/3725"
    const rel = u.pathname.replace(/^\/api\/event\/?/, '');
    const segs = rel ? rel.split('/').map(decodeURIComponent) : [];

    if (segs.length === 0) {
      return res.status(400).json({ error: 'Missing path: expected /api/event/<eventId>/player/<bib>' });
    }

    // 3) 원본 API로 프록시
    const upstream = `https://myresult.co.kr/api/${segs.join('/')}${u.search || ''}`;

    // CORS preflight (선택)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      return res.status(204).end();
    }

    const r = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const body = await r.text();

    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    // 필요 시 외부에서 직접 호출 허용:
    // res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(r.status).send(body);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
