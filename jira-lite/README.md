# Jira Lite - AI-Powered Issue Tracking

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-5-2d3748?logo=prisma" alt="Prisma" />
</div>

## 🚀 Overview

Jira Lite is a lightweight, AI-powered issue tracking web application built for modern teams. It features a beautiful Kanban board, intelligent AI suggestions, team collaboration tools, and comprehensive project management capabilities.

**Built for the Litmers Vibe Coding Contest 2025**

## ✨ Features

### Authentication
- ✅ Email/Password sign up and login
- ✅ Google OAuth integration
- ✅ Password reset with email verification
- ✅ Password change for logged-in users
- ✅ Profile management (name, profile image)
- ✅ Account deletion with soft delete

### Team Management
- ✅ Create and manage teams
- ✅ Invite members via email with actual email sending
- ✅ Role-based access (OWNER/ADMIN/MEMBER)
- ✅ Role changes and ownership transfer
- ✅ Team activity logs
- ✅ Member kick/leave functionality

### Project Management
- ✅ Create projects within teams (max 15 per team)
- ✅ Project descriptions with markdown support
- ✅ Archive/restore projects
- ✅ Favorite projects for quick access
- ✅ Custom labels (max 20 per project)
- ✅ Custom statuses with WIP limits

### Issue Management
- ✅ Create issues with title, description, assignee, due date, priority, labels
- ✅ Kanban board with drag-and-drop
- ✅ Issue status: Backlog, In Progress, Done (+ custom)
- ✅ Priority levels: High, Medium, Low
- ✅ Subtasks with checkbox completion (max 20)
- ✅ Issue change history
- ✅ Search and filtering

### AI Features (Powered by OpenAI)
- ✅ AI Summary generation (2-4 sentences)
- ✅ AI Solution suggestions
- ✅ AI Auto-label recommendations
- ✅ AI Duplicate detection
- ✅ AI Comment summarization (5+ comments)
- ✅ Rate limiting (10/minute, 100/day)
- ✅ Caching with automatic invalidation

### Comments
- ✅ Add, edit, delete comments
- ✅ Paginated comment list
- ✅ Permission-based deletion

### Dashboard & Statistics
- ✅ Personal dashboard with assigned issues
- ✅ Project dashboard with stats
- ✅ Team statistics with charts
- ✅ Due date tracking

### Notifications
- ✅ In-app notifications
- ✅ Mark as read (individual/all)
- ✅ Notification triggers for:
  - Issue assignment
  - Comments
  - Due date reminders
  - Team invites
  - Role changes

### UI/UX
- ✅ Modern, responsive design
- ✅ Dark/Light mode support
- ✅ Loading states
- ✅ Error handling
- ✅ Mobile responsive
- ✅ Beautiful animations

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Radix UI + Custom
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js v5
- **Email**: Resend
- **AI**: OpenAI API (GPT-3.5 Turbo)
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Recharts

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use Supabase/Neon)
- Google OAuth credentials
- OpenAI API key
- Resend API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/jira-lite.git
cd jira-lite
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# OpenAI
OPENAI_API_KEY="..."

# Resend (Email)
RESEND_API_KEY="..."
FROM_EMAIL="noreply@your-domain.com"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. **Initialize database**
```bash
npx prisma generate
npx prisma db push
```

5. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production
- `DATABASE_URL` - Production PostgreSQL connection string
- `AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production URL
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `OPENAI_API_KEY` - From OpenAI
- `RESEND_API_KEY` - From Resend
- `NEXT_PUBLIC_APP_URL` - Your production URL

## 🧪 Test Account

For testing, you can create a new account or use Google OAuth.

**Demo credentials** (if pre-seeded):
- Email: `demo@jira-lite.app`
- Password: `demo123`

## 📁 Project Structure

```
jira-lite/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── (auth)/        # Auth pages (login, signup, etc.)
│   │   ├── (dashboard)/   # Dashboard pages
│   │   ├── api/           # API routes
│   │   └── ...
│   ├── components/
│   │   ├── layout/        # Layout components
│   │   └── ui/            # UI components
│   └── lib/
│       ├── auth.ts        # NextAuth config
│       ├── db.ts          # Prisma client
│       ├── ai.ts          # AI functions
│       ├── email.ts       # Email functions
│       ├── utils.ts       # Utilities
│       └── validations.ts # Zod schemas
├── .env.example
├── README.md
└── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/request-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Profile
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `DELETE /api/profile` - Delete account
- `PUT /api/profile/password` - Change password

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `GET /api/teams/[teamId]` - Get team
- `PUT /api/teams/[teamId]` - Update team
- `DELETE /api/teams/[teamId]` - Delete team
- `GET /api/teams/[teamId]/members` - List members
- `PUT /api/teams/[teamId]/members` - Update roles
- `POST /api/teams/[teamId]/invites` - Send invite
- `GET /api/teams/[teamId]/activity` - Activity log

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project
- `PUT /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project
- `POST /api/projects/[projectId]/favorite` - Toggle favorite
- `POST /api/projects/[projectId]/archive` - Toggle archive
- `GET /api/projects/[projectId]/labels` - Get labels
- `POST /api/projects/[projectId]/labels` - Create label
- `GET /api/projects/[projectId]/issues` - Get issues

### Issues
- `GET /api/issues/[issueId]` - Get issue
- `PUT /api/issues/[issueId]` - Update issue
- `DELETE /api/issues/[issueId]` - Delete issue
- `GET /api/issues/[issueId]/subtasks` - Get subtasks
- `POST /api/issues/[issueId]/subtasks` - Create subtask
- `GET /api/issues/[issueId]/comments` - Get comments
- `POST /api/issues/[issueId]/comments` - Create comment
- `POST /api/issues/[issueId]/ai` - AI features

### AI
- `POST /api/ai` - AI features (labels, duplicates)

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications` - Mark as read

### Dashboard
- `GET /api/dashboard` - Dashboard data

## 📝 Data Limits

| Item | Limit |
|------|-------|
| Projects per team | 15 |
| Issues per project | 200 |
| Subtasks per issue | 20 |
| Labels per project | 20 |
| Labels per issue | 5 |
| Custom statuses | 5 |
| Comment length | 1000 chars |
| Description length | 5000 chars |
| AI requests/minute | 10 |
| AI requests/day | 100 |

## 🎨 Design Decisions

1. **Modern Gradient Theme**: Used violet/purple gradients for a distinctive, modern look
2. **Glass Morphism**: Subtle backdrop blur effects for depth
3. **Micro-interactions**: Smooth animations and transitions
4. **Mobile-first**: Responsive design that works on all devices
5. **Accessible**: Proper focus states and semantic HTML

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is built for the Litmers Vibe Coding Contest 2025.

---

Built with ❤️ by the Jira Lite Team
