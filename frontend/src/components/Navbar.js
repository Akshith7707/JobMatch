import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { Zap, LogOut, LayoutDashboard, Search, Bookmark, Briefcase, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navLink = (href, icon, label) => {
    const active = router.pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 border-b-2 pb-0.5 font-body text-sm font-medium tracking-wide transition-colors ${
          active
            ? 'border-brand-800 text-brand-900'
            : 'border-transparent text-brand-700/90 hover:border-brand-400 hover:text-brand-900'
        }`}
      >
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-brand-800 bg-[#fffdf8] shadow-ledger-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.25rem] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-brand-800 bg-brand-800 text-brand-50 shadow-inset-brass">
              <Zap className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-brand-900">SkillSync</span>
            <span className="rounded-sm border border-brand-600 bg-brand-100 px-2 py-0.5 font-body text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-brand-800">
              AI
            </span>
          </Link>

          <div className="flex items-center gap-6 lg:gap-8">
            {navLink('/jobs', <Search className="h-4 w-4 text-brand-700" strokeWidth={1.75} />, 'Browse Jobs')}
            {isAuthenticated ? (
              <>
                {navLink('/dashboard', <LayoutDashboard className="h-4 w-4 text-brand-700" strokeWidth={1.75} />, 'Dashboard')}
                {navLink('/applications', <Briefcase className="h-4 w-4 text-brand-700" strokeWidth={1.75} />, 'Tracker')}
                {navLink('/learning', <GraduationCap className="h-4 w-4 text-brand-700" strokeWidth={1.75} />, 'Learn')}
                {navLink('/saved', <Bookmark className="h-4 w-4 text-brand-700" strokeWidth={1.75} />, 'Saved')}
                <span className="hidden border-l-2 border-brand-200 pl-6 font-body text-sm text-brand-800 sm:inline">
                  {user?.full_name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-sm border border-transparent p-1.5 text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900"
                  aria-label="Log out"
                >
                  <LogOut className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-body text-sm font-semibold tracking-wide text-brand-800 underline decoration-brand-400 decoration-2 underline-offset-4 hover:text-brand-950"
                >
                  Log in
                </Link>
                <Link href="/register" className="btn-primary text-sm !px-5 !py-2 !normal-case !tracking-wide">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
