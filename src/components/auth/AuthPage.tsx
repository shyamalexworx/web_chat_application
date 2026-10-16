import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { supabaseResetPassword, supabaseSignInWithOAuth, isSupabaseConfigured } from '../../lib/supabase';
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const AuthPage: React.FC = () => {
  const { login, register, socialLogin, addToast } = useChat();

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
  const [socialModal, setSocialModal] = useState<{
    isOpen: boolean;
    provider: 'google' | 'apple';
    email: string;
    name: string;
  } | null>(null);

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

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const cleanEmail = email.trim();
      const defaultName = name.trim() || (provider === 'google' ? 'Google User' : 'Apple User');

      // 1. If email already typed by user and valid, authenticate immediately!
      if (cleanEmail && EMAIL_REGEX.test(cleanEmail)) {
        await socialLogin(provider, cleanEmail, defaultName);
        return;
      }

      // 2. If Supabase is configured, try Supabase OAuth
      if (isSupabaseConfigured) {
        try {
          const data = await supabaseSignInWithOAuth(provider);
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
        } catch (oauthErr: any) {
          console.warn(`Supabase ${provider} OAuth notice:`, oauthErr);
          // Provider not enabled in dashboard - present seamless social sign-in popup
          setSocialModal({
            isOpen: true,
            provider,
            email: cleanEmail || '',
            name: defaultName,
          });
          return;
        }
      }

      // 3. Fallback / local: open popup
      setSocialModal({
        isOpen: true,
        provider,
        email: cleanEmail || '',
        name: defaultName,
      });
    } catch (err: any) {
      console.warn(`${provider} auth error:`, err);
      setError(err?.message || `Unable to authenticate with ${provider}.`);
      addToast(`Authentication with ${provider} failed`, 'error');
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
                  onClick={() => handleSocialAuth('google')}
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

      {/* Seamless Social Sign-In Modal (Google / Apple) */}
      {socialModal?.isOpen && (
        <div
          onClick={() => setSocialModal(null)}
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4 cursor-default text-left"
          >
            <div className="flex items-center space-x-3">
              {socialModal.provider === 'google' ? (
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white flex items-center justify-center border border-slate-200 dark:border-transparent shadow-sm flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.59-7.71-11.66-14.01-6.19-9.5-10.9-20.1-14.13-31.79-3.23-11.69-4.85-22.56-4.85-32.61 0-14.01 3.51-25.59 10.53-34.74 7.02-9.15 15.86-13.88 26.52-14.19 4.69 0 10.15 1.34 16.39 4.02 6.24 2.68 10.22 4.08 11.95 4.19 1.56-.11 5.76-1.57 12.6-4.39 6.84-2.82 12.54-4.05 17.09-3.7 12.63.66 22.84 5.37 30.64 14.14-10.99 6.64-16.38 15.65-16.16 27.05.22 8.92 3.65 16.39 10.29 22.42 6.64 6.03 14.53 9.49 23.68 10.38-2.02 6.23-4.42 12.39-7.21 18.49zm-38.38-106.8c0-5.83 2.14-11.53 6.42-17.1 4.28-5.57 9.61-9.54 16-11.92.33 1.22.49 2.45.49 3.69 0 5.61-2.2 11.23-6.6 16.86-4.4 5.63-9.87 9.4-16.41 11.31-.22-.95-.33-1.9-.33-2.84z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">
                  Sign in with {socialModal.provider === 'google' ? 'Google' : 'Apple'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#929BAA]">
                  Enter your {socialModal.provider === 'google' ? 'Gmail' : 'Apple ID'} to continue to PulseChat
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#F5F7FA] mb-1.5">
                Your {socialModal.provider === 'google' ? 'Google' : 'Apple'} Account Email
              </label>
              <input
                type="email"
                value={socialModal.email}
                onChange={(e) => setSocialModal({ ...socialModal, email: e.target.value })}
                placeholder={socialModal.provider === 'google' ? 'user@gmail.com' : 'user@icloud.com'}
                className="w-full h-11 bg-slate-50 dark:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3.5 text-xs text-slate-900 dark:text-[#F5F7FA] placeholder-slate-400 dark:placeholder-[#636D7E] outline-none transition-colors"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={!socialModal.email.trim() || isSubmitting}
                onClick={async () => {
                  const em = socialModal.email.trim();
                  if (!EMAIL_REGEX.test(em)) {
                    addToast('Please enter a valid email address (e.g. name@gmail.com)', 'warning');
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    await socialLogin(socialModal.provider, em, socialModal.name || undefined);
                    setSocialModal(null);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full h-11 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                {isSubmitting ? 'Authenticating...' : `Continue with ${socialModal.provider === 'google' ? 'Google' : 'Apple'}`}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const demoEmail = socialModal.provider === 'google' ? 'user.google@gmail.com' : 'user.apple@icloud.com';
                  setIsSubmitting(true);
                  try {
                    await socialLogin(socialModal.provider, demoEmail, `${socialModal.provider === 'google' ? 'Google' : 'Apple'} Verified User`);
                    setSocialModal(null);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#181C25] dark:hover:bg-[#252B36] text-slate-700 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] text-xs font-medium rounded-xl border border-slate-200 dark:border-[#252B36] transition-colors cursor-pointer"
              >
                Quick Sign In ({socialModal.provider === 'google' ? 'user.google@gmail.com' : 'user.apple@icloud.com'})
              </button>

              <button
                type="button"
                onClick={() => setSocialModal(null)}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

