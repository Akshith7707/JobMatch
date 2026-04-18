# SkillSync — Technical workflow and implementation

This document describes **how the system works end-to-end**, the **implementation choices**, and **how it differs** from typical job-board or “AI resume” products.

---

## 1. What the product is (in one sentence)

A **candidate-only** stack: the user builds a **structured profile** from a **PDF resume** and optional **GitHub URL**; the backend **scrapes real job listings** from multiple public sources, **normalizes and optionally parses** them with an LLM, **scores** each job against the candidate using **rule-based signals plus optional embeddings**, and exposes **job-centric workflows** (matches, bookmarks, applications, tailoring, interview prep) through a **Next.js UI** talking to an **Express + PostgreSQL API**.

---

## 2. High-level architecture

| Layer | Technology | Responsibility |
|--------|------------|----------------|
| Client | Next.js (Pages Router), React, Tailwind, Zustand | SPA-style pages; `axios` to API; JWT in `localStorage` |
| API | Express, `helmet`, `cors`, `express-rate-limit`, `morgan` | REST under `/api/*`; JWT `Bearer` auth on protected routes |
| Persistence | PostgreSQL (`pg` pool), UUID primary keys | Users, candidates, jobs, matches, applications, weights, etc. |
| AI | OpenAI-compatible client → **Nebius** (`meta-llama/Llama-3.3-70B-Instruct`, `Qwen/Qwen3-Embedding-8B`) | Chat (JSON extraction, copy) + embeddings + cosine similarity |

```mermaid
flowchart LR
  subgraph client [Next.js]
    UI[Pages / Zustand]
  end
  subgraph api [Express]
    Auth[/api/auth]
    Cand[/api/candidates]
    Jobs[/api/jobs]
    Match[/api/matches]
    Agents[/api/agents]
  end
  subgraph data [PostgreSQL]
    DB[(users candidates jobs matches ...)]
  end
  subgraph ai [Nebius OpenAI-compatible]
    LLM[Chat completions]
    Emb[Embeddings]
  end
  UI --> Auth
  UI --> Cand
  UI --> Jobs
  UI --> Match
  Cand --> LLM
  Cand --> Emb
  Jobs --> DB
  Cand --> DB
  Jobs --> LLM
```

There is **no** embedded Next.js API route layer for core logic: the browser calls **one external API base URL** (`NEXT_PUBLIC_API_URL`, default `http://localhost:3001/api`). That is a deliberate split: **frontend deploy (e.g. Vercel)** and **backend deploy (e.g. Railway/Render)** can evolve independently.

---

## 3. End-to-end user workflow (operational)

1. **Register / login** — `POST /api/auth/register` or `POST /api/auth/login` returns `{ user, token }`. Passwords are **bcrypt**-hashed; sessions are **stateless JWT** (no server-side session store).
2. **Profile row** — On register, the API creates `users` and a linked `candidates` row (`UNIQUE(user_id)`).
3. **Resume upload** — `POST /api/candidates/resume` (multipart PDF, in-memory `multer`). Text is extracted with **`pdf-parse`**; **`profileAgent`** calls the LLM to populate `skills`, `experience_years`, `tech_stack`, `ai_profile` JSON on `candidates`.
4. **GitHub (optional)** — `POST /api/candidates/github` enriches GitHub-derived fields used in **project scoring** and profile completeness.
5. **Profile complete** — When both resume-derived data and GitHub URL exist, `profile_complete` can be set true; **matching** may run asynchronously after resume processing.
6. **Job ingestion** — Authenticated `POST /api/jobs/scrape` runs **`scrapingAgent.scrapeAll()`**, upserts jobs by `(source, source_id)`, then kicks off **background** `parseUnparsedJobs()` (LLM job parsing) and **background** `rematchAllCandidates()`.
7. **Discovery** — `GET /api/jobs` lists active jobs with filters (skills text, remote, source, pagination).
8. **Recommendations** — Candidate-specific ranked jobs come from persisted **`matches`** rows (and related candidate routes), not from a third-party “recommended for you” API.
9. **Actions** — Bookmarks, applied state, feedback, applications pipeline, resume tailoring, cover letters, interview prep, learning path — each is a **dedicated route + agent module** that reads/writes Postgres and calls the LLM where needed.

