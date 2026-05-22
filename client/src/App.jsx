import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './hooks/useLanguage';
import { FarmerModeProvider } from './hooks/useFarmerMode';
import Layout from './components/Layout/Layout';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FarmsPage from './pages/Farms/FarmsPage';
import FarmDetail from './pages/Farms/FarmDetail';
import VisitorsPage from './pages/Visitors/VisitorsPage';
import BiosecurityPage from './pages/Biosecurity/BiosecurityPage';
import AlertsPage from './pages/Alerts/AlertsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import DiseaseAnalysisPage from './pages/DiseaseAnalysisPage';

// Initialize dark mode from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

/**
 * Protected route wrapper
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading FarmGuard...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

/**
 * Public route — redirect to dashboard if already logged in
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/farms" element={<ProtectedRoute><FarmsPage /></ProtectedRoute>} />
      <Route path="/farms/:id" element={<ProtectedRoute><FarmDetail /></ProtectedRoute>} />
      <Route path="/visitors" element={<ProtectedRoute><VisitorsPage /></ProtectedRoute>} />
      <Route path="/biosecurity" element={<ProtectedRoute><BiosecurityPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/disease-analysis" element={<ProtectedRoute><DiseaseAnalysisPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <FarmerModeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </FarmerModeProvider>
    </LanguageProvider>
  );
}
