require('dotenv').config();
const pool = require('./pool');

const migration = `
-- Drop old tables to rebuild schema
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS match_weights CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (candidates only)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidate profiles
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  github_url VARCHAR(500),
  resume_text TEXT,

  skills JSONB DEFAULT '[]',
  experience_years NUMERIC(4,1) DEFAULT 0,
  project_complexity_score NUMERIC(3,1) DEFAULT 0,
  tech_stack JSONB DEFAULT '[]',
  github_stats JSONB DEFAULT '{}',
  skill_embedding TEXT,
  ai_profile JSONB DEFAULT '{}',

  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Jobs table (scraped from external sources)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(30) NOT NULL,
  source_id VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,

  title VARCHAR(500) NOT NULL,
  company VARCHAR(500),
  description TEXT,
  location VARCHAR(500),
  remote BOOLEAN DEFAULT FALSE,
  salary_min INTEGER,
  salary_max INTEGER,
  tags JSONB DEFAULT '[]',
  posted_at TIMESTAMP,

  required_skills JSONB DEFAULT '[]',
  preferred_skills JSONB DEFAULT '[]',
  experience_min NUMERIC(4,1) DEFAULT 0,
  experience_max NUMERIC(4,1),
  ai_parsed JSONB DEFAULT '{}',
  job_embedding TEXT,
  parsed BOOLEAN DEFAULT FALSE,

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'removed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(source, source_id)
);

-- Match results
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

  match_score NUMERIC(5,2) NOT NULL,
  skill_score NUMERIC(5,2),
  experience_score NUMERIC(5,2),
  project_score NUMERIC(5,2),

  match_reasons JSONB DEFAULT '[]',
  detailed_breakdown JSONB DEFAULT '{}',

  status VARCHAR(20) DEFAULT 'new'
    CHECK (status IN ('new', 'viewed', 'bookmarked', 'applied', 'ignored')),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(candidate_id, job_id)
);

-- Feedback for learning loop (candidate actions only)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  feedback_type VARCHAR(30) NOT NULL
    CHECK (feedback_type IN ('apply', 'bookmark', 'ignore', 'click')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Adjustable scoring weights
CREATE TABLE match_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_weight NUMERIC(3,2) DEFAULT 0.40,
  experience_weight NUMERIC(3,2) DEFAULT 0.25,
  project_weight NUMERIC(3,2) DEFAULT 0.20,
  culture_weight NUMERIC(3,2) DEFAULT 0.15,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO match_weights (skill_weight, experience_weight, project_weight, culture_weight, version, active)
VALUES (0.40, 0.25, 0.20, 0.15, 1, true);

-- Application pipeline tracker
DROP TABLE IF EXISTS applications CASCADE;
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  stage VARCHAR(30) DEFAULT 'applied'
    CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn')),
  notes TEXT DEFAULT '',
  applied_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Notifications
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved resume versions
DROP TABLE IF EXISTS resume_versions CASCADE;
CREATE TABLE resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  label VARCHAR(200) NOT NULL,
  resume_text TEXT NOT NULL,
  skills JSONB DEFAULT '[]',
  ai_profile JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cover letters
DROP TABLE IF EXISTS cover_letters CASCADE;
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Mock interview sessions
DROP TABLE IF EXISTS mock_interviews CASCADE;
CREATE TABLE mock_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  score NUMERIC(5,2),
  feedback TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidates_user_id ON candidates(user_id);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted ON jobs(posted_at DESC);
CREATE INDEX idx_matches_candidate ON matches(candidate_id);
CREATE INDEX idx_matches_job ON matches(job_id);
CREATE INDEX idx_matches_score ON matches(match_score DESC);
CREATE INDEX idx_feedback_match ON feedback(match_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_stage ON applications(stage);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_resume_versions_candidate ON resume_versions(candidate_id);
CREATE INDEX idx_mock_interviews_candidate ON mock_interviews(candidate_id);
`;

async function migrate() {
  try {
    await pool.query(migration);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
