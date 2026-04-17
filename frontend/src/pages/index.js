import Link from 'next/link';
import { Zap, Brain, Target, TrendingUp, Github, FileText, Search, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Skill Extraction',
    desc: 'Deep analysis of your resume and GitHub to understand your true capabilities.',
  },
  {
    icon: Search,
    title: 'Real-Time Job Scraping',
    desc: 'We pull fresh jobs from RemoteOK, Arbeitnow, JSearch, and HN Who\'s Hiring every day.',
  },
  {
    icon: Target,
    title: 'Precision Matching',
    desc: 'AI matches your skills against hundreds of real jobs with semantic understanding.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Learning',
    desc: 'Every bookmark and application improves your future matches automatically.',
  },
];

const steps = [
  { icon: FileText, title: 'Upload Resume', desc: 'Drop your PDF and let AI extract your skills.' },
  { icon: Github, title: 'Connect GitHub', desc: 'We analyze your repos for real project experience.' },
  { icon: Search, title: 'Get Matched', desc: 'AI scores you against 100+ real jobs instantly.' },
  { icon: BarChart3, title: 'Apply', desc: 'View matches, bookmark favorites, apply directly.' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
              <Zap className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-medium">AI-Powered Job Matching for Developers</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Real Jobs.
              <br />
              <span className="text-brand-200">AI-Matched to You.</span>
            </h1>
            <p className="text-xl text-brand-100 mb-10 leading-relaxed">
              SkillSync scrapes hundreds of real developer jobs from across the web,
              then uses AI to match them to your exact skills and experience.
              No recruiter spam. No fake listings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-white text-brand-700 px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-brand-50 transition-colors shadow-lg">
                Start Matching Free
              </Link>
              <Link href="/login" className="bg-brand-500 text-white px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-brand-400 transition-colors border border-brand-400">
                I Have an Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Not Another Job Board</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We scrape real jobs from top sources, then use AI agents to deeply understand both your skills and each job requirement.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-shadow">
                <div className="bg-brand-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Four steps to your next great role</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="relative inline-flex mb-4">
                  <div className="bg-brand-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
                    <s.icon className="h-8 w-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-brand-100 text-brand-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Sources */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">We Aggregate Real Jobs From</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { name: 'RemoteOK', desc: 'Remote dev jobs' },
              { name: 'JSearch', desc: 'Google Jobs API' },
              { name: 'Arbeitnow', desc: 'Global job board' },
              { name: 'HN Hiring', desc: 'YC community jobs' },
            ].map(s => (
              <div key={s.name} className="card text-center !p-4">
                <div className="text-lg font-bold text-brand-600">{s.name}</div>
                <div className="text-xs text-gray-500 mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-brand-100 text-lg mb-8">Upload your resume and get matched to real jobs in under 2 minutes.</p>
          <Link href="/register" className="bg-white text-brand-700 px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-brand-50 transition-colors shadow-lg inline-block">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-brand-400" />
            <span className="text-lg font-bold text-white">SkillSync AI</span>
          </div>
          <p className="text-sm">AI-powered job matching for developers. Real jobs, real matches.</p>
        </div>
      </footer>
    </div>
  );
}