---

## 4. Authentication and authorization (technical)

- **Middleware** `authenticate`: reads `Authorization: Bearer <jwt>`, `jwt.verify` with `JWT_SECRET`, attaches `req.user` (`id`, `email` payload).
- **Public routes** — e.g. `GET /api/jobs` (list) may be unauthenticated depending on route file; scrape and candidate mutations require auth.
- **CORS** — Locked to `FRONTEND_URL` or `http://localhost:3000` by default.
- **Rate limiting** — Global `/api/` limiter (e.g. 200 requests / 15 minutes per IP) reduces abuse on scrape and AI-heavy endpoints.

This is standard **JWT + resource ownership by `user_id` / `candidate_id`**, not OAuth “Sign in with Google” unless you add it later.

---

## 5. Job pipeline (how listings enter the system)

### 5.1 Scraping

**`scrapingAgent`** pulls from multiple adapters (e.g. **RemoteOK**, **Arbeitnow**, **JSearch** when `RAPIDAPI_KEY` is set, plus other sources in the same module). Each adapter returns a **normalized DTO**: `source`, `source_id`, `url`, `title`, `company`, `description`, `location`, `remote`, salary fields, `tags`, `posted_at`.

**Implementation detail:** HTTP with `axios`, timeouts, defensive filtering/mapping, HTML stripped from descriptions where needed. Failures per source are logged; other sources still contribute.

### 5.2 Persistence

Jobs are stored with **`UNIQUE(source, source_id)`** so re-scrapes **upsert** instead of duplicating rows.

### 5.3 AI parsing (post-scrape)

**`jobParsingAgent`** (invoked in background) turns raw descriptions into structured **`required_skills`**, **`preferred_skills`**, experience bounds, etc., when `parsed` is false. Until then, the **matcher falls back** to **tags + title token heuristics** for required skills so matching is not blocked on LLM completion.

**Difference from “scrape only” demos:** many projects stop at JSON in the UI; here **structured columns** feed scoring and skill-gap UX.

---

## 6. Candidate profile pipeline

- **Resume** → plain text → LLM → JSON merged into **`candidates`** (`skills` JSONB, `tech_stack`, `experience_years`, `ai_profile`).
- **GitHub** → API-backed stats / languages / complexity-style signals (see **`matchingAgent.computeProjectScore`**) stored on the candidate row.
- **Embeddings** (when generated and stored on candidate/job) participate in **`computeMatchScore`** as a **fourth weighted channel** (stored as JSON string in DB, parsed at score time).

Profile extraction failures are **degraded gracefully** (e.g. empty skills) so the API does not hard-fail the upload flow.

---

## 7. Matching — how it is implemented

**Core module:** `matchingAgent`.

### 7.1 Inputs

- **Candidate row:** `skills`, `tech_stack`, `experience_years`, `project_complexity_score`, `github_stats`, optional `skill_embedding`.
- **Job row:** `required_skills`, `preferred_skills`, `experience_min` / `max`, `tags`, `title`, optional `job_embedding`.
- **Weights:** latest active row from **`match_weights`** (`skill_weight`, `experience_weight`, `project_weight`, `culture_weight` — the last bucket is used for **embedding** contribution in code).

### 7.2 Score components

1. **Skill score** — Set overlap / fuzzy substring match between candidate skills+tech and job required+preferred; **fallback** from tags/title words if `required_skills` is empty.
2. **Experience score** — Band fit vs `experience_min` / `experience_max` with soft penalties outside the band.
3. **Project score** — Combines **declared complexity** with **GitHub language overlap** against job text and simple repo/follower heuristics.
4. **Embedding score** — If both embeddings exist, **cosine similarity × 100**; else 0.

**Weighted sum** → `match_score` (capped at 100). **Human-readable `match_reasons`** are derived from thresholds on sub-scores.

### 7.3 Persistence and thresholds

