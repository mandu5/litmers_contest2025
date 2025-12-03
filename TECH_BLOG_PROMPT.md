# Jira Lite 프로젝트 기술 블로그 작성 프롬프트

## 📋 프로젝트 개요

**Jira Lite**는 AI 기반 이슈 트래킹 웹 애플리케이션으로, Litmers Vibe Coding Contest 2025를 위해 개발되었습니다. Next.js 14, TypeScript, Prisma, PostgreSQL을 기반으로 구축되었으며, OpenAI API를 활용한 다양한 AI 기능을 제공합니다.

---

## 🎯 기술 블로그 작성 가이드

### 1. 프로젝트 소개 및 배경

**작성 포인트:**
- Litmers Vibe Coding Contest 2025 참가 배경
- 8시간 제한 내 MVP 개발 도전
- AI-Native 개발 역량 평가 목표
- Jira와 유사하지만 경량화된 이슈 트래킹 도구의 필요성

**핵심 메시지:**
> "제한된 시간 내에 AI 기능을 완전히 통합한 프로덕션 레벨의 이슈 트래킹 시스템을 구축하는 것이 목표였습니다."

---

### 2. 기술 스택 선택 이유

#### 2.1 프론트엔드: Next.js 14 (App Router)

**선택 이유:**
- **서버 컴포넌트**: 초기 로딩 성능 최적화
- **API Routes**: 별도 백엔드 서버 없이 풀스택 개발 가능
- **타입 안정성**: TypeScript와의 완벽한 통합
- **배포 편의성**: Vercel 원클릭 배포

**구현 특징:**
- Route Groups `(auth)`, `(dashboard)`를 활용한 레이아웃 분리
- Server Components와 Client Components의 적절한 분리
- React Server Actions를 활용한 폼 처리

#### 2.2 데이터베이스: PostgreSQL + Prisma ORM

**선택 이유:**
- **타입 안전성**: Prisma의 TypeScript 타입 생성
- **관계형 데이터**: 팀-프로젝트-이슈의 복잡한 관계 모델링
- **마이그레이션**: Prisma Migrate를 통한 스키마 버전 관리
- **Soft Delete**: `deletedAt` 필드를 통한 논리적 삭제 구현

**스키마 설계 하이라이트:**
```prisma
// 다대다 관계, 인덱싱, Soft Delete 패턴
model Issue {
  deletedAt DateTime? // Soft Delete
  @@index([projectId, status]) // 복합 인덱스
}
```

#### 2.3 인증: NextAuth.js v5

**선택 이유:**
- **다중 인증 방식**: Credentials + Google OAuth 동시 지원
- **세션 관리**: JWT 기반 세션 (24시간 만료)
- **Prisma Adapter**: 데이터베이스와의 자동 동기화
- **타입 확장**: Session 타입에 커스텀 필드 추가

**구현 특징:**
- 이메일/비밀번호와 Google OAuth를 별도 계정으로 처리
- `bcryptjs`를 통한 비밀번호 해싱
- 세션 콜백에서 사용자 ID 및 Provider 정보 주입

#### 2.4 AI 통합: OpenAI API (GPT-3.5 Turbo)

**선택 이유:**
- **비용 효율성**: GPT-3.5 Turbo의 합리적인 가격
- **응답 속도**: 빠른 응답 시간
- **다양한 기능**: 요약, 제안, 분류, 유사도 분석 등

**구현 특징:**
- Rate Limiting (분당 10회, 일당 100회)
- 결과 캐싱 및 자동 무효화
- 에러 핸들링 및 폴백 처리

#### 2.5 이메일: Resend

**선택 이유:**
- **개발자 친화적**: 간단한 API
- **HTML 이메일**: 템플릿 기반 이메일 발송
- **비용 효율성**: 무료 티어 제공

---

### 3. 핵심 기능 구현 상세

#### 3.1 AI 기능 구현

**3.1.1 AI 요약 생성 (AI Summary)**

**구현 방식:**
```typescript
// 캐싱 메커니즘
if (issue.aiSummary && issue.aiSummaryCachedAt) {
  return cachedSummary; // DB에서 캐시된 결과 반환
}

// description 수정 시 캐시 무효화
if (descriptionChanged) {
  aiSummaryCachedAt = null;
}
```

