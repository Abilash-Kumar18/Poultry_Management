import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Mail, Lock, User, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, socialLogin } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (fbAppId) {
      if (window.FB) {
        try {
          window.FB.init({
            appId: fbAppId,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
        } catch (e) {
          console.error('FB init error:', e);
        }
      } else {
        window.fbAsyncInit = function() {
          try {
            window.FB.init({
              appId: fbAppId,
              cookie: true,
              xfbml: true,
              version: 'v18.0'
            });
          } catch (e) {
            console.error('FB async init error:', e);
          }
        };
      }
    }
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = t('auth.validate_name');
    if (!form.email) errs.email = t('auth.validate_email');
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('auth.validate_email_format');
    if (!form.password) errs.password = t('auth.validate_password');
    else if (form.password.length < 6) errs.password = t('auth.validate_password_len');
    if (form.password !== form.confirm) errs.confirm = t('auth.validate_confirm');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success(t('auth.register_toast'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || t('auth.error_register'));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = async (provider) => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID;

    if (provider === 'Google' && googleClientId && window.google) {
      setLoading(true);
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                await socialLogin(null, null, null, 'Google', tokenResponse.access_token);
                toast.success('Successfully registered with Google!');
                navigate('/dashboard');
              } catch (err) {
                toast.error(err.response?.data?.error || 'Google authentication failed on server.');
                setLoading(false);
              }
            } else {
              toast.error('Google authorization failed.');
              setLoading(false);
            }
          },
          error_callback: (err) => {
            console.error('Google Auth Error:', err);
            toast.error('Google Registration Error');
            setLoading(false);
          }
        });
        client.requestAccessToken();
      } catch (err) {
        console.error(err);
        toast.error('Failed to trigger Google registration.');
        setLoading(false);
      }
    } else if (provider === 'Facebook' && fbAppId && window.FB) {
      setLoading(true);
      try {
        window.FB.login(async (response) => {
          if (response.authResponse && response.authResponse.accessToken) {
            try {
              await socialLogin(null, null, null, 'Facebook', response.authResponse.accessToken);
              toast.success('Successfully registered with Facebook!');
              navigate('/dashboard');
            } catch (err) {
              toast.error(err.response?.data?.error || 'Facebook authentication failed on server.');
              setLoading(false);
            }
          } else {
            toast.error('Facebook registration cancelled or failed.');
            setLoading(false);
          }
        }, { scope: 'public_profile,email' });
      } catch (err) {
        console.error(err);
        toast.error('Failed to trigger Facebook registration.');
        setLoading(false);
      }
    } else {
      // Fallback Mock Login mode
      setLoading(true);
      try {
        let email = '';
        let name = '';
        let avatar = '';
        
        if (provider === 'Google') {
          email = 'ravi.shankar.google@gmail.com';
          name = 'Ravi Shankar (Google Mock)';
          avatar = 'https://lh3.googleusercontent.com/a/default-user=s96-c';
        } else {
          email = 'ravi.shankar.fb@outlook.com';
          name = 'Ravi Shankar (Facebook Mock)';
          avatar = 'https://graph.facebook.com/1234567/picture?type=normal';
        }

        await socialLogin(email, name, avatar, provider);
        toast.success(`Welcome! Registered with ${provider} (Mock Mode)`);
        navigate('/dashboard');
      } catch (err) {
        toast.error(`Failed to register with ${provider}.`);
      } finally {
        setLoading(false);
      }
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }
  });

  const inputClass = "w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative">
      {/* Floating Language Selector */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setLangOpen(!langOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium border border-gray-800 bg-gray-900/60 backdrop-blur-md text-gray-300 hover:text-white transition-all hover:bg-gray-850"
          aria-label="Change language"
        >
          <Globe size={14} className="text-primary-500" />
          <span>{language === 'en' ? 'English' : language === 'ta' ? 'தமிழ்' : 'हिन्दी'}</span>
        </button>

        {langOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
            <div className="absolute right-0 mt-2 w-32 bg-gray-900/95 border border-gray-800 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md">
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
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors ${
                    language === lang.code ? 'text-primary-400 font-bold bg-primary-950/20' : 'text-gray-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl shadow-2xl shadow-primary-500/25 mb-4">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.create_account')}</h1>
          <p className="text-gray-400 text-sm mt-1">{t('auth.signup_subtitle')}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.full_name')}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="name"
                  type="text"
                  {...field('name')}
                  className={inputClass}
                  placeholder={t('auth.full_name_placeholder')}
                  autoComplete="name"
                />
              </div>
              {errors.name && <p className="form-error">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  {...field('email')}
                  className={inputClass}
                  placeholder={t('auth.email_placeholder')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  {...field('password')}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder={t('auth.password_hint')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">
                {t('auth.confirm_password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="confirm"
                  type="password"
                  {...field('confirm')}
                  className={inputClass}
                  placeholder={t('repeat_password')}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm && <p className="form-error">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth.signing_up')}
                </span>
              ) : t('auth.signup_btn')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-3 text-gray-500 font-semibold tracking-wider">
                {language === 'ta' ? 'அல்லது இதனுடன் தொடரவும்' : language === 'hi' ? 'या इसके साथ जारी रखें' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSocialClick('Google')}
              disabled={loading}
              className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-gray-800 bg-gray-950 text-gray-300 font-medium text-xs md:text-sm hover:bg-gray-850 hover:text-white transition-all shadow-sm hover:border-gray-700"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialClick('Facebook')}
              disabled={loading}
              className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-gray-800 bg-gray-950 text-gray-300 font-medium text-xs md:text-sm hover:bg-gray-850 hover:text-white transition-all shadow-sm hover:border-gray-700"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#1877F2" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.have_account')}{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              {t('auth.login_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
