import { setCorsHeaders, handleUser } from '../_lib/handlers.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { kakaoId } = req.query;

  try {
    return await handleUser(req, res, kakaoId);
  } catch (error) {
    console.error('User error:', error);
    return res.status(500).json({ error: error.message });
  }
}
