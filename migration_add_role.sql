-- group_members 테이블에 role 컬럼 추가
-- 기존 데이터는 모두 'runner'로 설정

ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'runner';

-- bib와 photo_url을 nullable로 변경
ALTER TABLE group_members 
ALTER COLUMN bib DROP NOT NULL,
ALTER COLUMN photo_url DROP NOT NULL;

-- CHECK 제약 조건 추가
ALTER TABLE group_members
ADD CONSTRAINT check_runner_required_fields CHECK (
  (role = 'supporter') OR 
  (role = 'runner' AND bib IS NOT NULL AND photo_url IS NOT NULL)
);

-- 주석 추가
COMMENT ON COLUMN group_members.role IS '멤버 역할: runner(주자) 또는 supporter(응원자)';
COMMENT ON COLUMN group_members.bib IS '배번 (주자만 필수)';
COMMENT ON COLUMN group_members.photo_url IS '레디샷 URL (주자만 필수)';
