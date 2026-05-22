import { useState } from 'react';
import { Plus, Search, Download, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { TableSkeleton } from '../../components/UI/LoadingSkeleton';
import { EmptyState, ErrorState } from '../../components/UI/EmptyState';
import Modal from '../../components/UI/Modal';
import VoiceInput from '../../components/UI/VoiceInput';
import { getStatusBadge, formatDate, formatDateTime } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useFarmerMode } from '../../hooks/useFarmerMode';
import { useLanguage } from '../../hooks/useLanguage';
import farmerVisitors from '../../assets/farmer_visitors.png';

const INIT_FORM = {
  name: '', contact: '', company: '', purpose: '', farm_id: '', visit_date: '',
  vehicle_number: '',
  health_declaration: { fever: false, cough: false, recentTravel: false, animalContact: false }
};

export default function VisitorsPage() {
  const { isFarmerMode } = useFarmerMode();
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [viewVisitor, setViewVisitor] = useState(null);
  const [form, setForm] = useState(INIT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  const { data: farmsData } = useFetch('/farms');
  const { data, loading, error, refetch } = useFetch('/visitors', {
    search: search || undefined,
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    page,
    limit: 15,
  }, [search, statusFilter, startDate, endDate, page]);

  const visitors = data?.visitors || [];
  const pagination = data?.pagination;

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.contact.trim()) errs.contact = 'Contact is required';
    if (!form.purpose.trim()) errs.purpose = 'Purpose is required';
    if (!form.farm_id) errs.farm_id = 'Farm is required';
    if (!form.visit_date) errs.visit_date = 'Visit date is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.post('/visitors', form);
      toast.success('Visitor registered successfully!');
      setShowAdd(false);
      setForm(INIT_FORM);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register visitor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/visitors/${id}/approve`);
      toast.success('Visitor approved!');
      refetch();
    } catch { toast.error('Failed to approve visitor.'); }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/visitors/${id}/reject`);
      toast.success('Visitor rejected.');
      refetch();
    } catch { toast.error('Failed to reject visitor.'); }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(statusFilter && { status: statusFilter }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });
    const token = localStorage.getItem('farm_token');
    const url = `/api/visitors/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'visitors.csv');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
        toast.success('CSV exported!');
      })
      .catch(() => toast.error('Export failed.'));
  };

  const hdField = (key) => ({
    checked: form.health_declaration[key],
    onChange: (e) => setForm(f => ({ ...f, health_declaration: { ...f.health_declaration, [key]: e.target.checked } }))
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual Header Banner for Farmers */}
      {isFarmerMode && (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-md border border-gray-200 dark:border-gray-800">
          <img src={farmerVisitors} alt="Farmer Visitors Banner" className="w-full h-48 sm:h-56 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{t('visitors.banner_title')}</h2>
            <p className="text-sm text-gray-200/90 max-w-lg">{t('visitors.banner_desc')}</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('visitors.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{pagination?.total ?? 0} total entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline text-sm">
            <Download size={16} /> {t('reports.export_csv')}
          </button>
          <button onClick={() => { setForm(INIT_FORM); setFormErrors({}); setShowAdd(true); }} className="btn-primary text-sm">
            <Plus size={16} /> {t('visitors.add_visitor')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('visitors.search_placeholder')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input sm:w-36" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">{t('visitors.all_statuses')}</option>
          <option value="pending">{t('visitors.status_pending')}</option>
          <option value="approved">{t('visitors.status_approved')}</option>
          <option value="rejected">{t('visitors.status_denied')}</option>
        </select>
        <input type="date" className="input sm:w-40" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start date" />
        <input type="date" className="input sm:w-40" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End date" />
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={6} cols={7} /> : error ? <ErrorState error={error} onRetry={refetch} /> : visitors.length === 0 ? (
        <div className="card">
          <EmptyState icon={Clock} title={t('visitors.no_visitors_title')} message={t('visitors.no_visitors_desc')} action={<button onClick={() => setShowAdd(true)} className="btn-primary">{t('visitors.add_visitor')}</button>} />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-th">{t('visitors.visitor_name')}</th>
                  <th className="table-th">{t('visitors.company')}</th>
                  <th className="table-th">{t('visitors.farm')}</th>
                  <th className="table-th">{t('visitors.purpose')}</th>
                  <th className="table-th">{t('visitors.visit_date')}</th>
                  <th className="table-th">{t('common.status')}</th>
                  <th className="table-th">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {visitors.map(visitor => (
                  <tr key={visitor.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {visitor.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{visitor.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{visitor.contact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{visitor.company || '—'}</td>
                    <td className="table-td">
                      <span className="text-xs">{visitor.farm_name}</span>
                    </td>
                    <td className="table-td">
                      <span className="text-xs max-w-[120px] truncate block">{visitor.purpose}</span>
                    </td>
                    <td className="table-td text-xs">{formatDate(visitor.visit_date)}</td>
                    <td className="table-td">
                      <span className={`badge ${getStatusBadge(visitor.status)}`}>{visitor.status}</span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewVisitor(visitor)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 transition-colors" title="View details">
                          <Filter size={14} />
                        </button>
                        {visitor.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(visitor.id)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleReject(visitor.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors" title="Reject">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline text-sm py-1.5">← Prev</button>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-outline text-sm py-1.5">Next →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Visitor Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('visitors.log_visitor_title')} size="lg" footer={
        <>
          <button onClick={() => setShowAdd(false)} className="btn-outline">{t('common.cancel')}</button>
          <button form="visitor-form" type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('visitors.submitting') : t('visitors.add_visitor')}
          </button>
        </>
      }>
        <form id="visitor-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('visitors.visitor_name')}</label>
              <div className="flex gap-2">
                <input className="input" placeholder="Visitor name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <VoiceInput onTranscript={text => setForm(f => ({ ...f, name: text }))} />
              </div>
              {formErrors.name && <p className="form-error">{formErrors.name}</p>}
            </div>
            <div>
              <label className="label">{t('visitors.contact')}</label>
              <div className="flex gap-2">
                <input className="input" placeholder="+1-555-0000" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                <VoiceInput onTranscript={text => setForm(f => ({ ...f, contact: text }))} />
              </div>
              {formErrors.contact && <p className="form-error">{formErrors.contact}</p>}
            </div>
            <div>
              <label className="label">{t('visitors.company')}</label>
              <div className="flex gap-2">
                <input className="input" placeholder="Company name" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                <VoiceInput onTranscript={text => setForm(f => ({ ...f, company: text }))} />
              </div>
            </div>
            <div>
              <label className="label">{t('visitors.vehicle')}</label>
              <div className="flex gap-2">
                <input className="input" placeholder="ABC-123" value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} />
                <VoiceInput onTranscript={text => setForm(f => ({ ...f, vehicle_number: text }))} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('visitors.purpose')}</label>
              <div className="flex gap-2">
                <input className="input" placeholder="e.g. Veterinary inspection, Feed delivery" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
                <VoiceInput onTranscript={text => setForm(f => ({ ...f, purpose: text }))} />
              </div>
              {formErrors.purpose && <p className="form-error">{formErrors.purpose}</p>}
            </div>
            <div>
              <label className="label">{t('visitors.farm')}</label>
              <select className="input" value={form.farm_id} onChange={e => setForm(f => ({ ...f, farm_id: e.target.value }))}>
                <option value="">Select farm...</option>
                {farmsData?.farms?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {formErrors.farm_id && <p className="form-error">{formErrors.farm_id}</p>}
            </div>
            <div>
              <label className="label">{t('visitors.visit_date')}</label>
              <input className="input" type="datetime-local" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} />
              {formErrors.visit_date && <p className="form-error">{formErrors.visit_date}</p>}
            </div>
          </div>
          
          {/* Health Declaration */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Health Declaration Checklist</p>
            <div className="space-y-2">
              {[
                { key: 'fever', label: 'Currently experiencing fever or flu-like symptoms' },
                { key: 'cough', label: 'Have a persistent cough or respiratory issues' },
                { key: 'recentTravel', label: 'Recently traveled to disease-affected areas' },
                { key: 'animalContact', label: 'Had contact with sick animals in the past 14 days' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded text-primary-500" {...hdField(key)} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* View Visitor Modal */}
      <Modal isOpen={!!viewVisitor} onClose={() => setViewVisitor(null)} title="Visitor Details" size="md">
        {viewVisitor && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {viewVisitor.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{viewVisitor.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{viewVisitor.company || 'Individual'}</p>
                <span className={`badge mt-1 ${getStatusBadge(viewVisitor.status)}`}>{viewVisitor.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('visitors.contact')}</p><p className="font-medium text-gray-900 dark:text-white">{viewVisitor.contact}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('visitors.farm')}</p><p className="font-medium text-gray-900 dark:text-white">{viewVisitor.farm_name}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('visitors.purpose')}</p><p className="font-medium text-gray-900 dark:text-white">{viewVisitor.purpose}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('visitors.vehicle')}</p><p className="font-medium text-gray-900 dark:text-white">{viewVisitor.vehicle_number || '—'}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">{t('visitors.visit_date')}</p><p className="font-medium text-gray-900 dark:text-white">{formatDateTime(viewVisitor.visit_date)}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400 mb-0.5">Registered</p><p className="font-medium text-gray-900 dark:text-white">{formatDate(viewVisitor.created_at)}</p></div>
            </div>
            {viewVisitor.health_declaration && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Health Declaration</p>
                {(() => {
                  try {
                    const hd = typeof viewVisitor.health_declaration === 'string' ? JSON.parse(viewVisitor.health_declaration) : viewVisitor.health_declaration;
                    return Object.entries(hd).map(([key, val]) => (
                       <div key={key} className="flex items-center gap-2 text-xs py-0.5">
                        <span className={val ? 'text-red-500' : 'text-green-500'}>{val ? '⚠️' : '✅'}</span>
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: <strong>{val ? 'Yes' : 'No'}</strong></span>
                      </div>
                    ));
                  } catch { return null; }
                })()}
              </div>
            )}
            {viewVisitor.status === 'pending' && (
              <div className="flex gap-3">
                <button onClick={() => { handleApprove(viewVisitor.id); setViewVisitor(null); }} className="btn-primary flex-1">{t('visitors.approve_btn')}</button>
                <button onClick={() => { handleReject(viewVisitor.id); setViewVisitor(null); }} className="btn-danger flex-1">{t('visitors.reject_btn')}</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
