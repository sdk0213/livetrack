import { setCorsHeaders, handleGroupByCode } from '../_lib/handlers.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Vercel의 동적 라우팅: req.query에서 code 추출
    const { code } = req.query;
    console.log('[groups/[code].js] Request:', req.method, 'Code:', code);
    
    if (!code) {
      return res.status(400).json({ error: 'Code parameter is required' });
    }
    
    return await handleGroupByCode(req, res, code);
  } catch (error) {
    console.error('Group by code error:', error);
    return res.status(500).json({ error: error.message });
  }
}
