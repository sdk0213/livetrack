-- 2025 춘천마라톤 그룹 삭제
-- event_id = 132 (춘천마라톤)

-- CASCADE로 인해 group_members도 자동 삭제됨
DELETE FROM groups WHERE event_id = 132;

-- 확인 쿼리
SELECT COUNT(*) as deleted_count FROM groups WHERE event_id = 132;