**프롬프트 엔지니어링:**
- System Prompt: "2-4문장의 간결한 요약 제공"
- Temperature: 0.5 (일관성과 창의성의 균형)
- Max Tokens: 200 (비용 절감)

**3.1.2 AI 자동 라벨 추천 (Auto-Label)**

**구현 방식:**
1. 프로젝트의 기존 라벨 목록을 AI에 제공
2. 이슈 제목과 설명을 분석
3. JSON 배열로 최대 3개 라벨 반환
4. 사용자가 수락/거부 선택

**프롬프트 전략:**
- Temperature: 0.3 (낮은 값으로 일관성 확보)
- JSON 파싱을 위한 정규식 처리
- 대소문자 무시 매칭

**3.1.3 중복 이슈 탐지 (Duplicate Detection)**

**구현 방식:**
- 최근 20개 이슈와 유사도 비교
- 50% 이상 유사도만 반환
- 최대 3개 유사 이슈 제시

**3.1.4 Rate Limiting 구현**

**데이터베이스 기반 Rate Limiting:**
```typescript
// 일일 사용량 추적
model AIUsage {
  userId String
  date   DateTime @db.Date
  count  Int
  @@unique([userId, date])
}
```

**제한 정책:**
- 분당 10회: 최근 1분간의 요청 수 체크
- 일당 100회: 당일 사용량 추적
- 제한 초과 시 429 에러 및 리셋 시간 안내

**3.1.5 캐싱 전략**

**캐시 무효화 조건:**
- 이슈 설명 수정 → AI Summary/Suggestion 캐시 무효화
- 새 댓글 추가 → AI Comment Summary 캐시 무효화
- 캐시된 결과는 DB에 저장하여 재사용

---

#### 3.2 칸반 보드 구현

**기술 스택:**
- `@hello-pangea/dnd`: React DnD 라이브러리
- 드래그 앤 드롭으로 이슈 상태 변경
- 같은 컬럼 내 순서 변경 (`position` 필드)

**구현 특징:**
- 커스텀 상태 지원 (기본 3개 + 최대 5개)
- WIP Limit (Work In Progress Limit) 설정
- 실시간 상태 업데이트

---

#### 3.3 인증 시스템

**3.3.1 이메일/비밀번호 인증**

**보안 구현:**
- `bcryptjs`로 비밀번호 해싱 (salt rounds: 10)
- 이메일 중복 체크
- Soft Delete된 계정 로그인 방지

**3.3.2 Google OAuth**

**구현 방식:**
- NextAuth.js의 Google Provider 활용
- 별도 계정으로 처리 (이메일/비밀번호 계정과 병합 안 함)
- 자동 회원가입 처리

**3.3.3 비밀번호 재설정**

**플로우:**
1. 이메일 입력 → 토큰 생성 (1시간 만료)
2. Resend로 이메일 발송
3. 토큰 검증 후 새 비밀번호 설정

---

#### 3.4 팀 관리 시스템

**역할 기반 접근 제어 (RBAC):**

**3단계 역할:**
- **OWNER**: 팀 생성자, 최고 권한, 팀당 1명
- **ADMIN**: 관리자 권한, 멤버 관리 가능
- **MEMBER**: 일반 멤버, 프로젝트/이슈 작업 가능

**권한 체크 패턴:**
```typescript
// 모든 API 엔드포인트에서 팀 멤버십 검증
const membership = await db.teamMember.findUnique({
  where: { teamId_userId: { teamId, userId } }
});
if (!membership) return 404; // 다른 팀 접근 시 404
```

**팀 초대 시스템:**
- 이메일 기반 초대 (7일 만료)
- 토큰 기반 초대 링크
- 실제 이메일 발송 (Resend)

---

#### 3.5 알림 시스템

**알림 트리거:**
- 이슈 담당자 지정
- 댓글 작성
- 마감일 임박 (1일 전, 당일)
- 팀 초대
- 역할 변경

**구현 방식:**
- 인앱 알림 (헤더 아이콘 + 미읽음 개수)
- 읽음/미읽음 상태 관리
- 페이지네이션 지원

---

