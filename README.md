# TaskFlow — Capstone Project Management Platform

> A full-stack, production-grade project management application built with the PERN stack.
> **PostgreSQL · Express · React · Node.js · Redux Toolkit · Tailwind CSS · JWT**

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Email Configuration](#email-configuration)
9. [Demo Accounts](#demo-accounts)
10. [Deployment](#deployment)

---

## ✨ Features

| Feature | Details |
|---|---|
| **JWT Authentication** | Register, login, persistent sessions with secure token storage |
| **Multi-Workspace** | Each user gets a default workspace; create unlimited workspaces |
| **Role-Based Access Control** | Three roles: Owner, Admin, Member — enforced on every API route |
| **Team Invitations** | Invite members by email with role selection (Admin/Member) |
| **Invitation Emails** | Professional HTML email with workspace info, project table, role badge, and accept button |
| **Task Assignment Emails** | Automatic email to assignee when a task is created or reassigned |
| **Project Management** | Full CRUD — status, priority, dates, lead, team members |
| **Task Management** | Six statuses, four priorities, six types, assignee, due date, time tracking |
| **Task Comments** | Threaded discussion on every task with edit tracking |
| **Activity Log** | Every task change is recorded with user, field, old/new values |
| **Dashboard** | Live stats, recent projects, open tasks, team overview |
| **Global Search** | Instant search across projects and tasks |
| **Sidebar My Tasks** | Expandable list of your assigned open tasks |
| **Progress Tracking** | Auto-calculated per project based on done/total tasks |
| **Responsive UI** | Works on desktop and mobile with a slide-out sidebar |

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js 18+ | JavaScript runtime |
| Express 4 | HTTP framework |
| PostgreSQL 14+ | Relational database |
| node-postgres (pg) | Database driver |
| bcryptjs | Password hashing (12 rounds) |
| jsonwebtoken | JWT creation & verification |
| nodemailer | SMTP email delivery |
| helmet | HTTP security headers |
| compression | Response compression |
| express-rate-limit | Rate limiting |
| express-validator | Request validation |
| morgan | HTTP request logging |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool |
| Redux Toolkit | State management |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS | Utility-first styling |
| react-hot-toast | Toast notifications |
| Lucide React | Icon library |

---

## 🏗 Architecture

```
taskflow/
├── server/                        # Express REST API
│   ├── src/
│   │   ├── config/index.js        # Centralised configuration
│   │   ├── db/
│   │   │   ├── pool.js            # PostgreSQL connection pool
│   │   │   ├── init.js            # Schema creation (9 tables)
│   │   │   └── seed.js            # Demo data
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT + workspace RBAC + project access
│   │   │   └── errorHandler.js    # Validation, 404, global error handler
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── workspaceController.js
│   │   │   ├── teamController.js  # Invite + accept flow
│   │   │   ├── projectController.js
│   │   │   └── taskController.js  # With email + activity logging
│   │   ├── routes/index.js        # All routes with validation
│   │   ├── services/
│   │   │   └── emailService.js    # HTML email templates
│   │   ├── utils/
│   │   │   ├── logger.js          # Colour-coded console logger
│   │   │   └── response.js        # Standardised API response helpers
│   │   └── index.js               # Express app entry point
│   ├── .env.example
│   └── package.json
│
└── client/                        # React SPA
    ├── src/
    │   ├── api/axios.js           # Axios instance with interceptors
    │   ├── store/store.js         # Redux store + all slices
    │   ├── components/
    │   │   ├── ui/index.jsx       # Avatar, Badge, Modal, Spinner, etc.
    │   │   └── layout/AppLayout.jsx  # Sidebar + TopBar + Outlet
    │   ├── pages/
    │   │   ├── auth/AuthPage.jsx
    │   │   ├── auth/AcceptInvite.jsx
    │   │   ├── dashboard/Dashboard.jsx
    │   │   ├── projects/Projects.jsx
    │   │   ├── projects/ProjectDetail.jsx
    │   │   ├── tasks/TaskDetail.jsx
    │   │   ├── team/Team.jsx
    │   │   └── settings/Settings.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+** (running locally or a cloud URL)

### 1 — Database

```bash
# In psql:
CREATE DATABASE taskflow;
```

### 2 — Backend

```bash
cd server
npm install
cp .env.example .env
# → Edit .env with your values (see Environment Variables below)

npm run db:init    # Creates all tables, indexes and triggers
npm run db:seed    # Seeds demo data (optional)
npm run dev        # Starts on http://localhost:5000
```

### 3 — Frontend

```bash
cd client
npm install
npm run dev        # Starts on http://localhost:5173
```

Open **http://localhost:5173**

---

## ⚙️ Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# PostgreSQL (use DATABASE_URL for cloud, or individual fields for local)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/taskflow

# JWT — generate with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_char_hex_secret
JWT_EXPIRES_IN=7d

# CORS
CLIENT_ORIGIN=http://localhost:5173

# Email (see Email Configuration section)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourname@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM_NAME=TaskFlow
EMAIL_FROM_ADDRESS=yourname@gmail.com
```

---

## 🗄 Database Schema

```sql
users               id · name · email · password_hash · avatar · color · is_active · last_login
workspaces          id · name · description · owner_id
workspace_members   workspace_id · user_id · role (owner|admin|member)
workspace_invitations  id · workspace_id · invited_by · email · role · token · status · expires_at
projects            id · workspace_id · name · description · status · priority · progress · start_date · end_date · lead_id
project_members     project_id · user_id
tasks               id · project_id · title · description · status · priority · type · assignee_id · reporter_id · due_date · estimated_hours · actual_hours · tags · position
task_comments       id · task_id · user_id · content · is_edited
task_activities     id · task_id · user_id · action · field · old_value · new_value
notifications       id · user_id · type · title · body · link · is_read
```

---

## 🔌 API Reference

All protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register + auto-create workspace |
| POST | `/api/auth/login` | — | Login → returns token + workspaces |
| GET  | `/api/auth/me` | ✅ | Current user + workspaces |
| PUT  | `/api/auth/profile` | ✅ | Update name/color |
| PUT  | `/api/auth/password` | ✅ | Change password |

### Workspaces
| Method | Endpoint | Role |
|--------|----------|------|
| GET    | `/api/workspaces` | any |
| POST   | `/api/workspaces` | any |
| GET    | `/api/workspaces/:workspaceId` | member |
| PUT    | `/api/workspaces/:workspaceId` | owner |
| DELETE | `/api/workspaces/:workspaceId` | owner |
| GET    | `/api/workspaces/:workspaceId/stats` | member |

### Team
| Method | Endpoint | Role |
|--------|----------|------|
| GET    | `/api/workspaces/:workspaceId/members` | member |
| GET    | `/api/workspaces/:workspaceId/users` | member |
| POST   | `/api/workspaces/:workspaceId/invite` | **admin** |
| PATCH  | `/api/workspaces/:workspaceId/members/:userId/role` | **admin** |
| DELETE | `/api/workspaces/:workspaceId/members/:userId` | **admin** |
| GET    | `/api/invite/info?token=xxx` | public |
| POST   | `/api/invite/accept` | authenticated |

### Projects
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET    | `/api/workspaces/:workspaceId/projects` | |
| POST   | `/api/workspaces/:workspaceId/projects` | |
| GET    | `/api/projects/:id` | includes members |
| GET    | `/api/projects/:id/stats` | task counts by status/priority |
| PUT    | `/api/projects/:id` | |
| DELETE | `/api/projects/:id` | admin or creator |

### Tasks
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET    | `/api/tasks/my` | Your open tasks, priority-sorted |
| GET    | `/api/tasks/:id` | Full detail with comments + activities |
| PUT    | `/api/tasks/:id` | Sends email if assignee changes |
| DELETE | `/api/tasks/:id` | Recalculates project progress |
| POST   | `/api/tasks/:id/comments` | |
| PUT    | `/api/tasks/:id/comments/:commentId` | |
| DELETE | `/api/tasks/:id/comments/:commentId` | |
| GET    | `/api/projects/:projectId/tasks` | |
| POST   | `/api/projects/:projectId/tasks` | Sends email to assignee |

---

## 📧 Email Configuration

### Gmail (Recommended for development)
1. Enable 2-Factor Authentication on your Google account
2. Visit: **myaccount.google.com → Security → App Passwords**
3. Create a new App Password for "Mail"
4. Use the generated 16-character password as `SMTP_PASS`

> **Note:** If email is not configured, the API still works fully. Invitations are created in the database; email send failures are logged but do not block the API response.

### Other SMTP Providers
| Provider | SMTP_HOST | SMTP_PORT |
|----------|-----------|-----------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp-mail.outlook.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

---

## 👥 Demo Accounts

After running `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| oliver@taskflow.dev | password123 | Owner (Cloud Ops Hub) |
| alex@taskflow.dev | password123 | Admin |
| sarah@taskflow.dev | password123 | Admin |
| john@taskflow.dev | password123 | Member |
| maria@taskflow.dev | password123 | Member |

**Workspace:** Cloud Ops Hub · 3 projects · 12 tasks

---

## 🌐 Deployment

### 1. Backend (Already Deployed)
The Express API is hosted on Vercel at:
`https://capstoneproject-drab-five.vercel.app/api`

**Environment Variables in Vercel:**
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A long random string.
- `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://taskflow-client.vercel.app`).
- `CLIENT_ORIGIN`: Same as `FRONTEND_URL`.
- `SMTP_USER` / `SMTP_PASS`: For email notifications.

### 2. Frontend  (Already Deployed)
1. **GitHub Sync**: Push your code to a GitHub repository.
2. **Import to Vercel**:
    - Select the repository.
    - **Framework Preset**: Vite.
    - **Root Directory**: `client`.
3. **Environment Variables**:
    - Add `VITE_API_URL` = `https://capstoneproject-drab-five.vercel.app/api`
4. **Deploy**: Vercel will build and host the app automatically.

> **Note:** The `client/vercel.json` file handles SPA routing, ensuring that refreshing the page on a dashboard or project route doesn't return a 404.

---

## 📚 Academic Information

**Project:** Full-Stack PERN Project Management Application  
**Stack:** PostgreSQL, Express, React, Node.js  
**Key Concepts Demonstrated:**
- RESTful API design with proper HTTP status codes
- JWT-based stateless authentication
- Role-Based Access Control (RBAC)
- Database normalisation (3NF) with foreign keys and constraints
- Asynchronous email delivery with Nodemailer
- Redux state management with Redux Toolkit
- Component-based UI architecture with React
- Environment-based configuration
- Error handling at middleware level
- SQL transactions for data integrity
- Index optimisation for common queries
