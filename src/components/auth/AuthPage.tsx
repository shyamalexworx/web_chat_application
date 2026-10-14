import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { InteractivePerspectiveGrid } from './InteractivePerspectiveGrid';

export const AuthPage: React.FC = () => {
  const { login, register, addToast } = useChat();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(email.trim(), password.trim());
      if (!success) {
        setError('Invalid credentials or authentication error.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'member';
    setIsSubmitting(true);
    try {
      const success = await register(name.trim(), email.trim(), username, password.trim());
      if (!success) {
        setError('Registration failed. Check your Supabase configuration or try another email.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialAuth = (provider: string) => {
    addToast(`Connecting to ${provider}...`, 'info');
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addToast(`Password reset link sent to ${email.trim()}`, 'success');
    } else {
      addToast('Please enter your email address to receive a reset link.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-y-auto select-none z-50">
      <InteractivePerspectiveGrid className="min-h-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[430px] my-auto py-8">
          {/* Glassmorphic Container matching website palette & typography */}
          <div className="bg-[#0E1118]/85 backdrop-blur-2xl border border-[#252B36]/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90 relative overflow-hidden">
            {/* Subtle top edge accent glow */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#4F8CFF]/60 to-transparent" />

            {/* Brand Logo & Name (PulseChat) */}
            <div className="flex items-center justify-center space-x-2.5 mb-6">
              <div className="relative w-7 h-7 flex items-center justify-center">
                {/* Top-left outline cyan/blue square */}
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-[4px] border-2 border-[#4F8CFF] shadow-[0_0_12px_rgba(79,140,255,0.5)]" />
                {/* Bottom-right solid blue square */}
                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-[4px] bg-[#4F8CFF] shadow-[0_0_12px_rgba(79,140,255,0.6)]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#F5F7FA]">PulseChat</span>
            </div>

            {/* Header Heading & Subtitle */}
            <div className="text-center mb-7">
              <h1 className="text-2xl font-bold text-[#F5F7FA] tracking-tight">
                {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
              </h1>
              <p className="text-sm text-[#929BAA] mt-2">
                {mode === 'login'
                  ? 'Welcome back! Please enter your details.'
                  : 'Start collaborating with your team today.'}
              </p>
            </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-5 p-3 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] text-xs rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Sign In / Sign Up Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-[#F5F7FA] mb-2">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full h-11 bg-[#181C25] hover:bg-[#1E2330] focus:bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-4 text-sm text-[#F5F7FA] placeholder-[#636D7E] outline-none transition-all shadow-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#F5F7FA] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 bg-[#181C25] hover:bg-[#1E2330] focus:bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-4 text-sm text-[#F5F7FA] placeholder-[#636D7E] outline-none transition-all shadow-sm"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#F5F7FA]">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#929BAA] hover:text-[#F5F7FA] transition-colors cursor-pointer"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 bg-[#181C25] hover:bg-[#1E2330] focus:bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-4 text-sm text-[#F5F7FA] placeholder-[#636D7E] outline-none transition-all shadow-sm"
              required
            />
          </div>

          {/* Primary Action Button (White button with dark text matching image) */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-11 bg-[#F5F7FA] hover:bg-white text-[#0B0D12] text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-[0.99] flex items-center justify-center space-x-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-[#0B0D12] border-t-transparent rounded-full animate-spin" />
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

          {/* Divider with OR (dashed border as shown in screenshot) */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-[#252B36]" />
            </div>
            <div className="relative bg-[#0E1118] px-3 text-xs font-semibold text-[#929BAA] tracking-wider">
              OR
            </div>
          </div>

          {/* Social Authentication Buttons */}
          <div className="space-y-3">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              className="w-full h-11 bg-[#F5F7FA] hover:bg-white text-[#0B0D12] border border-[#252B36]/20 rounded-lg text-sm font-medium flex items-center justify-center space-x-2.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              {/* Google G icon */}
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

            {/* Continue with Apple */}
            <button
              type="button"
              onClick={() => handleSocialAuth('Apple')}
              className="w-full h-11 bg-[#F5F7FA] hover:bg-white text-[#0B0D12] border border-[#252B36]/20 rounded-lg text-sm font-medium flex items-center justify-center space-x-2.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              {/* Apple Logo */}
              <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.59-7.71-11.66-14.01-6.19-9.5-10.9-20.1-14.13-31.79-3.23-11.69-4.85-22.56-4.85-32.61 0-14.01 3.51-25.59 10.53-34.74 7.02-9.15 15.86-13.88 26.52-14.19 4.69 0 10.15 1.34 16.39 4.02 6.24 2.68 10.22 4.08 11.95 4.19 1.56-.11 5.76-1.57 12.6-4.39 6.84-2.82 12.54-4.05 17.09-3.7 12.63.66 22.84 5.37 30.64 14.14-10.99 6.64-16.38 15.65-16.16 27.05.22 8.92 3.65 16.39 10.29 22.42 6.64 6.03 14.53 9.49 23.68 10.38-2.02 6.23-4.42 12.39-7.21 18.49zm-38.38-106.8c0-5.83 2.14-11.53 6.42-17.1 4.28-5.57 9.61-9.54 16-11.92.33 1.22.49 2.45.49 3.69 0 5.61-2.2 11.23-6.6 16.86-4.4 5.63-9.87 9.4-16.41 11.31-.22-.95-.33-1.9-.33-2.84z" />
              </svg>
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center mt-7 text-sm text-[#929BAA]">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="font-semibold text-[#F5F7FA] hover:text-[#4F8CFF] hover:underline transition-colors cursor-pointer ml-0.5"
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
                  }}
                  className="font-semibold text-[#F5F7FA] hover:text-[#4F8CFF] hover:underline transition-colors cursor-pointer ml-0.5"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </InteractivePerspectiveGrid>
  </div>
);
};
