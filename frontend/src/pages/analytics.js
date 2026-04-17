import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { candidates } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Loader2, BarChart3, TrendingUp, Target, PieChart,
  Briefcase, Eye, Bookmark, Send, XCircle, Sparkles
} from 'lucide-react';

const STATUS_ICONS = { new: Target, viewed: Eye, bookmarked: Bookmark, applied: Send, ignored: XCircle };
const STATUS_COLORS = { new: 'text-blue-600 bg-blue-50', viewed: 'text-gray-600 bg-gray-50', bookmarked: 'text-yellow-600 bg-yellow-50', applied: 'text-green-600 bg-green-50', ignored: 'text-red-500 bg-red-50' };
const STAGE_COLORS = { applied: 'bg-blue-500', screening: 'bg-yellow-500', interview: 'bg-purple-500', offer: 'bg-green-500', rejected: 'bg-red-400', accepted: 'bg-emerald-600', withdrawn: 'bg-gray-400' };

function MiniBar({ label, value, max, color = 'bg-brand-500' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

export default function Analytics() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    candidates.getAnalytics().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
  if (!data) return <div className="max-w-5xl mx-auto px-4 py-16 text-center"><h2 className="text-xl font-bold">No data yet</h2></div>;

  const overview = data.overview || {};
  const maxSkillDemand = Math.max(...(data.top_skills_in_demand || []).map(s => parseInt(s.demand)), 1);
  const maxDist = Math.max(...(data.score_distribution || []).map(s => parseInt(s.count)), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <BarChart3 className="h-7 w-7 text-brand-600" /> Analytics
      </h1>
      <p className="text-gray-500 mb-8">Track your job search progress and insights</p>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">{overview.total || 0}</div>
          <div className="text-sm text-gray-500">Total Matches</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{Math.round(overview.avg_score || 0)}%</div>
          <div className="text-sm text-gray-500">Avg Match Score</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">{Math.round(overview.max_score || 0)}%</div>
          <div className="text-sm text-gray-500">Best Match</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Match Status Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-brand-600" /> Match Status
          </h3>
          <div className="space-y-3">
            {(data.status_counts || []).map(s => {
              const Icon = STATUS_ICONS[s.status] || Target;
              const color = STATUS_COLORS[s.status] || 'text-gray-600 bg-gray-50';
              return (
                <div key={s.status} className="flex items-center gap-3">
                  <span className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
                  <span className="text-sm text-gray-700 capitalize flex-1">{s.status}</span>
                  <span className="text-sm font-bold text-gray-900">{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" /> Score Distribution
          </h3>
          <div className="space-y-3">
            {(data.score_distribution || []).map(s => (
              <MiniBar key={s.range} label={s.range + '%'} value={parseInt(s.count)} max={maxDist}
                color={s.range.startsWith('80') ? 'bg-green-500' : s.range.startsWith('60') ? 'bg-blue-500' : s.range.startsWith('40') ? 'bg-yellow-500' : 'bg-red-400'} />
            ))}
          </div>
        </div>

        {/* Top Skills in Demand */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" /> Skills in Demand
          </h3>
          <div className="space-y-2">
            {(data.top_skills_in_demand || []).slice(0, 10).map(s => (
              <MiniBar key={s.skill} label={s.skill} value={parseInt(s.demand)} max={maxSkillDemand} color="bg-brand-500" />
            ))}
          </div>
        </div>

        {/* Application Pipeline */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-600" /> Application Pipeline
          </h3>
          {(data.pipeline || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No applications tracked yet. Use the Application Tracker to get started.</p>
          ) : (
            <div className="space-y-3">
              {data.pipeline.map(p => (
                <div key={p.stage} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[p.stage] || 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-700 capitalize flex-1">{p.stage}</span>
                  <span className="text-sm font-bold text-gray-900">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
