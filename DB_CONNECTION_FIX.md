# 데이터베이스 연결 에러 해결 (포트 5432 → 6543)

**에러:**
```
Can't reach database server at aws-1-ap-south-1.pooler.supabase.com:5432
```

## 문제 원인

현재 `DATABASE_URL`이 **직접 연결(포트 5432)**을 사용하고 있습니다. 하지만 Vercel과 같은 서버리스 환경에서는 **Connection Pooler(포트 6543)**를 사용해야 합니다.

### 왜 Connection Pooler가 필요한가?

- **직접 연결 (5432)**: 연결 수 제한이 있고, 서버리스 환경에서 연결이 끊길 수 있음
- **Connection Pooler (6543)**: 연결을 재사용하여 안정적이고 효율적

## 해결 방법

### 1. Supabase에서 Connection Pooler URL 가져오기

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Connection Pooler URL 복사**
   - Settings → Database
   - "Connection string" 섹션
   - **"Connection pooling"** 탭 선택 (⚠️ 중요!)
   - **"Session mode"** 선택
   - **"URI"** 형식의 연결 문자열 복사

3. **연결 문자열 형식 확인**
   ```
   postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-REGION.pooler.supabase.com:6543/postgres
   ```
   
   **중요 사항:**
   - 포트: **6543** (5432가 아님!)
   - 호스트: `pooler.supabase.com` (pooler 포함)
   - 끝에 `?pgbouncer=true` 추가 필요할 수 있음

### 2. Vercel 환경 변수 업데이트

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트: `litmers-contest2025-gp64`

2. **환경 변수 수정**
   - Settings → Environment Variables
   - `DATABASE_URL` 찾기
   - "Edit" 클릭

3. **새로운 Connection Pooler URL로 변경**

   **변경 전 (잘못된 형식):**
   ```
   postgresql://postgres:password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
   ```

   **변경 후 (올바른 형식):**
   ```
   postgresql://postgres.PROJECT_ID:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **변경 사항:**
   - 포트: `5432` → `6543`
   - 사용자명: `postgres` → `postgres.PROJECT_ID` (프로젝트 ID 포함)
   - 파라미터 추가: `?pgbouncer=true`

### 3. Connection Pooler URL 형식

**올바른 형식:**
```
postgresql://postgres.프로젝트ID:비밀번호@aws-X-지역.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**예시:**
```
postgresql://postgres.abcdefghijklmnop:your_password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. 프로젝트 ID 확인 방법

1. Supabase 대시보드 → Settings → General
2. "Reference ID" 또는 URL에서 확인
3. 또는 기존 연결 문자열에서 추출

### 5. 재배포

1. **환경 변수 저장 후 자동 재배포**
   - Vercel이 자동으로 재배포 시작
   
2. **수동 재배포 (필요 시)**
   - Settings → Deployments
   - 최신 배포의 "..." 메뉴 → "Redeploy"

3. **배포 로그 확인**
   - 배포가 완료되면 로그에서 데이터베이스 연결 에러가 사라졌는지 확인
   - `P1001` 에러가 더 이상 나타나지 않아야 함

## 확인 체크리스트

- [ ] Supabase에서 Connection Pooler 탭 선택
- [ ] Session mode 선택
- [ ] 포트가 **6543**인지 확인
- [ ] 호스트에 `pooler`가 포함되어 있는지 확인
- [ ] 사용자명에 프로젝트 ID가 포함되어 있는지 확인 (`postgres.PROJECT_ID`)
- [ ] `?pgbouncer=true` 파라미터 추가
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] 재배포 완료
- [ ] 배포 로그에서 연결 에러 사라짐

## 추가 확인 사항

### 비밀번호 특수문자 처리

비밀번호에 특수문자(`@`, `:`, `/`, `#`, `?`, `&` 등)가 있으면 URL 인코딩이 필요합니다:

```javascript
// 예시
password: "abc@123#"
인코딩: "abc%40123%23"
```

### 연결 테스트

로컬에서 테스트하려면:

```bash
# .env.local 파일 업데이트
DATABASE_URL="postgresql://postgres.PROJECT_ID:password@aws-X-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma 연결 테스트
npx prisma db push
```

이렇게 하면 데이터베이스 연결 에러가 해결됩니다!

