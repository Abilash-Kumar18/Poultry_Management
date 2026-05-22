import { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle, Filter, Trash2, Radio, MapPin, Shield, ChevronUp, ChevronDown } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { PageLoader } from '../../components/UI/LoadingSkeleton';
import { EmptyState, ErrorState } from '../../components/UI/EmptyState';
import Modal, { ConfirmModal } from '../../components/UI/Modal';
import { getSeverityBadge, getStatusBadge, formatDate, formatRelativeTime } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../../hooks/useLanguage';
import { useFarmerMode } from '../../hooks/useFarmerMode';
import farmerWarnings from '../../assets/farmer_warnings.png';

const SEVERITY_CONFIG = {
  low: { color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/20' },
  medium: { color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/20' },
  high: { color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/20' },
  critical: { color: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/20 animate-pulse-slow' },
};

const INIT_FORM = { farm_id: '', title: '', severity: 'low', description: '', symptoms: '', actions: '', affected_animals: '0' };

export default function AlertsPage() {
  const { isFarmerMode } = useFarmerMode();
  const { language, t } = useLanguage();

  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [viewAlert, setViewAlert] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedWarning, setExpandedWarning] = useState(null);

  const { data: warningsData } = useFetch('/warnings');
  const warnings = warningsData?.warnings || [];

  const { data: farmsData } = useFetch('/farms');
  const { data, loading, error, refetch } = useFetch('/alerts', {
    severity: severityFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  }, [severityFilter, statusFilter, search]);

  const alerts = data?.alerts || [];
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  const validate = () => {
    const errs = {};
    if (!form.farm_id) errs.farm_id = 'Farm is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.post('/alerts', form);
      toast.success('Alert created!');
      setShowAdd(false);
      setForm(INIT_FORM);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (alert, status) => {
    try {
      await api.put(`/alerts/${alert.id}`, { status });
      toast.success(`Alert marked as ${status}`);
      refetch();
    } catch { toast.error('Failed to update alert.'); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/alerts/${deleteAlert.id}`);
      toast.success('Alert deleted.');
      setDeleteAlert(null);
      refetch();
    } catch { toast.error('Failed to delete alert.'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual Header Banner for Farmers */}
      {isFarmerMode && (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-md border border-gray-200 dark:border-gray-800">
          <img src={farmerWarnings} alt="Farmer Warnings Banner" className="w-full h-48 sm:h-56 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{t('alerts_page.banner_title')}</h2>
            <p className="text-sm text-gray-200/90 max-w-lg">{t('alerts_page.banner_desc')}</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('alerts_page.title')}</h1>
          <div className="flex items-center gap-3 mt-1">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {criticalCount} {t('alerts_page.sev_critical').toLowerCase()}
              </span>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">{activeCount} active alerts</span>
          </div>
        </div>
        <button onClick={() => { setForm(INIT_FORM); setFormErrors({}); setShowAdd(true); }} className="btn-primary text-sm">
          <Plus size={16} /> {t('alerts_page.create_alert')}
        </button>
      </div>

      {/* Regional Warnings Feed */}
      {warnings.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-red-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
          {/* Decorative scanner lines */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent animate-pulse" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl animate-pulse">
                <Radio size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {language === 'ta' ? 'வட்டார நோய் பரவல் தகவல் ஊட்டம்' : language === 'hi' ? 'क्षेत्रीय प्रकोप सूचना फ़ीड' : 'Regional Outbreak Intelligence Feed'}
                  <span className="badge bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse text-xs">
                    {warnings.filter(w => w.status === 'active').length} Active
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ta' ? 'அருகிலுள்ள பகுதிகள் மற்றும் பிற மாநிலங்களின் நேரடி கண்காணிப்புத் தகவல்' : language === 'hi' ? 'निकटवर्ती क्षेत्रों और राज्यों से लाइव महामारी विज्ञान चेतावनी अलर्ट' : 'Live epidemiological warning alerts synced from regional health records'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warnings.map(warn => {
              const isExpanded = expandedWarning === warn.id;
              const severityColor = warn.severity === 'critical' ? 'border-red-500/30 bg-red-950/20 text-red-400' : 'border-orange-500/30 bg-orange-950/20 text-orange-400';
              return (
                <div 
                  key={warn.id} 
                  className={`border rounded-xl p-4 transition-all duration-300 relative overflow-hidden ${
                    warn.isNearFarmer 
                      ? 'border-amber-500/40 bg-amber-500/5 shadow-md shadow-amber-500/5' 
                      : 'border-gray-800 bg-gray-900/40'
                  }`}
                >
                  {warn.isNearFarmer && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                      <MapPin size={10} /> {language === 'ta' ? 'உமது பண்ணைக்கு அருகில்' : language === 'hi' ? 'आपके फार्म के पास' : 'Near Your Farm'}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md mb-2 ${severityColor}`}>
                        {warn.severity.toUpperCase()}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">{warn.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        📍 {warn.affectedArea} · <span className="font-semibold text-gray-700 dark:text-gray-300">{warn.containmentZone}</span>
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Pathogen</p>
                          <p className="font-semibold text-gray-300">{warn.pathogen}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Active Cases</p>
                          <p className="font-semibold text-amber-500">{warn.activeCases} hosts</p>
                        </div>
                      </div>

                      <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-850">
                        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Shield size={12} /> {language === 'ta' ? 'பாதுகாப்பு மற்றும் தனிமைப்படுத்தல் வழிகாட்டுதல்கள்' : language === 'hi' ? 'निवारक संगरोध प्रक्रियाएं' : 'Preventative Quarantine Procedures'}
                        </p>
                        <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 pl-1">
                          {warn.guidelines.map((line, idx) => (
                            <li key={idx} className="leading-relaxed">{line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setExpandedWarning(isExpanded ? null : warn.id)}
                    className="w-full text-center text-xs font-semibold text-primary-500 hover:text-primary-400 transition-colors mt-3 flex items-center justify-center gap-1 py-1 hover:bg-gray-800 rounded-lg"
                  >
                    {isExpanded ? (
                      <>
                        {language === 'ta' ? 'சுருக்குக' : language === 'hi' ? 'विवरण छुपाएं' : 'Hide Guidelines'}
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        {language === 'ta' ? 'அறிவுரைகளைக் காட்டு' : language === 'hi' ? 'दिशानिर्देश देखें' : 'View Quarantine Guidelines'}
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('alerts_page.sev_critical'), count: alerts.filter(a => a.severity === 'critical').length, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
          { label: t('alerts_page.sev_high'), count: alerts.filter(a => a.severity === 'high').length, color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
          { label: t('common.active'), count: alerts.filter(a => a.status === 'active').length, color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' },
          { label: t('common.resolved'), count: alerts.filter(a => a.status === 'resolved').length, color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400' },
        ].map(({ label, count, color, textColor }) => (
          <div key={label} className="card text-center">
            <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder={t('alerts_page.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input sm:w-36" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">{t('alerts_page.all_severities')}</option>
          <option value="critical">{t('alerts_page.sev_critical')}</option>
          <option value="high">{t('alerts_page.sev_high')}</option>
          <option value="medium">{t('alerts_page.sev_medium')}</option>
          <option value="low">{t('alerts_page.sev_low')}</option>
        </select>
        <select className="input sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{t('visitors.all_statuses')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="monitoring">Monitoring</option>
          <option value="resolved">{t('common.resolved')}</option>
        </select>
      </div>

      {/* Alert List */}
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : alerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title={t('alerts_page.no_alerts_title')} message={t('alerts_page.no_alerts_desc')} action={<button onClick={() => setShowAdd(true)} className="btn-primary">{t('alerts_page.create_alert')}</button>} />
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
            return (
              <div key={alert.id} className={`card border ${config.bg} cursor-pointer`} onClick={() => setViewAlert(alert)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full ${config.color} flex-shrink-0 mt-1.5 ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h3>
                        <span className={`badge ${getSeverityBadge(alert.severity)}`}>{alert.severity}</span>
                        <span className={`badge ${getStatusBadge(alert.status)}`}>{alert.status}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        🏡 {alert.farm_name} · {alert.affected_animals > 0 && `${alert.affected_animals} animals affected · `}{formatRelativeTime(alert.created_at)}
                      </p>
                      {alert.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{alert.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {alert.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(alert, alert.status === 'active' ? 'monitoring' : 'resolved')}
                        className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"
                        title={alert.status === 'active' ? 'Move to monitoring' : 'Mark as resolved'}
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteAlert(alert)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('alerts_page.create_alert_title')} size="lg" footer={
        <>
          <button onClick={() => setShowAdd(false)} className="btn-outline">{t('common.cancel')}</button>
          <button form="alert-form" type="submit" className="btn-danger" disabled={submitting}>
            {submitting ? 'Creating...' : t('alerts_page.file_alert_btn')}
          </button>
        </>
      }>
        <form id="alert-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">{t('alerts_page.alert_title_label')}</label>
              <input className="input" placeholder="e.g. Suspected Avian Influenza" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              {formErrors.title && <p className="form-error">{formErrors.title}</p>}
            </div>
            <div>
              <label className="label">{t('alerts_page.affected_farm')}</label>
              <select className="input" value={form.farm_id} onChange={e => setForm(f => ({ ...f, farm_id: e.target.value }))}>
                <option value="">Select farm...</option>
                {farmsData?.farms?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {formErrors.farm_id && <p className="form-error">{formErrors.farm_id}</p>}
            </div>
            <div>
              <label className="label">{t('alerts_page.severity')}</label>
              <select className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                <option value="low">🔵 {t('alerts_page.sev_low')}</option>
                <option value="medium">🟡 {t('alerts_page.sev_medium')}</option>
                <option value="high">🟠 {t('alerts_page.sev_high')}</option>
                <option value="critical">🔴 {t('alerts_page.sev_critical')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('scanner.affected_count')}</label>
              <input className="input" type="number" min="0" placeholder="0" value={form.affected_animals} onChange={e => setForm(f => ({ ...f, affected_animals: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{t('alerts_page.description')}</label>
            <textarea className="input" rows={3} placeholder="Describe the situation..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('scanner.symptoms')}</label>
            <textarea className="input" rows={2} placeholder="List observed symptoms..." value={form.symptoms} onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('scanner.recommendations')}</label>
            <textarea className="input" rows={2} placeholder="Actions to take..." value={form.actions} onChange={e => setForm(f => ({ ...f, actions: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* View Alert Modal */}
      <Modal isOpen={!!viewAlert} onClose={() => setViewAlert(null)} title="Alert Details" size="md">
        {viewAlert && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-4 h-4 rounded-full ${SEVERITY_CONFIG[viewAlert.severity]?.color || 'bg-gray-500'} flex-shrink-0 mt-1 ${viewAlert.severity === 'critical' ? 'animate-pulse' : ''}`} />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{viewAlert.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className={`badge ${getSeverityBadge(viewAlert.severity)}`}>{viewAlert.severity}</span>
                  <span className={`badge ${getStatusBadge(viewAlert.status)}`}>{viewAlert.status}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500 dark:text-gray-400">{t('alerts_page.affected_farm')}</p><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewAlert.farm_name}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">{t('scanner.affected_count')}</p><p className="font-medium text-gray-900 dark:text-white mt-0.5">{viewAlert.affected_animals}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Reported</p><p className="font-medium text-gray-900 dark:text-white mt-0.5">{formatDate(viewAlert.created_at)}</p></div>
              {viewAlert.resolved_at && <div><p className="text-gray-500 dark:text-gray-400">Resolved</p><p className="font-medium text-gray-900 dark:text-white mt-0.5">{formatDate(viewAlert.resolved_at)}</p></div>}
            </div>
            {viewAlert.description && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('alerts_page.description')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewAlert.description}</p>
              </div>
            )}
            {viewAlert.symptoms && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('scanner.symptoms')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewAlert.symptoms}</p>
              </div>
            )}
            {viewAlert.actions && (
              <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-900/20">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">{t('scanner.recommendations')}</p>
                <p className="text-sm text-green-800 dark:text-green-300">{viewAlert.actions}</p>
              </div>
            )}
            {viewAlert.status !== 'resolved' && (
              <div className="flex gap-3">
                {viewAlert.status === 'active' && (
                  <button onClick={() => { handleStatusChange(viewAlert, 'monitoring'); setViewAlert(null); }} className="btn-outline flex-1 text-sm">Set to Monitoring</button>
                )}
                <button onClick={() => { handleStatusChange(viewAlert, 'resolved'); setViewAlert(null); }} className="btn-primary flex-1 text-sm">{t('alerts_page.resolve_btn')}</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteAlert}
        onClose={() => setDeleteAlert(null)}
        onConfirm={handleDelete}
        title={t('alerts_page.delete_title')}
        message={t('alerts_page.delete_msg')}
        confirmText={t('alerts_page.delete_btn')}
      />
    </div>
  );
}
