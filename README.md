# Modern Todo Web App

A full-stack todo app with React, Vite, TypeScript, Express, SQLite, REST APIs, Tailwind CSS, local username/password login, and per-user todo ownership.

## Features

- Register and login with local username/password credentials
- Add, edit, delete, and complete todos
- Filter by all, active, or completed
- Search todos by title
- Due dates and Low, Medium, High priorities
- Each user only sees their own todos
- SQLite persistence
- API validation and structured error responses
- Responsive Tailwind CSS interface
- Docker support

## Project Structure

```text
.
├── client/          # React + Vite + TypeScript frontend
├── server/          # Express + SQLite API
│   ├── data/        # Local SQLite database files
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

Copy environment settings:

```bash
cp .env.example .env
```

Set `JWT_SECRET` to a long random value before starting the app.

Start the app:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API calls to `http://localhost:4000`.

## Environment Variables

| Name | Purpose | Default |
| --- | --- | --- |
| `PORT` | API server port | `4000` |
| `DATABASE_PATH` | SQLite file path | `server/data/todos.sqlite` |
| `JWT_SECRET` | Token signing secret | Development fallback only |
| `CLIENT_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

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

## Validation

The API validates usernames, passwords, todo titles, due dates, priority values, filters, and update payloads with Zod. Errors return a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "details": []
  }
}
```

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Open `http://localhost:4000`.

Docker Compose requires `JWT_SECRET` to be set in your shell or `.env` file.

## Verification

Build both apps:

```bash
npm run build
```

Verify all API flows:

```bash
npm run verify:api
```
