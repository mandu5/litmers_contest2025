# DATABASE_URL 에러 해결 가이드

**에러:** `Environment variable not found: DATABASE_URL`

이것이 "Authentication configuration error"의 실제 원인입니다.

## 문제 원인

Prisma가 `DATABASE_URL` 환경 변수를 찾지 못해서 발생하는 문제입니다. NextAuth가 PrismaAdapter를 사용하므로, 데이터베이스 연결이 실패하면 인증도 실패합니다.

## 해결 방법

### 1. Vercel 환경 변수 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트: `litmers-contest2025-gp64`

2. **환경 변수 확인**
   - Settings → Environment Variables
   - `DATABASE_URL` 변수가 있는지 확인

3. **DATABASE_URL 설정 (없는 경우)**

   **Supabase 사용 시:**
   ```
   postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **중요 사항:**
   - Connection Pooler 사용 (포트 6543)
   - `?pgbouncer=true` 추가
   - 비밀번호의 특수문자는 URL 인코딩 필요

4. **환경 설정 확인**
   - `DATABASE_URL` 변수의 "Environment" 설정 확인
   - ✅ Production 체크박스가 선택되어 있는지 확인
   - ✅ Preview, Development도 필요에 따라 선택

### 2. DATABASE_URL 형식 확인

올바른 형식:
```
postgresql://username:password@host:port/database?pgbouncer=true
```

예시 (Supabase):
```
postgresql://postgres.abc123:your_password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 3. 환경 변수 추가 후

1. **재배포 필수**
   - 환경 변수 변경 후 자동으로 재배포됩니다
   - 또는 Settings → Deployments → "Redeploy" 클릭

2. **확인 방법**
   - 배포 로그에서 `DATABASE_URL` 관련 에러가 사라졌는지 확인
   - 로그인 페이지에서 에러가 사라졌는지 확인

### 4. 문제가 계속되는 경우

1. **변수 이름 확인**
   - 정확히 `DATABASE_URL` (대소문자 구분)
   - 오타 없이 정확히 입력

2. **값 확인**
   - 연결 문자열이 올바른지 확인
   - 특수문자가 URL 인코딩되었는지 확인
   - 비밀번호에 `@`, `:`, `/` 등이 있으면 인코딩 필요

3. **재배포**
   - Settings → General → Clear Build Cache
   - 수동 재배포

## 확인 체크리스트

- [ ] Vercel에 `DATABASE_URL` 환경 변수가 추가됨
- [ ] `DATABASE_URL`의 Environment가 "Production"으로 설정됨
- [ ] 연결 문자열 형식이 올바름 (`postgresql://...`)
- [ ] Connection Pooler 사용 중 (포트 6543, `?pgbouncer=true`)
- [ ] 재배포 완료됨
- [ ] 배포 로그에 DATABASE_URL 에러가 없음

이렇게 하면 인증 에러가 해결될 것입니다!

