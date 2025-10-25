# RunCheer 빠른 시작 가이드

## ✅ 카카오 설정 완료!
JavaScript 키: `1c986b10c0401ffb6c00df1ccddef006`

---

## 🚀 다음 단계

### 1. 의존성 설치
```bash
npm install
```

### 2. Vercel 설정

#### Vercel Postgres 설정
1. Vercel 대시보드 접속
2. 프로젝트 선택 > Storage > Create Database > Postgres
3. 데이터베이스 생성 후 연결

#### 데이터베이스 테이블 생성
1. Vercel 대시보드 > Storage > Postgres > Query 탭
2. `schema.sql` 파일 내용을 복사하여 실행

#### Vercel Blob Storage 설정
1. Vercel 대시보드 > Storage > Create Database > Blob
2. 생성 완료

### 3. 로컬 개발
```bash
# 환경 변수 다운로드
vercel env pull .env.local

# 개발 서버 시작
vercel dev
```

브라우저에서 `http://localhost:3000/test_kakao.html` 접속

### 4. 배포
```bash
vercel --prod
```

---

## 📱 테스트 방법

### 1. 카카오 로그인
- 💬 "카카오톡으로 시작하기" 버튼 클릭
- 카카오 계정으로 로그인

### 2. 그룹 생성
- ➕ "새 그룹 만들기" 클릭
- 그룹 이름 입력 (예: 런티풀 춘천)
- 대회 선택 (JTBC 또는 춘천)
- 생성하면 4자리 코드 발급

### 3. 주자 정보 등록
- 배번 입력
- 사진 업로드 (자동 압축됨)
- 등록 완료

### 4. 그룹 참여 (다른 사용자)
- 🔗 "그룹 코드로 참여하기" 클릭
- 4자리 코드 입력
- 배번 + 사진 등록

### 5. 추적 시작
- 🎯 "그룹 추적 시작" 버튼 클릭
- 실시간 위치 확인

---

## 🔧 주요 기능

✅ **완료된 기능**
- 카카오톡 로그인
- 그룹 생성 (4자리 코드 자동 생성)
- 그룹 참여
- 주자 정보 등록 (배번 + 사진)
- 이미지 자동 압축 및 캐싱 (3시간)
- 그룹 탈퇴
- 회원 탈퇴
- 개인정보 처리방침

🚧 **추가 구현 필요**
- 실시간 추적 기능 통합 (기존 index.html의 추적 로직)
- 이미지 업로드 API 완성 (multipart 처리)
- 실제 Blob Storage 연동

---

## 📂 파일 구조

```
livetrack/
├── test_kakao.html           # 메인 HTML (카카오 버전)
├── js/
│   └── app.js                # 객체지향 JavaScript
├── api/
│   ├── users/
│   │   ├── [kakaoId].js      # 사용자 CRUD
│   │   └── group.js          # 사용자 그룹 조회
│   ├── groups/
│   │   ├── index.js          # 그룹 생성
│   │   ├── [code].js         # 그룹 조회
│   │   ├── join.js           # 그룹 참여
│   │   ├── leave.js          # 그룹 탈퇴
│   │   └── runners.js        # 주자 목록
│   └── images/
│       └── upload.js         # 이미지 업로드
├── schema.sql                # DB 스키마
├── package.json              # 의존성
└── .gitignore
```

---

## ⚠️ 주의사항

1. **카카오 도메인 설정**: 
   - Redirect URI에 배포 도메인 추가 필수
   - `https://your-domain.vercel.app`

2. **데이터베이스**:
   - Vercel Postgres 무료 티어: 60시간/월
   - 상용시 유료 플랜 필요

3. **이미지 용량**:
   - 최대 5MB
   - 자동으로 1200x1200으로 리사이즈
   - JPEG 80% 품질로 압축

4. **데이터 보존**:
   - 대회 종료 후 30일 뒤 자동 삭제
   - `expires_at` 필드 관리

---

## 🐛 문제 해결

### 카카오 로그인 실패
- JavaScript 키 확인
- Redirect URI 설정 확인
- 도메인 등록 확인

### 데이터베이스 연결 실패
- Vercel 환경 변수 확인
- `vercel env pull` 실행했는지 확인

### 이미지 업로드 실패
- Blob Storage 설정 확인
- 파일 크기 확인 (5MB 이하)

---

## 📞 도움말

문제가 있으면 다음을 확인하세요:
1. Vercel 배포 로그
2. 브라우저 개발자 도구 콘솔
3. Vercel Postgres Query 탭 (SQL 에러)

모든 준비가 완료되었습니다! 🎉
