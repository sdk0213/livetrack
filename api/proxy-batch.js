// 여러 주자를 한 번에 조회하는 배치 API
// 예: /api/proxy-batch?bibs=2634,2912,3097&eventId=132

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const bibsParam = u.searchParams.get('bibs');
    const eventId = u.searchParams.get('eventId');
    
    if (!bibsParam || !eventId) {
      return res.status(400).json({ 
        error: "missing 'bibs' or 'eventId' query (e.g., ?bibs=2634,2912&eventId=132)" 
      });
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      return res.status(204).end();
    }

    const bibs = bibsParam.split(',').map(b => b.trim()).filter(b => b);
    
    // 병렬로 모든 주자 조회
    const fetchPromises = bibs.map(async (bib) => {
      try {
        const upstream = `https://myresult.co.kr/api/event/${eventId}/player/${bib}`;
        const r = await fetch(upstream, { 
          headers: { Accept: 'application/json' },
          // 타임아웃 설정
          signal: AbortSignal.timeout(5000)
        });
        
        if (!r.ok) {
          return { bib, error: `HTTP ${r.status}`, data: null };
        }
        
        const data = await r.json();
        return { bib, error: null, data };
      } catch (error) {
        return { bib, error: error.message, data: null };
      }
    });

    const results = await Promise.all(fetchPromises);

    // 60초 캐싱
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
      eventId,
      count: results.length,
      results
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
