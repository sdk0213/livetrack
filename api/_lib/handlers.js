/**
 * 공통 API 핸들러 로직
 */

import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

// CORS 헤더 설정
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ============================================
// Auth Handlers
// ============================================
export async function handleAuthToken(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  // 카카오 토큰 요청 - 항상 고정된 URL 사용
  const redirectUri = 'https://livetrack-theta.vercel.app/test_kakao.html';
  
  console.log('Token request with redirect_uri:', redirectUri);
  
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
    console.error('Kakao user info error:', errorData);
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

// ============================================
// User Handlers
// ============================================
export async function handleUser(req, res, kakaoId) {
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

export async function handleUserGroup(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kakaoId } = req.query;
  if (!kakaoId) {
    return res.status(400).json({ error: 'kakaoId is required' });
  }

  try {
    // kakaoId를 문자열로 변환 (DB에 문자열로 저장됨)
    const kakaoIdStr = String(kakaoId);
    
    const result = await sql`
      SELECT g.* 
      FROM groups g
      INNER JOIN group_members gm ON g.code = gm.group_code
      WHERE gm.kakao_id = ${kakaoIdStr}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('handleUserGroup error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}

// ============================================
// Group Handlers
// ============================================
export async function handleGroupCreate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

export async function handleGroupJoin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

export async function handleGroupLeave(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kakaoId } = req.body;

  if (!kakaoId) {
    return res.status(400).json({ error: 'kakaoId is required' });
  }

  await sql`DELETE FROM group_members WHERE kakao_id = ${kakaoId}`;

  return res.status(200).json({ message: 'Left group successfully' });
}

export async function handleGroupRunners(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

export async function handleGroupByCode(req, res, code) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await sql`SELECT * FROM groups WHERE code = ${code}`;

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Group not found' });
  }

  return res.status(200).json(result.rows[0]);
}

// ============================================
// Image Handlers
// ============================================
export async function handleImageUpload(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

export async function handlePing(req, res) {
  return res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
}
