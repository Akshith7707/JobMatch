import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { candidates, matches as matchApi, jobs as jobsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Upload, Github, TrendingUp, Star, MapPin, DollarSign,
  ExternalLink, Bookmark, X, CheckCircle, AlertCircle,
  Loader2, RefreshCw, Globe, Clock
} from 'lucide-react';

const SOURCE_BADGES = {
  remoteok: { label: 'RemoteOK', color: 'bg-blue-100 text-blue-700' },
  arbeitnow: { label: 'Arbeitnow', color: 'bg-green-100 text-green-700' },
  jsearch: { label: 'JSearch', color: 'bg-purple-100 text-purple-700' },
  hackernews: { label: 'HN Hiring', color: 'bg-orange-100 text-orange-700' },
};

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'text-green-700 bg-green-50 border-green-200' :
    score >= 60 ? 'text-blue-700 bg-blue-50 border-blue-200' :
    score >= 40 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
    'text-gray-600 bg-gray-50 border-gray-200';
  return (
    <span className={`text-2xl font-bold rounded-xl px-4 py-2 border ${color}`}>
      {Math.round(score)}%
    </span>
  );
}

function SourceBadge({ source }) {
  const badge = SOURCE_BADGES[source] || { label: source, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
      {badge.label}
    </span>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [analyzingGithub, setAnalyzingGithub] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      const [profileRes, recRes] = await Promise.all([
        candidates.getProfile(),
        candidates.getRecommendations(),
      ]);
      setProfile(profileRes.data);
      setRecommendations(recRes.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, router, loadData]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await candidates.uploadResume(file);
      toast.success('Resume analyzed by AI!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    if (!githubUrl) return;
    setAnalyzingGithub(true);
    try {
      await candidates.submitGitHub(githubUrl);
      toast.success('GitHub profile analyzed!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setAnalyzingGithub(false);
    }
  };

  const handleScrapeJobs = async () => {
    setScraping(true);
    try {
      const { data } = await jobsApi.scrape();
      toast.success(`Found ${data.inserted} new jobs!`);
      loadData();
    } catch (err) {
      toast.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const handleFeedback = async (matchId, feedbackType) => {
    try {
      await matchApi.submitFeedback({ match_id: matchId, feedback_type: feedbackType });
      if (feedbackType === 'ignore') {
        setDismissed(prev => new Set([...prev, matchId]));
        toast('Job hidden', { icon: '👋' });
      } else if (feedbackType === 'bookmark') {
        toast.success('Job bookmarked!');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const skills = profile?.skills || [];
  const isProfileComplete = profile?.profile_complete;
  const visibleRecs = recommendations.filter(r => !dismissed.has(r.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
          <p className="text-gray-500">Your AI-powered job matches from across the web</p>
        </div>
        <button
          onClick={handleScrapeJobs}
          disabled={scraping}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${scraping ? 'animate-spin' : ''}`} />
          {scraping ? 'Scraping...' : 'Refresh Jobs'}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Completeness */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Profile Setup</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {profile?.resume_text ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={profile?.resume_text ? 'text-gray-900' : 'text-gray-400'}>
                  Resume uploaded
                </span>
              </div>
              <div className="flex items-center gap-3">
                {profile?.github_url ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={profile?.github_url ? 'text-gray-900' : 'text-gray-400'}>
                  GitHub connected
                </span>
              </div>
              <div className="flex items-center gap-3">
                {isProfileComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={isProfileComplete ? 'text-gray-900' : 'text-gray-400'}>
                  Profile complete
                </span>
              </div>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand-600" />
              Resume
            </h3>
            <label className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              uploading ? 'border-brand-300 bg-brand-50' : 'border-gray-300 hover:border-brand-400'
            }`}>
              <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  <span className="text-brand-600 text-sm">AI is analyzing...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {profile?.resume_text ? 'Upload new resume (PDF)' : 'Drop your resume here (PDF)'}
                  </p>
                </>
              )}
            </label>
          </div>

          {/* GitHub */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Github className="h-5 w-5 text-brand-600" />
              GitHub Profile
            </h3>
            <form onSubmit={handleGithubSubmit} className="space-y-3">
              <input
                type="url"
                className="input-field"
                placeholder="https://github.com/username"
                value={githubUrl || profile?.github_url || ''}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <button type="submit" className="btn-primary w-full text-sm" disabled={analyzingGithub}>
                {analyzingGithub ? 'Analyzing repos...' : profile?.github_url ? 'Re-analyze' : 'Analyze GitHub'}
              </button>
            </form>
          </div>

          {/* Extracted Skills */}
          {skills.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-brand-600" />
                AI-Detected Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => {
                  const s = typeof skill === 'string' ? { name: skill, level: 'intermediate' } : skill;
                  const levelColors = {
                    expert: 'bg-purple-100 text-purple-700',
                    advanced: 'bg-blue-100 text-blue-700',
                    intermediate: 'bg-green-100 text-green-700',
                    beginner: 'bg-gray-100 text-gray-700',
                  };
                  return (
                    <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium ${levelColors[s.level] || 'bg-gray-100 text-gray-700'}`}>
                      {s.name}
                    </span>
                  );
                })}
              </div>
              {profile?.experience_years > 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  Estimated experience: <span className="font-medium text-gray-700">{profile.experience_years} years</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Job Matches */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-brand-600" />
              Your Job Matches
            </h2>
            <span className="text-sm text-gray-500">{visibleRecs.length} matches</span>
          </div>

          {visibleRecs.length === 0 ? (
            <div className="card text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-4">
                {isProfileComplete
                  ? 'Try refreshing jobs to scrape the latest listings from across the web.'
                  : 'Complete your profile by uploading a resume and connecting GitHub to get AI-powered job matches.'}
              </p>
              {isProfileComplete && (
                <button onClick={handleScrapeJobs} disabled={scraping} className="btn-primary text-sm">
                  {scraping ? 'Scraping...' : 'Scrape Jobs Now'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRecs.map((match) => (
                <div key={match.id} className="card hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SourceBadge source={match.source} />
                        {match.remote && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            Remote
                          </span>
                        )}
                        {match.job_posted_at && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(match.job_posted_at)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight">{match.title}</h3>
                      <p className="text-gray-500 text-sm">{match.company}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {match.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {match.location}
                          </span>
                        )}
                        {(match.salary_min || match.salary_max) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {match.salary_min ? `$${(match.salary_min / 1000).toFixed(0)}k` : ''}
                            {match.salary_max ? `–$${(match.salary_max / 1000).toFixed(0)}k` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <ScoreBadge score={match.match_score} />
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-gray-700">{Math.round(match.skill_score || 0)}%</div>
                      <div className="text-xs text-gray-500">Skills</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-gray-700">{Math.round(match.experience_score || 0)}%</div>
                      <div className="text-xs text-gray-500">Experience</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-gray-700">{Math.round(match.project_score || 0)}%</div>
                      <div className="text-xs text-gray-500">Projects</div>
                    </div>
                  </div>

                  {match.match_reasons && match.match_reasons.length > 0 && (
                    <p className="text-sm text-gray-600 mt-3 bg-brand-50 rounded-lg px-3 py-2">
                      {match.match_reasons.join(' | ')}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4">
                    <a
                      href={match.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleFeedback(match.id, 'click')}
                      className="btn-primary text-sm !py-2 flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Job
                    </a>
                    <button
                      onClick={() => handleFeedback(match.id, 'bookmark')}
                      className={`btn-secondary text-sm !py-2 flex items-center gap-1.5 ${
                        match.status === 'bookmarked' ? '!bg-yellow-50 !text-yellow-700 !border-yellow-300' : ''
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${match.status === 'bookmarked' ? 'fill-current' : ''}`} />
                      {match.status === 'bookmarked' ? 'Saved' : 'Bookmark'}
                    </button>
                    <button
                      onClick={() => handleFeedback(match.id, 'ignore')}
                      className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" /> Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
