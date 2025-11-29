# Vercel 환경 변수 문제 해결

포트 6543으로 변경했는데도 여전히 포트 5432 에러가 발생하는 경우:

## 가능한 원인들

### 1. 환경(Environment) 설정 확인 ⚠️ 가장 중요!

Vercel에서는 각 환경 변수마다 **어떤 환경에서 사용할지** 설정할 수 있습니다:

- ✅ **Production**: 프로덕션 배포에 사용
- ✅ **Preview**: PR/브랜치 배포에 사용  
- ✅ **Development**: 로컬 개발에 사용

**문제:**
- Production 환경 변수만 설정했는데, Preview 환경에서 실행 중일 수 있음
- 또는 여러 환경에 다른 값이 설정되어 있을 수 있음

**해결:**
1. Vercel → Settings → Environment Variables
2. `DATABASE_URL` 변수 클릭
3. **모든 환경(Production, Preview, Development)에 체크**되어 있는지 확인
4. 각 환경의 값이 모두 포트 6543인지 확인

### 2. 재배포 확인

환경 변수 변경 후:
- 자동 재배포가 트리거되어야 함
- 배포가 완료될 때까지 기다려야 함 (1-2분)
- 배포 로그에서 실제 사용 중인 `DATABASE_URL` 확인

**확인 방법:**
1. Vercel → Deployments → 최신 배포 클릭
2. "Functions" 탭에서 런타임 로그 확인
3. `DATABASE_URL`이 포트 6543을 사용하는지 확인

### 3. 캐시 문제

**해결:**
1. Vercel → Settings → General
2. "Clear Build Cache" 클릭
3. 수동 재배포

### 4. 빌드 타임 vs 런타임

환경 변수는 **런타임**에만 사용됩니다. 빌드 타임에는 사용되지 않습니다.

**확인:**
- Vercel 배포 로그의 "Runtime Logs"에서 확인
- 실제 함수 실행 시의 환경 변수 확인

### 5. 여러 DATABASE_URL 변수 존재

같은 이름의 변수가 여러 개 설정되어 있을 수 있습니다.

**해결:**
1. Settings → Environment Variables
2. `DATABASE_URL` 검색
3. 중복된 변수가 있는지 확인
4. 오래된 변수 삭제

### 6. 지역별 설정

Vercel의 지역별 설정이 다를 수 있습니다.

**확인:**
- Environment Variables 페이지에서 지역 확인

---

## 즉시 확인할 사항

### ✅ 체크리스트

1. **모든 환경에 DATABASE_URL 설정됨**
   - [ ] Production 체크됨
   - [ ] Preview 체크됨  
   - [ ] Development 체크됨 (필요한 경우)

2. **모든 환경의 값이 포트 6543**
   - [ ] Production: `:6543`
   - [ ] Preview: `:6543`
   - [ ] Development: `:6543`

3. **재배포 완료**
   - [ ] 최신 배포 완료됨
   - [ ] 배포 로그 확인함

4. **배포 로그에서 확인**
   - [ ] 런타임 로그에서 포트 6543 사용 확인
   - [ ] 포트 5432 에러가 사라짐

---

## 디버깅 방법

### 1. 환경 변수 값 확인

Vercel 함수에서 환경 변수를 로그로 출력:

```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
```

이 로그는 Vercel → Deployments → Functions 탭에서 확인 가능합니다.

### 2. 실제 사용 중인 URL 확인

배포 로그에서:
- `⚠️ WARNING: DATABASE_URL is using port 5432` 메시지가 보이면 포트 5432 사용 중
- 이 메시지가 없으면 포트 6543 사용 중

### 3. 수동 재배포

1. Settings → Deployments
2. 최신 배포의 "..." 메뉴 → "Redeploy"
3. 배포 완료 후 다시 테스트

---

## 가장 가능성 높은 원인

**Preview 환경 변수가 설정되지 않았을 가능성**

Vercel은 기본적으로:
- Production 배포: Production 환경 변수 사용
- Preview 배포: Preview 환경 변수 사용 (없으면 Production 사용)

**해결:**
Settings → Environment Variables에서 `DATABASE_URL`의 모든 환경 체크박스가 선택되어 있는지 확인하세요!

