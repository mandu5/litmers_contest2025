# 🚨 긴급: 포트 5432 에러 해결

**에러 메시지:**
```
Can't reach database server at aws-1-ap-south-1.pooler.supabase.com:5432
```

## ⚡ 즉시 해결 방법

현재 Vercel의 `DATABASE_URL`이 **포트 5432 (직접 연결)**를 사용하고 있습니다. **포트 6543 (Connection Pooler)**로 변경해야 합니다.

### 1단계: Supabase에서 올바른 연결 문자열 가져오기

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Connection Pooler 탭으로 이동**
   - Settings → Database
   - **"Connection pooling"** 탭 클릭 ⚠️ (중요: "Connection string" 탭이 아님!)
   - **"Session mode"** 선택
   - **"URI"** 탭에서 연결 문자열 복사

3. **올바른 형식 확인**
   ```
   postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-REGION.pooler.supabase.com:6543/postgres
   ```
   - ✅ 포트: **6543** (5432가 아님!)
   - ✅ 호스트에 `pooler` 포함
   - ✅ 끝에 `?pgbouncer=true` 추가

### 2단계: Vercel 환경 변수 업데이트

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트: `litmers-contest2025-gp64` 선택

2. **환경 변수 수정**
   - Settings → Environment Variables
   - `DATABASE_URL` 찾기 → "Edit" 클릭

3. **포트 변경**
   
   **현재 (잘못된 형식):**
   ```
   postgresql://...@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
   ```
   
   **변경 후 (올바른 형식):**
   ```
   postgresql://postgres.PROJECT_ID:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   
   **변경 사항:**
   - `:5432` → `:6543` (포트 변경)
   - `postgres:` → `postgres.PROJECT_ID:` (프로젝트 ID 추가)
   - 끝에 `?pgbouncer=true` 추가

### 3단계: 재배포

환경 변수 저장 후 Vercel이 자동으로 재배포합니다. 배포 로그에서 에러가 사라졌는지 확인하세요.

---

## 🔍 현재 설정 확인 방법

현재 `DATABASE_URL`이 포트 5432를 사용하는지 확인:

1. Vercel → Settings → Environment Variables
2. `DATABASE_URL` 값 확인
3. `:5432`가 포함되어 있으면 → 포트 6543으로 변경 필요

---

## 📋 체크리스트

- [ ] Supabase에서 Connection Pooler 탭 사용
- [ ] 포트 6543 확인
- [ ] 사용자명에 프로젝트 ID 포함 (`postgres.PROJECT_ID`)
- [ ] `?pgbouncer=true` 추가
- [ ] Vercel 환경 변수 업데이트
- [ ] 재배포 완료
- [ ] 에러 해결 확인

이렇게 하면 데이터베이스 연결 에러가 해결됩니다!

