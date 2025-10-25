-- 간단한 마이그레이션 (제약조건 없이)
-- Neon Postgres 콘솔에서 실행하세요

-- 1. role 컬럼 추가
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'runner';

-- 2. bib를 nullable로 변경
ALTER TABLE group_members 
ALTER COLUMN bib DROP NOT NULL;

-- 3. photo_url을 nullable로 변경
ALTER TABLE group_members 
ALTER COLUMN photo_url DROP NOT NULL;

-- 확인 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'group_members'
ORDER BY ordinal_position;
