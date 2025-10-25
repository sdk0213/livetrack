// API: 그룹 탈퇴
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { code, kakaoId } = req.body;

  try {
    // 멤버 삭제
    const result = await sql`
      DELETE FROM group_members 
      WHERE group_code = ${code} AND kakao_id = ${kakaoId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 이미지도 삭제
    await sql`
      DELETE FROM runner_images 
      WHERE kakao_id = ${kakaoId} AND group_code = ${code}
    `;

    return res.status(200).json({ message: 'Successfully left the group' });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
