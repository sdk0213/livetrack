-- 사용자가 여러 그룹에 참여할 수 있도록 제약 조건 수정

-- 1. 기존 unique 제약 제거
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS unique_member;

-- 2. 그룹별 사용자 unique 제약 추가 (같은 그룹에 중복 참여 방지)
ALTER TABLE group_members ADD CONSTRAINT unique_member_per_group UNIQUE (group_code, kakao_id);

-- 이제 한 사용자가 여러 그룹(여러 대회)에 각각 다른 레디샷으로 참여 가능!
