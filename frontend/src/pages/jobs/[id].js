import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { jobs as jobsApi, candidates, matches as matchApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  MapPin, DollarSign, ExternalLink, Loader2, Clock, ArrowLeft,
  FileText, Building2, BrainCircuit
} from 'lucide-react';

const SOURCE_BADGES = {
  remoteok: { label: 'RemoteOK', color: 'bg-blue-100 text-blue-700' },
  arbeitnow: { label: 'Arbeitnow', color: 'bg-green-100 text-green-700' },
  jsearch: { label: 'JSearch', color: 'bg-purple-100 text-purple-700' },
  hackernews: { label: 'HN Hiring', color: 'bg-orange-100 text-orange-700' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuthStore();
  const [job, setJob] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState(null);
  const [generatingCL, setGeneratingCL] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      jobsApi.get(id).then(r => setJob(r.data)).catch(() => {}),
      jobsApi.getSimilar(id).then(r => setSimilar(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleCoverLetter = async () => {
    setGeneratingCL(true);
    try {
      const { data } = await candidates.generateCoverLetter(id);
      setCoverLetter(data.content);
      toast.success('Cover letter generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate cover letter');
    } finally {
      setGeneratingCL(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">Job not found</h2>
        <Link href="/jobs" className="text-brand-600 hover:underline mt-2 inline-block">Back to jobs</Link>
      </div>
    );
  }

  const badge = SOURCE_BADGES[job.source] || { label: job.source, color: 'bg-gray-100 text-gray-600' };
  const skills = Array.isArray(job.required_skills) ? job.required_skills.map(s => typeof s === 'string' ? s : s.name) : [];
  const prefSkills = Array.isArray(job.preferred_skills) ? job.preferred_skills.map(s => typeof s === 'string' ? s : s.name) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Browse Jobs
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`px-2.5 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>
              {job.remote && <span className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Remote</span>}
              {job.posted_at && (
                <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" /> {timeAgo(job.posted_at)}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 font-medium">{job.company || 'Company not listed'}</span>
            </div>

            <div className="flex items-center gap-5 mt-3 text-sm text-gray-500">
              {job.location && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
              )}
              {(job.salary_min || job.salary_max) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {job.salary_min ? `$${(job.salary_min / 1000).toFixed(0)}k` : ''}
                  {job.salary_max ? ` – $${(job.salary_max / 1000).toFixed(0)}k` : ''}
                </span>
              )}
              {job.experience_min > 0 && (
                <span>{job.experience_min}{job.experience_max ? `–${job.experience_max}` : '+'} years</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Apply on {badge.label}
              </a>
              {isAuthenticated && (
                <>
                  <button onClick={handleCoverLetter} disabled={generatingCL}
                    className="btn-secondary flex items-center gap-2 text-sm !bg-purple-50 !text-purple-700 !border-purple-200 hover:!bg-purple-100">
                    {generatingCL ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {generatingCL ? 'Generating...' : 'Cover Letter'}
                  </button>
                  <Link href={`/interview-prep?job=${id}`}
                    className="btn-secondary flex items-center gap-2 text-sm !bg-orange-50 !text-orange-700 !border-orange-200 hover:!bg-orange-100">
                    <BrainCircuit className="h-4 w-4" /> Interview Prep
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          {coverLetter && (
            <div className="card bg-purple-50 border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" /> Generated Cover Letter
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{coverLetter}</pre>
              <button onClick={() => { navigator.clipboard.writeText(coverLetter); toast.success('Copied!'); }}
                className="btn-secondary text-xs mt-4">Copy to Clipboard</button>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="prose prose-sm prose-gray max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{job.description}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {skills.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">{s}</span>
                ))}
              </div>
            </div>
          )}

          {prefSkills.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Nice to Have</h3>
              <div className="flex flex-wrap gap-2">
                {prefSkills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">{s}</span>
                ))}
              </div>
            </div>
          )}

          {similar.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Similar Jobs</h3>
              <div className="space-y-3">
                {similar.map(s => (
                  <Link key={s.id} href={`/jobs/${s.id}`}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.company}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      {s.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{s.location}</span>}
                      {s.salary_max && <span>${(s.salary_max / 1000).toFixed(0)}k</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
