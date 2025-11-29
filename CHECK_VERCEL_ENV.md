# Vercel 환경 변수 확인 체크리스트

이미 포트 6543으로 변경했는데도 에러가 발생하는 경우:

## 즉시 확인할 사항

### 1. 환경(Environment) 설정 확인 ⚠️ 가장 중요!

Vercel에서 각 환경 변수마다 **어떤 환경에서 사용할지** 선택할 수 있습니다:

1. **Vercel 대시보드** → Settings → Environment Variables
2. **`DATABASE_URL` 변수 클릭**
3. 다음 체크박스 확인:
   - ✅ **Production** (프로덕션 배포)
   - ✅ **Preview** (PR/브랜치 배포) ← 이게 누락될 수 있음!
   - ✅ **Development** (로컬 개발, 선택 사항)

**문제:**
- Production에만 설정하고 Preview 환경에서 실행되면 오래된 값이 사용될 수 있음
- 또는 Preview 환경에 포트 5432가 설정되어 있을 수 있음

**해결:**
- 모든 환경(Production, Preview)의 `DATABASE_URL` 값이 포트 **6543**인지 확인
- Preview 환경 변수도 포트 6543으로 설정

### 2. 실제 사용 중인 값 확인

Vercel 배포 로그에서 실제 사용 중인 `DATABASE_URL` 확인:

1. **Vercel → Deployments → 최신 배포 클릭**
2. **"Runtime Logs" 또는 "Functions" 탭** 확인
3. 다음 로그 찾기:
   ```
   ⚠️ WARNING: DATABASE_URL is using port 5432
   Current URL: postgresql://...
   ```
   
   또는
   
   ```
   Can't reach database server at ...:5432
   ```

**이 로그가 보이면:**
- 실제로 포트 5432가 사용되고 있음
- 환경 변수가 제대로 로드되지 않았거나, 다른 값이 설정되어 있음

### 3. 재배포 확인

환경 변수 변경 후:

1. **재배포가 완료되었는지 확인**
   - Deployments 탭에서 최신 배포 상태 확인
   - "Ready" 또는 "Building" 상태 확인

2. **배포 완료 후 기다리기**
   - 환경 변수 변경 후 재배포까지 1-2분 소요
   - 재배포가 완료될 때까지 기다리기

3. **수동 재배포**
   - Settings → Deployments
   - 최신 배포의 "..." 메뉴 → "Redeploy"

### 4. 캐시 문제

빌드 캐시가 문제일 수 있습니다:

1. **Settings → General**
2. **"Clear Build Cache" 클릭**
3. **수동 재배포**

### 5. 여러 DATABASE_URL 변수

같은 이름의 변수가 여러 개 설정되어 있을 수 있습니다:

1. Settings → Environment Variables
2. `DATABASE_URL` 검색
3. 중복된 변수가 있는지 확인
4. 오래된 변수 삭제

---

## 확인 순서

1. ✅ **모든 환경에 포트 6543 설정 확인**
   - Production: `:6543`
   - Preview: `:6543`

2. ✅ **재배포 완료 확인**
   - 최신 배포 상태 확인

3. ✅ **배포 로그 확인**
   - Runtime Logs에서 포트 확인
   - 포트 5432 에러가 사라졌는지 확인

4. ✅ **캐시 삭제 및 재배포**
   - Build Cache 삭제
   - 수동 재배포

---

## 디버깅

Vercel 배포 로그에서 실제 사용 중인 `DATABASE_URL` 확인:

```
⚠️ WARNING: DATABASE_URL is using port 5432
Current URL: postgresql://...:5432/...
```

이 메시지가 보이면 → 환경 변수가 포트 5432를 사용 중

이 메시지가 안 보이면 → 포트 6543 사용 중 (다른 문제일 수 있음)

---

## 가장 가능성 높은 원인

**Preview 환경 변수가 포트 5432로 설정되어 있거나, Preview 환경에서 실행 중인데 Preview 환경 변수가 설정되지 않은 경우**

**해결:**
Settings → Environment Variables에서 `DATABASE_URL`의 **모든 환경(Production, Preview)**에 포트 6543이 설정되어 있는지 확인하세요!

