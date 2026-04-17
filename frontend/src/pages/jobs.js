import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { jobs as jobsApi } from '@/lib/api';
import {
  Search, MapPin, DollarSign, Globe, ExternalLink,
  Loader2, ChevronLeft, ChevronRight, SlidersHorizontal, Clock, ArrowRight
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

export default function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ skills: '', remote: false, source: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [sources, setSources] = useState([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.skills) params.skills = filters.skills;
      if (filters.remote) params.remote = 'true';
      if (filters.source) params.source = filters.source;

      const { data } = await jobsApi.list(params);
      setJobs(data.jobs);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    jobsApi.sourceStats().then(({ data }) => setSources(data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Globe className="h-8 w-8 text-brand-600" />
          Browse Jobs
        </h1>
        <p className="text-gray-500 mt-1">
          {total} jobs scraped from across the web — no account needed to browse
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="input-field !pl-10"
              placeholder="Search by skill, title, or keyword..."
              value={filters.skills}
              onChange={(e) => setFilters(f => ({ ...f, skills: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Search</button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-sm flex items-center gap-1.5 ${showFilters ? '!bg-brand-50 !border-brand-300' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </form>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.remote}
                onChange={(e) => { setFilters(f => ({ ...f, remote: e.target.checked })); setPage(1); }}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Remote Only
            </label>

            <select
              value={filters.source}
              onChange={(e) => { setFilters(f => ({ ...f, source: e.target.value })); setPage(1); }}
              className="input-field !w-auto text-sm"
            >
              <option value="">All Sources</option>
              {sources.map(s => (
                <option key={s.source} value={s.source}>
                  {SOURCE_BADGES[s.source]?.label || s.source} ({s.count})
                </option>
              ))}
            </select>

            <button
              onClick={() => { setFilters({ skills: '', remote: false, source: '' }); setPage(1); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const badge = SOURCE_BADGES[job.source] || { label: job.source, color: 'bg-gray-100 text-gray-600' };
              const tags = Array.isArray(job.tags) ? job.tags : [];
              const reqSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
              const displaySkills = reqSkills.length > 0
                ? reqSkills.map(s => typeof s === 'string' ? s : s.name)
                : tags;

              return (
                <div key={job.id} className="card hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                    {job.remote && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Remote</span>
                    )}
                    {job.posted_at && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {timeAgo(job.posted_at)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 leading-tight">{job.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>

                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {job.salary_min ? `$${(job.salary_min / 1000).toFixed(0)}k` : ''}
                        {job.salary_max ? `–$${(job.salary_max / 1000).toFixed(0)}k` : ''}
                      </span>
                    )}
                  </div>

                  {displaySkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {displaySkills.slice(0, 6).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          {skill}
                        </span>
                      ))}
                      {displaySkills.length > 6 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-400">
                          +{displaySkills.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-2">
                    <Link href={`/jobs/${job.id}`}
                      className="btn-primary text-sm !py-2 flex items-center gap-1.5 justify-center flex-1">
                      <ArrowRight className="h-4 w-4" />
                      View Details
                    </Link>
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-sm !py-2 flex items-center gap-1.5">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
