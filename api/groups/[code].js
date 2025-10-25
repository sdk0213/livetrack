// API: 특정 그룹 조회 및 관리
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { method } = req;
  const { code } = req.query;

  try {
    if (method === 'GET') {
      // 그룹 조회
      const result = await sql`
        SELECT * FROM groups WHERE code = ${code}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      return res.status(200).json(result.rows[0]);
      
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
