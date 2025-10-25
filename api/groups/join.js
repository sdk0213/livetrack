// API: 그룹 참여
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { code, kakaoId, bib, photoUrl, name } = req.body;

  try {
    // 그룹 존재 확인
    const group = await sql`
      SELECT * FROM groups WHERE code = ${code}
    `;
    
    if (group.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 사용자가 이미 그룹에 속해있는지 확인
    const existingMember = await sql`
      SELECT * FROM group_members WHERE kakao_id = ${kakaoId}
    `;
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User already in a group' });
    }

    // 같은 그룹에 같은 배번이 있는지 확인
    const existingBib = await sql`
      SELECT * FROM group_members 
      WHERE group_code = ${code} AND bib = ${bib}
    `;
    
    if (existingBib.rows.length > 0) {
      return res.status(400).json({ error: 'Bib number already exists in this group' });
    }

    // 멤버 추가
    const result = await sql`
      INSERT INTO group_members (group_code, kakao_id, bib, photo_url, joined_at)
      VALUES (${code}, ${kakaoId}, ${bib}, ${photoUrl}, NOW())
      RETURNING *
    `;

    return res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
