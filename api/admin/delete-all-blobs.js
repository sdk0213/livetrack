import { list, del } from '@vercel/blob';
import { setCorsHeaders } from '../_lib/handlers.js';

/**
 * ⚠️ 위험: 모든 Blob Storage 파일을 삭제합니다
 * 이 API는 매우 주의해서 사용해야 합니다
 * 프로덕션에서는 관리자 인증을 추가하는 것을 강력히 권장합니다
 */
export default async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ⚠️ 보안: 관리자 인증 추가 권장
  const { adminPassword } = req.body;
  
  // 환경 변수에 설정한 관리자 비밀번호 확인
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting to delete all blobs...');
    
    // 모든 Blob 목록 조회
    const { blobs } = await list();
    
    console.log(`Found ${blobs.length} blobs to delete`);
    
    if (blobs.length === 0) {
      return res.status(200).json({ 
        message: 'No blobs to delete',
        deleted: 0
      });
    }

    // 모든 Blob 삭제
    let deletedCount = 0;
    const errors = [];

    for (const blob of blobs) {
      try {
        await del(blob.url);
        deletedCount++;
        console.log(`Deleted: ${blob.url}`);
      } catch (error) {
        console.error(`Failed to delete ${blob.url}:`, error);
        errors.push({ url: blob.url, error: error.message });
      }
    }

    return res.status(200).json({
      message: 'Blob deletion completed',
      total: blobs.length,
      deleted: deletedCount,
      failed: errors.length,
      errors: errors
    });

  } catch (error) {
    console.error('Delete all blobs error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}
