# SkillSync AI — Project Pitch  
*3–5 minute presentation outline*

---

## 1. Introduction (Hook)

**Most developers don’t fail because they lack skills — they fail because the right opportunities never find them.**

Job boards are noisy. Listings are duplicated, outdated, or irrelevant. “Easy apply” buttons send résumés into the void. Meanwhile, hiring teams use ATS filters that reward keyword stuffing, not real fit.

**The problem we solve:** How does a developer **discover real, current roles** that **actually match** their skills and experience — without living inside ten different sites or guessing which keywords to paste into a résumé?

---

## 2. Solution Overview

**SkillSync AI** is a **candidate-first job intelligence platform**. It **pulls live software jobs from the open web**, **understands both the job and the candidate** using AI, and **surfaces ranked matches** with actionable tools to apply with confidence.

**Core value proposition:**

| For the candidate | What it means |
|-------------------|---------------|
| **One place** | Browse and track roles sourced from multiple real-world feeds — not another generic job board clone. |
| **Fit, not noise** | Scores reflect skills, experience, and project signals — not just title matching. |
| **Action** | Tailor résumés, draft cover letters, prep for interviews, and track applications — not just “save and forget.” |

**In one line:** *SkillSync turns scattered job listings into a personalized pipeline from discovery to application.*

---

## 3. Key Features

### Discovery & matching
- **Live scraping** from sources such as RemoteOK, Arbeitnow, JSearch, and HN-style hiring threads — jobs are **fresh and real**, not stale database dumps.
- **AI job parsing** extracts skills, seniority, and requirements from messy descriptions.
- **Profile from your résumé + optional GitHub** — structured skills, experience, and project depth.
- **Match scores** with **skill-gap visibility** so candidates see *why* a role fits or what to learn next.

### Candidate workflow
- **Dashboard** with ranked recommendations, bookmarks, and “applied” tracking.
- **Job detail pages** with full description, similar roles, and one-click apply links to the original listing.
- **Résumé tailoring** — ATS-oriented feedback, keyword and format insights, **match-oriented suggestions**, and **AI-generated tailored résumé text** (honesty-first prompts).
- **Cover letter generator** tuned to the job + your profile.
- **Interview prep** — technical, behavioral (e.g. STAR), and role-relevant prompts.
- **Learning path** — prioritized upskill ideas and resources based on gaps across your matches.
- **Application tracker** — pipeline stages, notes, and history in one view.

### Why each matters
- **Scraping + parsing:** Solves *stale data* and *unstructured JDs* — the hard part of “real” job search.
- **Matching + gaps:** Moves from *keyword bingo* to *explainable fit*.
- **Tailoring + prep:** Reduces time-to-apply and interview anxiety — the gap between “I saw a job” and “I submitted something strong.”

---

