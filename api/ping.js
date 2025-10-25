import { setCorsHeaders, handlePing } from './_lib/handlers.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return await handlePing(req, res);
  } catch (error) {
    console.error('Ping error:', error);
    return res.status(500).json({ error: error.message });
  }
}
