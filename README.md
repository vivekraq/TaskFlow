# TaskFlow

A full-stack project management app for small teams. Built with React, Express, and MongoDB.

Create projects, add team members, assign tasks with priorities and due dates, and keep track of everything from a single dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?logo=mongodb&logoColor=white)

---

## What it does

- **Projects** — Create projects, add descriptions, invite team members by email
- **Tasks** — Assign tasks to members with title, description, priority (low/medium/high), status (todo/in_progress/done), and optional due dates
- **Roles** — Project creators become admins. Admins can manage members and all tasks. Regular members can create tasks and update the status of tasks assigned to them.
- **Dashboard** — See all your assigned tasks across projects, overdue alerts, and per-project breakdowns
- **Auth** — Email/password signup and login with JWT tokens

## Tech stack

| Layer    | What                                            |
| -------- | ----------------------------------------------- |
| Frontend | React 18, React Router 6, Vite 5                |
| Backend  | Node.js, Express 4                               |
| Database | MongoDB with Mongoose ODM                        |
| Auth     | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)        |
| Deploy   | Railway (Nixpacks) — single-service deployment   |

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (running locally or a hosted instance like MongoDB Atlas)

### Setup

```bash
# clone and install
git clone https://github.com/your-username/taskflow.git
cd taskflow
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

Copy the env template and fill in your database credentials:

```bash
cp backend/.env.example backend/.env
```

```env
MONGODB_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=change-this-to-something-random
PORT=5000
NODE_ENV=development
```

> **Important:** Don't commit the `.env` file. It's already in `.gitignore`.

For MongoDB Atlas, use the connection string from your cluster dashboard instead of the localhost URL.

### Running locally

You'll need two terminals:

```bash
# terminal 1 — backend on port 5000
cd backend
npm run dev

# terminal 2 — frontend on port 5173
cd frontend
npm run dev
```

Vite proxies `/api/*` to the backend automatically, so just open http://localhost:5173.

## Project structure

```
├── backend/
│   ├── src/
│   │   ├── db/index.js            # mongoose connection
│   │   ├── models/
│   │   │   ├── User.js            # user schema
│   │   │   ├── Project.js         # project + embedded members
│   │   │   └── Task.js            # task schema
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   └── rbac.js            # role-based access checks
│   │   └── routes/
│   │       ├── auth.js            # signup, login, /me
│   │       ├── dashboard.js       # aggregated user stats
│   │       ├── projects.js        # project CRUD + member mgmt
│   │       └── tasks.js           # task CRUD with permission logic
│   ├── server.js                  # express app entry point
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx         # sidebar + main area
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx    # auth state + token mgmt
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Projects.jsx
│   │   │   └── ProjectDetail.jsx  # tasks, members, settings
│   │   ├── api.js                 # fetch wrapper
│   │   ├── App.jsx                # routes
│   │   └── index.css              # global dark theme styles
│   └── vite.config.js             # dev proxy config
│
├── scripts/
│   └── copy-build.js              # copies frontend dist → backend/public
│
├── railway.toml
└── package.json                   # root-level build/start scripts
```

## API endpoints

Base URL: `/api`
Auth: send `Authorization: Bearer <token>` header on protected routes.

### Auth

```
POST   /api/auth/signup    — register (name, email, password)
POST   /api/auth/login     — login (email, password) → returns JWT
GET    /api/auth/me        — get current user (requires auth)
```

### Projects

```
GET    /api/projects              — list your projects
POST   /api/projects              — create a project
GET    /api/projects/:id          — project details + members
PUT    /api/projects/:id          — update project (admin only)
DELETE /api/projects/:id          — delete project (admin only)
```

### Members

```
POST   /api/projects/:id/members                — add member by email (admin)
PUT    /api/projects/:id/members/:userId/role    — change role (admin)
DELETE /api/projects/:id/members/:userId         — remove member (admin)
```

### Tasks

```
GET    /api/projects/:id/tasks            — list tasks in a project
POST   /api/projects/:id/tasks            — create a task
PUT    /api/projects/:id/tasks/:taskId    — update a task
DELETE /api/projects/:id/tasks/:taskId    — delete a task
```

**Permission notes:**
- Admins can edit/delete any task in the project
- Task creators can edit/delete their own tasks
- Assignees can only change the status of tasks assigned to them

### Dashboard

```
GET    /api/dashboard    — your tasks, overdue items, per-project stats
```

### Health

```
GET    /api/health       — returns { status: "ok" }
```

## Database

MongoDB with three collections managed by Mongoose:

- **users** — name, email, hashed password
- **projects** — name, description, embedded members array (each with user ref, role, joined date)
- **tasks** — title, description, status, priority, due date, refs to project and users

Members are embedded directly in the project document rather than using a separate join collection. This keeps queries simpler and is the standard MongoDB approach for bounded arrays.

## Deploying to Railway

The repo includes a `railway.toml` that handles everything:

1. Create a project on [Railway](https://railway.app) and connect your repo
2. Add a MongoDB service — Railway sets `MONGODB_URI` automatically
3. Add these env vars in the dashboard:
   - `JWT_SECRET` — run `openssl rand -hex 32` to generate one
   - `NODE_ENV` = `production`
4. Deploy — it'll build the frontend, copy it into the backend, and serve everything from one process

For manual deploys:

```bash
npm run build   # builds frontend + copies to backend/public
npm start       # starts the express server
```

## License

MIT