#### 3.6 Soft Delete 패턴

**적용 대상:**
- User, Team, Project, Issue, Comment

**구현:**
```prisma
model Issue {
  deletedAt DateTime? // null이면 활성, 값이 있으면 삭제됨
}

// 조회 시 필터링
where: { deletedAt: null }
```

**장점:**
- 데이터 복구 가능
- 관계 무결성 유지
- 감사 추적 가능

---

### 4. 아키텍처 및 설계 결정

#### 4.1 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 페이지 (Route Group)
│   ├── (dashboard)/       # 대시보드 페이지 (Route Group)
│   └── api/               # API Routes
├── components/
│   ├── layout/            # 레이아웃 컴포넌트
│   └── ui/                # 재사용 가능한 UI 컴포넌트
└── lib/
    ├── auth.ts            # NextAuth 설정
    ├── db.ts              # Prisma 클라이언트
    ├── ai.ts              # AI 기능
    ├── email.ts           # 이메일 발송
    └── validations.ts     # Zod 스키마
```

**설계 원칙:**
- **관심사 분리**: 기능별로 명확한 폴더 구조
- **재사용성**: UI 컴포넌트의 독립성
- **타입 안정성**: TypeScript 엄격 모드

#### 4.2 API 설계

**RESTful 원칙:**
- `GET /api/issues/[issueId]` - 조회
- `PUT /api/issues/[issueId]` - 수정
- `DELETE /api/issues/[issueId]` - 삭제
- `POST /api/issues/[issueId]/ai` - AI 기능

**에러 처리:**
- 401: Unauthorized (인증 실패)
- 403: Forbidden (권한 없음)
- 404: Not Found (리소스 없음)
- 429: Too Many Requests (Rate Limit 초과)

---

### 5. 성능 최적화

#### 5.1 데이터베이스 최적화

**인덱싱 전략:**
```prisma
model Issue {
  @@index([projectId, status])  // 복합 인덱스
  @@index([assigneeId])
  @@index([deletedAt])          // Soft Delete 필터링
}
```

**쿼리 최적화:**
- 필요한 필드만 선택 (`select`)
- 관계 데이터 한 번에 로드 (`include`)
- 페이지네이션 (`take`, `skip`)

#### 5.2 AI 응답 캐싱

**캐싱 효과:**
- API 호출 비용 절감
- 응답 속도 향상
- Rate Limit 부담 감소

**무효화 전략:**
- 이슈 설명 수정 시 자동 무효화
- 댓글 추가 시 댓글 요약 캐시 무효화

---

### 6. 배포 및 운영

#### 6.1 Vercel 배포

**환경 변수 설정:**
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `AUTH_SECRET`: NextAuth 시크릿 키
- `OPENAI_API_KEY`: OpenAI API 키
- `RESEND_API_KEY`: Resend API 키
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth

**배포 최적화:**
- Connection Pooling (PgBouncer) 사용
- Serverless 함수 최적화
- 환경 변수 검증

#### 6.2 데이터베이스 연결

**Connection Pooling:**
- Vercel Serverless 환경에서 필수
- Supabase Connection Pooler 사용 (포트 6543)
- `pgbouncer=true` 파라미터 추가

---

### 7. 개발 과정에서의 도전과제와 해결책

#### 7.1 AI Rate Limiting 구현

**도전:**
- Serverless 환경에서 분당 제한 추적
- Redis 없이 데이터베이스만으로 구현

**해결:**
- `AIUsage` 모델로 일일 사용량 추적
- `updatedAt` 필드로 최근 1분간 요청 수 체크
- 프로덕션에서는 Redis 도입 권장

#### 7.2 캐시 무효화 타이밍

**도전:**
- 언제 캐시를 무효화해야 하는가?
- 사용자 경험과 비용의 균형

**해결:**
- 이슈 설명 수정 시에만 무효화
- 댓글은 5개 이상일 때만 요약 생성
- 사용자가 명시적으로 재생성 요청 가능

#### 7.3 권한 검증의 일관성

**도전:**
- 모든 API 엔드포인트에서 일관된 권한 검증
- 팀 멤버십 확인 누락 방지

**해결:**
- 공통 헬퍼 함수 작성
- 미들웨어 패턴 활용
- 타입 시스템으로 안전성 확보

---

### 8. 학습한 내용과 인사이트

#### 8.1 AI 통합 모범 사례

1. **Rate Limiting 필수**: 비용 제어 및 API 안정성
2. **캐싱 전략**: 동일 요청의 반복 호출 방지
3. **프롬프트 엔지니어링**: System Prompt로 일관성 확보
4. **에러 처리**: AI API 실패 시 사용자 친화적 메시지

#### 8.2 Next.js App Router 활용

1. **Server Components**: 초기 로딩 성능 향상
2. **Route Groups**: 레이아웃 분리로 코드 구조화
3. **API Routes**: 풀스택 개발의 편의성

#### 8.3 Prisma 활용

1. **타입 안전성**: 컴파일 타임 에러 방지
2. **관계 모델링**: 복잡한 데이터 구조 표현
3. **마이그레이션**: 스키마 변경 관리

---

### 9. 향후 개선 방향

#### 9.1 성능 개선

- **Redis 도입**: Rate Limiting 및 캐싱
- **CDN 활용**: 정적 자산 최적화
- **이미지 최적화**: Next.js Image 컴포넌트 활용

#### 9.2 기능 확장

- **실시간 업데이트**: WebSocket 또는 Server-Sent Events
- **파일 첨부**: 이슈에 파일 업로드 기능
- **검색 기능 강화**: Full-text Search (PostgreSQL)

#### 9.3 AI 기능 고도화

- **Fine-tuning**: 프로젝트별 맞춤 AI 모델
- **벡터 검색**: 유사 이슈 탐지 정확도 향상
- **자동화 워크플로우**: AI 기반 이슈 자동 분류

---

## 📊 프로젝트 통계

- **개발 기간**: 8시간 (Contest 제한)
- **코드 라인 수**: 약 15,000+ 라인
- **API 엔드포인트**: 30+ 개
- **데이터베이스 모델**: 15개
- **AI 기능**: 5가지
- **인증 방식**: 2가지 (이메일/비밀번호, Google OAuth)

---

## 🎓 이 프로젝트에서 배울 수 있는 것

1. **AI 통합 실무 경험**: OpenAI API를 활용한 실제 기능 구현
2. **Next.js 14 App Router**: 최신 Next.js 패턴 학습
3. **Prisma ORM**: 타입 안전한 데이터베이스 접근
4. **인증 시스템**: NextAuth.js를 활용한 다중 인증 구현
5. **Rate Limiting**: AI API 비용 제어 전략
6. **캐싱 전략**: 성능 최적화 및 비용 절감
7. **권한 관리**: 역할 기반 접근 제어 (RBAC)
8. **Soft Delete**: 데이터 복구 가능한 삭제 패턴

---

## 🔗 참고 자료

- [Next.js 14 공식 문서](https://nextjs.org/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [NextAuth.js 공식 문서](https://next-auth.js.org/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Resend 문서](https://resend.com/docs)

---

## 💡 블로그 작성 팁

1. **코드 예제 포함**: 실제 구현 코드와 함께 설명
2. **스크린샷 추가**: UI/UX 시각화
3. **아키텍처 다이어그램**: 시스템 구조 설명
4. **성능 메트릭**: 실제 측정 데이터 공유
5. **트러블슈팅**: 문제 해결 과정 상세 설명
6. **비교 분석**: 다른 기술 스택과의 비교
7. **실전 팁**: 배포 및 운영 경험 공유

---

## 📝 블로그 제목 제안

1. "8시간 만에 만든 AI 기반 이슈 트래킹 시스템: Jira Lite 개발기"
2. "Next.js 14 + OpenAI로 구현한 프로덕션 레벨 AI 기능 통합 가이드"
3. "Prisma + NextAuth.js로 구축하는 현대적인 인증 시스템"
4. "AI API Rate Limiting과 캐싱 전략: 실전 구현 사례"
5. "Serverless 환경에서의 데이터베이스 연결 최적화: PgBouncer 활용기"

---

**작성일**: 2025년
**작성자**: [작성자명]
**프로젝트**: Jira Lite - Litmers Vibe Coding Contest 2025
