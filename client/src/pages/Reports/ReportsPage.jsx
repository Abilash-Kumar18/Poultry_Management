import { useState } from 'react';
import { FileText, Download, Calendar, BarChart3, Users, ShieldCheck, AlertTriangle, Printer } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useLanguage } from '../../hooks/useLanguage';
import { PageLoader } from '../../components/UI/LoadingSkeleton';
import { formatDate } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'compliance', labelKey: 'reports.compliance_report', icon: ShieldCheck, color: 'from-green-500 to-emerald-600', endpoint: '/reports/compliance' },
  { id: 'visitors', labelKey: 'reports.visitor_analytics', icon: Users, color: 'from-blue-500 to-indigo-600', endpoint: '/reports/visitors' },
  { id: 'diseases', labelKey: 'reports.disease_incidents', icon: AlertTriangle, color: 'from-red-500 to-rose-600', endpoint: '/reports/diseases' },
];

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const [activeReport, setActiveReport] = useState('compliance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [farmFilter, setFarmFilter] = useState('');

  const activeType = REPORT_TYPES.find(r => r.id === activeReport);
  const { data: farmsData } = useFetch('/farms');
  const { data: reportData, loading, error, refetch } = useFetch(activeType.endpoint, {
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    farm_id: farmFilter || undefined,
  }, [activeReport, startDate, endDate, farmFilter]);

  const report = reportData?.report;

  const handlePrint = () => {
    window.print();
    toast.success(language === 'ta' ? 'அச்சு சாளரம் திறக்கப்படுகிறது...' : language === 'hi' ? 'प्रिंट संवाद खुल रहा है...' : 'Opening print dialog...');
  };

  const ComplianceReport = () => {
    if (!report) return null;
    const barData = report.farm_compliance?.map(f => ({
      name: f.name?.split(' ').slice(0, 2).join(' '),
      score: f.compliance_rate ?? 0,
      biosecurity: f.biosecurity_score ?? 0,
    })) || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{report.overall_score ?? 0}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('reports.overall_biosecurity_score')}</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {report.farm_compliance?.filter(f => f.compliance_rate >= 80).length ?? 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('reports.farms_fully_compliant')}</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {report.farm_compliance?.filter(f => f.compliance_rate < 60).length ?? 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('reports.farms_need_attention')}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">{t('reports.farm_compliance_rates')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
              <Bar dataKey="score" name="Compliance %" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="biosecurity" name="Biosecurity Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title">{t('reports.farm_by_farm_breakdown')}</h3>
          <div className="table-container">
            <table className="table">
              <thead className="table-header"><tr>
                <th className="table-th">{t('reports.table_farm')}</th>
                <th className="table-th">{t('reports.table_type')}</th>
                <th className="table-th">{t('reports.table_checks')}</th>
                <th className="table-th">{t('reports.table_compliance')}</th>
                <th className="table-th">{t('reports.table_status')}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {report.farm_compliance?.map(f => (
                  <tr key={f.id} className="table-row">
                    <td className="table-td font-medium">{f.name}</td>
                    <td className="table-td capitalize">{f.type === 'pig' ? t('farms.type_pig') : f.type === 'poultry' ? t('farms.type_poultry') : t('farms.type_mixed')}</td>
                    <td className="table-td">{f.completed_checks}/{f.total_checks}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-20">
                          <div className={`h-full rounded-full ${f.compliance_rate >= 80 ? 'bg-green-500' : f.compliance_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${f.compliance_rate ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-medium w-10">{f.compliance_rate ?? 0}%</span>
                      </div>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${f.health_status === 'healthy' ? 'badge-green' : f.health_status === 'warning' ? 'badge-yellow' : 'badge-red'}`}>
                        {f.health_status === 'healthy' ? t('dashboard.healthy_count') : f.health_status === 'warning' ? t('visitors.pending') : t('scanner.severity_critical')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const VisitorReport = () => {
    if (!report) return null;
    const s = report.summary;
    const pieData = [
      { name: t('visitors.status_approved'), value: s?.approved || 0 },
      { name: t('biosecurity.completed'), value: s?.completed || 0 },
      { name: t('visitors.status_pending'), value: s?.pending || 0 },
      { name: t('visitors.status_denied'), value: s?.rejected || 0 },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('reports.total_visitors'), value: s?.total ?? 0, color: 'text-blue-600 dark:text-blue-400' },
            { label: t('visitors.status_approved'), value: s?.approved ?? 0, color: 'text-green-600 dark:text-green-400' },
            { label: t('visitors.status_pending'), value: s?.pending ?? 0, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: t('visitors.status_denied'), value: s?.rejected ?? 0, color: 'text-red-600 dark:text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">{t('reports.visitor_status_distribution')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="section-title">{t('reports.top_visit_purposes')}</h3>
            <div className="space-y-3">
              {report.by_purpose?.slice(0, 5).map(({ purpose, count }) => (
                <div key={purpose} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{purpose}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(count / (s?.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">{t('reports.visits_by_farm')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={report.by_farm?.slice(0, 6) || []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="farm_name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
              <Bar dataKey="visitor_count" name={t('dashboard.visitors')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const DiseaseReport = () => {
    if (!report) return null;
    const s = report.summary;
    const severityData = [
      { name: t('alerts_page.sev_critical'), value: s?.critical || 0 },
      { name: t('alerts_page.sev_high'), value: s?.high || 0 },
      { name: t('alerts_page.sev_medium'), value: s?.medium || 0 },
      { name: t('alerts_page.sev_low'), value: s?.low || 0 },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('reports.total_incidents'), value: s?.total ?? 0, color: 'text-gray-900 dark:text-white' },
            { label: t('reports.critical_alerts'), value: s?.critical ?? 0, color: 'text-red-600 dark:text-red-400' },
            { label: t('reports.active_alerts_count'), value: s?.active ?? 0, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: t('reports.animals_affected'), value: s?.total_affected ?? 0, color: 'text-orange-600 dark:text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">{t('reports.alert_severity_distribution')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {severityData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f97316', '#f59e0b', '#3b82f6'][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="section-title">{t('reports.incidents_by_farm')}</h3>
            <div className="space-y-3">
              {report.by_farm?.slice(0, 5).map(({ farm_name, alert_count, total_affected, severe_count }) => (
                <div key={farm_name} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{farm_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{total_affected} {t('reports.animals_affected').toLowerCase()} · {severe_count} {t('alerts_page.sev_critical').toLowerCase()}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{alert_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">{t('reports.recent_incidents')}</h3>
          <div className="table-container">
            <table className="table">
              <thead className="table-header"><tr>
                <th className="table-th">{t('reports.table_title')}</th>
                <th className="table-th">{t('reports.table_farm')}</th>
                <th className="table-th">{t('reports.table_severity')}</th>
                <th className="table-th">{t('reports.table_affected')}</th>
                <th className="table-th">{t('reports.table_date')}</th>
                <th className="table-th">{t('reports.table_status')}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {report.recent_alerts?.slice(0, 8).map(a => (
                  <tr key={a.id} className="table-row">
                    <td className="table-td font-medium max-w-[200px] truncate">{a.title}</td>
                    <td className="table-td text-xs">{a.farm_name}</td>
                    <td className="table-td"><span className={`badge ${a.severity === 'critical' || a.severity === 'high' ? 'badge-red' : a.severity === 'medium' ? 'badge-yellow' : 'badge-blue'}`}>{a.severity === 'critical' ? t('alerts_page.sev_critical') : a.severity === 'high' ? t('alerts_page.sev_high') : a.severity === 'medium' ? t('alerts_page.sev_medium') : t('alerts_page.sev_low')}</span></td>
                    <td className="table-td">{a.affected_animals}</td>
                    <td className="table-td text-xs">{formatDate(a.created_at)}</td>
                    <td className="table-td"><span className={`badge ${a.status === 'resolved' ? 'badge-green' : a.status === 'active' ? 'badge-red' : 'badge-yellow'}`}>{a.status === 'resolved' ? t('common.resolved') : t('common.active')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('reports.analytics_title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.generated_at', { date: formatDate(new Date().toISOString()) })}</p>
        </div>
        <button onClick={handlePrint} className="btn-outline text-sm">
          <Printer size={16} /> {t('reports.print_report')}
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ id, labelKey, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveReport(id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeReport === id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
            }`}
          >
            <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{t(labelKey)}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-48" value={farmFilter} onChange={e => setFarmFilter(e.target.value)}>
          <option value="">{t('reports.all_farms')}</option>
          {farmsData?.farms?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="date" className="input sm:w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" className="input sm:w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button onClick={refetch} className="btn-primary text-sm">{t('reports.generate')}</button>
      </div>

      {/* Report Content */}
      {loading ? <PageLoader /> : !report ? (
        <div className="card text-center py-12">
          <FileText size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('reports.click_generate')}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{report.title}</h2>
          </div>
          {activeReport === 'compliance' && <ComplianceReport />}
          {activeReport === 'visitors' && <VisitorReport />}
          {activeReport === 'diseases' && <DiseaseReport />}
        </>
      )}
    </div>
  );
}
