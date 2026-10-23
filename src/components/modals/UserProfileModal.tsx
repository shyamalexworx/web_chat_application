import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  UserCheck,
  Smile,
  Circle,
  Settings,
  Volume2,
  VolumeX,
  Languages,
  Upload,
  Image as ImageIcon,
  Trash2,
  Moon,
  Sun,
  Laptop,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';
import { SUPPORTED_LANGUAGES } from '../../utils/translation';
import { generateLetterAvatar } from '../../utils/avatar';
import { compressImageFile } from '../../utils/imageCompressor';
import { uploadChatMedia, isSupabaseConfigured } from '../../lib/supabase';

const STATUS_PRESETS = [
  { emoji: '💬', text: 'In a meeting' },
  { emoji: '🚀', text: 'Shipping code' },
  { emoji: '🎧', text: 'Deep focus / heads down' },
  { emoji: '☕', text: 'On coffee break' },
  { emoji: '🌴', text: 'On vacation' },
  { emoji: '🤒', text: 'Out sick' },
];

export const UserProfileModal: React.FC = () => {
  const {
    isUserProfileOpen,
    setIsUserProfileOpen,
    currentUser,
    updateCurrentUserProfile,
    selectedLanguage,
    setSelectedLanguage,
    autoTranslateEnabled,
    setAutoTranslateEnabled,
    theme,
    setTheme,
    addToast,
    t,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  // Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title);
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '💻');
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [isOnline, setIsOnline] = useState(currentUser.isOnline);
  const [avatar, setAvatar] = useState(currentUser.avatar || generateLetterAvatar(currentUser.name));
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state whenever modal is opened or currentUser updates
  useEffect(() => {
    if (isUserProfileOpen) {
      setName(currentUser.name || '');
      setTitle(currentUser.title || '');
      setStatusEmoji(currentUser.statusEmoji || '💻');
      setStatusText(currentUser.statusText || '');
      setIsOnline(currentUser.isOnline);
      setAvatar(currentUser.avatar || generateLetterAvatar(currentUser.name));
      setSoundEnabled(soundFX.isEnabled());
    }
  }, [isUserProfileOpen, currentUser]);

  // Sound State
  const [soundEnabled, setSoundEnabled] = useState(soundFX.isEnabled());

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundFX.play('chime');
    addToast(next ? 'Sound notifications enabled' : 'Sound notifications muted', 'info');
  };

  if (!isUserProfileOpen) return null;

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name,
      title,
      statusEmoji,
      statusText,
      isOnline,
      avatar,
    });
    addToast('Profile & Settings updated', 'success');
    setIsUserProfileOpen(false);
  };

  return (
    <div 
      onClick={() => setIsUserProfileOpen(false)}
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-[#252B36] rounded-2xl shadow-2xl overflow-hidden flex flex-col cursor-default max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-[#252B36] flex items-center justify-between bg-slate-50 dark:bg-[#12151C]/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#4F8CFF]/15 border border-[#4F8CFF]/30 flex items-center justify-center text-[#4F8CFF]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-[#F5F7FA]">{t('profile_and_settings')}</h2>
              <p className="text-[10px] text-slate-500 dark:text-[#929BAA]">
                {t('manage_profile_desc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUserProfileOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] hover:bg-slate-100 dark:hover:bg-[#181C25] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="px-4 border-b border-slate-200 dark:border-[#252B36] flex items-center space-x-1.5 bg-slate-100/80 dark:bg-[#12151C]/50 text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-2.5 border-b-2 font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-t-lg text-xs ${
              activeTab === 'profile'
                ? 'border-[#4F8CFF] text-[#4F8CFF] bg-white/70 dark:bg-white/5 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#929BAA] dark:hover:text-[#F5F7FA]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t('profile_and_presence')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-2 px-2.5 border-b-2 font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer rounded-t-lg text-xs ${
              activeTab === 'preferences'
                ? 'border-[#4F8CFF] text-[#4F8CFF] bg-white/70 dark:bg-white/5 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#929BAA] dark:hover:text-[#F5F7FA]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('preferences')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 overflow-y-auto no-scrollbar space-y-3 text-xs">
          {/* TAB 1: PROFILE & PRESENCE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmitProfile} className="space-y-3">
              {/* Avatar Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 dark:text-[#F5F7FA] mb-1.5">
                  {t('profile_photo')}
                </label>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={avatar}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[#4F8CFF] shadow-subtle bg-slate-100 dark:bg-[#181C25]"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#181C25] ${
                        isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          addToast('Please select a valid image file', 'warning');
                          return;
                        }
                        try {
                          const compressedDataUrl = await compressImageFile(file, 256, 256, 0.82);
                          setAvatar(compressedDataUrl);

                          // Asynchronously try uploading to Supabase Storage if configured
                          try {
                            if (isSupabaseConfigured) {
                              const uploaded = await uploadChatMedia(file, file.name, 'images');
                              if (uploaded?.url) {
                                setAvatar(uploaded.url);
                              }
                            }
                          } catch (err) {
                            console.warn('Could not upload avatar to cloud storage, using compressed local URL', err);
                          }
                          addToast('Custom photo chosen', 'success');
                        } catch (err) {
                          addToast('Failed to process photo', 'error');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('choose_photo')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-800 dark:text-[#F5F7FA] mb-1">
                    {t('display_name')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-[#F5F7FA] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-800 dark:text-[#F5F7FA] mb-1">
                    {t('title_role')}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-[#F5F7FA] outline-none"
                  />
                </div>
              </div>

              {/* Custom Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 dark:text-[#F5F7FA] mb-1">
                  {t('custom_status_emoji')}
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                    className="w-10 text-center bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg py-1.5 text-sm outline-none"
                  />
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder={t('status_placeholder')}
                    className="flex-1 bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-[#F5F7FA] placeholder-slate-400 dark:placeholder-[#929BAA] outline-none"
                  />
                </div>

                {/* Quick status presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset.text}
                      type="button"
                      onClick={() => {
                        setStatusEmoji(preset.emoji);
                        setStatusText(preset.text);
                      }}
                      className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#12151C] hover:bg-slate-200 dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] rounded-md text-[10.5px] text-slate-600 hover:text-slate-900 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <span>{preset.emoji}</span>
                      <span>{t(preset.text)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Online Presence Toggle */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Circle
                    className={`w-3 h-3 fill-current ${
                      isOnline ? 'text-[#32C48D]' : 'text-[#636D7E]'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA]">
                      {isOnline ? t('active_online_presence') : t('away_offline_mode')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-[#929BAA]">
                      {isOnline
                        ? t('teammates_can_see_active')
                        : t('show_offline_colleagues')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOnline(!isOnline)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    isOnline ? 'bg-[#32C48D]' : 'bg-slate-300 dark:bg-[#252B36]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isOnline ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Save Profile Button */}
              <div className="pt-1.5 flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-semibold rounded-lg text-xs transition-all shadow-accent-glow cursor-pointer"
                >
                  {t('save_profile_changes')}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PREFERENCES & AUDIO */}
          {activeTab === 'preferences' && (
            <div className="space-y-3 animate-fade-in">
              {/* Interface Theme Selection */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] rounded-lg space-y-2">
                <div className="flex items-center space-x-1.5">
                  <Sun className="w-3.5 h-3.5 text-[#4F8CFF]" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA]">{t('interface_theme')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      addToast('Dark theme activated', 'info');
                    }}
                    className={`p-2 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-1 ring-[#4F8CFF]/30'
                        : 'bg-white dark:bg-[#181C25] text-slate-600 dark:text-[#929BAA] border-slate-200 dark:border-[#252B36] hover:bg-slate-100 dark:hover:bg-[#252B36] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t('dark')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      addToast('Light theme activated', 'info');
                    }}
                    className={`p-2 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-1 ring-[#4F8CFF]/30'
                        : 'bg-white dark:bg-[#181C25] text-slate-600 dark:text-[#929BAA] border-slate-200 dark:border-[#252B36] hover:bg-slate-100 dark:hover:bg-[#252B36] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t('light')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('system');
                      addToast('System theme sync activated', 'info');
                    }}
                    className={`p-2 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      theme === 'system'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-1 ring-[#4F8CFF]/30'
                        : 'bg-white dark:bg-[#181C25] text-slate-600 dark:text-[#929BAA] border-slate-200 dark:border-[#252B36] hover:bg-slate-100 dark:hover:bg-[#252B36] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>{t('system')}</span>
                  </button>
                </div>
              </div>

              {/* Sound Notifications Toggle */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] rounded-lg flex items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="p-1.5 bg-white dark:bg-[#181C25] rounded-md border border-slate-200 dark:border-[#252B36] text-[#4F8CFF] flex-shrink-0">
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#32C48D]" /> : <VolumeX className="w-3.5 h-3.5 text-[#F05D6C]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA]">{t('sound_chimes')}</div>
                    <div className="text-[10px] text-slate-500 dark:text-[#929BAA] leading-normal">
                      {t('sound_chimes_desc')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={toggleSound}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    soundEnabled ? 'bg-[#32C48D]' : 'bg-slate-300 dark:bg-[#252B36]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Language Selection */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] rounded-lg space-y-2">
                <div className="flex items-center space-x-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#4F8CFF]" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA]">{t('screen_language')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        addToast(`Language set to ${lang.name}`, 'info');
                      }}
                      className={`p-1.5 rounded-md border text-left text-[11px] transition-colors flex items-center space-x-1.5 cursor-pointer ${
                        selectedLanguage === lang.code
                          ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF]'
                          : 'bg-white dark:bg-[#181C25] text-slate-600 dark:text-[#929BAA] border-slate-200 dark:border-[#252B36] hover:bg-slate-100 dark:hover:bg-[#252B36] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
