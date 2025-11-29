# ⚡ 지금 바로 해결하기

**현재 에러:**
```
Can't reach database server at aws-1-ap-south-1.pooler.supabase.com:5432
```

## 🔧 3단계로 해결

### 1️⃣ Supabase에서 Connection Pooler URL 가져오기

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. **Settings → Database** 클릭
4. **"Connection pooling"** 탭 선택 ⚠️ (중요!)
5. **"Session mode"** 선택
6. **"URI"** 탭의 연결 문자열 복사
   - 포트가 **6543**인지 확인 (5432 아님!)

### 2️⃣ Vercel 환경 변수 수정

1. https://vercel.com/dashboard 접속
2. 프로젝트 **`litmers-contest2025-gp64`** 선택
3. **Settings → Environment Variables** 클릭
4. **`DATABASE_URL`** 찾아서 **"Edit"** 클릭
5. 포트 변경:
   - 찾기: `:5432`
   - 변경: `:6543`
   - 끝에 `?pgbouncer=true` 추가 (없으면)
   - 사용자명: `postgres:` → `postgres.PROJECT_ID:` (프로젝트 ID 포함)
6. **"Save"** 클릭

**올바른 형식:**
```
postgresql://postgres.PROJECT_ID:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 3️⃣ 재배포

- 환경 변수 저장 시 자동 재배포
- 배포 완료 후 로그인 다시 시도

---

## ✅ 확인 방법

배포가 완료되면:
1. 로그인 페이지에서 에러가 사라졌는지 확인
2. Vercel 배포 로그에서 포트 5432 에러가 사라졌는지 확인

---

## 📞 문제가 계속되면

1. Vercel → Settings → Environment Variables에서 `DATABASE_URL` 값 확인
2. `:6543`이 포함되어 있는지 확인
3. Supabase에서 복사한 연결 문자열과 일치하는지 확인

**이것만 하면 해결됩니다!**

