import { useState } from 'react';
import { Plus, CheckCircle, Clock, Filter, Upload, ShieldCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { PageLoader } from '../../components/UI/LoadingSkeleton';
import { EmptyState, ErrorState } from '../../components/UI/EmptyState';
import Modal from '../../components/UI/Modal';
import { formatDateTime, getStatusBadge } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../../hooks/useLanguage';

export default function BiosecurityPage() {
  const { t } = useLanguage();
  const [farmFilter, setFarmFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ farm_id: '', protocol_name: '', category: 'daily', due_date: new Date().toISOString().split('T')[0], notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadItem, setUploadItem] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: farmsData } = useFetch('/farms');
  const { data, loading, error, refetch } = useFetch('/biosecurity/checklists', {
    farm_id: farmFilter || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
  }, [farmFilter, categoryFilter, statusFilter]);

  const { data: summary } = useFetch('/biosecurity/summary', { farm_id: farmFilter || undefined }, [farmFilter]);

  const checklists = data?.checklists || [];
  const grouped = checklists.reduce((acc, item) => {
    const key = item.farm_name || 'Unknown Farm';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleComplete = async (item) => {
    try {
      await api.put(`/biosecurity/checklists/${item.id}`, { status: item.status === 'completed' ? 'pending' : 'completed' });
      toast.success(item.status === 'completed' ? 'Marked as pending' : 'Marked as completed!');
      refetch();
    } catch { toast.error('Failed to update checklist.'); }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.farm_id) errs.farm_id = 'Farm is required';
    if (!form.protocol_name.trim()) errs.protocol_name = 'Protocol name is required';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.post('/biosecurity/checklists', form);
      toast.success('Checklist item added!');
      setShowAdd(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadItem) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('checklist_id', uploadItem.id);
      await api.post('/biosecurity/upload-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo uploaded!');
      setUploadItem(null);
      refetch();
    } catch { toast.error('Failed to upload photo.'); } finally {
      setUploading(false);
    }
  };

  const summaryData = summary?.summary;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('biosecurity.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('biosecurity.banner_desc')}</p>
        </div>
        <button onClick={() => { setForm({ farm_id: '', protocol_name: '', category: 'daily', due_date: new Date().toISOString().split('T')[0], notes: '' }); setFormErrors({}); setShowAdd(true); }} className="btn-primary text-sm">
          <Plus size={16} /> {t('biosecurity.add_protocol')}
        </button>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('biosecurity.total_checks'), value: summaryData.total ?? 0, color: 'text-blue-600 dark:text-blue-400' },
            { label: t('biosecurity.completed'), value: summaryData.completed ?? 0, color: 'text-green-600 dark:text-green-400' },
            { label: t('biosecurity.pending'), value: summaryData.pending ?? 0, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: t('biosecurity.rate'), value: summaryData.total ? `${Math.round((summaryData.completed / summaryData.total) * 100)}%` : '0%', color: 'text-primary-600 dark:text-primary-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-48" value={farmFilter} onChange={e => setFarmFilter(e.target.value)}>
          <option value="">{t('biosecurity.all_farms')}</option>
          {farmsData?.farms?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="input sm:w-36" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">{t('biosecurity.all_cats')}</option>
          <option value="daily">{t('biosecurity.daily')}</option>
          <option value="weekly">{t('biosecurity.weekly')}</option>
          <option value="monthly">{t('biosecurity.monthly')}</option>
        </select>
        <select className="input sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{t('biosecurity.all_status')}</option>
          <option value="pending">{t('biosecurity.pending')}</option>
          <option value="completed">{t('biosecurity.completed')}</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {/* Checklists */}
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : checklists.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('biosecurity.no_checklists')} message={t('biosecurity.no_checklists_desc')} action={<button onClick={() => setShowAdd(true)} className="btn-primary">{t('biosecurity.add_protocol')}</button>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([farmName, items]) => (
            <div key={farmName} className="card">
              <h2 className="section-title flex items-center gap-2">
                <span>🏡</span> {farmName}
                <span className="ml-auto text-xs text-gray-500 font-normal">
                  {items.filter(i => i.status === 'completed').length}/{items.length} {t('biosecurity.completed').toLowerCase()}
                </span>
              </h2>
              
              {/* Category groups */}
              {['daily', 'weekly', 'monthly'].map(cat => {
                const catItems = items.filter(i => i.category === cat);
                if (!catItems.length) return null;
                return (
                  <div key={cat} className="mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">{t('biosecurity.' + cat)}</h3>
                    <div className="space-y-2">
                      {catItems.map(item => (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          item.status === 'completed'
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                          <button
                            onClick={() => handleComplete(item)}
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                              item.status === 'completed'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                            }`}
                            aria-label={item.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {item.status === 'completed' && <CheckCircle size={12} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${item.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                              {item.protocol_name}
                            </p>
                            {item.completed_by && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                ✓ {item.completed_by} · {formatDateTime(item.completed_at)}
                              </p>
                            )}
                            {item.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.notes}</p>}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span>
                            <button
                              onClick={() => setUploadItem(item)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Upload photo verification"
                            >
                              <Upload size={14} />
                            </button>
                            {item.photo_url && (
                              <span className="text-green-500 text-xs" title="Photo uploaded">📷</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Add Protocol Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={t('biosecurity.add_protocol')} footer={
        <>
          <button onClick={() => setShowAdd(false)} className="btn-outline">{t('biosecurity.cancel')}</button>
          <button form="checklist-form" type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('biosecurity.add_protocol')}
          </button>
        </>
      }>
        <form id="checklist-form" onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="label">{t('biosecurity.farm')}</label>
            <select className="input" value={form.farm_id} onChange={e => setForm(f => ({ ...f, farm_id: e.target.value }))}>
              <option value="">{t('biosecurity.select_farm')}</option>
              {farmsData?.farms?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {formErrors.farm_id && <p className="form-error">{formErrors.farm_id}</p>}
          </div>
          <div>
            <label className="label">{t('biosecurity.protocol_name')}</label>
            <input className="input" placeholder="e.g. Disinfection of entry points" value={form.protocol_name} onChange={e => setForm(f => ({ ...f, protocol_name: e.target.value }))} />
            {formErrors.protocol_name && <p className="form-error">{formErrors.protocol_name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('biosecurity.category')}</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="daily">{t('biosecurity.daily')}</option>
                <option value="weekly">{t('biosecurity.weekly')}</option>
                <option value="monthly">{t('biosecurity.monthly')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('biosecurity.due_date')}</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{t('biosecurity.notes')}</label>
            <textarea className="input" rows={3} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Upload Photo Modal */}
      <Modal isOpen={!!uploadItem} onClose={() => setUploadItem(null)} title={t('biosecurity.upload_photo')} size="sm">
        {uploadItem && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('biosecurity.upload_desc', { name: uploadItem.protocol_name })}
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-800/50">
              <Upload size={24} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">{uploading ? t('biosecurity.uploading') : t('biosecurity.click_to_upload')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
            {uploadItem.photo_url && (
              <p className="text-xs text-green-600 dark:text-green-400">✓ Current photo: {uploadItem.photo_url.split('/').pop()}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
