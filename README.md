# Modern Todo Web App

A full-stack todo app with React, Vite, TypeScript, Express, PostgreSQL, JWT authentication, REST APIs, and Tailwind CSS.

## Features

- Register and login with local username/password credentials
- Add, edit, delete, and complete todos
- Filter by all, active, or completed
- Search todos by title
- Due dates and Low, Medium, High priorities
- Each user only sees their own todos
- PostgreSQL persistence through `DATABASE_URL`
- API validation and structured error responses
- Responsive Tailwind CSS interface

## Project Structure

```text
.
├── client/          # React + Vite + TypeScript frontend
├── server/          # Express + TypeScript API
│   └── src/
├── scripts/         # API verification script
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Local Setup

Install dependencies:

```bash
npm install
npm --prefix client install
```

Create local environment files:

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Set these values in `.env`:

```text
PORT=4000
DATABASE_URL=postgresql://todo_user:todo_password@localhost:5432/todo_app
DATABASE_SSL=false
JWT_SECRET=<generate-a-long-random-secret>
CORS_ORIGIN=http://localhost:5173
```

Set this value in `client/.env.local`:

```text
VITE_API_URL=http://localhost:4000
```

Start a local PostgreSQL database with Docker:

```bash
docker compose up postgres
```

Start the app:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:4000`.

## Environment Variables

Backend:

| Name | Purpose |
| --- | --- |
| `PORT` | API server port. Render sets this automatically. |
| `DATABASE_URL` | PostgreSQL connection string. Required. |
| `DATABASE_SSL` | Set to `true` for hosted PostgreSQL if SSL is required. |
| `JWT_SECRET` | Long random token signing secret. Required. |
| `CORS_ORIGIN` | Allowed frontend origin, such as your Vercel URL. |

Frontend:

| Name | Purpose |
| --- | --- |
| `VITE_API_URL` | Public backend API origin, such as your Render service URL. |

## REST API

All todo routes require `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login user |
| `GET` | `/api/todos?filter=all&search=text` | List todos |
| `POST` | `/api/todos` | Create todo |
| `PATCH` | `/api/todos/:id` | Update todo |
| `DELETE` | `/api/todos/:id` | Delete todo |

## Build And Verification

Build both apps:

```bash
npm run build
```

Verify API flows:

```bash
npm run verify:api
```

The verification script uses an in-memory PostgreSQL-compatible database so it can run without a local PostgreSQL server.

## Render Backend Deployment

Create a PostgreSQL database on Render first. Then create a Web Service for this repository.

Recommended Render settings:

```text
Root Directory: .
Build Command: npm install && npm run render:build
Start Command: npm run render:start
```

Set these Render environment variables:

```text
DATABASE_URL=<Render PostgreSQL internal connection string>
DATABASE_SSL=true
JWT_SECRET=<long random secret generated outside git>
CORS_ORIGIN=<your Vercel frontend URL>
```

Do not put real secrets in `.env.example`, README, or committed files.

## Vercel Frontend Deployment

Create a Vercel project that points to the `client` directory.

Recommended Vercel settings:

```text
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Set this Vercel environment variable:

```text
VITE_API_URL=<your Render backend URL>
```

After both services are deployed, update Render `CORS_ORIGIN` to the final Vercel production URL and redeploy the backend.
