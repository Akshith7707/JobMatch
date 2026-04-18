import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { candidates, matches as matchApi, jobs as jobsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Upload, Github, TrendingUp, Star, MapPin, DollarSign,
  ExternalLink, Bookmark, X, CheckCircle, AlertCircle,
  Loader2, RefreshCw, Globe, Clock, Send, ChevronDown,
  ChevronUp, Check, XCircle, FileText, Wand2,
  Target, Lightbulb, Plus, AlertTriangle, Copy, Download,
  Sparkles, ArrowRight, BrainCircuit
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

function SkillGapBar({ skillGap }) {
  if (!skillGap || (!skillGap.matched?.length && !skillGap.missing?.length)) return null;
  const coverage = skillGap.coverage ?? 0;
  const barColor = coverage >= 80 ? 'bg-green-500' :
    coverage >= 60 ? 'bg-blue-500' :
    coverage >= 40 ? 'bg-yellow-500' : 'bg-red-400';

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Skill Match</span>
        <span className={`text-xs font-bold ${
          coverage >= 80 ? 'text-green-600' : coverage >= 60 ? 'text-blue-600' :
          coverage >= 40 ? 'text-yellow-600' : 'text-red-500'
        }`}>
          {coverage}% coverage
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(coverage, 3)}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skillGap.matched?.map((s, i) => (
          <span key={`m-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <Check className="h-3 w-3" /> {s.name}
          </span>
        ))}
        {skillGap.missing?.map((s, i) => (
          <span key={`x-${i}`} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200">
            <XCircle className="h-3 w-3" /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreColumn({ label, score, subLabel, subValue, size = 92 }) {
  const stroke = 6;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const n = Number(score);
  const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 80 ? '#15803d' : clamped >= 60 ? '#1d4ed8' : clamped >= 40 ? '#b45309' : '#b91c1c';

  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center">
      <p className="min-h-[2.5rem] max-w-[10rem] text-[0.7rem] font-semibold uppercase leading-snug tracking-wide text-brand-800">
        {label}
      </p>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e7e5e4"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display text-[1.65rem] font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      {subLabel != null && subLabel !== '' && (
        <div className="flex w-full flex-col gap-0.5 border-t border-brand-200/80 pt-3">
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-600">{subLabel}</p>
          <p className="text-sm font-semibold text-brand-900 break-words">{subValue ?? '—'}</p>
        </div>
      )}
    </div>
  );
}

// Legacy alias: older JSX uses <ScoreRing score label /> only (no sub-metrics row)
function ScoreRing({ score, label }) {
  return <ScoreColumn label={label} score={score} />;
}

function TailorModal({ data, onClose }) {
  const [tab, setTab] = useState('overview');
  const [generatedResume, setGeneratedResume] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const ats = data.ats_details || {};
  const tailor = data.tailor_suggestions || {};

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: result } = await candidates.generateTailoredResume(data.job_id, tailor);
      setGeneratedResume(result.tailored_resume);
      setTab('generated');
      toast.success('Tailored resume generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate resume');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedResume);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedResume;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedResume || typeof generatedResume !== 'string') {
      toast.error('Generate the resume first, then download.');
      return;
    }
    const safeName = (data.job_title || 'job').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const blob = new Blob([generatedResume], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Resume_Tailored_${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Resume downloaded!');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'keywords', label: 'Keywords', icon: FileText },
    { id: 'rewrite', label: 'Rewrite', icon: Wand2 },
    { id: 'actions', label: 'Actions', icon: Lightbulb },
  ];
  if (generatedResume) {
    tabs.push({ id: 'generated', label: 'Generated', icon: Sparkles });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-brand-600" />
              Resume Tailor for {data.job_title}
            </h2>
            <p className="text-sm text-gray-500">{data.job_company}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score columns: label → ring + main number → sub-metric (no overlapping rows) */}
        <div className="border-b border-brand-200 bg-brand-50/80 px-4 py-6 sm:px-6">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
            <ScoreColumn
              label="ATS score"
              score={ats.ats_score || 0}
              subLabel="Keywords"
              subValue={`${ats.keyword_density_score ?? 0}%`}
            />
            <ScoreColumn
              label="Match after tailoring"
              score={data.match_score_after_tailoring || 0}
              subLabel="Formatting"
              subValue={`${ats.section_score ?? 0}%`}
            />
            <ScoreColumn
              label="Relevance"
              score={ats.experience_relevance_score || 0}
              subLabel="Confidence"
              subValue={
                typeof tailor.confidence === 'string'
                  ? tailor.confidence
                  : tailor.confidence != null
                    ? String(tailor.confidence)
                    : '—'
              }
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {tab === 'overview' && (
            <div className="space-y-4">
              {ats.overall_feedback && (
                <div className="bg-brand-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">ATS Feedback</h4>
                  <p className="text-sm text-gray-700">{ats.overall_feedback}</p>
                </div>
              )}
              {tailor.tailored_summary && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-1.5">
                    <Wand2 className="h-4 w-4 text-green-600" /> AI-Tailored Summary
                  </h4>
                  <p className="text-sm text-gray-700 italic">&ldquo;{tailor.tailored_summary}&rdquo;</p>
                </div>
              )}
              {ats.format_issues?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" /> Format Issues
                  </h4>
                  <ul className="space-y-1">
                    {ats.format_issues.map((issue, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">&#8226;</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'keywords' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-3">Keyword Analysis</h4>
                <div className="flex flex-wrap gap-2">
                  {(ats.keyword_matches || []).map((kw, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      kw.found
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {kw.found ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
              {tailor.keywords_to_add?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-blue-500" /> Add These Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tailor.keywords_to_add.map((kw, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        + {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tailor.keywords_to_emphasize?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">Emphasize More</h4>
                  <div className="flex flex-wrap gap-2">
                    {tailor.keywords_to_emphasize.map((kw, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'rewrite' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Improved Experience Bullets</h4>
              {(tailor.tailored_experience_bullets || []).map((b, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">Before</span>
                    <p className="text-sm text-gray-500 line-through">{b.original}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">After</span>
                    <p className="text-sm text-gray-900 font-medium">{b.improved}</p>
                  </div>
                </div>
              ))}
              {tailor.tailored_skills?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">Recommended Skills Section</h4>
                  <div className="flex flex-wrap gap-2">
                    {tailor.tailored_skills.map((s, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Action Items (by impact)</h4>
              {(tailor.action_items || []).map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
              {tailor.sections_to_add?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">Sections to Add</h4>
                  <div className="flex flex-wrap gap-2">
                    {tailor.sections_to_add.map((s, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200">
                        + {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'generated' && generatedResume && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" /> AI-Generated Tailored Resume
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt
                  </button>
                </div>
              </div>
              <pre className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-[60vh] overflow-y-auto">
                {generatedResume}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            AI analysis powered by Llama 3.3 70B. Only add truthful experience.
          </p>
          {!generatedResume && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Tailored Resume
                </>
              )}
            </button>
          )}
          {generatedResume && tab !== 'generated' && (
            <button
              onClick={() => setTab('generated')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              View Generated Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({ match, onFeedback, onTailor, hasResume }) {
  const [expanded, setExpanded] = useState(false);

  const breakdown = match.detailed_breakdown || {};
  const skillGap = breakdown.skill_gap || null;
  const isBookmarked = match.status === 'bookmarked';
  const isApplied = match.status === 'applied';

  return (
    <div className="card hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SourceBadge source={match.source} />
            {match.remote && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Remote</span>
            )}
            {match.job_posted_at && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(match.job_posted_at)}
              </span>
            )}
            {isApplied && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Applied</span>
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

      {skillGap && (skillGap.matched?.length > 0 || skillGap.missing?.length > 0) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Hide' : 'Show'} Skill Gap Analysis
            {skillGap.coverage != null && (
              <span className="text-xs text-gray-400 ml-1">({skillGap.coverage}% match)</span>
            )}
          </button>
          {expanded && <SkillGapBar skillGap={skillGap} />}
        </>
      )}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Link href={`/jobs/${match.job_id}`}
          className="btn-primary text-sm !py-2 flex items-center gap-1.5">
          <ArrowRight className="h-4 w-4" /> Details
        </Link>
        <a href={match.url} target="_blank" rel="noopener noreferrer"
          onClick={() => onFeedback(match.id, 'click')}
          className="btn-secondary text-sm !py-2 flex items-center gap-1.5">
          <ExternalLink className="h-4 w-4" /> Apply
        </a>
        {hasResume && (
          <button onClick={() => onTailor(match.job_id)}
            className="btn-secondary text-sm !py-2 flex items-center gap-1.5 !bg-purple-50 !text-purple-700 !border-purple-200 hover:!bg-purple-100">
            <Wand2 className="h-4 w-4" /> Tailor
          </button>
        )}
        <Link href={`/interview-prep?job=${match.job_id}`}
          className="btn-secondary text-sm !py-2 flex items-center gap-1.5 !bg-orange-50 !text-orange-700 !border-orange-200 hover:!bg-orange-100">
          <BrainCircuit className="h-4 w-4" /> Prep
        </Link>
        {!isApplied && (
          <button onClick={() => onFeedback(match.id, 'apply')}
            className="btn-secondary text-sm !py-2 flex items-center gap-1.5 !bg-green-50 !text-green-700 !border-green-200 hover:!bg-green-100">
            <Send className="h-4 w-4" /> Applied
          </button>
        )}
        <button onClick={() => onFeedback(match.id, 'bookmark')}
          className={`btn-secondary text-sm !py-2 flex items-center gap-1.5 ${isBookmarked ? '!bg-yellow-50 !text-yellow-700 !border-yellow-300' : ''}`}>
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
        <button onClick={() => onFeedback(match.id, 'ignore')}
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
  const [tailorData, setTailorData] = useState(null);
  const [tailoring, setTailoring] = useState(null);

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
      toast.success(`Found ${data.inserted} new jobs! AI parsing in progress...`);
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
        setRecommendations(prev =>
          prev.map(r => r.id === matchId ? { ...r, status: 'bookmarked' } : r)
        );
        toast.success('Job saved!');
      } else if (feedbackType === 'apply') {
        setRecommendations(prev =>
          prev.map(r => r.id === matchId ? { ...r, status: 'applied' } : r)
        );
        toast.success('Marked as applied!');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  const handleTailor = async (jobId) => {
    setTailoring(jobId);
    try {
      const { data } = await candidates.tailorResume(jobId);
      setTailorData(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Resume tailoring failed');
    } finally {
      setTailoring(null);
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
  const hasResume = !!profile?.resume_text;
  const visibleRecs = recommendations.filter(r => !dismissed.has(r.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tailor Modal */}
      {tailorData && (
        <TailorModal data={tailorData} onClose={() => setTailorData(null)} />
      )}

      {/* Tailoring Loader */}
      {tailoring && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm mx-4">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Analyzing Your Resume</h3>
            <p className="text-sm text-gray-500">AI is calculating ATS score, match score, and generating tailored suggestions...</p>
          </div>
        </div>
      )}

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
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Profile Setup</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {hasResume ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                )}
                <span className={hasResume ? 'text-gray-900' : 'text-gray-400'}>
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
                    {hasResume ? 'Upload new resume (PDF)' : 'Drop your resume here (PDF)'}
                  </p>
                </>
              )}
            </label>
          </div>

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
                <JobCard
                  key={match.id}
                  match={match}
                  onFeedback={handleFeedback}
                  onTailor={handleTailor}
                  hasResume={hasResume}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
