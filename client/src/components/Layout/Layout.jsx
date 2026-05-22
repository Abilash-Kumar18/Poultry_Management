import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Tractor, Users, ShieldCheck, AlertTriangle,
  FileText, Settings, LogOut, Menu, X, Bell, Moon, Sun, ChevronRight, Camera, Globe
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useFarmerMode } from '../../hooks/useFarmerMode';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/farms', labelKey: 'nav.farms', icon: Tractor },
  { path: '/visitors', labelKey: 'nav.visitors', icon: Users },
  { path: '/biosecurity', labelKey: 'nav.biosecurity', icon: ShieldCheck },
  { path: '/alerts', labelKey: 'nav.alerts', icon: AlertTriangle },
  { path: '/disease-analysis', labelKey: 'nav.disease_scanner', icon: Camera },
  { path: '/reports', labelKey: 'nav.reports', icon: FileText },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  }, []);

  return [dark, toggle];
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const { isFarmerMode, toggleFarmerMode } = useFarmerMode();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 flex flex-col h-full w-64 bg-white dark:bg-gray-900 
        border-r border-gray-200 dark:border-gray-800 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{t('nav.portal_title')}</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">{t('nav.portal_subtitle')}</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, labelKey, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={isActive(path) ? 'sidebar-link-active' : 'sidebar-link-inactive'}
              aria-current={isActive(path) ? 'page' : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{t(labelKey)}</span>
              {isActive(path) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button
            onClick={toggleDark}
            className="sidebar-link-inactive w-full"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{dark ? t('nav.light_mode') : t('nav.dark_mode')}</span>
          </button>
          
          <div className="flex items-center gap-3 px-3 py-2">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full object-cover border border-primary-500 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="sidebar-link-inactive w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
            aria-label="Logout"
          >
            <LogOut size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t(navItems.find(n => isActive(n.path))?.labelKey || 'nav.dashboard')}
            </h1>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Farmer Mode Toggle Switch */}
            <button
              onClick={toggleFarmerMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all border shadow-sm ${
                isFarmerMode
                  ? 'bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50'
              }`}
              aria-label="Toggle Farmer Mode"
            >
              <span className="text-sm md:text-base">🌾</span>
              <span className="hidden sm:inline">
                {language === 'en' ? 'Farmer Mode' : language === 'ta' ? 'விவசாயி பயன்முறை' : 'किसान मोड'}
              </span>
              <span className="sm:hidden">
                {language === 'en' ? 'Farmer' : language === 'ta' ? 'விவசாயி' : 'किसान'}
              </span>
              <div className={`relative w-8 h-4 rounded-full flex-shrink-0 transition-colors ml-1 ${isFarmerMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-650'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isFarmerMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 font-medium text-xs md:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur"
                aria-label="Change language"
              >
                <Globe size={16} className="text-primary-500" />
                <span className="hidden sm:inline text-gray-700 dark:text-gray-200">
                  {language === 'en' ? 'English' : language === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                </span>
                <span className="sm:hidden font-bold text-gray-700 dark:text-gray-200">
                  {language.toUpperCase()}
                </span>
              </button>

              {langOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setLangOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1 z-50 animate-fade-in backdrop-blur-md bg-white/95 dark:bg-gray-900/95">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'ta', label: 'தமிழ்' },
                      { code: 'hi', label: 'हिन्दी' }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setLangOpen(false);
                          toast.success(lang.code === 'en' ? 'Language updated to English' : lang.code === 'ta' ? 'மொழி தமிழுக்கு மாற்றப்பட்டது' : 'भाषा हिंदी में बदल दी गई है');
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs md:text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                          language === lang.code 
                            ? 'text-primary-600 dark:text-primary-400 font-bold bg-primary-50/50 dark:bg-primary-950/20' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={toggleDark}
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-gray-600 dark:text-gray-400" />}
            </button>
            
            <button
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-gray-600 dark:text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full object-cover border border-primary-500 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 main-content animate-fade-in pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 py-2">
        {navItems.slice(0, 5).map(({ path, labelKey, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-[44px] transition-colors ${
              isActive(path)
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label={t(labelKey)}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
