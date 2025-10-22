export default async function handler(req, res) {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
      return res.status(204).end();
    }

    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = u.searchParams.get('path');
    
    if (!path) {
      return res.status(400).json({ error: "missing 'path' query" });
    }

    // 현재 시간
    const now = new Date();
    const eventDate = '2025-10-22'; // 춘천 마라톤 날짜
    
    // 오후 3시 (출발 시간) - 고정
    const startTime = new Date(eventDate + 'T15:00:00');
    
    // 현재 시간과 출발 시간의 차이 계산 (실시간)
    const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
    
    // 주행 거리 계산 (5분/km 페이스로 가정 = 12km/h = 300초/km)
    const paceSecondsPerKm = 300;
    const distanceKm = Math.min(42.20, elapsedSeconds / paceSecondsPerKm);
    
    // 체크포인트 (춘천 마라톤 기준)
    const checkpoints = [
      { name: '출발', distance: 0.00 },
      { name: '반환점', distance: 4.00 },
      { name: '5K', distance: 5.00 },
      { name: '10K', distance: 10.00 },
      { name: '15K', distance: 15.00 },
      { name: '20K', distance: 20.00 },
      { name: 'Half', distance: 21.10 },
      { name: '25K', distance: 25.00 },
      { name: '30K', distance: 30.00 },
      { name: '35K', distance: 35.00 },
      { name: '40K', distance: 40.00 },
      { name: '도착', distance: 42.20 }
    ];
    
    const records = [];
    
    for (const cp of checkpoints) {
      if (cp.distance > distanceKm) break;
      
      const cpSeconds = cp.distance * paceSecondsPerKm;
      const recordTime = new Date(startTime.getTime() + cpSeconds * 1000);
      const timePoint = recordTime.toTimeString().split(' ')[0]; // HH:MM:SS
      
      records.push({
        point: {
          name: cp.name,
          distance: cp.distance
        },
        time_point: timePoint
      });
    }
    
    // 완주 여부 확인
    const isFinished = distanceKm >= 42.20;
    const netTime = isFinished ? formatTime(42.20 * paceSecondsPerKm) : null;
    const pace = isFinished ? "5'00\"" : null;
    
    // 테스트 데이터
    const testData = {
      num: '1080',
      tag: '1080',
      name: '성대경',
      team_name: '런티풀',
      event: {
        id: 132,
        name: '2025 춘천마라톤',
        date: eventDate
      },
      course: {
        distance: '42.20'
      },
      records: records,
      result_nettime: netTime,
      pace_nettime: pace
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(testData);
    
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
