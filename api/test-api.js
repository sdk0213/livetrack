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
    const startTime = new Date(eventDate + 'T18:00:00+09:00'); // 한국 시간 16:00
    
    // 현재 시간과 출발 시간의 차이 계산 (실시간)
    const elapsedSeconds = Math.max(0, (now - startTime) / 1000);
    
    // 주자별 설정
    const runners = {
      '2634': { name: '장건희', team_name: 'B', pace: 292 }, // 3:25
      '2912': { name: '김이수', team_name: 'B', pace: 254 }, // 2:59
      '3097': { name: '유재원', team_name: 'B', pace: 269 }, // 3:09
      '3148': { name: '이재경', team_name: 'B', pace: 297 }, // 3:29
      '9430': { name: '박종현', team_name: 'D', pace: 254 }, // 2:59
      '13292': { name: '문영채', team_name: 'E', pace: 300 }, // 완주
      '1080': { name: '성대경', team_name: 'A', pace: 248 }, // 2:54
      '16322': { name: '도시연', team_name: 'F', pace: 398 }, // 4:40
      '2296': { name: '박용준', team_name: 'B', pace: 383 }, // 4:30
      '14618': { name: '최병찬', team_name: 'F', pace: 426 }, // 5:00
      '10384': { name: '이희수', team_name: '', pace: 383 }, // 4:30
      '14614': { name: '최동철', team_name: 'F', pace: 426 }, // 5:00
      '14906': { name: '박유영', team_name: 'F', pace: 339 }, // 3:59
      '3212': { name: '전우진', team_name: 'B', pace: 298 }, // 3:30
      '10352': { name: '어승혜', team_name: 'D', pace: 383 }, // 4:30
      '5969': { name: '이득우', team_name: 'C', pace: 341 }, // 4:00
      '13373': { name: '황민효', team_name: 'E', pace: 383 }, // 4:30
      '15493': { name: '강한철', team_name: 'F', pace: 370 }, // 4:20
      '7153': { name: '최인아', team_name: 'C', pace: 426 }, // 5:00
      '13306': { name: '송주엽', team_name: 'E', pace: 469 }, // 5:30
      '13366': { name: '허수민', team_name: 'E', pace: 362 },  // 4:15
      '8904': { name: '민경훈', team_name: 'D', pace: 400 },  // 4:15
      '13324': { name: '이소정', team_name: 'E', pace: 402 }  // 4:15
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
      const timePoint = recordTime.toLocaleTimeString('ko-KR', {
        hour12: false,
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/:/g, ':') + '.' + String(Math.floor(seededRandom(seed + 1000) * 100)).padStart(2, '0');
      
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
    
    // 페이스 계산 - 완주한 경우에만 페이스 표시
    let pace = null;
    if (isFinished && cumulativeSeconds > 0 && records.length > 1) {
      // 완주 시의 평균 페이스 계산
      const totalDistance = 42.20;
      const avgPaceSeconds = cumulativeSeconds / totalDistance;
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
