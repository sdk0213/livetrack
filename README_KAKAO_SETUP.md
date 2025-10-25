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
   - 개발: `http://localhost:3000/`
   - 배포: `https://livetrack-theta.vercel.app/`
   
   **⚠️ 중요: 끝에 슬래시(/)를 반드시 포함해야 합니다!**

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
브라우저에서 `http://localhost:3000/` 접속

### 배포
```bash
vercel --prod
```

배포 후 `https://livetrack-theta.vercel.app/`에서 접속 가능

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
├── index.html                # 메인 HTML (카카오 로그인)
├── test.html                 # 배번 직접 입력 테스트 버전
├── test_mock.html            # 목업 버전
├── js/
│   └── app.js                # 메인 JavaScript (객체지향)
├── api/
│   ├── _lib/
│   │   └── handlers.js       # API 핸들러 모음
│   ├── users/
│   │   ├── [kakaoId].js      # 사용자 CRUD
│   │   └── group.js          # 사용자 그룹 조회
│   ├── groups/
│   │   ├── index.js          # 그룹 생성
│   │   ├── [code].js         # 그룹 조회/삭제
│   │   ├── create-with-member.js  # 그룹+멤버 동시 생성
│   │   ├── join.js           # 그룹 참여
│   │   ├── leave.js          # 그룹 탈퇴
│   │   └── runners.js        # 그룹 멤버 목록
│   ├── images/
│   │   └── upload.js         # 이미지 업로드 (Vercel Blob)
│   └── proxy.js              # 마라톤 데이터 프록시
├── schema.sql                # 데이터베이스 스키마
├── migration_add_role.sql    # 역할 추가 마이그레이션
├── privacy.html              # 개인정보 처리방침
└── README_KAKAO_SETUP.md     # 이 파일
```

---

## ⚠️ 주의사항

1. **카카오 JavaScript 키**는 클라이언트에 노출되어도 안전합니다 (도메인 제한으로 보호됨)
2. **Vercel Postgres**는 무료 티어 제한이 있습니다 (60시간/월)
3. **이미지는 자동으로 압축**되어 저장됩니다 (최대 1200x1200)
4. **그룹 데이터는 대회 종료 후 30일 뒤 자동 삭제**됩니다

---

## 🚀 완료된 기능

✅ 구현 완료:
- ✅ 카카오 로그인/로그아웃
- ✅ 사용자 관리 (생성/조회/수정/삭제)
- ✅ 그룹 생성/참여/탈퇴/삭제
- ✅ 주자/응원자 역할 구분
- ✅ 이미지 업로드 (Vercel Blob Storage)
- ✅ 실시간 위치 추적 (60초 간격)
- ✅ 지도 마커 예상 위치 갱신 (15초 간격)
- ✅ 그룹 멤버 목록 (주자/응원자 구분)
- ✅ 완주자 자동 스킵 (API 최적화)
- ✅ 주자 정보 캐싱 (성능 최적화)
- ✅ 개인정보 처리방침

🎯 프로덕션 배포 준비 완료!

## 📊 주요 기능

### 1. 카카오 로그인 연동
- OAuth 2.0 인증
- 자동 사용자 생성
- 프로필 정보 동기화

### 2. 그룹 관리
- 4자리 랜덤 코드 생성
- 그룹장/멤버 권한 구분
- 그룹 삭제 시 CASCADE로 자동 정리

### 3. 역할 시스템
- **주자**: 배번 + 레디샷 필수
- **응원자**: 정보 불필요

### 4. 실시간 추적
- 60초마다 서버에서 실제 데이터 갱신
- 15초마다 페이스 기반 예상 위치로 마커 이동
- 완주자 자동 스킵으로 API 호출 최소화

### 5. 성능 최적화
- 주자 정보 캐싱 (마커 클릭 시 API 호출 없음)
- 이미지 자동 압축 (품질 80%, 최대 5MB)
- 완주자 API 조회 건너뛰기
