# SkillSync AI — Pitch Timeline, Pages & Script  
*4–5 minute recording · easy English*

Use this file while you record: follow **Time** → open **Page** → say **What to say**.

---

## Before you start

| Step | Action |
|------|--------|
| 1 | Start **backend** (`backend`: `npm run dev`) and **frontend** (`frontend`: `npm run dev`). |
| 2 | Open **http://localhost:3000** in full screen. |
| 3 | **Log in** so Dashboard has matches (upload résumé + GitHub if needed, click **Refresh Jobs** once). |
| 4 | Close extra tabs. Set zoom to **100%**. |

---

## Timeline (overview)

| Block | Time | Page to show | Goal |
|-------|------|--------------|------|
| A | 0:00 – 0:50 | `/` | Hook + problem |
| B | 0:50 – 1:40 | `/` or `/login` | What SkillSync does (simple) |
| C | 1:40 – 2:50 | `/dashboard` | Matches + actions |
| D | 2:50 – 3:50 | `/dashboard` + modals OR `/jobs` + `/applications` | Features: tailor, browse, tracker |
| E | 3:50 – 4:40 | Any app page (voice over) | Tech + why different |
| F | 4:40 – 5:10 | `/` or `/dashboard` | Thank you + end |

---

## Block A — 0:00 to 0:50 (Hook)

**Page:** `http://localhost:3000/` (home)

**What to show:** Hero section + scroll slightly to “features” if you have time.

**What to say:**

- Hello, I am **[your name]**. I will present **SkillSync AI**.
- Many developers waste time on **job sites** that repeat the same posts or show **jobs that do not fit**.
- **Applicant tracking systems** often look for **keywords**, not always **real skills**.
- **SkillSync** brings **live jobs from the web**, **matches them to your profile**, and helps you **apply with confidence** — résumé, cover letter, and interview prep **in one workflow**.

---

## Block B — 0:50 to 1:40 (Solution in plain words)

**Page:** Stay on **`/`** OR show **`/login`** for a few seconds (optional).

**What to show:** If on login: email field only, or say “users sign in here” without typing password slowly.

**What to say:**

- **Step one:** You **upload your résumé** as a PDF. You can also add your **GitHub** link.
- Our system **reads your skills** and **experience** and builds your profile.
- **Step two:** We **scrape fresh job listings** from sources like **RemoteOK** and others — so listings are **current**, not a dead database.
- **Step three:** **AI matches** you to jobs. You see a **score** and a **skill gap** view — so you understand **why** a job fits or **what to learn next**.

---

## Block C — 1:40 to 2:50 (Dashboard)

**Page:** `http://localhost:3000/dashboard`

**What to show:** Scroll through **one or two match cards**. Point to score, skills area, buttons.

**What to say:**

- This is the **main dashboard**. These are **my personalized matches**, ordered by **fit**.
- Each card shows the **match score**, **skill match**, and short **reasons**.
- I can **open the real job** on the original site, **save** a job, mark **applied**, go to **details**, or open **interview prep** from here.
- I can click **Refresh Jobs** to **pull new listings** and **update matches**.

---

## Block D — 2:50 to 3:50 (Key features on screen)

Use **short visits** — about **20–30 seconds per item**.

### D1 — Résumé tailor (optional but strong)

**Page:** On **`/dashboard`**, click **Tailor** on one job.

**What to show:** Top **scores**, one **tab** (Overview or Keywords), then close modal.

**What to say:**

- For any job I can use **Résumé tailor**. It gives **ATS-style feedback**, **keywords**, and **actions** to improve my résumé for **this role**.
- I can also **generate a tailored résumé draft** and **download** it.

### D2 — Browse jobs (public)

**Page:** `http://localhost:3000/jobs`

**What to show:** Scroll a few cards, click **View Details** on one if you have time.

**What to say:**

- Anyone can **browse scraped jobs** without logging in — **search and filters** by skill or source.
- From **job details** I can open **cover letter** and **interview prep** when I am logged in.

### D3 — Application tracker

**Page:** `http://localhost:3000/applications`

**What to show:** Scroll Kanban or list; one **stage** change optional.

**What to say:**

- **Application tracker** helps me move from **applied** to **screening**, **interview**, and add **notes** so nothing is lost.

### D4 — Learning path (quick)

**Page:** `http://localhost:3000/learning`

**What to show:** Scroll once.

**What to say:**

- **Learning path** suggests **resources** for **skills I am missing** across my matches.

*If you run out of time, skip D4 or D2 — keep **D1** (tailor) and **D3** (tracker).*

---

## Block E — 3:50 to 4:40 (Tech + USP)

**Page:** No change needed — stay on **`/dashboard`** or **`/jobs`** while you talk.  
*(Or show `README.md` / `pitch.md` in editor for 5 seconds only if allowed.)*

**What to say:**

- **Frontend:** **Next.js** and **React** — fast UI and easy to deploy.
- **Backend:** **Node.js** and **Express** — REST API, **JWT** login, **secure** passwords.
- **Database:** **PostgreSQL** — we use **Neon** or any Postgres host.
- **AI:** **Nebius** API with **Llama** for text and **embedding models** for similarity — so matching is **not only keyword search**.
- **Why different:** We combine **live aggregation**, **explained matching**, and **action tools** — tailor, letter, prep, tracker — **together**, not as separate random tools.

---

## Block F — 4:40 to 5:10 (Close)

**Page:** `http://localhost:3000/` **or** clean view of **`/dashboard`**

**What to say:**

- SkillSync helps developers turn **many noisy listings** into **clear matches** and **stronger applications**.
- Thank you for watching. I welcome **questions**.

**Then:** Stop recording.

---

## Quick copy — one-line reminders per minute

| Minute | Page | One line |
|--------|------|----------|
| 0 | `/` | Problem: noisy jobs + ATS · Solution: SkillSync |
| 1 | `/` or login | Résumé + GitHub · scrape jobs · AI match |
| 2 | `/dashboard` | My matches · scores · actions |
| 3 | tailor + `/jobs` or `/applications` | Tailor · browse · track |
| 4 | voice over | Stack + why different |
| 5 | `/` | Thanks |

---

## Page list (all routes for reference)

| Route | Name |
|-------|------|
| `/` | Home |
| `/login` | Login |
| `/register` | Register |
| `/dashboard` | Dashboard (matches) |
| `/jobs` | Browse jobs |
| `/jobs/[id]` | Job detail |
| `/applications` | Application tracker |
| `/learning` | Learning path |
| `/saved` | Saved jobs |

---

*File: `PITCH-TIMELINE.md` — SkillSync project.*
