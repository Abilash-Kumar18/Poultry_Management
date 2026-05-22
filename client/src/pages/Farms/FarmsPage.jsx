import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Tractor, MapPin, Users } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { TableSkeleton } from '../../components/UI/LoadingSkeleton';
import { EmptyState, ErrorState } from '../../components/UI/EmptyState';
import Modal, { ConfirmModal } from '../../components/UI/Modal';
import VoiceInput from '../../components/UI/VoiceInput';
import { ScoreBar } from '../../components/UI/StatCard';
import { getHealthBadge } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useFarmerMode } from '../../hooks/useFarmerMode';
import { useLanguage } from '../../hooks/useLanguage';
import farmerFarms from '../../assets/farmer_farms.png';

const INITIAL_FORM = { name: '', type: 'pig', location: '', capacity: '', description: '' };

export default function FarmsPage() {
  const { isFarmerMode } = useFarmerMode();
  const { t } = useLanguage();
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFarm, setEditFarm] = useState(null);
  const [deleteFarm, setDeleteFarm] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, refetch } = useFetch('/farms', {
    search: search || undefined,
    type: typeFilter || undefined,
    health_status: healthFilter || undefined,
  }, [search, typeFilter, healthFilter]);

  const farms = data?.farms || [];

  const validateForm = (formData) => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Farm name is required';
    if (!formData.type) errs.type = 'Farm type is required';
    if (!formData.location.trim()) errs.location = 'Location is required';
    if (!formData.capacity || parseInt(formData.capacity) < 1) errs.capacity = 'Valid capacity is required';
    return errs;
  };

  const openAddModal = () => { setForm(INITIAL_FORM); setFormErrors({}); setShowAddModal(true); };
  const openEditModal = (farm) => { setForm({ name: farm.name, type: farm.type, location: farm.location, capacity: String(farm.capacity), description: farm.description || '' }); setFormErrors({}); setEditFarm(farm); };

  const handleSubmit = async (formData) => {
    const errs = validateForm(formData);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      if (editFarm) {
        await api.put(`/farms/${editFarm.id}`, formData);
        toast.success('Farm updated successfully!');
        setEditFarm(null);
      } else {
        await api.post('/farms', formData);
        toast.success('Farm added successfully!');
        setShowAddModal(false);
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save farm.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFarm) return;
    try {
      await api.delete(`/farms/${deleteFarm.id}`);
      toast.success('Farm deleted.');
      setDeleteFarm(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete farm.');
    }
  };



  return (
    <div className="space-y-6 animate-fade-in">
      {/* Visual Header Banner for Farmers */}
      {isFarmerMode && (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-md border border-gray-200 dark:border-gray-800">
          <img src={farmerFarms} alt="Farmer Farms Banner" className="w-full h-48 sm:h-56 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{t('farms.banner_title')}</h2>
            <p className="text-sm text-gray-200/90 max-w-lg">{t('farms.banner_desc')}</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{t('farms.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('farms.managed_count', { count: farms.length, plural: farms.length !== 1 ? 's' : '' })}
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={16} /> {t('farms.add_farm')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('farms.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{t('farms.all_types')}</option>
          <option value="pig">Pig</option>
          <option value="poultry">Poultry</option>
          <option value="mixed">Mixed</option>
        </select>
        <select className="input sm:w-40" value={healthFilter} onChange={e => setHealthFilter(e.target.value)}>
          <option value="">{t('farms.all_status')}</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Farm Grid */}
      {loading ? <TableSkeleton rows={4} cols={5} /> : error ? <ErrorState error={error} onRetry={refetch} /> : farms.length === 0 ? (
        <EmptyState icon={Tractor} title={t('farms.no_farms_title')} message={t('farms.no_farms_desc')} action={<button onClick={openAddModal} className="btn-primary">{t('farms.add_farm')}</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {farms.map(farm => (
            <div key={farm.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    farm.type === 'pig' ? 'bg-pink-50 dark:bg-pink-900/20' :
                    farm.type === 'poultry' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    {farm.type === 'pig' ? '🐷' : farm.type === 'poultry' ? '🐔' : '🏡'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{farm.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{farm.type} Farm</p>
                  </div>
                </div>
                <span className={getHealthBadge(farm.health_status)}>{farm.health_status}</span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin size={12} /> <span className="truncate">{farm.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Users size={12} /> <span>Capacity: {farm.capacity.toLocaleString()}</span>
                </div>
              </div>

              <ScoreBar score={farm.biosecurity_score} label="Biosecurity Score" />

              {(farm.pending_visitors > 0 || farm.active_alerts > 0) && (
                <div className="flex gap-2 mt-3">
                  {farm.pending_visitors > 0 && <span className="badge-yellow">{farm.pending_visitors} pending visitors</span>}
                  {farm.active_alerts > 0 && <span className="badge-red">{farm.active_alerts} active alerts</span>}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Link to={`/farms/${farm.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
                  {t('farms.view_details')}
                </Link>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(farm)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" aria-label="Edit farm">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => setDeleteFarm(farm)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors" aria-label="Delete farm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal key="add-farm-modal" isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('farms.add_new_title')} footer={
        <>
          <button onClick={() => setShowAddModal(false)} className="btn-outline">{t('farms.cancel')}</button>
          <button form="farm-form" type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('farms.adding') : t('farms.add_farm')}
          </button>
        </>
      }>
        <FarmForm
          form={form}
          onSubmit={handleSubmit}
          formErrors={formErrors}
          isFarmerMode={isFarmerMode}
          t={t}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal key="edit-farm-modal" isOpen={!!editFarm} onClose={() => setEditFarm(null)} title={t('farms.edit_title')} footer={
        <>
          <button onClick={() => setEditFarm(null)} className="btn-outline">{t('farms.cancel')}</button>
          <button form="farm-form" type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('farms.saving') : t('farms.save_changes')}
          </button>
        </>
      }>
        <FarmForm
          form={form}
          onSubmit={handleSubmit}
          formErrors={formErrors}
          isFarmerMode={isFarmerMode}
          t={t}
        />
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deleteFarm}
        onClose={() => setDeleteFarm(null)}
        onConfirm={handleDelete}
        title={t('farms.delete_title')}
        message={t('farms.delete_msg', { name: deleteFarm?.name })}
        confirmText={t('farms.delete_btn')}
      />
    </div>
  );
}

import { useEffect as reactUseEffect } from 'react';

function FarmForm({ form: initialForm, onSubmit, formErrors, isFarmerMode, t }) {
  const [form, setForm] = useState(initialForm);

  reactUseEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleSubmitLocal = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmitLocal} className="space-y-4" id="farm-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label text-sm font-semibold">{t('farms.farm_name')}</label>
          <div className="flex gap-2">
            <input className="input" placeholder="Green Valley Farm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <VoiceInput onTranscript={text => setForm(f => ({ ...f, name: text }))} />
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Green Valley Dairy', 'Golden Feather Poultry', 'Swine Breeders'].map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setForm(f => ({ ...f, name: suggestion }))}
                className="px-2.5 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
          {formErrors.name && <p className="form-error">{formErrors.name}</p>}
        </div>
        
        <div className="sm:col-span-2">
          <label className="label text-sm font-semibold mb-2 block">{t('farms.farm_type')}</label>
          {isFarmerMode ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'pig', label: t('farms.type_pig') },
                { value: 'poultry', label: t('farms.type_poultry') },
                { value: 'mixed', label: t('farms.type_mixed') }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    form.type === opt.value
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 scale-[1.02] shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-3xl">{opt.label.split(' ')[0]}</span>
                  <span className="text-xs font-bold">{opt.label.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          ) : (
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="pig">{t('farms.type_pig')}</option>
              <option value="poultry">{t('farms.type_poultry')}</option>
              <option value="mixed">{t('farms.type_mixed')}</option>
            </select>
          )}
        </div>

        <div>
          <label className="label text-sm font-semibold">{t('farms.capacity')}</label>
          <div className="flex gap-2">
            <input className="input" type="number" placeholder="500" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            <VoiceInput onTranscript={text => {
              const digits = text.replace(/\D/g, '');
              if (digits) setForm(f => ({ ...f, capacity: digits }));
            }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {[100, 500, 1000, 5000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setForm(f => ({ ...f, capacity: String(val) }))}
                className="px-2.5 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                {val}
              </button>
            ))}
          </div>
          {formErrors.capacity && <p className="form-error">{formErrors.capacity}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label text-sm font-semibold">{t('farms.location')}</label>
          <div className="flex gap-2">
            <input className="input" placeholder="Rural District 1, Block A" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <VoiceInput onTranscript={text => setForm(f => ({ ...f, location: text }))} />
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Coimbatore, Tamil Nadu', 'Ludhiana, Punjab', 'Pune, Maharashtra'].map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setForm(f => ({ ...f, location: loc }))}
                className="px-2.5 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors"
              >
                + {loc.split(',')[0]}
              </button>
            ))}
          </div>
          {formErrors.location && <p className="form-error">{formErrors.location}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label text-sm font-semibold">{t('farms.description')}</label>
          <div className="flex gap-2">
            <textarea className="input" rows={3} placeholder="Optional description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <VoiceInput onTranscript={text => setForm(f => ({ ...f, description: text }))} />
          </div>
        </div>
      </div>
    </form>
  );
}