## 4. Architecture (How It Fits Together)

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (React) — Dashboard, jobs, modals, auth UI         │
│  Tailwind · Zustand · REST client → API                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / JSON · JWT
┌───────────────────────────▼─────────────────────────────────┐
│  Express API — Auth, candidates, jobs, matches, agents       │
│  Rate limiting · CORS · validation                           │
└───────┬───────────────┬───────────────┬──────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────────────────┐
│ PostgreSQL   │ │ Scraping    │ │ AI layer (Nebius /        │
│ (e.g. Neon)  │ │ (HTTP APIs) │ │ OpenAI-compatible)        │
│ Users ·      │ │ RemoteOK ·  │ │ Chat: Llama 3.3 70B       │
│ candidates · │ │ Arbeitnow · │ │ Embeddings: Qwen3-8B      │
│ jobs ·       │ │ JSearch ·   │ │ Agents: profile, job      │
│ matches ·    │ │ HN Algolia  │ │   parse, tailor, cover,   │
│ applications │ │             │ │   interview prep, paths   │
└──────────────┘ └─────────────┘ └──────────────────────────┘
```

**Data flow (simplified):**

1. **Scrape** → new rows in `jobs` (deduped by source + id).
2. **Parse** (async) → structured skills and metadata on each job.
3. **Candidate** uploads résumé / GitHub → **profile** + optional **embedding** for similarity.
4. **Matching** runs candidate ↔ active jobs → **scores + skill gaps** stored in `matches`.
5. **Feedback** (bookmark, apply, ignore) feeds **learning weights** over time.
6. **Tailor / cover letter / prep** call the **LLM** with job + candidate context on demand — no duplicate storage of full résumé in prompts beyond what’s needed.

**Non-technical takeaway:** The browser talks to one API; the API owns data, rules, and AI calls; the database is the source of truth; AI is used **where judgment scales** (parse, write, explain) — not to replace the human decision to apply.

---

## 5. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js (Pages), React, Tailwind | Fast UI, SEO-friendly pages, component reuse, easy deploy story. |
| **State** | Zustand | Minimal boilerplate for auth and UI state. |
| **Backend** | Node.js + Express | Simple REST, fits team skills, easy to extend with routes and middleware. |
| **Database** | PostgreSQL (Neon or any host) | Relational model for users, jobs, matches, applications; JSON fields where flexible. |
| **Auth** | JWT + bcrypt | Stateless API auth for SPAs; passwords hashed at rest. |
| **AI** | Nebius (OpenAI-compatible API) | Llama-class chat for agents; embedding model for semantic similarity without vendor lock-in to a single cloud. |
| **HTTP** | Axios (frontend), axios/fetch (backend) | Scraping and external APIs from Node. |

**Deployment note:** Frontend and backend can live on separate hosts (e.g. Vercel + Railway/Render); only env vars and CORS need alignment.

---

## 6. What Makes It Different (USP)

| Typical pain | SkillSync angle |
|--------------|-----------------|
| One more job board with fake or reposted roles | **Aggregated live feeds** with scraping + deduplication |
| Black-box “% match” | **Explainable scores** + **skill gap** breakdown |
| Generic résumé tips | **Job-specific tailoring**, ATS-style feedback, and **generated draft** aligned to *that* JD |
| Tab overload (board + docs + notes + tracker) | **Single workflow**: match → tailor → cover letter → prep → **pipeline** |
| Recruiter-first tools | **Candidate-first** — no pay-to-play placement layer in the MVP story |

**Compared to “use ChatGPT for a cover letter”:** SkillSync **grounds** answers in **your stored profile**, **this job’s text**, and **your match history** — it’s a product, not a one-off prompt.

---

## 7. Future Scope (Vision)

- **Notifications** for high-match new roles after each scrape.
- **Salary / market** signals from aggregated listing data.
- **Stronger embeddings** in the matching loop (optional — already architected) for semantic “near match” discovery.
- **Portfolio / public profile** link for sharing proof of skills.
- **Scale:** Horizontal API instances, job queue for scrape + parse, read replicas for analytics.

---

## 8. Conclusion (Closing)

**Developers shouldn’t optimize for algorithms — they should optimize for careers.**

SkillSync AI uses **live data**, **transparent matching**, and **practical AI** to shrink the gap between “I’m qualified” and “they saw me.”  

**That’s SkillSync — real jobs, real fit, one place to act.**

---

### Delivery tips (3–5 minutes)

- **0:00–0:45** — Hook + problem (Section 1).  
- **0:45–1:30** — Solution + value (Section 2).  
- **1:30–2:30** — 3–4 killer features with “why it matters” (Section 3, pick highlights).  
- **2:30–3:30** — One architecture diagram walk + tech stack one-liners (Sections 4–5).  
- **3:30–4:15** — USP + one competitor contrast (Section 6).  
- **4:15–5:00** — Future + closing line (Sections 7–8).

Adjust depth for audience: **more architecture for engineers**, **more problem/solution story for business or faculty panels.**
