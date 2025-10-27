import { setCorsHeaders, handleGroupCreate } from '../_lib/handlers.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: 그룹 개수 조회
  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM groups`;
      const count = parseInt(result.rows[0].count);
      return res.status(200).json({ count });
    } catch (error) {
      console.error('Get groups count error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: 그룹 생성
  try {
    return await handleGroupCreate(req, res);
  } catch (error) {
    console.error('Group create error:', error);
    return res.status(500).json({ error: error.message });
  }
}
