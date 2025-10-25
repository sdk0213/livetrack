// API: 사용자의 그룹 정보 조회
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { kakaoId } = req.query;

  try {
    // 사용자가 속한 그룹 조회
    const result = await sql`
      SELECT 
        g.code,
        g.name,
        g.event_id,
        g.creator_kakao_id,
        g.created_at,
        gm.bib,
        gm.photo_url,
        gm.team_name
      FROM group_members gm
      INNER JOIN groups g ON gm.group_code = g.code
      WHERE gm.kakao_id = ${kakaoId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not in any group' });
    }

    return res.status(200).json(result.rows[0]);
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
