// API: 그룹 관리
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'POST') {
      // 그룹 생성
      const { code, name, eventId, creatorKakaoId } = req.body;
      
      // 코드 중복 확인
      const existing = await sql`
        SELECT * FROM groups WHERE code = ${code}
      `;
      
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Group code already exists' });
      }
      
      // 사용자가 이미 그룹에 속해있는지 확인
      const userGroup = await sql`
        SELECT * FROM group_members WHERE kakao_id = ${creatorKakaoId}
      `;
      
      if (userGroup.rows.length > 0) {
        return res.status(400).json({ error: 'User already in a group' });
      }
      
      // 그룹 생성
      const result = await sql`
        INSERT INTO groups (code, name, event_id, creator_kakao_id, created_at)
        VALUES (${code}, ${name}, ${eventId}, ${creatorKakaoId}, NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result.rows[0]);
      
    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
