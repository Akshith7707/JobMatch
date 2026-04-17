import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { candidates, matches as matchApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Bookmark, Send, MapPin, DollarSign, ExternalLink, Loader2,
  Clock, Trash2, CheckCircle2
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

export default function SavedJobs() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState('bookmarked');
  const [bookmarked, setBookmarked] = useState([]);
  const [applied, setApplied] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadAll();
  }, [isAuthenticated, router]);

  async function loadAll() {
    setLoading(true);
    try {
      const [bRes, aRes] = await Promise.all([
        candidates.getBookmarked(),
        candidates.getApplied(),
      ]);
      setBookmarked(bRes.data);
      setApplied(aRes.data);
    } catch {
      toast.error('Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(matchId) {
    try {
      await matchApi.submitFeedback({ match_id: matchId, feedback_type: 'apply' });
      toast.success('Marked as applied!');
      loadAll();
    } catch {
      toast.error('Action failed');
    }
  }

  async function handleRemove(matchId) {
    try {
      await matchApi.submitFeedback({ match_id: matchId, feedback_type: 'ignore' });
      toast('Removed from saved', { icon: '🗑️' });
      loadAll();
    } catch {
      toast.error('Action failed');
    }
  }

  const items = tab === 'bookmarked' ? bookmarked : applied;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Jobs</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('bookmarked')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'bookmarked'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          Bookmarked ({bookmarked.length})
        </button>
        <button
          onClick={() => setTab('applied')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'applied'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Send className="h-4 w-4" />
          Applied ({applied.length})
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-16">
          {tab === 'bookmarked' ? (
            <>
              <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarked jobs</h3>
              <p className="text-gray-500">Bookmark jobs from your dashboard to save them here</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications tracked</h3>
              <p className="text-gray-500">Mark jobs as "Applied" to track your applications</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((match) => {
            const badge = SOURCE_BADGES[match.source] || { label: match.source, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={match.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      {match.remote && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Remote</span>
                      )}
                      {match.job_posted_at && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(match.job_posted_at)}
                        </span>
                      )}
                      {tab === 'applied' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          Applied
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">{match.title}</h3>
                    <p className="text-sm text-gray-500">{match.company}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
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

                  <span className="text-xl font-bold text-brand-600">{Math.round(match.match_score)}%</span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <a
                    href={match.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-sm !py-2 flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Job
                  </a>
                  {tab === 'bookmarked' && (
                    <button
                      onClick={() => handleApply(match.id)}
                      className="btn-secondary text-sm !py-2 flex items-center gap-1.5 !bg-green-50 !text-green-700 !border-green-200 hover:!bg-green-100"
                    >
                      <Send className="h-4 w-4" />
                      Mark Applied
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(match.id)}
                    className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
