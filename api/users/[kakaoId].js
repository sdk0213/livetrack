// API: 사용자 관리
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { method } = req;
  const { kakaoId } = req.query;

  try {
    if (method === 'GET') {
      // 사용자 조회
      const result = await sql`
        SELECT * FROM users WHERE kakao_id = ${kakaoId}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json(result.rows[0]);
      
    } else if (method === 'POST') {
      // 사용자 생성
      const { name, profileImage } = req.body;
      
      const result = await sql`
        INSERT INTO users (kakao_id, name, profile_image, created_at)
        VALUES (${kakaoId}, ${name}, ${profileImage}, NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result.rows[0]);
      
    } else if (method === 'PATCH') {
      // 사용자 정보 수정
      const { name } = req.body;
      
      const result = await sql`
        UPDATE users
        SET name = ${name}, updated_at = NOW()
        WHERE kakao_id = ${kakaoId}
        RETURNING *
      `;
      
      return res.status(200).json(result.rows[0]);
      
    } else if (method === 'DELETE') {
      // 사용자 삭제
      await sql`DELETE FROM users WHERE kakao_id = ${kakaoId}`;
      return res.status(204).end();
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
