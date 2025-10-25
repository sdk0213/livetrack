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
      SELECT 
        g.*,
        u.name as creator_name
      FROM groups g
      INNER JOIN group_members gm ON g.code = gm.group_code
      LEFT JOIN users u ON g.creator_kakao_id = u.kakao_id
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

  const { code, name, eventId, creatorKakaoId } = req.body;

  if (!code || !name || !eventId || !creatorKakaoId) {
    console.error('Missing required fields:', { code, name, eventId, creatorKakaoId });
    return res.status(400).json({ error: 'code, name, eventId, creatorKakaoId are required' });
  }

  try {
    const result = await sql`
      INSERT INTO groups (code, name, event_id, creator_kakao_id)
      VALUES (${code}, ${name}, ${eventId}, ${creatorKakaoId})
      RETURNING *
    `;

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Group creation error:', error);
    if (error.code === '23505') { // 중복 코드
      return res.status(409).json({ error: 'Code already exists' });
    }
    throw error;
  }
}

export async function handleGroupCreateWithMember(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, name, eventId, creatorKakaoId, role = 'runner', bib, photoUrl } = req.body;

  if (!code || !name || !eventId || !creatorKakaoId) {
    console.error('Missing required fields:', { code, name, eventId, creatorKakaoId });
    return res.status(400).json({ error: 'code, name, eventId, and creatorKakaoId are required' });
  }

  // 주자인 경우 배번과 사진 필수
  if (role === 'runner' && (!bib || !photoUrl)) {
    console.error('Runner missing required fields:', { bib, photoUrl });
    return res.status(400).json({ error: 'Runner role requires bib and photoUrl' });
  }

  try {
    // 1. 그룹 생성
    const groupResult = await sql`
      INSERT INTO groups (code, name, event_id, creator_kakao_id)
      VALUES (${code}, ${name}, ${eventId}, ${creatorKakaoId})
      RETURNING *
    `;

    const group = groupResult.rows[0];

    // 2. 멤버 추가 (생성자를 주자 또는 응원자로 등록)
    if (role === 'runner') {
      await sql`
        INSERT INTO group_members (group_code, kakao_id, role, bib, photo_url)
        VALUES (${code}, ${creatorKakaoId}, ${role}, ${bib}, ${photoUrl})
      `;
    } else {
      await sql`
        INSERT INTO group_members (group_code, kakao_id, role)
        VALUES (${code}, ${creatorKakaoId}, ${role})
      `;
    }

    return res.status(201).json(group);
  } catch (error) {
    console.error('Group creation with member error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    if (error.code === '23505') { // 중복 제약
      return res.status(409).json({ error: 'Duplicate entry' });
    }
    if (error.code === '42703') { // 컬럼이 존재하지 않음
      return res.status(500).json({ error: 'Database schema error: role column missing. Please run migration.' });
    }
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      code: error.code,
      detail: error.detail
    });
  }
}

export async function handleGroupJoin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, kakaoId, role = 'runner', bib, photoUrl } = req.body;

  // 기본 필수 항목 확인
  if (!code || !kakaoId) {
    console.error('Missing required fields:', { code, kakaoId });
    return res.status(400).json({ error: 'code and kakaoId are required' });
  }

  // 주자인 경우 배번과 사진 필수
  if (role === 'runner' && (!bib || !photoUrl)) {
    console.error('Runner missing required fields:', { bib, photoUrl });
    return res.status(400).json({ error: 'Runner role requires bib and photoUrl' });
  }

  try {
    // 그룹 존재 확인
    const groupResult = await sql`SELECT * FROM groups WHERE code = ${code}`;

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groupResult.rows[0];

    // 이미 멤버인지 확인
    const memberCheck = await sql`
      SELECT * FROM group_members 
      WHERE group_code = ${code} AND kakao_id = ${kakaoId}
    `;

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // 멤버 추가 (role에 따라 다르게)
    if (role === 'runner') {
      await sql`
        INSERT INTO group_members (group_code, kakao_id, role, bib, photo_url)
        VALUES (${code}, ${kakaoId}, ${role}, ${bib}, ${photoUrl})
      `;
    } else {
      await sql`
        INSERT INTO group_members (group_code, kakao_id, role)
        VALUES (${code}, ${kakaoId}, ${role})
      `;
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error('Group join error:', error);
    if (error.code === '23505') { // 중복 제약
      return res.status(409).json({ error: 'Duplicate entry' });
    }
    throw error;
  }
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

  const { code } = req.query;

  if (!code) {
    console.error('Missing code parameter');
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const result = await sql`
      SELECT 
        gm.kakao_id,
        u.name,
        u.profile_image,
        gm.role,
        gm.bib,
        gm.photo_url,
        gm.team_name,
        gm.joined_at
      FROM group_members gm
      INNER JOIN users u ON gm.kakao_id = u.kakao_id
      WHERE gm.group_code = ${code}
      ORDER BY gm.role DESC, u.name
    `;

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Group runners query error:', error);
    throw error;
  }
}

export async function handleGroupByCode(req, res, code) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM groups WHERE code = ${code}`;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'DELETE') {
    console.log('=== GROUP DELETE REQUEST ===');
    console.log('Code:', code);
    
    // 그룹 삭제 (CASCADE로 group_members도 자동 삭제됨)
    const result = await sql`DELETE FROM groups WHERE code = ${code} RETURNING *`;

    console.log('Delete result:', result.rows);

    if (result.rows.length === 0) {
      console.log('Group not found for deletion:', code);
      return res.status(404).json({ error: 'Group not found' });
    }

    console.log('Group deleted successfully:', code);
    return res.status(200).json({ message: 'Group deleted successfully', group: result.rows[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================
// Image Handlers
// ============================================
export async function handleImageUpload(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel의 serverless function에서는 multipart/form-data를 직접 파싱할 수 없음
  // 클라이언트에서 base64로 변환해서 보내야 함
  const { kakaoId, groupCode, imageData } = req.body;

  if (!kakaoId || !groupCode || !imageData) {
    console.error('Missing fields:', { kakaoId, groupCode, hasImageData: !!imageData });
    return res.status(400).json({ error: 'kakaoId, groupCode, imageData are required' });
  }

  try {
    // base64 데이터 추출
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Vercel Blob에 업로드
    const filename = `runner-${kakaoId}-${groupCode}-${Date.now()}.jpg`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    console.log('Image uploaded:', blob.url);
    
    return res.status(200).json({ 
      url: blob.url,
      filename: filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function handlePing(req, res) {
  return res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
}
