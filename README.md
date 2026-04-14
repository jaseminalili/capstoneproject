# TaskFlow — Professional Project Management Platform
 
A full-stack project and task management web application built with the PERN stack (PostgreSQL, Express.js, React, Node.js). Developed as a capstone project for South East European University, Tetovo.
 
**Live Demo:** https://frontend-pi-rouge-81.vercel.app
 
**Demo Credentials:**
```
oliver@taskflow.dev / Password123!
alex@taskflow.dev   / Password123!
```
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React 18, Redux Toolkit 2.3, React Router 6, Tailwind CSS 3.4 |
| Backend | Node.js 18, Express.js 4.18, Express Validator 7 |
| Database | PostgreSQL 16 (Neon serverless) |
| Auth | JSON Web Tokens (JWT), bcryptjs cost factor 12 |
| Email | Nodemailer 8, Gmail SMTP |
| Build | Vite 6 |
| Deployment | Vercel (frontend + backend), Neon (database) |
 
---
 
## Features
 
### Authentication & Security
- JWT authentication with 7-day token expiry
- ISO standard password validation — minimum 8 characters, uppercase, lowercase, number, special character
- Live password strength indicator with 5 real-time checkmarks
- Forgot password — secure email reset link with 1-hour expiry, single use token
- bcrypt password hashing with cost factor 12
- Password change with current password verification
 
### Workspace Management
- Multi-workspace support — create and switch between workspaces
- 3-tier Role Based Access Control — Owner, Admin, Member
- Workspace settings — rename, update description
- Delete workspace — GitHub-style confirmation (type workspace name)
- Auto-create personal workspace on registration
 
### Team Collaboration
- Invite members via email — professional HTML invitation email
- Role management — promote/demote between Admin and Member
- Remove members from workspace
- Team overview with member list and roles
 
### Projects
- Full CRUD — create, read, update, delete projects
- Project status — Active, Planning, Completed, On Hold, Cancelled
- Project priority — Critical, High, Medium, Low
- Project lead assignment
- Team member assignment per project
- Auto-calculated progress based on completed tasks
- Progress bar visualization
 
### Tasks
- Full CRUD — create, read, update, delete tasks
- 6 task statuses — Backlog, Todo, In Progress, In Review, Done, Cancelled
- 4 priority levels — Critical, High, Medium, Low
- 6 task types — Task, Bug, Feature, Improvement, Story, Epic
- Single assignee with email notification on assignment
- Due date and estimated hours tracking
- Inline status, type and priority editing on task detail page
- Reporter tracking with activity log
 
### Task Discussion
- Comment system on every task
- Edit indicator on modified comments
- Real-time comment posting with Enter to send
- Comment timestamps and author avatars
 
### Notifications
- In-app notification bell with unread count badge
- Notifications for task assignments and comments
- Mark individual or all notifications as read
- Click notification to navigate to relevant task
 
### Search
- Global debounced search across projects and tasks
- Server-side ILIKE search — 300ms debounce
- Results grouped by Projects and Tasks
- Click result to navigate directly
 
### Profile & Settings
- Edit display name — avatar initials update automatically
- Avatar color picker — 8 colors with live preview
- Change password with strength indicator
- Delete account — type email to confirm, preserves team tasks
 
### UI & UX
- Dark mode toggle — persists in localStorage across sessions
- Light mode forced on auth pages, restored after login
- Mobile responsive sidebar with overlay
- Toast notifications for all user actions
- Loading spinners and empty states
- Keyboard shortcuts — Enter to submit comments
 
---
 
## Database Schema
 
11 tables with proper foreign keys, CASCADE rules, indexes and auto-update triggers:
 
```
users                   — accounts with avatar and color
workspaces              — team workspaces with owner
workspace_members       — RBAC membership (owner/admin/member)
workspace_invitations   — email invitation tokens (7-day expiry)
projects                — projects with status, priority, progress
project_members         — project team assignments
tasks                   — tasks with 6 statuses, 4 priorities, 6 types
task_comments           — discussion per task
task_activities         — audit log of all task changes
notifications           — in-app notification system
password_reset_tokens   — secure forgot password tokens (1-hour expiry)
```
 
---
 
## API Endpoints
 
### Auth
```
POST   /api/auth/register              — Register new account
POST   /api/auth/login                 — Login
GET    /api/auth/me                    — Get current user
PUT    /api/auth/profile               — Update name and avatar color
PUT    /api/auth/password              — Change password
DELETE /api/auth/account              — Delete account
POST   /api/auth/forgot-password       — Request password reset email
GET    /api/auth/verify-reset-token    — Validate reset token
POST   /api/auth/reset-password        — Set new password with token
```
 
### Workspaces
```
GET    /api/workspaces                              — List workspaces
POST   /api/workspaces                              — Create workspace
PUT    /api/workspaces/:id                          — Update workspace (owner)
DELETE /api/workspaces/:id                          — Delete workspace (owner)
GET    /api/workspaces/:id/members                  — List members
POST   /api/workspaces/:id/invite                   — Invite member (admin)
PATCH  /api/workspaces/:id/members/:userId/role     — Change role (admin)
DELETE /api/workspaces/:id/members/:userId          — Remove member (admin)
GET    /api/workspaces/:id/search                   — Global search
```
 
