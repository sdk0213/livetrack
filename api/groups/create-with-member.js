import { setCorsHeaders, handleGroupCreateWithMember } from '../_lib/handlers.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return await handleGroupCreateWithMember(req, res);
  } catch (error) {
    console.error('Group create with member error:', error);
    return res.status(500).json({ error: error.message });
  }
}
