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

    // 배번 추출 (path에서) - path 형식: event/132/player/2296
    const bibMatch = path.match(/player\/(\d+)/);
    const bib = bibMatch ? bibMatch[1] : '1080';

    // 현재 시간 (한국 시간으로 변환)
    const now = new Date();
    const eventDate = '2025-10-22'; // 춘천 마라톤 날짜
    const startTime = new Date(new Date(eventDate + 'T16:00:00Z').getTime() + (9 * 60 * 60 * 1000)); // 한국 시간 (UTC+9)
    
    // 현재 시간과 출발 시간의 차이 계산 (실시간)
    const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
    
    // 주자별 설정
    const runners = {
      '1080': {
        name: '성대경',
        team_name: '런티풀',
        pace: 270 // 4:30/km (4:00~6:00 사이 랜덤)
      },
      '2296': {
        name: '고민지',
        team_name: '달리기클럽',
        pace: 330 // 5:30/km
      },
      '2634': {
        name: '김이수',
        team_name: '러닝크루',
        pace: 250 // 4:10/km
      }
    };
    
    const runner = runners[bib] || runners['1080'];
    
    // 주행 거리 계산
    const distanceKm = Math.min(42.20, elapsedSeconds / runner.pace);
    
    // 체크포인트 (춘천 마라톤 기준)
    const checkpoints = [
      { code: 'P0', name: '출발', distance: 0.00, lat: 37.874123, lng: 127.734567 },
      { code: 'P1', name: '반환점', distance: 4.00, lat: 37.880456, lng: 127.738901 },
      { code: 'P2', name: '5K', distance: 5.00, lat: 37.879020, lng: 127.723578 },
      { code: 'P3', name: '10K', distance: 10.00, lat: 37.883234, lng: 127.729876 },
      { code: 'P4', name: '15K', distance: 15.00, lat: 37.878456, lng: 127.715432 },
      { code: 'P5', name: '20K', distance: 20.00, lat: 37.881234, lng: 127.721098 },
      { code: 'P6', name: 'Half', distance: 21.10, lat: 37.876543, lng: 127.718765 },
      { code: 'P7', name: '25K', distance: 25.00, lat: 37.884321, lng: 127.725432 },
      { code: 'P8', name: '30K', distance: 30.00, lat: 37.877654, lng: 127.712345 },
      { code: 'P9', name: '35K', distance: 35.00, lat: 37.882345, lng: 127.727654 },
      { code: 'P10', name: '40K', distance: 40.00, lat: 37.875432, lng: 127.719876 },
      { code: 'P11', name: '도착', distance: 42.20, lat: 37.874123, lng: 127.734567 }
    ];
    
    const records = [];
    let cumulativeSeconds = 0;
    
    // 배번 기반 시드로 일관된 랜덤 페이스 생성
    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
    
    // 출발점(P0)은 무조건 추가
    records.push({
      event_id: 132,
      course_cd: 'Full',
      point_cd: 'P0',
      lap: 1,
      player_num: bib,
      created_at: new Date(eventDate + 'T16:00:00+09:00').toISOString(),
      updated_at: null,
      time_section: null,
      time_sum: "0:00:00",
      time_point: startTime.toLocaleTimeString('ko-KR', { 
        hour12: false,
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/:/g, ':') + '.00',
      point: {
        event_id: 132,
        course_cd: 'Full',
        point_cd: 'P0',
        lap: 1,
          created_at: new Date(eventDate + 'T16:00:00+09:00').toISOString(),
        updated_at: null,
        name: '출발',
        distance: "0.00",
        checkpoint: true,
        before_record: true,
        lat: 37.874123,
        lng: 127.734567
      }
    });
    
    // 나머지 체크포인트 처리 (P1부터)
    for (let i = 1; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const prevCp = checkpoints[i-1];
      
      // 구간별 랜덤 페이스 적용 (±10초 변동)
      const sectionDistance = cp.distance - prevCp.distance;
      const seed = parseInt(bib) * 100 + i;
      const variation = (seededRandom(seed) - 0.5) * 20; // -10 ~ +10초
      const sectionPace = runner.pace + variation;
      const sectionSeconds = sectionDistance * sectionPace;
      
      cumulativeSeconds += sectionSeconds;
      
      // 현재까지 누적 시간이 경과 시간보다 크면 아직 도달하지 않음
      if (cumulativeSeconds > elapsedSeconds) {
        break;
      }
      
      const recordTime = new Date(startTime.getTime() + cumulativeSeconds * 1000);
      const hours = String(recordTime.getHours()).padStart(2, '0');
      const minutes = String(recordTime.getMinutes()).padStart(2, '0');
      const seconds = String(recordTime.getSeconds()).padStart(2, '0');
      const milliseconds = String(Math.floor(seededRandom(seed + 1000) * 100)).padStart(2, '0');
      const timePoint = `${hours}:${minutes}:${seconds}.${milliseconds}`;
      
      records.push({
        event_id: 132,
        course_cd: 'Full',
        point_cd: cp.code,
        lap: 1,
        player_num: bib,
        created_at: recordTime.toISOString(),
        updated_at: null,
        time_section: formatTime(sectionSeconds),
        time_sum: formatTime(cumulativeSeconds),
        time_point: timePoint,
        point: {
          event_id: 132,
          course_cd: 'Full',
          point_cd: cp.code,
          lap: 1,
          created_at: recordTime.toISOString(),
          updated_at: null,
          name: cp.name,
          distance: cp.distance.toFixed(2),
          checkpoint: true,
          before_record: true,
          lat: cp.lat,
          lng: cp.lng
        }
      });
    }
    
    // 완주 여부 확인
    const isFinished = distanceKm >= 42.20;
    const netTime = isFinished ? formatTime(cumulativeSeconds) : null;
    
    // 페이스 계산 - 진행 중에도 현재 평균 페이스 제공
    let pace = null;
    if (cumulativeSeconds > 0 && records.length > 1) {
      // 마지막 체크포인트까지의 평균 페이스 계산
      const lastCp = checkpoints[records.length - 1];
      const avgPaceSeconds = cumulativeSeconds / lastCp.distance;
      const paceMin = Math.floor(avgPaceSeconds / 60);
      const paceSec = Math.floor(avgPaceSeconds % 60);
      pace = `${paceMin}'${String(paceSec).padStart(2, '0')}"`;
    }
    
    // 테스트 데이터
    const testData = {
      num: bib,
      tag: bib,
      name: runner.name,
      team_name: runner.team_name,
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
      pace_nettime: pace,
      _debug: {
        deployedAt: '2025-10-22T15:55:00-KST',
        nowUTC: now.toISOString(),
        startTimeUTC: startTime.toISOString(),
        elapsedSeconds: elapsedSeconds,
        elapsedMinutes: Math.floor(elapsedSeconds / 60),
        pace: runner.pace,
        recordsCount: records.length,
        loopExecuted: true
      }
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
