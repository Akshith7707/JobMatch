import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { candidates } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Loader2, GraduationCap, ExternalLink, Clock, Zap,
  BookOpen, Video, FileText, Code, ChevronDown, ChevronUp,
  Target, TrendingUp
} from 'lucide-react';

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const TYPE_ICONS = {
  video: Video,
  docs: FileText,
  course: BookOpen,
  tutorial: Code,
  project: Code,
};

const DIFF_COLORS = {
  beginner: 'text-green-600',
  intermediate: 'text-yellow-600',
  advanced: 'text-red-600',
};

export default function LearningPath() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadPath();
  }, [isAuthenticated, router]);

  async function loadPath() {
    setLoading(true);
    try {
      const { data } = await candidates.getLearningPath();
      setData(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate learning path');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900">Analyzing Your Skill Gaps</h3>
          <p className="text-sm text-gray-500">AI is creating a personalized learning path...</p>
        </div>
      </div>
    );
  }

  const paths = data?.paths || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap className="h-8 w-8 text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning Path</h1>
          <p className="text-sm text-gray-500">Bridge the gap between your skills and your dream jobs</p>
        </div>
      </div>

      {/* Strategy Banner */}
      {data?.strategy && (
        <div className="card bg-brand-50 border-brand-200 mt-6 mb-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Strategy</h3>
              <p className="text-sm text-gray-700 mt-0.5">{data.strategy}</p>
              {data.overall_timeline && (
                <p className="text-xs text-brand-600 font-medium mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {data.overall_timeline}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {paths.length === 0 ? (
        <div className="card text-center py-16 mt-6">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No skill gaps detected</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Your current skills cover all the requirements for your matched jobs.
            Keep building your profile to discover new opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {paths.map((path, i) => {
            const isExpanded = expanded === i;
            return (
              <div key={i} className="card hover:shadow-md transition-shadow">
                <button
                  onClick={() => setExpanded(isExpanded ? null : i)}
                  className="w-full flex items-start justify-between gap-4 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{path.skill}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[path.priority] || PRIORITY_COLORS.medium}`}>
                        {path.priority} priority
                      </span>
                      {path.difficulty && (
                        <span className={`text-xs font-medium ${DIFF_COLORS[path.difficulty] || 'text-gray-500'}`}>
                          {path.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {path.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> ~{path.estimated_hours}h to learn
                        </span>
                      )}
                    </div>
                    {path.job_demand_note && (
                      <p className="text-xs text-brand-600 mt-1">{path.job_demand_note}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400 mt-1" /> : <ChevronDown className="h-5 w-5 text-gray-400 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    {/* Quick Win */}
                    {path.quick_win && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <h4 className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Quick Win
                        </h4>
                        <p className="text-sm text-gray-700">{path.quick_win}</p>
                      </div>
                    )}

                    {/* Resources */}
                    {path.resources?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
                        <div className="space-y-2">
                          {path.resources.map((r, j) => {
                            const TypeIcon = TYPE_ICONS[r.type] || BookOpen;
                            return (
                              <a
                                key={j}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors group"
                              >
                                <TypeIcon className="h-4 w-4 text-gray-400 group-hover:text-brand-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">
                                    {r.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-400 capitalize">{r.type}</span>
                                    {r.free !== undefined && (
                                      <span className={`text-xs font-medium ${r.free ? 'text-green-600' : 'text-orange-500'}`}>
                                        {r.free ? 'Free' : 'Paid'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-brand-500 flex-shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
