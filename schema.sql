-- RunCheer 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  kakao_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 그룹 테이블
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  event_id INTEGER NOT NULL,
  creator_kakao_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- 대회 종료 후 30일
  CONSTRAINT unique_code UNIQUE (code)
);

-- 그룹 멤버 테이블
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_code VARCHAR(4) NOT NULL,
  kakao_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'runner', -- 'runner' 또는 'supporter'
  bib VARCHAR(10), -- runner인 경우에만 필수
  photo_url TEXT, -- runner인 경우에만 필수 (그룹별로 다른 사진 가능)
  team_name VARCHAR(50),
  joined_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_member_per_group UNIQUE (group_code, kakao_id), -- 같은 그룹 내에서만 중복 방지
  CONSTRAINT unique_bib_in_group UNIQUE (group_code, bib),
  CONSTRAINT fk_group FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (kakao_id) REFERENCES users(kakao_id) ON DELETE CASCADE,
  CONSTRAINT check_runner_required_fields CHECK (
    (role = 'supporter') OR 
    (role = 'runner' AND bib IS NOT NULL AND photo_url IS NOT NULL)
  )
);

-- 이미지 테이블 (Vercel Blob 저장)
CREATE TABLE IF NOT EXISTS runner_images (
  id SERIAL PRIMARY KEY,
  kakao_id VARCHAR(50) NOT NULL,
  group_code VARCHAR(4) NOT NULL,
  blob_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_image UNIQUE (kakao_id, group_code),
  CONSTRAINT fk_image_user FOREIGN KEY (kakao_id) REFERENCES users(kakao_id) ON DELETE CASCADE,
  CONSTRAINT fk_image_group FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);
CREATE INDEX IF NOT EXISTS idx_group_members_group_code ON group_members(group_code);
CREATE INDEX IF NOT EXISTS idx_group_members_kakao_id ON group_members(kakao_id);

-- 자동 삭제 함수 (대회 종료 후 30일)
CREATE OR REPLACE FUNCTION delete_expired_groups()
RETURNS void AS $$
BEGIN
  DELETE FROM groups WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 초기 데이터: 대회 만료일 설정 (필요시)
-- UPDATE groups SET expires_at = '2025-11-02'::timestamp + interval '30 days' WHERE event_id = 133;
-- UPDATE groups SET expires_at = '2025-10-26'::timestamp + interval '30 days' WHERE event_id = 132;
