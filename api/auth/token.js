/**
 * 카카오 토큰 요청 API
 * 인가 코드를 받아서 액세스 토큰을 발급받습니다
 */

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // 카카오 토큰 요청
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY || '1c986b10c0401ffb6c00df1ccddef006',
        redirect_uri: `${process.env.VERCEL_URL || 'https://livetrack-theta.vercel.app'}/test_kakao.html`,
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

    // 토큰과 사용자 정보 반환
    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user: userData,
    });

  } catch (error) {
    console.error('Token request error:', error);
    return res.status(500).json({ error: error.message });
  }
}
