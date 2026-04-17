import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { candidates } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  Loader2, BrainCircuit, BookOpen, MessageSquare, Lightbulb,
  ChevronDown, ChevronUp, Check, Star, ArrowLeft, Shield
} from 'lucide-react';

const DIFF_COLORS = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };

export default function InterviewPrep() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { job } = router.query;
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('technical');
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (job) generatePrep();
  }, [isAuthenticated, router, job]);

  async function generatePrep() {
    setLoading(true);
    try {
      const { data } = await candidates.getInterviewPrep(job);
      setPrep(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate prep');
    } finally { setLoading(false); }
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <BrainCircuit className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Interview Prep AI</h2>
        <p className="text-gray-500 mb-4">Select a job from your dashboard or browse page to generate interview prep</p>
        <Link href="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900">Generating Interview Questions</h3>
          <p className="text-sm text-gray-500">AI is analyzing the role and preparing custom questions...</p>
        </div>
      </div>
    );
  }

  if (!prep) return null;

  const p = prep.prep || {};
  const tabs = [
    { id: 'technical', label: 'Technical', icon: BookOpen, count: p.technical_questions?.length || 0 },
    { id: 'behavioral', label: 'Behavioral', icon: MessageSquare, count: p.behavioral_questions?.length || 0 },
    { id: 'system', label: 'System Design', icon: Shield, count: p.system_design?.length || 0 },
    { id: 'tips', label: 'Tips', icon: Lightbulb },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={`/jobs/${job}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Job
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <BrainCircuit className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Prep</h1>
          <p className="text-sm text-gray-500">{prep.job_title} at {prep.company}</p>
        </div>
        {p.estimated_difficulty && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${DIFF_COLORS[p.estimated_difficulty] || 'bg-gray-100'}`}>
            {p.estimated_difficulty} difficulty
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label} {t.count != null && <span className="text-xs text-gray-400">({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === 'technical' && (
        <div className="space-y-3">
          {(p.technical_questions || []).map((q, i) => (
            <div key={i} className="card">
              <button onClick={() => setExpandedQ(expandedQ === `t${i}` ? null : `t${i}`)}
                className="w-full flex items-start justify-between gap-3 text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400">Q{i + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFF_COLORS[q.difficulty] || 'bg-gray-100'}`}>{q.difficulty}</span>
                    {q.topic && <span className="text-xs text-gray-400">{q.topic}</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                </div>
                {expandedQ === `t${i}` ? <ChevronUp className="h-4 w-4 text-gray-400 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 mt-1" />}
              </button>
              {expandedQ === `t${i}` && q.suggested_answer && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1"><Star className="h-3 w-3" /> Suggested Answer</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{q.suggested_answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'behavioral' && (
        <div className="space-y-3">
          {(p.behavioral_questions || []).map((q, i) => (
            <div key={i} className="card">
              <button onClick={() => setExpandedQ(expandedQ === `b${i}` ? null : `b${i}`)}
                className="w-full flex items-start justify-between gap-3 text-left">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                  {q.framework && <span className="text-xs text-orange-500 font-medium mt-1 inline-block">{q.framework} Framework</span>}
                </div>
                {expandedQ === `b${i}` ? <ChevronUp className="h-4 w-4 text-gray-400 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 mt-1" />}
              </button>
              {expandedQ === `b${i}` && q.suggested_answer && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {typeof q.suggested_answer === 'object' ? (
                    Object.entries(q.suggested_answer).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-xs font-bold text-gray-500 uppercase">{key}:</span>
                        <p className="text-sm text-gray-700">{val}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-700">{q.suggested_answer}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-3">
          {(p.system_design || []).length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-gray-500">No system design questions for this role level</p>
            </div>
          ) : (p.system_design || []).map((q, i) => (
            <div key={i} className="card">
              <p className="text-sm font-medium text-gray-900 mb-3">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {(q.key_points || []).map((kp, j) => (
                  <span key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 border border-purple-200">
                    <Check className="h-3 w-3" /> {kp}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="space-y-6">
          {p.company_research_tips?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Company Research Tips</h3>
              <ul className="space-y-1.5">
                {p.company_research_tips.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          )}
          {p.red_flags_to_avoid?.length > 0 && (
            <div className="card bg-red-50 border-red-200">
              <h3 className="font-semibold text-gray-900 mb-3">Red Flags to Avoid</h3>
              <ul className="space-y-1.5">
                {p.red_flags_to_avoid.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">&#8226;</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.salary_negotiation_tips?.length > 0 && (
            <div className="card bg-green-50 border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3">Salary Negotiation</h3>
              <ul className="space-y-1.5">
                {p.salary_negotiation_tips.map((t, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Lightbulb className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
