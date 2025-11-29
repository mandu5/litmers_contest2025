# PgBouncer Prepared Statement 에러 해결

**에러:**
```
prepared statement "s2" already exists
ConnectorError: PostgresError { code: "42P05", message: "prepared statement \"s2\" already exists" }
```

## 문제 원인

Prisma가 Connection Pooler (PgBouncer)와 함께 작동할 때 prepared statement를 사용하려고 시도하지만, PgBouncer는 prepared statement를 제대로 지원하지 않아 발생하는 문제입니다.

## 해결 방법

### 1. DATABASE_URL에 PgBouncer 파라미터 확인

`DATABASE_URL`에 다음 파라미터들이 포함되어 있어야 합니다:

```
postgresql://postgres.PROJECT_ID:password@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**필수 파라미터:**
- `?pgbouncer=true` - Prisma가 prepared statement를 비활성화하도록 지시
- `&connection_limit=1` - 서버리스 환경에 적합한 연결 제한

### 2. Vercel 환경 변수 확인 및 수정

1. **Vercel 대시보드** → Settings → Environment Variables
2. **`DATABASE_URL`** 찾기 → Edit
3. **연결 문자열 끝에 파라미터 추가**:

   **현재:**
   ```
   postgresql://postgres.PROJECT_ID:password@...pooler.supabase.com:6543/postgres
   ```
   
   **변경 후:**
   ```
   postgresql://postgres.PROJECT_ID:password@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

4. **Save** 클릭
5. **재배포** (자동으로 시작됨)

### 3. Supabase Connection Pooler 설정 확인

Supabase에서 Connection Pooler를 **Session mode**로 설정했는지 확인:

1. Supabase Dashboard → Settings → Database
2. **Connection pooling** 탭 선택
3. **Session mode** 선택 (Transaction mode가 아님!)
4. URI 복사

### 4. 코드 수정

코드에서 자동으로 PgBouncer 파라미터를 추가하도록 수정했습니다 (`src/lib/db.ts`):
- `?pgbouncer=true` 자동 추가
- `&connection_limit=1` 자동 추가

하지만 Vercel 환경 변수에 이미 올바른 파라미터가 설정되어 있는 것이 가장 확실합니다.

## 확인 체크리스트

- [ ] `DATABASE_URL`에 `?pgbouncer=true` 포함
- [ ] `DATABASE_URL`에 `&connection_limit=1` 포함 (선택 사항이지만 권장)
- [ ] Supabase Connection Pooler가 **Session mode**로 설정됨
- [ ] 포트가 **6543** (Connection Pooler)
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] 재배포 완료
- [ ] 에러 해결 확인

## 추가 참고사항

### Session mode vs Transaction mode

- **Session mode**: Prepared statement 사용 가능 (권장)
- **Transaction mode**: Prepared statement 사용 불가 (Prisma와 호환성 문제)

Prisma와 함께 사용할 때는 **Session mode**를 사용해야 합니다.

### Connection Limit

서버리스 환경에서는 `connection_limit=1`을 설정하는 것이 권장됩니다:
- 각 함수 실행마다 하나의 연결만 사용
- 연결 풀 오버플로우 방지

## 문제가 계속되는 경우

1. **Supabase 설정 재확인**
   - Connection Pooler가 Session mode인지 확인
   - 올바른 포트 (6543) 사용 확인

2. **환경 변수 재설정**
   - 기존 `DATABASE_URL` 삭제 후 재추가
   - 모든 파라미터 포함하여 정확히 입력

3. **캐시 삭제 및 재배포**
   - Vercel → Settings → General → Clear Build Cache
   - 수동 재배포

이렇게 하면 prepared statement 에러가 해결됩니다!

