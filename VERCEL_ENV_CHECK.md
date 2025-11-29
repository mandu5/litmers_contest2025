# Vercel 환경 변수 확인 가이드

프로덕션에서 "Authentication configuration error"가 발생하는 경우, 다음 환경 변수가 Vercel에 제대로 설정되어 있는지 확인하세요.

## 필수 환경 변수 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택: `litmers-contest2025-gp64`

2. **환경 변수 확인**
   - Settings → Environment Variables

3. **필수 환경 변수 목록**

### 🔴 필수 (반드시 설정 필요)

- `AUTH_SECRET`
  - 생성 방법: `openssl rand -base64 32`
  - 또는 터미널에서 실행하여 생성
  - 예시: `mcKvZ6lhmmc5FHy+i5he67LVRs8gPCQ4wA4xx9s5BSM=`

- `NEXTAUTH_URL`
  - 값: `https://litmers-contest2025-gp64.vercel.app`
  - 또는 실제 배포된 URL

- `DATABASE_URL`
  - PostgreSQL 연결 문자열
  - 예시: `postgresql://user:password@host:port/database?pgbouncer=true`

### 🟡 권장 (필요에 따라 설정)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY` (AI 기능 사용 시)
- `RESEND_API_KEY` (이메일 기능 사용 시)
- `NEXT_PUBLIC_APP_URL` (NEXTAUTH_URL과 동일하게 설정)

## 환경 변수 설정 후

1. **재배포 필요**
   - 환경 변수 변경 후 자동으로 재배포됩니다
   - 또는 Settings → Deployments에서 "Redeploy" 클릭

2. **확인 방법**
   - Vercel 대시보드 → Deployments → 최신 배포의 Logs 확인
   - `AUTH_SECRET` 관련 에러가 있는지 확인

## 문제 해결

### AUTH_SECRET이 설정되어 있는데도 에러가 발생하는 경우

1. **환경 변수 이름 확인**
   - 정확히 `AUTH_SECRET` (대소문자 구분)
   - 오타 없이 정확히 입력

2. **재배포 확인**
   - 환경 변수 추가/수정 후 재배포가 완료되었는지 확인
   - 배포 로그에서 환경 변수가 로드되었는지 확인

3. **캐시 삭제**
   - Vercel → Settings → General → Clear Build Cache
   - 재배포

### 로컬에서는 작동하는데 프로덕션에서만 에러가 나는 경우

- 로컬의 `.env.local` 파일을 확인
- Vercel에 동일한 환경 변수들이 설정되어 있는지 확인
- 특히 `AUTH_SECRET`과 `NEXTAUTH_URL`이 제대로 설정되어 있는지 확인

