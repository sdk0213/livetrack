// API: 그룹의 주자 목록 조회
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { code } = req.query;

  try {
    // 그룹의 모든 주자 조회 (사용자 정보와 조인)
    const result = await sql`
      SELECT 
        gm.kakao_id,
        gm.bib,
        gm.photo_url,
        gm.team_name,
        gm.joined_at,
        u.name,
        u.profile_image
      FROM group_members gm
      INNER JOIN users u ON gm.kakao_id = u.kakao_id
      WHERE gm.group_code = ${code}
      ORDER BY gm.joined_at ASC
    `;

    return res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
