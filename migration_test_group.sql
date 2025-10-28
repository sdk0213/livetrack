-- 테스트 그룹 3174 생성 (JTBC 마라톤)
INSERT INTO groups (code, name, event_id, creator_kakao_id)
VALUES ('3174', '테스트그룹', 133, 'test_creator')
ON CONFLICT (code) DO UPDATE SET name = '테스트그룹', event_id = 133;

-- 테스트 주자들 추가 (전부 러너)
INSERT INTO group_members (group_code, bib, name, role, event_id, photo_url, profile_image)
VALUES 
  ('3174', '2634', '장건희', 'runner', 133, NULL, NULL),
  ('3174', '2912', '김이수', 'runner', 133, NULL, NULL),
  ('3174', '3097', '유재원', 'runner', 133, NULL, NULL),
  ('3174', '3148', '이재경', 'runner', 133, NULL, NULL),
  ('3174', '9430', '박종현', 'runner', 133, NULL, NULL),
  ('3174', '13292', '문영채', 'runner', 133, NULL, NULL),
  ('3174', '1080', '성대경', 'runner', 133, NULL, NULL),
  ('3174', '16322', '도시연', 'runner', 133, NULL, NULL),
  ('3174', '2296', '박용준', 'runner', 133, NULL, NULL),
  ('3174', '14618', '최병찬', 'runner', 133, NULL, NULL),
  ('3174', '10384', '이희수', 'runner', 133, NULL, NULL),
  ('3174', '14614', '최동철', 'runner', 133, NULL, NULL),
  ('3174', '14906', '박유영', 'runner', 133, NULL, NULL),
  ('3174', '3212', '전우진', 'runner', 133, NULL, NULL),
  ('3174', '10352', '어승혜', 'runner', 133, NULL, NULL),
  ('3174', '5969', '이득우', 'runner', 133, NULL, NULL),
  ('3174', '13373', '황민효', 'runner', 133, NULL, NULL),
  ('3174', '15493', '강한철', 'runner', 133, NULL, NULL),
  ('3174', '7153', '최인아', 'runner', 133, NULL, NULL),
  ('3174', '13306', '송주엽', 'runner', 133, NULL, NULL),
  ('3174', '13366', '허수민', 'runner', 133, NULL, NULL),
  ('3174', '8904', '민경훈', 'runner', 133, NULL, NULL),
  ('3174', '13324', '이소정', 'runner', 133, NULL, NULL),
  ('3174', '15092', '이은석', 'runner', 133, NULL, NULL),
  ('3174', '13354', '정찬선', 'runner', 133, NULL, NULL),
  ('3174', '2147', '김웅기', 'runner', 133, NULL, NULL),
  ('3174', '7319', '김나예', 'runner', 133, NULL, NULL)
ON CONFLICT (group_code, bib) DO UPDATE SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  event_id = EXCLUDED.event_id;
