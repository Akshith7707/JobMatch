# SkillSync AI — Autonomous Job Matching Platform

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Landing   │  │ Candidate │  │ Recruiter│  │ Job Creation │  │
│  │ Page      │  │ Dashboard │  │ Dashboard│  │ Page         │  │
│  └──────────┘  └───────────┘  └──────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────────┐
│                     API GATEWAY (Express)                       │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌────────────────┐   │
│  │ Auth │ │ CORS │ │ Rate   │ │ Error  │ │ Request        │   │
│  │      │ │      │ │ Limit  │ │ Handler│ │ Validation     │   │
│  └──────┘ └──────┘ └────────┘ └────────┘ └────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    AGENT ORCHESTRATOR                            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Profile Agent │  │ Job Parsing  │  │ Matching Agent       │  │
│  │              │  │ Agent        │  │                      │  │
│  │ IN: resume,  │  │ IN: job desc │  │ IN: candidate +     │  │
│  │     github   │  │ OUT: parsed  │  │     job profiles     │  │
│  │ OUT: profile │  │     skills   │  │ OUT: match score     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │ Ranking Agent│  │ Learning Agent                       │    │
│  │              │  │                                      │    │
│  │ IN: matches  │  │ IN: feedback (hire/reject/apply)     │    │
│  │ OUT: ranked  │  │ OUT: adjusted weights                │    │
│  │     list     │  │                                      │    │
│  └──────────────┘  └──────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ PostgreSQL   │  │ Embeddings   │  │ GitHub API           │  │
│  │ (Primary DB) │  │ Cache (pgvec)│  │ (External)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Candidate Signs Up
  → uploads resume (PDF) + GitHub URL
  → Profile Agent extracts skills via AI
  → Embeddings generated and stored
  → Matching Agent runs against open jobs
  → Ranked job recommendations shown

Recruiter Posts Job
  → enters job description
  → Job Parsing Agent extracts requirements
  → Matching Agent runs against candidates
  → Ranked candidate list shown

Feedback Loop
  → Recruiter shortlists/rejects candidates
  → Candidate applies/ignores jobs
  → Learning Agent adjusts match weights
  → Future matches improve
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| POST | /api/candidates/profile | Create candidate profile |
| POST | /api/candidates/resume | Upload resume |
| GET | /api/candidates/recommendations | Get job matches |
| POST | /api/jobs | Create job posting |
| GET | /api/jobs/:id/candidates | Get matched candidates |
| POST | /api/matches/feedback | Submit feedback |
| GET | /api/agents/profile/:id | Run profile agent |
| GET | /api/agents/match/:jobId | Run matching agent |
