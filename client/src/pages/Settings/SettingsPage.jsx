import { useState } from 'react';
import { User, Lock, Bell, Shield, Users, Save, Globe, Moon, Sun, Tractor } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { useLanguage } from '../../hooks/useLanguage';
import { useFarmerMode } from '../../hooks/useFarmerMode';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', labelKey: 'settings_page.tab_profile', icon: User },
  { id: 'security', labelKey: 'settings_page.tab_security', icon: Lock },
  { id: 'notifications', labelKey: 'settings_page.tab_notifications', icon: Bell },
  { id: 'users', labelKey: 'settings_page.tab_users', icon: Users, adminOnly: true },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { isFarmerMode, toggleFarmerMode } = useFarmerMode();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [notifications, setNotifications] = useState({
    criticalAlerts: true, newVisitors: true, reportReady: false, weeklyDigest: true
  });
  const [saving, setSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const { data: usersData } = useFetch(activeTab === 'users' ? '/auth/users' : null);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    toast.success(next ? t('nav.dark_mode') + ' ' + t('common.active').toLowerCase() : t('nav.light_mode') + ' ' + t('common.active').toLowerCase());
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: profileForm.name });
      updateUser(res.data.user);
      toast.success(language === 'ta' ? 'சுயவிவரம் புதுப்பிக்கப்பட்டது!' : language === 'hi' ? 'प्रोफ़ाइल अपडेट हो गई!' : 'Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = t('auth.validate_password');
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) errs.newPassword = t('auth.validate_password_len');
    if (passwordForm.newPassword !== passwordForm.confirmNew) errs.confirmNew = t('auth.validate_confirm');
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSaving(true);
    try {
      await api.put('/auth/profile', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success(language === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : language === 'hi' ? 'पासवर्ड सफलतापूर्वक बदल गया!' : 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNew: '' });
      setPwErrors({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setSaving(true);
      try {
        const res = await api.put('/auth/profile', { avatar: base64String });
        updateUser(res.data.user);
        toast.success('Profile picture updated successfully!');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update profile picture.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const tabs = TABS.filter(t => !t.adminOnly || user?.role === 'admin');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('settings_page.title')}</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-52 flex-shrink-0">
          <div className="card p-2">
            <nav className="space-y-1">
              {tabs.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    activeTab === id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={16} />
                  {t(labelKey)}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="card space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="relative group w-20 h-20 flex-shrink-0">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-secondary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-sm">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                      {t('settings_page.upload_avatar')}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={saving} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email || user?.phone || 'No contact info'}</p>
                    <span className="badge-green mt-1 inline-block capitalize">{user?.role}</span>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings_page.personal_info')}</h3>
                  <div>
                    <label className="label">{t('settings_page.name')}</label>
                    <input className="input" value={profileForm.name} onChange={e => setProfileForm({ name: e.target.value })} placeholder={t('auth.full_name_placeholder')} />
                  </div>
                  <div>
                    <label className="label">{t('settings_page.email')}</label>
                    <input className="input opacity-70 cursor-not-allowed" value={user?.email || ''} disabled />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('settings_page.email_hint')}</p>
                  </div>
                  {user?.phone && (
                    <div>
                      <label className="label">{t('settings_page.phone')}</label>
                      <input className="input opacity-70 cursor-not-allowed" value={user?.phone || ''} disabled />
                    </div>
                  )}
                  <div>
                    <label className="label">{t('settings_page.role')}</label>
                    <input className="input opacity-70 cursor-not-allowed capitalize" value={user?.role} disabled />
                  </div>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} /> {saving ? t('settings_page.saving') : t('common.save')}
                  </button>
                </form>
              </div>

              {/* Preferences Card */}
              <div className="card space-y-6">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">
                  {language === 'en' ? 'System Preferences' : language === 'ta' ? 'அமைப்பு முன்னுரிமைகள்' : 'सिस्टम प्राथमिकताएं'}
                </h3>
                
                {/* Language Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-150 dark:border-gray-850 pb-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{t('settings_page.language')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {language === 'en' ? 'Select your interface language.' : language === 'ta' ? 'பயன்பாட்டுக்கான மொழியைத் தேர்ந்தெடுக்கவும்.' : 'अपनी इंटरफ़ेस भाषा चुनें।'}
                    </p>
                  </div>
                  <select 
                    value={language}
                    onChange={(e) => {
                      changeLanguage(e.target.value);
                      toast.success(e.target.value === 'en' ? 'Language updated to English' : e.target.value === 'ta' ? 'மொழி தமிழுக்கு மாற்றப்பட்டது' : 'भाषा हिंदी में बदल दी गई है');
                    }}
                    className="input sm:w-40"
                  >
                    <option value="en">English</option>
                    <option value="ta">தமிழ்</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>

                {/* Theme Switcher */}
                <div className="flex items-center justify-between gap-4 py-2 border-b border-gray-150 dark:border-gray-850 pb-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{t('settings_page.theme')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {language === 'en' ? 'Toggle between daylight and night themes.' : language === 'ta' ? 'பகல் மற்றும் இரவு தீம்களுக்கு இடையே மாறவும்.' : 'दिन और रात के थीम के बीच स्विच करें।'}
                    </p>
                  </div>
                  <button 
                    onClick={toggleDark}
                    className="btn-outline flex items-center gap-2 text-xs md:text-sm px-3.5 py-2 font-medium rounded-xl border"
                  >
                    {isDark ? (
                      <>
                        <Sun size={15} className="text-yellow-500" />
                        <span>{t('nav.light_mode')}</span>
                      </>
                    ) : (
                      <>
                        <Moon size={15} className="text-gray-500" />
                        <span>{t('nav.dark_mode')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Farmer Mode Switcher */}
                <div className="flex items-start justify-between gap-4 py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{t('settings_page.farmer_mode')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings_page.farmer_mode_desc')}</p>
                  </div>
                  <button
                    onClick={toggleFarmerMode}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isFarmerMode ? 'bg-amber-500 ring-2 ring-amber-400/50' : 'bg-gray-300 dark:bg-gray-600'}`}
                    role="switch"
                    aria-checked={isFarmerMode}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFarmerMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">{t('settings_page.change_password')}</h2>
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div>
                  <label className="label">{t('settings_page.current_password')}</label>
                  <input type="password" className="input" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" />
                  {pwErrors.currentPassword && <p className="form-error">{pwErrors.currentPassword}</p>}
                </div>
                <div>
                  <label className="label">{t('settings_page.new_password')}</label>
                  <input type="password" className="input" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder={t('auth.password_hint')} />
                  {pwErrors.newPassword && <p className="form-error">{pwErrors.newPassword}</p>}
                </div>
                <div>
                  <label className="label">{t('settings_page.confirm_new_password')}</label>
                  <input type="password" className="input" value={passwordForm.confirmNew} onChange={e => setPasswordForm(f => ({ ...f, confirmNew: e.target.value }))} placeholder="••••••••" />
                  {pwErrors.confirmNew && <p className="form-error">{pwErrors.confirmNew}</p>}
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Shield size={16} /> {saving ? t('settings_page.updating') : t('settings_page.update_password')}
                </button>
              </form>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('settings_page.session_info')}</h3>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('settings_page.logged_in_as')}</span><span className="font-medium text-gray-900 dark:text-white">{user?.email || user?.phone || 'Session user'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('settings_page.session_expires')}</span><span className="font-medium text-gray-900 dark:text-white">{t('settings_page.session_expiry_value')}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">{t('settings_page.notification_preferences')}</h2>
              {[
                { key: 'criticalAlerts', label: t('settings_page.pref_critical'), desc: t('settings_page.pref_critical_desc') },
                { key: 'newVisitors', label: t('settings_page.pref_visitors'), desc: t('settings_page.pref_visitors_desc') },
                { key: 'reportReady', label: t('settings_page.pref_reports'), desc: t('settings_page.pref_reports_desc') },
                { key: 'weeklyDigest', label: t('settings_page.pref_digest'), desc: t('settings_page.pref_digest_desc') },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4 py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifications[key] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    role="switch"
                    aria-checked={notifications[key]}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
              <button onClick={() => toast.success(language === 'ta' ? 'அறிவிப்பு விருப்பங்கள் சேமிக்கப்பட்டன!' : language === 'hi' ? 'अधिसूचना प्राथमिकताएं सहेजी गईं!' : 'Notification preferences saved!')} className="btn-primary mt-2">
                <Save size={16} /> {t('settings_page.save_preferences')}
              </button>
            </div>
          )}

          {/* Users Tab (Admin only) */}
          {activeTab === 'users' && user?.role === 'admin' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings_page.user_management')}</h2>
              <div className="table-container">
                <table className="table">
                  <thead className="table-header"><tr>
                    <th className="table-th">{t('settings_page.table_user')}</th>
                    <th className="table-th">{t('settings_page.table_email')}</th>
                    <th className="table-th">{t('settings_page.table_role')}</th>
                    <th className="table-th">{t('settings_page.table_joined')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {usersData?.users?.map(u => (
                      <tr key={u.id} className="table-row">
                        <td className="table-td">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                          </div>
                        </td>
                        <td className="table-td text-xs">{u.email || u.phone || '-'}</td>
                        <td className="table-td">
                          <span className={`badge capitalize ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}`}>{u.role}</span>
                        </td>
                        <td className="table-td text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