- **`matchCandidateToJobs`** / **`matchJobToCandidates`** write **`matches`** with **`ON CONFLICT (candidate_id, job_id) DO UPDATE`**.
- Rows are only created/updated when **`match_score > 20`** to avoid flooding the DB with noise.

### 7.4 Performance note

Scoring is **CPU-bound rule logic + optional embedding parse** per (candidate, job) pair in loops; scrape triggers **batch rematch** in the background. This is simpler than a search engine or vector DB but **transparent and easy to tune** via SQL weights.

---

## 8. Downstream “agents” (product workflows)

Each capability is a **route handler** plus a small **agent module** using **`chatCompletion`** / **`getEmbedding`** from **`aiClient.js`**:

| Concern | Typical trigger | Output |
|--------|------------------|--------|
| Profile | Resume / GitHub | Structured JSON on `candidates` |
| Job parsing | After scrape | Structured fields on `jobs` |
| Matching | Profile update / scrape / agent route | `matches` rows |
| Resume tailor | Per job | ATS-style feedback + tailored text (persisted versions optional via routes) |
| Cover letter / interview prep / learning path | Per job or global | Generated text / curriculum suggestions |

This is **orchestration in Node**, not a separate LangChain worker cluster: **lower ops complexity**, easier hackathon/demo deployment, at the cost of **less isolation** between AI and API processes.

---

## 9. How this differs from other implementations

### vs. mainstream job boards (LinkedIn, Indeed, etc.)

- **No employer posting product** — the data model is **candidate-centric**; jobs are **ingested**, not sold as slots.
- **Open-web aggregation** — multiple **scrapers/APIs**, not a single vendor feed contract.

### vs. “only RAG over a PDF” resume tools

- **Structured state** in Postgres (skills, scores, applications), not only chat memory.
- **Deterministic explainability** — sub-scores and skill gaps are **computed in code**; the LLM **augments** extraction and copy, not the only source of truth for ranking.

### vs. vector-only semantic job match demos

- **Hybrid ranker**: lexical/skill overlap + experience bands + GitHub signals **always** contribute; embeddings are **optional** and weighted via **`match_weights`**.
- **Graceful degradation** when jobs are not yet LLM-parsed (title/tag fallback).

### vs. full microservices / event-driven pipelines

- **Modular monolith**: Express routes + `agents/*` + one pool. **Background work** is `async` fire-and-forget from route handlers, not a dedicated queue (Redis, SQS). **Trade-off:** simpler deploy; less backpressure control at scale.

### vs. Next.js full-stack in one repo route handlers

- **Explicit BFF split**: Next does UI; Express owns auth, file upload, scraping, and DB. **Trade-off:** two deployables and CORS/env discipline; **gain:** long-running scrape and Node-native PDF parsing without serverless limits.

### vs. hosted “matching API” SaaS

- **Weights and schema are yours** — `match_weights` and SQL migrations define behavior; no black-box ranker fee per match.

---

## 10. Database and migrations (operational caveat)

**`npm run db:migrate`** runs a SQL script that **drops and recreates** core tables. That **wipes users and jobs** in that database. Treat migrations as **destructive** in development; production should use **forward-only migrations** if you evolve beyond demos.

---

## 11. Configuration surface (what operators must set)

| Area | Variables (representative) |
|------|----------------------------|
| DB | `DATABASE_URL` |
| Auth | `JWT_SECRET` |
| AI | `NEBIUS_API_KEY`, optional `NEBIUS_BASE_URL` |
| Scraping | `RAPIDAPI_KEY` for JSearch |
| GitHub enrichment | `GITHUB_TOKEN` (optional, rate limits) |
| CORS | `FRONTEND_URL` |
| Client → API | `NEXT_PUBLIC_API_URL` |

---

## 12. Summary

SkillSync is implemented as a **classic three-tier app** (Next → Express → Postgres) with **LLM-powered extractive and generative steps** plugged into **specific lifecycle hooks** (resume upload, post-scrape parse, per-job documents). Its **differentiating technical choice** is the **hybrid, tunable matcher** on **first-party scraped + structured job data**, aimed at **explainable candidate UX** rather than a single embedding score or a closed job feed.
