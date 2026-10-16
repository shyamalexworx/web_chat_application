import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { supabaseResetPassword, supabaseSignInWithOAuth, isSupabaseConfigured } from '../../lib/supabase';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, UserPlus, Trash2, ChevronRight, X, ExternalLink } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface SavedAccount {
  email: string;
  name: string;
  avatar?: string;
  provider?: string;
}

export const AuthPage: React.FC = () => {
  const { login, register, socialLogin, addToast, users } = useChat();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('pulsechat_remember_me') === 'true';
  });
  const [email, setEmail] = useState<string>(() => {
    const isRemembered = localStorage.getItem('pulsechat_remember_me') === 'true';
    return isRemembered ? (localStorage.getItem('pulsechat_remembered_email') || '') : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Account Chooser State
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showAddAccountInput, setShowAddAccountInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  const refreshSavedAccounts = () => {
    const map = new Map<string, SavedAccount>();

    // 1. Saved accounts from localStorage
    try {
      const raw = localStorage.getItem('pulsechat_saved_accounts');
      if (raw) {
        const parsed: SavedAccount[] = JSON.parse(raw);
        parsed.forEach((acc) => {
          if (acc.email) map.set(acc.email.toLowerCase(), acc);
        });
      }
    } catch (e) {}

    // 2. All registered users in the app
    users.forEach((u) => {
      if (u.email && !map.has(u.email.toLowerCase())) {
        map.set(u.email.toLowerCase(), {
          email: u.email.toLowerCase(),
          name: u.name || u.username || 'User',
          avatar: u.avatar,
        });
      }
    });

    // 3. Remembered email
    const remembered = localStorage.getItem('pulsechat_remembered_email');
    if (remembered && !map.has(remembered.toLowerCase())) {
      map.set(remembered.toLowerCase(), {
        email: remembered.toLowerCase(),
        name: remembered.split('@')[0],
      });
    }

    // 4. Default accounts (Shyam & Alex)
    const defaults: SavedAccount[] = [
      { name: 'Shyam Patel', email: 'shyam@gmail.com' },
      { name: 'Alex Rivera', email: 'alex.rivera@gmail.com' },
    ];
    defaults.forEach((def) => {
      if (!map.has(def.email.toLowerCase())) {
        map.set(def.email.toLowerCase(), def);
      }
    });

    setSavedAccounts(Array.from(map.values()));
  };

  useEffect(() => {
    refreshSavedAccounts();
  }, [users]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid, legitimate email address (e.g. name@gmail.com).');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(cleanEmail, password.trim());
      if (!success) {
        setError('Invalid email or password, or your email has not been verified yet.');
      } else {
        if (rememberMe) {
          localStorage.setItem('pulsechat_remember_me', 'true');
          localStorage.setItem('pulsechat_remembered_email', cleanEmail);
        } else {
          localStorage.removeItem('pulsechat_remember_me');
          localStorage.removeItem('pulsechat_remembered_email');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password, or your email has not been verified yet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setError('All fields are required.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid, legitimate email address (e.g. name@gmail.com).');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const username = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';
    setIsSubmitting(true);
    try {
      const res = await register(cleanName, cleanEmail, username, cleanPassword);
      if (typeof res === 'object') {
        const resObj = res as { requiresVerification?: boolean; message?: string; success?: boolean; error?: string };
        if (resObj.requiresVerification) {
          setSuccessMessage(resObj.message || `A verification email has been sent to ${cleanEmail}. Please verify before logging in.`);
          setMode('login');
        } else if (resObj.success === false) {
          setError(resObj.error || 'Registration failed.');
        } else {
          addToast('Account created successfully!', 'success');
        }
      } else if (!res) {
        setError('Registration failed. Please verify your details or sign in if you already have an account.');
      } else {
        addToast('Account created successfully!', 'success');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError('Please enter a valid, legitimate email address (e.g. name@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await supabaseResetPassword(cleanEmail);
      setSuccessMessage(res.message || `Password reset instructions sent to ${cleanEmail}.`);
      addToast('Reset link sent!', 'success');
    } catch (err: any) {
      setError(err?.message || 'Unable to send reset email. Please ensure your email is registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenGoogleChooser = () => {
    refreshSavedAccounts();
    setShowAddAccountInput(false);
    setCustomEmail('');
    setCustomName('');
    setIsGoogleChooserOpen(true);
  };

  const handleSelectGoogleAccount = async (acc: SavedAccount) => {
    setIsSubmitting(true);
    setError('');
    try {
      try {
        const raw = localStorage.getItem('pulsechat_saved_accounts');
        const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
        const updated = [
          acc,
          ...list.filter((a) => a.email.toLowerCase() !== acc.email.toLowerCase()),
        ];
        localStorage.setItem('pulsechat_saved_accounts', JSON.stringify(updated));
      } catch (err) {}

      await socialLogin('google', acc.email, acc.name, acc.avatar);
      setIsGoogleChooserOpen(false);
    } catch (err: any) {
      console.warn('Google login error:', err);
      setError(err?.message || 'Failed to sign in with selected account.');
      addToast('Sign in failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomGoogleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEm = customEmail.trim().toLowerCase();
    if (!cleanEm) {
      addToast('Please enter your Gmail address', 'warning');
      return;
    }
    if (!EMAIL_REGEX.test(cleanEm)) {
      addToast('Please enter a valid email address (e.g. name@gmail.com)', 'warning');
      return;
    }
    const cleanNm = customName.trim() || cleanEm.split('@')[0];
    const newAcc: SavedAccount = { email: cleanEm, name: cleanNm };

    setIsSubmitting(true);
    try {
      try {
        const raw = localStorage.getItem('pulsechat_saved_accounts');
        const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
        const updated = [
          newAcc,
          ...list.filter((a) => a.email.toLowerCase() !== cleanEm),
        ];
        localStorage.setItem('pulsechat_saved_accounts', JSON.stringify(updated));
      } catch (err) {}

      await socialLogin('google', cleanEm, cleanNm);
      setIsGoogleChooserOpen(false);
      setShowAddAccountInput(false);
      setCustomEmail('');
      setCustomName('');
    } catch (err: any) {
      console.warn('Custom Google account error:', err);
      setError(err?.message || 'Failed to authenticate account');
      addToast('Sign in failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSavedAccount = (emailToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('pulsechat_saved_accounts');
      const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
      localStorage.setItem('pulsechat_saved_accounts', JSON.stringify(updated));
    } catch (err) {}
    setSavedAccounts((prev) => prev.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase()));
  };

  const handleBrowserGoogleOAuth = async () => {
    setIsSubmitting(true);
    try {
      const data = await supabaseSignInWithOAuth('google');
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      addToast(err?.message || 'Browser OAuth not configured yet', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-y-auto select-none z-50 bg-slate-50 dark:bg-[#07090D] flex flex-col items-center justify-center p-3 sm:p-4 transition-colors">
      <div className="w-full max-w-[460px] mx-auto py-2 px-3">
        {/* Main Authentication Card */}
        <div className="w-full rounded-3xl bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#252B36] shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-6 sm:p-7 relative text-left flex flex-col justify-between min-h-[580px] sm:h-[600px] transition-colors">
          {/* Top Section: Brand Logo, Name, Heading & Subtitle */}
          <div className="w-full flex flex-col items-center flex-shrink-0">
            {/* Brand Logo - clean & static */}
            <div className="rounded-2xl w-12 h-12 mx-auto flex items-center justify-center bg-slate-50 dark:bg-[#12151D] border border-slate-200 dark:border-[#252B36] shadow-sm">
              <img src="/logo.png" alt="PulseChat Logo" className="w-full h-full object-contain p-1.5" />
            </div>

            {/* Website Name - clean & static */}
            <div className="flex items-center justify-center mt-2.5 mb-0.5">
              <span className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
                Pulse
              </span>
              <span className="text-2xl sm:text-[26px] font-black tracking-tight text-[#4F8CFF]">
                Chat
              </span>
            </div>

            {/* Header Heading & Subtitle */}
            <div className="text-center mb-2.5">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {mode === 'login' && 'Sign in to your account'}
                {mode === 'register' && 'Create your account'}
                {mode === 'forgot' && 'Reset your password'}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {mode === 'login' && 'Welcome back! Please enter your details.'}
                {mode === 'register' && 'Start collaborating with your team today.'}
                {mode === 'forgot' && 'Enter your email for reset instructions.'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="w-full mb-2 p-2 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] text-xs rounded-xl text-center leading-snug">
                <p>{error}</p>
                {error.toLowerCase().includes('already') && (
                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className="px-2.5 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-semibold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      Sign in now &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#181C25] hover:bg-slate-200 dark:hover:bg-[#252B36] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#FFFFFF] border border-slate-200 dark:border-[#252B36] rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Reset password
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Alert */}
            {successMessage && (
              <div className="w-full mb-2 p-2 bg-[#32C48D]/10 border border-[#32C48D]/30 text-[#32C48D] text-xs rounded-xl text-left flex items-start space-x-2 leading-snug">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Middle Section: Form inputs & Primary action button */}
          <div className="w-full flex-1 flex flex-col justify-center">
            {mode !== 'forgot' ? (
              <form
                onSubmit={mode === 'login' ? handleLogin : handleRegister}
                className={mode === 'register' ? 'space-y-2.5' : 'space-y-3.5'}
              >
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Smith"
                      className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-[#181C25] dark:hover:bg-[#1E2330] dark:focus:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF]/50 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748B] outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@gmail.com"
                    className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-[#181C25] dark:hover:bg-[#1E2330] dark:focus:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF]/50 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748B] outline-none transition-all shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-[#181C25] dark:hover:bg-[#1E2330] dark:focus:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF]/50 rounded-xl pl-4 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748B] outline-none transition-all shadow-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-[#FFFFFF] p-1 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Remember Me & Forgot Password Row in Login */}
                  {mode === 'login' && (
                    <div className="flex items-center justify-between pt-1.5 px-0.5">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-[#252B36] bg-slate-50 dark:bg-[#181C25] text-[#4F8CFF] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#4F8CFF]"
                        />
                        <span className="text-xs text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F1F5F9] transition-colors">Remember me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError('');
                          setSuccessMessage('');
                        }}
                        className="text-xs text-slate-500 hover:text-[#4F8CFF] dark:text-[#94A3B8] dark:hover:text-[#4F8CFF] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full h-11 sm:h-12 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center space-x-2 ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>
                      {isSubmitting
                        ? 'Connecting...'
                        : mode === 'login'
                        ? 'Sign in'
                        : 'Create account'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              /* Mode 3: Dedicated Forgot Password Form */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#F1F5F9] mb-1.5">
                    Registered Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@gmail.com"
                    className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white dark:bg-[#181C25] dark:hover:bg-[#1E2330] dark:focus:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] focus:ring-1 focus:ring-[#4F8CFF]/50 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748B] outline-none transition-all shadow-sm"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1">
                    We will send a password reset verification link to this email.
                  </p>
                </div>

                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full h-11 sm:h-12 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center space-x-2 ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>{isSubmitting ? 'Sending link...' : 'Send reset instructions'}</span>
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-[#94A3B8] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to sign in</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Section: Social Authentication & Mode Toggle */}
          {mode !== 'forgot' && (
            <div className="w-full flex-shrink-0 pt-1">
              {/* Divider with OR */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dashed border-slate-200 dark:border-[#252B36]" />
                </div>
                <div className="relative bg-white dark:bg-[#0E1118] px-3 text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] tracking-wider">
                  OR
                </div>
              </div>

              {/* Social Authentication: Google Only */}
              <div>
                <button
                  type="button"
                  onClick={handleOpenGoogleChooser}
                  disabled={isSubmitting}
                  className="w-full h-11 sm:h-12 bg-white hover:bg-slate-50 dark:bg-[#181C25] dark:hover:bg-[#1E2330] text-slate-700 dark:text-white border border-slate-200 dark:border-[#252B36] rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center space-x-2.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Toggle between Sign In and Sign Up */}
              <div className="text-center mt-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                {mode === 'login' ? (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="font-semibold text-slate-900 hover:text-[#4F8CFF] dark:text-white dark:hover:text-[#4F8CFF] hover:underline transition-colors cursor-pointer ml-0.5"
                    >
                      Sign up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="font-semibold text-slate-900 hover:text-[#4F8CFF] dark:text-white dark:hover:text-[#4F8CFF] hover:underline transition-colors cursor-pointer ml-0.5"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Authentic Google Account Chooser Modal */}
      {isGoogleChooserOpen && (
        <div
          onClick={() => {
            setIsGoogleChooserOpen(false);
            setShowAddAccountInput(false);
          }}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#252B36] rounded-2xl shadow-2xl overflow-hidden cursor-default text-left transition-colors"
          >
            {/* Google Header */}
            <div className="pt-6 pb-4 px-6 text-center border-b border-slate-100 dark:border-[#1E2330] relative">
              <button
                type="button"
                onClick={() => {
                  setIsGoogleChooserOpen(false);
                  setShowAddAccountInput(false);
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Choose an account
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                to continue to <span className="font-semibold text-slate-700 dark:text-slate-200">PulseChat</span>
              </p>
            </div>

            {/* Available Accounts List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E2330] custom-scrollbar">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => !isSubmitting && handleSelectGoogleAccount(acc)}
                  className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#181C25] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-blue-600 text-white font-bold text-sm flex items-center justify-center overflow-hidden shadow-sm">
                      {acc.avatar ? (
                        <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(acc.name || acc.email)[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                        {acc.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSavedAccount(acc.email, e)}
                      title="Remove from this device"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}

              {/* Use Another Account Toggle */}
              <div
                onClick={() => setShowAddAccountInput(!showAddAccountInput)}
                className="p-3.5 px-6 flex items-center space-x-3.5 hover:bg-slate-50 dark:hover:bg-[#181C25] transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 dark:border-[#2E3748] flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Use another account
                </div>
              </div>
            </div>

            {/* Expandable Add Account Form */}
            {showAddAccountInput && (
              <form onSubmit={handleAddCustomGoogleAccount} className="p-4 mx-6 my-2 bg-slate-50 dark:bg-[#161B24] rounded-xl border border-slate-200 dark:border-[#252B36] space-y-2.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Sign in or sign up with another Gmail
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Your Name (e.g. Shyam)"
                  className="w-full h-9 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full h-9 bg-white dark:bg-[#0E1118] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                  autoFocus
                />
                <div className="flex space-x-2 pt-1">
                  <button
                    type="submit"
                    disabled={!customEmail.trim() || isSubmitting}
                    className="flex-1 h-9 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign in / Sign up'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAccountInput(false)}
                    className="px-3 h-9 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-200 dark:border-[#252B36] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Actions & Footer */}
            <div className="p-4 px-6 border-t border-slate-100 dark:border-[#1E2330] flex flex-col items-center space-y-2 bg-slate-50/50 dark:bg-white/[0.01]">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleBrowserGoogleOAuth}
                  disabled={isSubmitting}
                  className="text-xs text-blue-600 dark:text-[#4F8CFF] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Sign in with Google OAuth in browser</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                To continue, Google shares your name, email address, and profile picture with PulseChat.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


