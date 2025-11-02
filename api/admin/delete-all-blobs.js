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
    
    let totalDeleted = 0;
    let totalFailed = 0;
    const allErrors = [];
    let hasMore = true;
    let cursor = undefined;
    
    // 페이지네이션으로 모든 Blob 삭제 (1000개씩)
    while (hasMore) {
      // 1000개씩 Blob 목록 조회
      const response = await list({ cursor, limit: 1000 });
      const { blobs } = response;
      
      console.log(`Found ${blobs.length} blobs in this batch`);
      
      if (blobs.length === 0) {
        break;
      }

      // 현재 배치의 Blob 삭제
      for (const blob of blobs) {
        try {
          await del(blob.url);
          totalDeleted++;
          console.log(`Deleted (${totalDeleted}): ${blob.url}`);
        } catch (error) {
          console.error(`Failed to delete ${blob.url}:`, error);
          allErrors.push({ url: blob.url, error: error.message });
          totalFailed++;
        }
      }
      
      // 다음 페이지가 있는지 확인
      hasMore = response.hasMore;
      cursor = response.cursor;
      
      console.log(`Batch completed. Total deleted: ${totalDeleted}, Failed: ${totalFailed}, Has more: ${hasMore}`);
    }
    
    if (totalDeleted === 0 && totalFailed === 0) {
      return res.status(200).json({ 
        message: 'No blobs to delete',
        deleted: 0
      });
    }

    return res.status(200).json({
      message: 'Blob deletion completed',
      total: totalDeleted + totalFailed,
      deleted: totalDeleted,
      failed: totalFailed,
      errors: allErrors
    });

  } catch (error) {
    console.error('Delete all blobs error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}
