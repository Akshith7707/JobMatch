import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { candidates } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Loader2, Briefcase, MapPin, DollarSign, ExternalLink,
  ChevronDown, Save, Clock, Building2, GripVertical
} from 'lucide-react';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'];
const STAGE_COLORS = {
  applied: 'bg-blue-100 text-blue-700 border-blue-200',
  screening: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  interview: 'bg-purple-100 text-purple-700 border-purple-200',
  offer: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
  accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',
};
const STAGE_DOT = {
  applied: 'bg-blue-500', screening: 'bg-yellow-500', interview: 'bg-purple-500',
  offer: 'bg-green-500', rejected: 'bg-red-400', accepted: 'bg-emerald-600', withdrawn: 'bg-gray-400',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Applications() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingNotes, setEditingNotes] = useState(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadApps();
  }, [isAuthenticated, router]);

  async function loadApps() {
    setLoading(true);
    try {
      const { data } = await candidates.getApplications();
      setApps(data);
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  }

  async function updateStage(appId, stage) {
    try {
      await candidates.updateApplication(appId, { stage });
      setApps(prev => prev.map(a => a.id === appId ? { ...a, stage } : a));
      toast.success(`Moved to ${stage}`);
    } catch { toast.error('Update failed'); }
  }

  async function saveNotes(appId) {
    try {
      await candidates.updateApplication(appId, { notes: noteText });
      setApps(prev => prev.map(a => a.id === appId ? { ...a, notes: noteText } : a));
      setEditingNotes(null);
      toast.success('Notes saved');
    } catch { toast.error('Save failed'); }
  }

  const filtered = filter === 'all' ? apps : apps.filter(a => a.stage === filter);

  const stageCounts = {};
  apps.forEach(a => { stageCounts[a.stage] = (stageCounts[a.stage] || 0) + 1; });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Briefcase className="h-7 w-7 text-brand-600" /> Application Tracker
      </h1>
      <p className="text-gray-500 mb-6">Track your job applications through each stage</p>

      {/* Pipeline overview */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All ({apps.length})
        </button>
        {STAGES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span className={`w-2 h-2 rounded-full ${filter === s ? 'bg-white' : STAGE_DOT[s]}`} />
            {s.charAt(0).toUpperCase() + s.slice(1)} ({stageCounts[s] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No applications{filter !== 'all' ? ` in "${filter}"` : ''}</h3>
          <p className="text-gray-500">Mark jobs as "Applied" from your dashboard to track them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STAGE_COLORS[app.stage]}`}>
                      {app.stage}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(app.updated_at)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{app.title}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {app.company}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                    {app.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {app.location}</span>}
                    {(app.salary_min || app.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {app.salary_min ? `$${(app.salary_min / 1000).toFixed(0)}k` : ''}
                        {app.salary_max ? `–$${(app.salary_max / 1000).toFixed(0)}k` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {app.match_score && (
                  <span className="text-lg font-bold text-brand-600">{Math.round(app.match_score)}%</span>
                )}
              </div>

              {/* Notes */}
              {editingNotes === app.id ? (
                <div className="mt-3">
                  <textarea className="input-field text-sm w-full" rows={3} value={noteText}
                    onChange={e => setNoteText(e.target.value)} placeholder="Add interview notes, follow-up dates, contact info..." />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => saveNotes(app.id)} className="btn-primary text-xs flex items-center gap-1">
                      <Save className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => setEditingNotes(null)} className="btn-secondary text-xs">Cancel</button>
                  </div>
                </div>
              ) : app.notes ? (
                <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => { setEditingNotes(app.id); setNoteText(app.notes); }}>
                  {app.notes}
                </p>
              ) : null}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <a href={app.url} target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-xs !py-1.5 flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" /> View Job
                </a>
                <div className="relative group">
                  <button className="btn-secondary text-xs !py-1.5 flex items-center gap-1">
                    Move to <ChevronDown className="h-3 w-3" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 hidden group-hover:block w-36">
                    {STAGES.filter(s => s !== app.stage).map(s => (
                      <button key={s} onClick={() => updateStage(app.id, s)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 capitalize">
                        <span className={`w-2 h-2 rounded-full ${STAGE_DOT[s]}`} /> {s}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setEditingNotes(app.id); setNoteText(app.notes || ''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-auto">
                  {app.notes ? 'Edit notes' : '+ Add notes'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
