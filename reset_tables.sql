-- groups 테이블과 group_members 테이블 초기화 쿼리
-- 주의: 이 쿼리를 실행하면 모든 그룹 및 그룹 멤버 데이터가 삭제됩니다.

-- 1. group_members 테이블 초기화 (외래 키 제약 조건 때문에 먼저 삭제)
TRUNCATE TABLE group_members;

-- 2. groups 테이블 초기화
TRUNCATE TABLE groups;

-- 또는 DELETE 사용 시 (자동 증가 값을 유지하려면)
-- DELETE FROM group_members;
-- DELETE FROM groups;

-- 자동 증가 값도 초기화하려면 (PostgreSQL의 경우)
-- ALTER SEQUENCE groups_id_seq RESTART WITH 1;
-- ALTER SEQUENCE group_members_id_seq RESTART WITH 1;

-- MySQL의 경우
-- ALTER TABLE groups AUTO_INCREMENT = 1;
-- ALTER TABLE group_members AUTO_INCREMENT = 1;
