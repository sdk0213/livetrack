// API: 이미지 업로드 (Vercel Blob)
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const formData = await req.body;
    
    // 실제 구현에서는 multipart/form-data 파싱 필요
    // 여기서는 간단한 예시만 제공
    
    // Vercel Blob에 업로드
    const { url } = await put(`runners/${Date.now()}.jpg`, req.body, {
      access: 'public',
    });

    return res.status(200).json({ url });
    
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}
