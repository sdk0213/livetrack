-- 테스트 그룹 3174 생성 (JTBC 마라톤)
INSERT INTO groups (code, name, event_id, creator_kakao_id)
VALUES ('3174', '테스트그룹', 133, 'test_creator')
ON CONFLICT (code) DO UPDATE SET name = '테스트그룹', event_id = 133;

-- 테스트 사용자 생성 (kakao_id 필요)
INSERT INTO users (kakao_id, name, profile_image)
VALUES ('test_creator', '테스트관리자', NULL)
ON CONFLICT (kakao_id) DO NOTHING;

-- 각 주자별 kakao_id 생성
INSERT INTO users (kakao_id, name, profile_image)
VALUES 
  ('test_2634', '장건희', NULL),
  ('test_2912', '김이수', NULL),
  ('test_3097', '유재원', NULL),
  ('test_3148', '이재경', NULL),
  ('test_9430', '박종현', NULL),
  ('test_13292', '문영채', NULL),
  ('test_1080', '성대경', NULL),
  ('test_16322', '도시연', NULL),
  ('test_2296', '박용준', NULL),
  ('test_14618', '최병찬', NULL),
  ('test_10384', '이희수', NULL),
  ('test_14614', '최동철', NULL),
  ('test_14906', '박유영', NULL),
  ('test_3212', '전우진', NULL),
  ('test_10352', '어승혜', NULL),
  ('test_5969', '이득우', NULL),
  ('test_13373', '황민효', NULL),
  ('test_15493', '강한철', NULL),
  ('test_7153', '최인아', NULL),
  ('test_13306', '송주엽', NULL),
  ('test_13366', '허수민', NULL),
  ('test_8904', '민경훈', NULL),
  ('test_13324', '이소정', NULL),
  ('test_15092', '이은석', NULL),
  ('test_13354', '정찬선', NULL),
  ('test_2147', '김웅기', NULL),
  ('test_7319', '김나예', NULL)
ON CONFLICT (kakao_id) DO NOTHING;

-- 테스트 주자들 추가 (전부 러너)
INSERT INTO group_members (group_code, kakao_id, bib, role, photo_url)
VALUES 
  ('3174', 'test_2634', '2634', 'runner', '/RunCheer.png'),
  ('3174', 'test_2912', '2912', 'runner', '/RunCheer.png'),
  ('3174', 'test_3097', '3097', 'runner', '/RunCheer.png'),
  ('3174', 'test_3148', '3148', 'runner', '/RunCheer.png'),
  ('3174', 'test_9430', '9430', 'runner', '/RunCheer.png'),
  ('3174', 'test_13292', '13292', 'runner', '/RunCheer.png'),
  ('3174', 'test_1080', '1080', 'runner', '/RunCheer.png'),
  ('3174', 'test_16322', '16322', 'runner', '/RunCheer.png'),
  ('3174', 'test_2296', '2296', 'runner', '/RunCheer.png'),
  ('3174', 'test_14618', '14618', 'runner', '/RunCheer.png'),
  ('3174', 'test_10384', '10384', 'runner', '/RunCheer.png'),
  ('3174', 'test_14614', '14614', 'runner', '/RunCheer.png'),
  ('3174', 'test_14906', '14906', 'runner', '/RunCheer.png'),
  ('3174', 'test_3212', '3212', 'runner', '/RunCheer.png'),
  ('3174', 'test_10352', '10352', 'runner', '/RunCheer.png'),
  ('3174', 'test_5969', '5969', 'runner', '/RunCheer.png'),
  ('3174', 'test_13373', '13373', 'runner', '/RunCheer.png'),
  ('3174', 'test_15493', '15493', 'runner', '/RunCheer.png'),
  ('3174', 'test_7153', '7153', 'runner', '/RunCheer.png'),
  ('3174', 'test_13306', '13306', 'runner', '/RunCheer.png'),
  ('3174', 'test_13366', '13366', 'runner', '/RunCheer.png'),
  ('3174', 'test_8904', '8904', 'runner', '/RunCheer.png'),
  ('3174', 'test_13324', '13324', 'runner', '/RunCheer.png'),
  ('3174', 'test_15092', '15092', 'runner', '/RunCheer.png'),
  ('3174', 'test_13354', '13354', 'runner', '/RunCheer.png'),
  ('3174', 'test_2147', '2147', 'runner', '/RunCheer.png'),
  ('3174', 'test_7319', '7319', 'runner', '/RunCheer.png')
ON CONFLICT (group_code, kakao_id) DO UPDATE SET 
  bib = EXCLUDED.bib,
  role = EXCLUDED.role,
  photo_url = EXCLUDED.photo_url;
