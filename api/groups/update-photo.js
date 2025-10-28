import { setCorsHeaders } from '../_lib/handlers.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { groupCode, kakaoId, bib, photoUrl } = req.body;

    if (!groupCode || !kakaoId || !bib || !photoUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // group_members 테이블의 photo_url 업데이트
    await sql`
      UPDATE group_members 
      SET photo_url = ${photoUrl}
      WHERE group_code = ${groupCode} 
        AND kakao_id = ${kakaoId}
        AND bib = ${bib}
    `;

    return res.status(200).json({ success: true, url: photoUrl });
  } catch (error) {
    console.error('Update photo error:', error);
    return res.status(500).json({ error: error.message });
  }
}
