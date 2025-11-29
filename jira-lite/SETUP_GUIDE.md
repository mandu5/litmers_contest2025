# 데이터베이스 설정 가이드

## 방법 1: Supabase 사용 (가장 간단, 무료) ⭐ 추천

### 1단계: Supabase 계정 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인 (또는 이메일로 가입)

### 2단계: 새 프로젝트 생성
1. "New Project" 클릭
2. 프로젝트 이름 입력 (예: `jira-lite`)
3. 데이터베이스 비밀번호 설정 (기억해두세요!)
4. 지역 선택 (가장 가까운 지역)
5. "Create new project" 클릭
6. 프로젝트 생성 완료까지 2-3분 대기

### 3단계: 데이터베이스 연결 정보 가져오기
1. 프로젝트 대시보드에서 왼쪽 메뉴의 "Settings" 클릭
2. "Database" 메뉴 클릭
3. "Connection string" 섹션에서 "URI" 탭 선택
4. 연결 문자열 복사 (예: `postgresql://postgres.xxxxx:password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`)

### 4단계: .env.local 파일 업데이트
`.env.local` 파일을 열고 `DATABASE_URL`을 복사한 연결 문자열로 변경:

```env
DATABASE_URL="여기에_복사한_연결_문자열_붙여넣기"
```

**중요**: 연결 문자열에서 `[YOUR-PASSWORD]` 부분을 2단계에서 설정한 비밀번호로 교체하세요!

---

## 방법 2: Neon 사용 (무료, PostgreSQL 전용)

### 1단계: Neon 계정 생성
1. https://neon.tech 접속
2. "Sign Up" 클릭
3. GitHub 계정으로 로그인

### 2단계: 새 프로젝트 생성
1. "Create a project" 클릭
2. 프로젝트 이름 입력
3. 데이터베이스 이름 입력 (기본값 사용 가능)
4. 지역 선택
5. "Create project" 클릭

### 3단계: 연결 문자열 가져오기
1. 프로젝트 대시보드에서 "Connection string" 복사
2. 연결 문자열이 자동으로 생성됨

### 4단계: .env.local 파일 업데이트
위와 동일하게 `DATABASE_URL` 업데이트

---

## 방법 3: 로컬 PostgreSQL 설치 (고급)

### macOS (Homebrew 사용)
```bash
# Homebrew 설치 (없는 경우)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# PostgreSQL 설치
brew install postgresql@15

# PostgreSQL 시작
brew services start postgresql@15

# 데이터베이스 생성
createdb jira_lite

# .env.local 파일 업데이트
DATABASE_URL="postgresql://$(whoami)@localhost:5432/jira_lite"
```

---

## 공통 단계: 데이터베이스 초기화

데이터베이스를 설정한 후, 다음 명령어를 실행하세요:

```bash
# jira-lite 폴더로 이동
cd jira-lite

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 적용
npx prisma db push
```

성공하면 다음과 같은 메시지가 표시됩니다:
```
✔ Generated Prisma Client
✔ Pushed database schema
```

---

## 개발 서버 재시작

```bash
# 현재 실행 중인 서버 중지 (Ctrl + C)
# 그 다음 다시 시작
npm run dev
```

이제 `MissingSecret` 에러가 사라지고 로그인/회원가입이 정상 작동합니다!

---

## 문제 해결

### "Can't reach database server" 에러
- `.env.local`의 `DATABASE_URL`이 올바른지 확인
- 데이터베이스 서버가 실행 중인지 확인
- 방화벽 설정 확인

### "Authentication failed" 에러
- 비밀번호가 올바른지 확인
- 연결 문자열의 특수문자가 URL 인코딩되었는지 확인

### Prisma 에러
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 재초기화 (주의: 기존 데이터 삭제됨)
npx prisma db push --force-reset
```

