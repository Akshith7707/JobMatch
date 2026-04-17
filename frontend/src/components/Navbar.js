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
      <Link href={href} className={`flex items-center gap-1.5 text-sm transition-colors ${
        active ? 'text-brand-600 font-medium' : 'text-gray-600 hover:text-brand-600'
      }`}>
        {icon}
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-brand-600" />
            <span className="text-xl font-bold text-gray-900">SkillSync</span>
            <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">AI</span>
          </Link>

          <div className="flex items-center gap-5">
            {navLink('/jobs', <Search className="h-4 w-4" />, 'Browse Jobs')}
            {isAuthenticated ? (
              <>
                {navLink('/dashboard', <LayoutDashboard className="h-4 w-4" />, 'Dashboard')}
                {navLink('/applications', <Briefcase className="h-4 w-4" />, 'Tracker')}
                {navLink('/learning', <GraduationCap className="h-4 w-4" />, 'Learn')}
                {navLink('/saved', <Bookmark className="h-4 w-4" />, 'Saved')}
                <span className="text-sm text-gray-500">{user?.full_name}</span>
                <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                  Log in
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
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
