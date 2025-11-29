# Authentication Configuration Error 디버깅 가이드

프로덕션에서 "Authentication configuration error"가 계속 발생하는 경우, 다음 단계로 실제 에러 원인을 파악하세요.

## 1. Vercel 배포 로그 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트: `litmers-contest2025-gp64`

2. **최신 배포 로그 확인**
   - Deployments → 최신 배포 클릭
   - "Functions" 또는 "Runtime Logs" 탭 확인
   - 다음 키워드로 검색:
     - `NextAuth`
     - `AUTH_SECRET`
     - `Configuration`
     - `Error`

3. **확인할 내용**
   - `❌ NextAuth GET error:` 또는 `❌ NextAuth POST error:` 로그
   - `Environment check:` 로그 (환경 변수 상태)
   - 실제 에러 메시지와 스택 트레이스

## 2. 가능한 원인들

### 원인 1: PrismaAdapter 데이터베이스 연결 실패

**증상:**
- 로그에 `PrismaClient` 또는 `database` 관련 에러
- `DATABASE_URL`은 설정되어 있음

**해결:**
- `DATABASE_URL` 형식 확인
- Connection Pooler 사용 중인지 확인 (`?pgbouncer=true`)
- 데이터베이스 서버가 접근 가능한지 확인

### 원인 2: NextAuth 초기화 시 에러

**증상:**
- 모듈 import 시 에러 발생
- 빌드는 성공하지만 런타임 에러

**해결:**
- Vercel 로그에서 실제 에러 메시지 확인
- 환경 변수가 런타임에 제대로 로드되는지 확인

### 원인 3: 환경 변수 로드 타이밍 문제

**증상:**
- 환경 변수는 설정되어 있지만 코드에서 `undefined`
- 빌드 타임과 런타임 차이

**해결:**
- Vercel 환경 변수의 "Environment" 설정 확인 (Production, Preview, Development)
- 모든 환경에 동일한 변수가 설정되어 있는지 확인

## 3. 즉시 확인할 사항

### Vercel 환경 변수 재확인

다음 명령어로 환경 변수 확인:

```bash
# Vercel CLI 사용 시
vercel env ls
```

또는 Vercel 대시보드에서:
- Settings → Environment Variables
- 각 변수의 "Environment" 설정 확인:
  - ✅ Production
  - ✅ Preview  
  - ✅ Development

### 필수 환경 변수 체크리스트

- [ ] `AUTH_SECRET` - Production 환경에 설정됨
- [ ] `DATABASE_URL` - Production 환경에 설정됨
- [ ] `NEXTAUTH_URL` - `localhost`가 아닌 프로덕션 URL 또는 삭제됨
- [ ] `GOOGLE_CLIENT_ID` - Production 환경에 설정됨
- [ ] `GOOGLE_CLIENT_SECRET` - Production 환경에 설정됨

## 4. 에러 로그 해석

최신 코드에는 상세한 에러 로깅이 포함되어 있습니다. Vercel 로그에서 다음을 확인하세요:

```
❌ NextAuth POST error: [실제 에러 메시지]
Error stack: [스택 트레이스]
Environment check: {
  hasAUTH_SECRET: true/false,
  hasNEXTAUTH_URL: true/false,
  hasDATABASE_URL: true/false,
  nodeEnv: 'production',
  vercelUrl: '...'
}
```

이 정보를 통해 정확한 문제를 파악할 수 있습니다.

## 5. 빠른 해결 방법

1. **환경 변수 재설정**
   - Vercel에서 모든 환경 변수 삭제 후 재추가
   - "Environment"를 "Production, Preview, Development" 모두 선택

2. **캐시 삭제 및 재배포**
   - Settings → General → Clear Build Cache
   - 수동으로 재배포

3. **로그 확인 후 공유**
   - Vercel 로그의 실제 에러 메시지를 확인
   - 에러 메시지를 공유하면 더 정확한 해결책 제시 가능

