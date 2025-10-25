/**
 * 통합 API 엔드포인트
 * Vercel 무료 플랜의 Function 개수 제한(12개)을 해결하기 위해 모든 API를 하나로 통합
 */

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

// CORS 헤더 설정
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vercel의 catch-all route에서 path 파라미터 가져오기
  const { path } = req.query;
  const parts = Array.isArray(path) ? path : [path || ''];
  const resource = parts[0] || '';
  
  try {
    // 라우팅
    switch (resource) {
      case 'ping':
        return handlePing(req, res);
      
      case 'auth':
        return handleAuth(req, res, parts);
      
      case 'users':
        return handleUsers(req, res, parts);
      
      case 'groups':
        return handleGroups(req, res, parts);
      
      case 'images':
        return handleImages(req, res, parts);
      
      default:
        return res.status(404).json({ error: 'Not found', path: parts });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================
// Ping
// ============================================
function handlePing(req, res) {
  return res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
}

// ============================================
// Auth
// ============================================
async function handleAuth(req, res, parts) {
  const action = parts[1];
  
  if (action === 'token') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // 카카오 토큰 요청
    const redirectUri = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/test_kakao.html`
      : 'https://livetrack-theta.vercel.app/test_kakao.html';
    
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY || '1c986b10c0401ffb6c00df1ccddef006',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Kakao token error:', errorData);
      return res.status(tokenResponse.status).json(errorData);
    }

    const tokenData = await tokenResponse.json();

    // 사용자 정보 조회
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      return res.status(userResponse.status).json(errorData);
    }

    const userData = await userResponse.json();

    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user: userData,
    });
  }

  return res.status(404).json({ error: 'Not found' });
}

// ============================================
// Users
// ============================================
async function handleUsers(req, res, parts) {
  const action = parts[1];

  // GET /api/users/group - 사용자의 그룹 조회
  if (action === 'group' && req.method === 'GET') {
    const { kakaoId } = req.query;
    if (!kakaoId) {
      return res.status(400).json({ error: 'kakaoId is required' });
    }

    const result = await sql`
      SELECT g.* 
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.kakao_id = ${kakaoId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  // /api/users/[kakaoId]
  const kakaoId = action;

  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM users WHERE kakao_id = ${kakaoId}`;
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'POST') {
    const { name, profileImage } = req.body;

    const result = await sql`
      INSERT INTO users (kakao_id, name, profile_image)
      VALUES (${kakaoId}, ${name}, ${profileImage})
      RETURNING *
    `;

    return res.status(201).json(result.rows[0]);
  }

  if (req.method === 'PATCH') {
    const { name, profileImage } = req.body;

    const result = await sql`
      UPDATE users
      SET name = COALESCE(${name}, name),
          profile_image = COALESCE(${profileImage}, profile_image),
          updated_at = NOW()
      WHERE kakao_id = ${kakaoId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM users WHERE kakao_id = ${kakaoId}`;
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================
// Groups
// ============================================
async function handleGroups(req, res, parts) {
  const action = parts[1];

  // POST /api/groups - 그룹 생성
  if (!action && req.method === 'POST') {
    const { name, eventId, leaderId } = req.body;

    if (!name || !eventId || !leaderId) {
      return res.status(400).json({ error: 'name, eventId, leaderId are required' });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();

    const result = await sql`
      INSERT INTO groups (name, code, event_id, leader_id)
      VALUES (${name}, ${code}, ${eventId}, ${leaderId})
      RETURNING *
    `;

    const group = result.rows[0];

    await sql`
      INSERT INTO group_members (group_id, kakao_id)
      VALUES (${group.id}, ${leaderId})
    `;

    return res.status(201).json(group);
  }

  // GET /api/groups/join - 그룹 가입
  if (action === 'join' && req.method === 'POST') {
    const { code, kakaoId } = req.body;

    if (!code || !kakaoId) {
      return res.status(400).json({ error: 'code and kakaoId are required' });
    }

    const groupResult = await sql`SELECT * FROM groups WHERE code = ${code}`;

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    const memberCheck = await sql`
      SELECT * FROM group_members 
      WHERE group_id = ${group.id} AND kakao_id = ${kakaoId}
    `;

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member' });
    }

    await sql`
      INSERT INTO group_members (group_id, kakao_id)
      VALUES (${group.id}, ${kakaoId})
    `;

    return res.status(200).json(group);
  }

  // POST /api/groups/leave - 그룹 탈퇴
  if (action === 'leave' && req.method === 'POST') {
    const { kakaoId } = req.body;

    if (!kakaoId) {
      return res.status(400).json({ error: 'kakaoId is required' });
    }

    await sql`DELETE FROM group_members WHERE kakao_id = ${kakaoId}`;

    return res.status(200).json({ message: 'Left group successfully' });
  }

  // GET /api/groups/runners?groupId=
  if (action === 'runners' && req.method === 'GET') {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const result = await sql`
      SELECT 
        u.kakao_id,
        u.name,
        u.profile_image,
        ri.bib_number,
        ri.image_url,
        ri.uploaded_at
      FROM group_members gm
      INNER JOIN users u ON gm.kakao_id = u.kakao_id
      LEFT JOIN runner_images ri ON u.kakao_id = ri.kakao_id
      WHERE gm.group_id = ${groupId}
      ORDER BY u.name
    `;

    return res.status(200).json(result.rows);
  }

  // GET /api/groups/[code]
  if (action && req.method === 'GET') {
    const code = action;
    const result = await sql`SELECT * FROM groups WHERE code = ${code}`;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================
// Images
// ============================================
async function handleImages(req, res, parts) {
  const action = parts[1];

  // POST /api/images/upload
  if (action === 'upload' && req.method === 'POST') {
    const { kakaoId, bibNumber, imageData } = req.body;

    if (!kakaoId || !bibNumber || !imageData) {
      return res.status(400).json({ error: 'kakaoId, bibNumber, imageData are required' });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `runner-${kakaoId}-${Date.now()}.jpg`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    const result = await sql`
      INSERT INTO runner_images (kakao_id, bib_number, image_url)
      VALUES (${kakaoId}, ${bibNumber}, ${blob.url})
      ON CONFLICT (kakao_id)
      DO UPDATE SET 
        bib_number = ${bibNumber},
        image_url = ${blob.url},
        uploaded_at = NOW()
      RETURNING *
    `;

    return res.status(200).json(result.rows[0]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
