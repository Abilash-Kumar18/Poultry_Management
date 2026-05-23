import { useDashboardStats } from '../hooks/useFetch';
import { useFetch } from '../hooks/useFetch';
import { StatCard } from '../components/UI/StatCard';
import { CardSkeleton } from '../components/UI/LoadingSkeleton';
import { EmptyState } from '../components/UI/EmptyState';
import { Tractor, Users, ShieldAlert, CheckCircle, Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getHealthBadge, getSeverityBadge, formatRelativeTime, formatDate, formatFarmType } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useFarmerMode } from '../hooks/useFarmerMode';
import { Camera, Radio, Shield } from 'lucide-react';
import farmerScanner from '../assets/farmer_scanner.png';
import farmerFarms from '../assets/farmer_farms.png';
import farmerVisitors from '../assets/farmer_visitors.png';
import farmerWarnings from '../assets/farmer_warnings.png';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats(30000);
  const { data: farmsData } = useFetch('/farms');
  const { data: alertsData } = useFetch('/alerts', { status: 'active' });
  const { data: visitorsData } = useFetch('/visitors', { limit: 30 });
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { isFarmerMode } = useFarmerMode();

  // Generate dynamic greeting
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'dashboard.greeting_morning' : hour < 17 ? 'dashboard.greeting_afternoon' : 'dashboard.greeting_evening';
  const name = user?.name?.split(' ')[0] || 'Farmer';
  const greeting = `${t(greetingKey)}, ${name}! ${t('dashboard.overview_subtitle')}`;

  // Generate area chart data from real database visitor logs and active outbreak alerts
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString(
      language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US',
      { weekday: 'short' }
    );
    
    // Aggregate real visitors registered on this date
    const dayVisitors = visitorsData?.visitors?.filter(v => {
      if (!v.visit_date) return false;
      return v.visit_date.startsWith(dayStr);
    }).length || 0;

    // Aggregate real active outbreak alerts posted on this date
    const dayAlerts = alertsData?.alerts?.filter(a => {
      if (!a.created_at) return false;
      return a.created_at.startsWith(dayStr);
    }).length || 0;

    return {
      date: dayName,
      visitors: dayVisitors,
      alerts: dayAlerts,
    };
  });

  const farmHealthData = farmsData?.farms ? [
    { name: 'Healthy', value: farmsData.farms.filter(f => f.health_status === 'healthy').length },
    { name: 'Warning', value: farmsData.farms.filter(f => f.health_status === 'warning').length },
    { name: 'Critical', value: farmsData.farms.filter(f => f.health_status === 'critical').length },
  ].filter(d => d.value > 0) : [];

  if (isFarmerMode) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Simplified Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/20 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl pointer-events-none select-none">🌾</div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🌾</span> {language === 'ta' ? `வணக்கம், ${name}!` : language === 'hi' ? `नमस्ते, ${name}!` : `Welcome Back, ${name}!`}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
            {language === 'ta' 
              ? 'உமது பண்ணையின் விவரங்களை எளிதாக நிர்வகிக்க கீழே உள்ள பெரிய பொத்தான்களைப் பயன்படுத்தவும்.' 
              : language === 'hi' 
              ? 'अपने खेत के विवरण को आसानी से प्रबंधित करने के लिए नीचे दिए गए बड़े बटनों का उपयोग करें।' 
              : 'Use the large, touch-friendly cards below to quickly access and manage your farm operations.'}
          </p>
        </div>

        {/* Simplified Live Health Shield Panel */}
        <div className={`p-6 border rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-md ${
          stats?.activeAlerts > 0 
            ? 'border-red-500/30 bg-red-950/20' 
            : 'border-green-500/30 bg-green-950/20'
        }`}>
          <div className={`p-4 rounded-full flex-shrink-0 ${
            stats?.activeAlerts > 0 
              ? 'bg-red-500/20 text-red-500 animate-pulse' 
              : 'bg-green-500/20 text-green-500'
          }`}>
            <Shield size={36} />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {stats?.activeAlerts > 0 
                ? (language === 'ta' ? '🚨 பண்ணை பாதுகாப்பு எச்சரிக்கை!' : language === 'hi' ? '🚨 फार्म सुरक्षा चेतावनी!' : '🚨 Active Biosecurity Warnings!')
                : (language === 'ta' ? '✅ பண்ணை பாதுகாப்பு: ஆரோக்கியமாக உள்ளது' : language === 'hi' ? '✅ फार्म सुरक्षा: सुरक्षित और स्वस्थ' : '✅ Farm Status: Safe & Healthy')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats?.activeAlerts > 0 
                ? (language === 'ta' ? `${stats.activeAlerts} தீவிர எச்சரிக்கைகள் கண்டறியப்பட்டுள்ளன. கவனமாக இருக்கவும்.` : language === 'hi' ? `${stats.activeAlerts} सक्रिय चेतावनियों का पता चला। कृपया निरीक्षण करें।` : `${stats.activeAlerts} active alerts need your attention. Inspect immediately.`)
                : (language === 'ta' ? 'அனைத்து பண்ணைகளும் பாதுகாப்பாக உள்ளன. எவ்வித நோய் பாதிப்பும் இல்லை.' : language === 'hi' ? 'सभी फार्म सामान्य रूप से चल रहे हैं। कोई खतरा नहीं है।' : 'All registered farms are currently running smoothly without any reported alerts.')}
            </p>
          </div>
          {stats?.activeAlerts > 0 && (
            <Link to="/alerts" className="sm:ml-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
              {language === 'ta' ? 'எச்சரிக்கைகளைப் பார்' : language === 'hi' ? 'चेतावनी देखें' : 'View Outbreaks'}
            </Link>
          )}
        </div>

        {/* Massive Touch-Friendly Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link 
            to="/disease-analysis" 
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-xl transition-all flex flex-col group active:scale-[0.98]"
          >
            <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative bg-gray-100 dark:bg-gray-800">
              <img src={farmerScanner} alt="AI Disease Scanner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3 w-12 h-12 bg-primary-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg border border-primary-400/20">
                📸
              </div>
            </div>
            <div className="px-2 pb-2 text-left">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                {language === 'ta' ? 'விலங்கு நோய் கண்டறிதல்' : language === 'hi' ? 'पशु रोग स्कैनर' : 'AI Disease Scanner'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ta' ? 'விலங்குகளின் புகைப்படத்தைப் பதிவேற்றி நோய் உள்ளதா என நொடியில் கண்டறியவும்.' : language === 'hi' ? 'रोग का तुरंत पता लगाने के लिए पशु की तस्वीर लें और स्कैन करें।' : 'Capture or upload a picture of your livestock to automatically detect disease pathogens.'}
              </p>
            </div>
          </Link>

          <Link 
            to="/farms" 
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xl transition-all flex flex-col group active:scale-[0.98]"
          >
            <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative bg-gray-100 dark:bg-gray-800">
              <img src={farmerFarms} alt="Manage Farms" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3 w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg border border-amber-400/20">
                🏡
              </div>
            </div>
            <div className="px-2 pb-2 text-left">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">
                {language === 'ta' ? 'எனது பண்ணைகள்' : language === 'hi' ? 'मेरे फार्म प्रबंधित करें' : 'Manage Farms'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ta' ? 'புதிய பண்ணையை உருவாக்கவும், உயிரியல் பாதுகாப்பு மதிப்பெண்களை சரிபார்க்கவும்.' : language === 'hi' ? 'नया फार्म जोड़ें, स्वास्थ्य और अनुपालन स्थिति की जांच करें।' : 'Check active herds, manage locations, and view biosecurity levels for all your farms.'}
              </p>
            </div>
          </Link>

          <Link 
            to="/visitors" 
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col group active:scale-[0.98]"
          >
            <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative bg-gray-100 dark:bg-gray-800">
              <img src={farmerVisitors} alt="Visitor Logbook" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3 w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg border border-emerald-400/20">
                👥
              </div>
            </div>
            <div className="px-2 pb-2 text-left">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                {language === 'ta' ? 'வருகையாளர் பதிவேடு' : language === 'hi' ? 'ஆगंतुक रजिस्टर' : 'Visitor Logbook'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ta' ? 'பண்ணைக்குள் வரும் பார்வையாளர்களை எளிதாக பதிவு செய்து பாதுகாப்பைப் பேணவும்.' : language === 'hi' ? 'खेत में आने वाले बाहरी लोगों को आसानी से पंजीकृत करें और अनुमतियां दें।' : 'Log and authorize guests, feed delivery drivers, and veterinary officials entering your farm.'}
              </p>
            </div>
          </Link>

          <Link 
            to="/alerts" 
            className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl transition-all flex flex-col group active:scale-[0.98]"
          >
            <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative bg-gray-100 dark:bg-gray-800">
              <img src={farmerWarnings} alt="Active Warnings" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3 w-12 h-12 bg-red-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg border border-red-400/20">
                🚨
              </div>
            </div>
            <div className="px-2 pb-2 text-left">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white group-hover:text-red-500 transition-colors">
                {language === 'ta' ? 'நோய் எச்சரிக்கை தகவல்கள்' : language === 'hi' ? 'प्रकोप और चेतावनी अलर्ट' : 'Active Warnings'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ta' ? 'அருகிலுள்ள வட்டாரங்களில் பரவும் நோய்கள் மற்றும் பாதுகாப்பு எச்சரிக்கைகள்.' : language === 'hi' ? 'अपने आस-पास के क्षेत्रों में फैलने वाली संक्रामक बीमारियों की लाइव चेतावनी देखें।' : 'View containment zones, quarantine orders, and regional disease warnings near your coordinates.'}
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {greeting}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/farms" className="btn-outline text-sm">
            <Tractor size={16} />{t('dashboard.view_farms')}
          </Link>
          <Link to="/alerts" className="btn-primary text-sm">
            <Plus size={16} />{t('dashboard.new_alert')}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? <CardSkeleton count={4} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={Tractor}
            label={t('dashboard.total_farms')}
            value={stats?.totalFarms ?? 0}
            sublabel={`${stats?.healthyFarms ?? 0} ${t('dashboard.healthy_count')}`}
            color="primary"
          />
          <StatCard
            icon={ShieldAlert}
            label={t('dashboard.active_alerts')}
            value={stats?.activeAlerts ?? 0}
            sublabel={`${stats?.criticalAlerts ?? 0} ${t('dashboard.critical_count')}`}
            color="red"
          />
          <StatCard
            icon={Users}
            label={t('dashboard.pending_visitors')}
            value={stats?.pendingVisitors ?? 0}
            sublabel={t('dashboard.awaiting_approval')}
            color="yellow"
          />
          <StatCard
            icon={CheckCircle}
            label={t('dashboard.avg_compliance')}
            value={stats?.avgBiosecurityScore ? `${stats.avgBiosecurityScore}%` : '—'}
            sublabel={t('dashboard.biosecurity_score')}
            color="secondary"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">{t('dashboard.activity_trend')}</h2>
            <span className="badge-green">{t('dashboard.live_indicator')}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="visitors" name={t('dashboard.visitors')} stroke="#10b981" fill="url(#colorVisitors)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="alerts" name={t('dashboard.alerts')} stroke="#ef4444" fill="url(#colorAlerts)" strokeWidth={2} dot={false} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Farm Health Pie */}
        <div className="card">
          <h2 className="section-title">{t('nav.farms')} {t('common.status')}</h2>
          {farmHealthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={farmHealthData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {farmHealthData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No farm data</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">{t('dashboard.active_alerts')}</h2>
            <Link to="/alerts" className="text-xs text-primary-500 hover:text-primary-600 font-medium">View all →</Link>
          </div>
          {alertsData?.alerts?.length === 0 ? (
            <EmptyState icon={Activity} title={t('dashboard.no_alerts')} message="All farms are running smoothly." />
          ) : (
            <div className="space-y-3">
              {alertsData?.alerts?.slice(0, 4).map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                    alert.severity === 'high' ? 'bg-orange-500' :
                    alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{alert.farm_name}</p>
                  </div>
                  <span className={getSeverityBadge(alert.severity)}>{alert.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">{t('dashboard.visitors')}</h2>
            <Link to="/visitors" className="text-xs text-primary-500 hover:text-primary-600 font-medium">View all →</Link>
          </div>
          {visitorsData?.visitors?.length === 0 ? (
            <EmptyState icon={Users} title={t('dashboard.no_visitors')} message="Register your first farm visitor." />
          ) : (
            <div className="space-y-3">
              {visitorsData?.visitors?.slice(0, 4).map(visitor => (
                <div key={visitor.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {visitor.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{visitor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{visitor.farm_name} · {formatDate(visitor.visit_date)}</p>
                  </div>
                  <span className={`badge ${visitor.status === 'approved' ? 'badge-green' : visitor.status === 'rejected' ? 'badge-red' : visitor.status === 'completed' ? 'badge-blue' : 'badge-yellow'}`}>
                    {visitor.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Farm List quick view */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">{t('nav.farms')} Overview</h2>
          <Link to="/farms" className="btn-outline text-xs py-1.5">{t('dashboard.view_farms')}</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {farmsData?.farms?.slice(0, 4).map(farm => (
            <Link key={farm.id} to={`/farms/${farm.id}`} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="text-lg">{farm.type === 'pig' ? '🐷' : farm.type === 'poultry' ? '🐔' : '🏡'}</div>
                <span className={getHealthBadge(farm.health_status)}>{farm.health_status}</span>
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{farm.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{farm.location}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Biosecurity</span>
                  <span className="font-medium">{farm.biosecurity_score}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${farm.biosecurity_score >= 80 ? 'bg-green-500' : farm.biosecurity_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${farm.biosecurity_score}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
