# RunCheer - 카카오톡 연동 크루 응원 시스템 설정 가이드

## 📋 필요한 것들

1. **카카오 개발자 계정**
2. **Vercel 계정**
3. **Vercel Postgres 데이터베이스**
4. **Vercel Blob Storage**

---

## 1️⃣ 카카오 개발자 앱 설정

### 1. 앱 생성
1. https://developers.kakao.com/ 접속
2. 로그인 후 "내 애플리케이션" 클릭
3. "애플리케이션 추가하기" 클릭
4. 앱 이름: `RunCheer` (원하는 이름)
5. 회사명: 개인 또는 회사명 입력

### 2. 플랫폼 등록
1. 생성된 앱 선택
2. 좌측 메뉴 "플랫폼" 클릭
3. "Web 플랫폼 등록" 클릭
4. 사이트 도메인 입력:
   - 개발: `http://localhost:3000`
   - 배포: `https://your-domain.vercel.app`

### 3. 카카오 로그인 활성화
1. 좌측 메뉴 "카카오 로그인" 클릭
2. "카카오 로그인 활성화" ON
3. Redirect URI 등록:
   - `http://localhost:3000`
   - `https://your-domain.vercel.app`

### 4. 동의 항목 설정
1. "동의 항목" 메뉴 클릭
2. 필수 동의 항목:
   - 닉네임 (필수)
   - 프로필 이미지 (선택)

### 5. JavaScript 키 복사
1. "앱 키" 메뉴 클릭
2. **JavaScript 키** 복사 (나중에 사용)

---

## 2️⃣ Vercel 프로젝트 설정

### 1. Vercel에 프로젝트 배포
```bash
# Vercel CLI 설치 (처음 한 번만)
npm i -g vercel

# 프로젝트 배포
vercel
```

### 2. Vercel Postgres 설정
1. Vercel 대시보드에서 프로젝트 선택
2. "Storage" 탭 클릭
3. "Create Database" > "Postgres" 선택
4. 데이터베이스 이름 입력 후 생성
5. "Connect" 클릭하여 연결

### 3. 데이터베이스 테이블 생성
```bash
# Vercel Postgres CLI 사용
vercel env pull .env.local
```

그 다음 Vercel 대시보드의 Storage > Postgres > "Query" 탭에서 `schema.sql` 내용을 복사하여 실행

### 4. Vercel Blob Storage 설정
1. Vercel 대시보드 > Storage > "Create Database"
2. "Blob" 선택
3. 이름 입력 후 생성

---

## 3️⃣ 환경 변수 설정

### Vercel 프로젝트 환경 변수 추가
1. Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
2. 다음 변수 추가:

```
KAKAO_JS_KEY=your_kakao_javascript_key
POSTGRES_URL=자동_생성됨
BLOB_READ_WRITE_TOKEN=자동_생성됨
```

### 로컬 개발 환경 (.env.local)
```bash
# .env.local 파일 생성
KAKAO_JS_KEY=your_kakao_javascript_key
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_user
POSTGRES_HOST=your_host
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=your_database
BLOB_READ_WRITE_TOKEN=your_blob_token
```

---

## 4️⃣ 코드 설정

### js/app.js 파일 수정
```javascript
const CONFIG = {
  KAKAO_JS_KEY: 'YOUR_KAKAO_JS_KEY_HERE', // 카카오 JavaScript 키 입력
  API_BASE: '/api',
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,
  IMAGE_QUALITY: 0.8,
  CACHE_DURATION: 3 * 60 * 60 * 1000
};
```

---

## 5️⃣ 배포 및 테스트

### 로컬 테스트
```bash
vercel dev
```
브라우저에서 `http://localhost:3000/test_kakao.html` 접속

### 배포
```bash
vercel --prod
```

---

## 📱 사용 흐름

1. **카카오톡 로그인**
   - 사용자가 카카오톡으로 로그인
   - 자동으로 사용자 정보 저장

2. **그룹 생성 또는 참여**
   - 새 그룹 만들기: 이름 + 대회 선택
   - 코드로 참여: 4자리 코드 입력

3. **주자 정보 등록**
   - 배번 입력
   - 사진 업로드 (자동 압축)

4. **응원하기**
   - 그룹 추적 시작
   - 실시간 위치 확인

---

## 🗂️ 파일 구조

```
livetrack/
├── test_kakao.html          # 메인 HTML
├── js/
│   └── app.js                # 메인 JavaScript (객체지향)
├── api/
│   ├── users/
│   │   └── [kakaoId].js      # 사용자 API
│   ├── groups/
│   │   ├── index.js          # 그룹 생성 API
│   │   └── [code].js         # 그룹 조회 API
│   └── images/
│       └── upload.js         # 이미지 업로드 API (TODO)
├── schema.sql                # 데이터베이스 스키마
└── README_KAKAO_SETUP.md     # 이 파일
```

---

## ⚠️ 주의사항

1. **카카오 JavaScript 키**는 클라이언트에 노출되어도 안전합니다 (도메인 제한으로 보호됨)
2. **Vercel Postgres**는 무료 티어 제한이 있습니다 (60시간/월)
3. **이미지는 자동으로 압축**되어 저장됩니다 (최대 1200x1200)
4. **그룹 데이터는 대회 종료 후 30일 뒤 자동 삭제**됩니다

---

## 🚀 다음 단계

아직 구현되지 않은 기능:
- [ ] 이미지 업로드 API (`/api/images/upload.js`)
- [ ] 그룹 참여 API (`/api/groups/[code]/join.js`)
- [ ] 그룹 탈퇴 API (`/api/groups/[code]/leave.js`)
- [ ] 그룹 주자 목록 API (`/api/groups/[code]/runners.js`)
- [ ] 실시간 추적 기능 통합

계속 구현하시겠습니까?
