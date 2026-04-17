# SkillSync AI

Candidate-focused job discovery: scrape real listings from the web, parse roles with AI, and match them to your resume and GitHub profile.

## Features

- **Live job scraping** — RemoteOK, Arbeitnow, JSearch, HN Who’s Hiring (and similar sources)
- **AI profile** — Resume PDF parsing + optional GitHub analysis (Nebius AI / Llama + embeddings)
- **Match scores** — Skill, experience, and project signals; skill-gap view on the dashboard
- **Workflows** — Bookmarks, applied tracking, application pipeline, job detail pages, resume tailoring (ATS-style feedback), cover letters, interview prep, learning paths

## Stack

| Layer | Tech |
|--------|------|
| Frontend | Next.js (Pages), React, Tailwind CSS, Zustand |
| Backend | Express.js, PostgreSQL (e.g. Neon), JWT auth |
| AI | Nebius API (OpenAI-compatible): chat + embeddings |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (local or hosted, e.g. Neon) — connection string with SSL for cloud DBs
- **Nebius API** — `NEBIUS_API_KEY` (and optional `NEBIUS_BASE_URL` if you use a custom endpoint)
- **GitHub token** (optional, recommended) — `GITHUB_TOKEN` for higher GitHub API rate limits when analyzing profiles

## Environment

Copy `backend/.env.example` to `backend/.env` and set at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing auth tokens |
| `NEBIUS_API_KEY` | Nebius AI API key |
| `NEBIUS_BASE_URL` | Optional; defaults to Nebius OpenAI-compatible base URL |
| `GITHUB_TOKEN` | Optional GitHub personal access token |
| `FRONTEND_URL` | Optional; CORS origin (default `http://localhost:3000`) |

Frontend: copy `frontend/.env.local.example` to `frontend/.env.local` and set `NEXT_PUBLIC_API_URL` if the API is not on `http://localhost:3001/api`.

## Quick start

### 1. Database

```bash
cd backend
cp .env.example .env   # edit with DATABASE_URL, JWT_SECRET, NEBIUS_API_KEY, etc.
npm install
npm run db:migrate
```

Optional — seed scraped jobs only:

```bash
npm run db:seed
```

### 2. Backend

```bash
cd backend
npm run dev    # http://localhost:3001 — health: GET /api/health
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # adjust NEXT_PUBLIC_API_URL if needed
npm run dev    # http://localhost:3000
```

Create an account via **Register**, upload a resume, add GitHub, then use **Refresh Jobs** on the dashboard to scrape and match.

### Troubleshooting (frontend blank or broken)

- If the UI is white or chunks fail to load, stop the dev server, delete `frontend/.next`, and run `npm run dev` again (common when the project lives under OneDrive or the cache gets out of sync).

## Architecture (high level)

```
Next.js (candidate UI)
        │
        ▼
Express API (/api)
        │
        ├── Auth — register / login (JWT)
        ├── Candidates — profile, resume, GitHub, recommendations, tailoring, applications, …
        ├── Jobs — list, scrape, job detail, similar jobs
        ├── Matches — feedback (bookmark, apply, ignore, …)
        └── Agents — manual re-match, match weights
        │
        ▼
PostgreSQL — users, candidates, jobs, matches, applications, …
```

### AI agents (backend)

| Area | Role |
|------|------|
| Profile agent | Extract skills and structure from resume text; GitHub summary |
| Job parsing agent | Parse job descriptions into skills and metadata |
| Matching agent | Score candidate vs jobs (skills, experience, projects) |
| Resume tailor agent | ATS-oriented feedback and tailored resume text |
| Cover letter / interview prep / learning path | Job-specific copy and study suggestions |

## Matching (conceptual)

Scores combine skill overlap, experience fit, project/GitHub signals, and optional embedding similarity when embeddings are available. Weights are configurable via `match_weights` in the database.

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `backend` | `npm run dev` | API with nodemon |
| `backend` | `npm run db:migrate` | Run schema migration |
| `backend` | `npm run db:seed` | Scrape seed jobs into DB |
| `frontend` | `npm run dev` | Next.js dev server |
| `frontend` | `npm run build` | Production build |

## License

Private / your project — adjust as needed.