### Projects
```
GET    /api/workspaces/:id/projects    — List projects
POST   /api/workspaces/:id/projects    — Create project
GET    /api/projects/:id               — Get project detail
PUT    /api/projects/:id               — Update project
DELETE /api/projects/:id               — Delete project
```
 
### Tasks
```
GET    /api/projects/:id/tasks         — List tasks for project
POST   /api/projects/:id/tasks         — Create task
GET    /api/tasks/:id                  — Get task detail
PUT    /api/tasks/:id                  — Update task
DELETE /api/tasks/:id                  — Delete task
GET    /api/tasks/my                   — Get my assigned tasks
POST   /api/tasks/:id/comments         — Add comment
PUT    /api/tasks/:id/comments/:cId    — Edit comment
DELETE /api/tasks/:id/comments/:cId    — Delete comment
```
 
### Notifications
```
GET    /api/notifications              — List notifications
PATCH  /api/notifications/read         — Mark all as read
PATCH  /api/notifications/:id/read     — Mark one as read
```
 
---
 
## Project Structure
 
```
capstone/
├── client/                         # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js            # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.jsx   # Sidebar, TopBar, dark mode toggle
│   │   │   └── ui/
│   │   │       └── index.jsx       # Shared components — Avatar, Badge, Modal
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── AuthPage.jsx    # Login and Register
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   ├── ResetPassword.jsx
│   │   │   │   └── AcceptInvite.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── projects/
│   │   │   │   ├── Projects.jsx
│   │   │   │   └── ProjectDetail.jsx
│   │   │   ├── tasks/
│   │   │   │   └── TaskDetail.jsx
│   │   │   ├── team/
│   │   │   │   └── Team.jsx
│   │   │   └── settings/
│   │   │       └── Settings.jsx
│   │   ├── store/
│   │   │   ├── slices/             # Redux slices for each domain
│   │   │   └── store.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── server/                         # Express backend
    └── src/
        ├── config/
        │   └── index.js            # Centralised configuration
        ├── controllers/
        │   ├── authController.js
        │   ├── workspaceController.js
        │   ├── teamController.js
        │   ├── projectController.js
        │   ├── taskController.js
        │   ├── searchController.js
        │   ├── notificationController.js
        │   └── passwordResetController.js
        ├── db/
        │   ├── pool.js             # PostgreSQL connection pool
        │   ├── init.js             # Schema creation
        │   └── seed.js             # Demo data
        ├── middleware/
        │   ├── auth.js             # JWT verification, RBAC
        │   └── errorHandler.js     # Global error handler
        ├── routes/
        │   └── index.js            # All API routes
        ├── services/
        │   └── emailService.js     # Nodemailer email templates
        └── utils/
            ├── logger.js
            └── response.js         # Standardised API responses
```
 
---
 
## Local Development
 
### Prerequisites
- Node.js 18+
- PostgreSQL 16 (local) or Neon account
- Gmail account with App Password for SMTP
 
### Backend Setup
 
```bash
cd server
npm install
```
 
Create `server/.env`:
```.env
#DB_HOST=localhost
#DB_PORT=5432
#DB_NAME=taskflow
#DB_USER=postgres
#DB_PASSWORD="your_database_password_of_pgadmin"
JWT_SECRET=your-secret-key-at-least-64-chars
JWT_EXPIRES_IN=7d
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM_NAME=TaskFlow
EMAIL_FROM_ADDRESS=your@gmail.com
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
PORT=5000
```
 
```bash
npm run db:init    # Create all tables
npm run db:seed    # Insert demo data
npm run dev        # Start with nodemon
```
 
### Frontend Setup
 
```bash
cd client
npm install
```
 
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
 
```bash
npm run dev        # Start Vite dev server
```
 
App runs at `http://localhost:5173`
 
---
 
## Deployment
 
Both frontend and backend are deployed on **Vercel** with **Neon** PostgreSQL.
 
### Backend Environment Variables (Vercel)
```
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
SMTP_USER
SMTP_PASS
EMAIL_FROM_NAME
EMAIL_FROM_ADDRESS
CLIENT_ORIGIN
FRONTEND_URL
```
 
### Frontend Environment Variables (Vercel)
```
VITE_API_URL
```
 
CI/CD is configured via GitHub — every push to `master` triggers automatic deployment.
 
---
 
## Security
 
- All passwords hashed with bcrypt cost factor 12
- JWT tokens expire after 7 days
- Password reset tokens expire after 1 hour and are single-use
- ISO standard password requirements enforced on both frontend and backend
- Role-based middleware on every protected route
- SQL injection prevented via parameterised queries
- CORS configured to allow only trusted origins
- Helmet.js security headers on all responses
 
---
 
## Author
 
**Jasemin Alili** — Student ID: 130149
 
South East European University, Tetovo
Faculty of Contemporary Sciences and Technologies
Academic Year 2025/2026
Mentor: Prof. Dr. Visar Shehu
