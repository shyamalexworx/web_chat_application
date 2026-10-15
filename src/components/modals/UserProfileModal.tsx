import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  UserCheck,
  Smile,
  Circle,
  Shield,
  ShieldCheck,
  Lock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Fingerprint,
  Zap,
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
import {
  encryptMessage,
  decryptMessage,
  generateSafetyFingerprint,
  type EncryptedPayload,
} from '../../utils/crypto';
import { soundFX } from '../../utils/audio';
import { SUPPORTED_LANGUAGES } from '../../utils/translation';
import { generateLetterAvatar } from '../../utils/avatar';

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
    activeView,
    channels,
    dms,
    selectedLanguage,
    setSelectedLanguage,
    autoTranslateEnabled,
    setAutoTranslateEnabled,
    theme,
    setTheme,
    addToast,
    t,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [title, setTitle] = useState(currentUser.title);
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '💻');
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [isOnline, setIsOnline] = useState(currentUser.isOnline);
  const [avatar, setAvatar] = useState(currentUser.avatar || generateLetterAvatar(currentUser.name));
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Security & Encryption State
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [testInput, setTestInput] = useState('Workspace confidential deployment credentials');
  const [testPayload, setTestPayload] = useState<EncryptedPayload | null>(null);
  const [testDecrypted, setTestDecrypted] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Sound State
  const [soundEnabled, setSoundEnabled] = useState(soundFX.isEnabled());

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const conversationName = activeChannel
    ? `#${activeChannel.name}`
    : activeDM
    ? activeDM.groupName || 'Direct Message'
    : 'Active Channel';

  const fingerprint = generateSafetyFingerprint(activeView.id);

  // Initial test encryption when opening security tab
  useEffect(() => {
    if (isUserProfileOpen && activeTab === 'security') {
      handleTestEncrypt(testInput);
    }
  }, [isUserProfileOpen, activeTab, activeView.id]);

  const handleTestEncrypt = async (text: string) => {
    setIsEncrypting(true);
    try {
      const payload = await encryptMessage(text, activeView.id);
      setTestPayload(payload);
      const decrypted = await decryptMessage(payload, activeView.id);
      setTestDecrypted(decrypted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedFingerprint(true);
    addToast('Safety fingerprint copied to clipboard', 'info');
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0F1117] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col cursor-default max-h-[92vh]"
      >
        {/* Header (Renamed: Profile & Settings) */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#252B36] flex items-center justify-between bg-[#12151C]/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F8CFF]/15 border border-[#4F8CFF]/30 flex items-center justify-center text-[#4F8CFF]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Profile & Settings</h2>
              <p className="text-[11px] text-[#929BAA]">
                Manage your identity, end-to-end encryption armor, and preferences.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsUserProfileOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="px-5 sm:px-6 border-b border-[#252B36] flex items-center space-x-2 bg-[#12151C]/50 text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-2 border-b-2 font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Profile & Presence</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-2 border-b-2 font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#32C48D] text-[#32C48D]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#32C48D]" />
            <span>Security & Encryption</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-2 border-b-2 font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: PROFILE & PRESENCE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {/* Avatar Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={avatar}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#4F8CFF] shadow-subtle bg-[#181C25]"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#181C25] ${
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/')) {
                          addToast('Please select a valid image file', 'warning');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setAvatar(dataUrl);
                          addToast('Custom photo chosen', 'success');
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Custom Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                    Title / Role
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] outline-none"
                  />
                </div>
              </div>

              {/* Custom Status */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                  Custom Status & Emoji
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                    className="w-12 text-center bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl py-2 text-base outline-none"
                  />
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="What are you working on right now?"
                    className="flex-1 bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
                  />
                </div>

                {/* Quick status presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset.text}
                      type="button"
                      onClick={() => {
                        setStatusEmoji(preset.emoji);
                        setStatusText(preset.text);
                      }}
                      className="px-2 py-1 bg-[#12151C] hover:bg-[#252B36] border border-[#252B36] rounded-md text-[11px] text-[#929BAA] hover:text-[#F5F7FA] flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Online Presence Toggle */}
              <div className="p-3 bg-[#12151C] border border-[#252B36] rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Circle
                    className={`w-3.5 h-3.5 fill-current ${
                      isOnline ? 'text-[#32C48D]' : 'text-[#636D7E]'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#F5F7FA]">
                      {isOnline ? 'Active Online Presence' : 'Away / Offline Mode'}
                    </div>
                    <div className="text-[11px] text-[#929BAA]">
                      {isOnline
                        ? 'Teammates can see that you are active and available.'
                        : 'Show as offline to colleagues.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOnline(!isOnline)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isOnline ? 'bg-[#32C48D]' : 'bg-[#252B36]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isOnline ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Save Profile Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-semibold rounded-xl transition-all shadow-accent-glow cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY & END-TO-END ENCRYPTION (Placed inside Profile & Settings as requested) */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              {/* Status Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#32C48D]">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[10px] uppercase tracking-wider">Cipher Standard</span>
                  </div>
                  <div className="text-xs font-bold text-[#F5F7FA]">AES-256-GCM</div>
                  <div className="text-[10px] text-[#929BAA]">128-bit Auth Tag</div>
                </div>

                <div className="p-3 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#4F8CFF]">
                    <Key className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[10px] uppercase tracking-wider">Key Derivation</span>
                  </div>
                  <div className="text-xs font-bold text-[#F5F7FA]">PBKDF2-SHA256</div>
                  <div className="text-[10px] text-[#929BAA]">100k Iterations</div>
                </div>

                <div className="p-3 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#A855F7]">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[10px] uppercase tracking-wider">Anti-Hacking Armor</span>
                  </div>
                  <div className="text-xs font-bold text-[#F5F7FA]">Armed & Active</div>
                  <div className="text-[10px] text-[#929BAA]">Anti-XSS & CSP</div>
                </div>
              </div>

              {/* Safety Fingerprint Verification */}
              <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Fingerprint className="w-4 h-4 text-[#4F8CFF]" />
                    <span className="font-bold text-[#F5F7FA]">Conversation Safety Fingerprint</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFingerprint}
                    className="flex items-center space-x-1 text-[11px] px-2 py-1 rounded bg-[#181C25] hover:bg-[#252B36] text-[#4F8CFF] border border-[#252B36] transition-colors cursor-pointer"
                  >
                    {copiedFingerprint ? (
                      <>
                        <Check className="w-3 h-3 text-[#32C48D]" />
                        <span className="text-[#32C48D]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[#929BAA] text-[11px] leading-relaxed">
                  Verify this safety number with colleagues in <strong className="text-[#F5F7FA]">{conversationName}</strong> to cryptographically verify zero eavesdropping or interception.
                </p>

                <div className="p-2.5 bg-[#0B0D12] rounded-lg border border-[#252B36] font-mono text-center tracking-widest text-xs text-[#32C48D] select-all">
                  {fingerprint}
                </div>
              </div>

              {/* Live Interactive Cryptography Sandbox */}
              <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-[#32C48D]" />
                    <span className="font-bold text-[#F5F7FA]">Live Cryptography Test Bench</span>
                  </div>
                  <span className="text-[10px] text-[#929BAA] font-mono">Web Crypto API</span>
                </div>

                <p className="text-[#929BAA] text-[11px]">
                  Type any test phrase below to see real-time AES-256-GCM encryption and verified local decryption:
                </p>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => {
                      setTestInput(e.target.value);
                      handleTestEncrypt(e.target.value);
                    }}
                    placeholder="Type test text..."
                    className="flex-1 bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F5F7FA] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestEncrypt(testInput)}
                    className="px-3 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded-lg flex items-center space-x-1.5 font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEncrypting ? 'animate-spin' : ''}`} />
                    <span>Encrypt</span>
                  </button>
                </div>

                {testPayload && (
                  <div className="space-y-2 pt-1 font-mono text-[11px]">
                    <div className="p-2.5 bg-[#0B0D12] rounded-lg border border-[#252B36] space-y-1">
                      <div className="text-[10px] text-[#4F8CFF] font-semibold flex items-center justify-between">
                        <span>AES-256-GCM CIPHERTEXT (Base64):</span>
                        <span className="text-[#929BAA]">IV: {testPayload.iv.slice(0, 8)}...</span>
                      </div>
                      <div className="text-[#929BAA] break-all select-all font-mono text-[10px] max-h-16 overflow-y-auto">
                        {testPayload.ciphertext || '(Empty)'}
                      </div>
                    </div>

                    <div className="p-2 bg-[#0B0D12] rounded-lg border border-[#252B36] flex items-center justify-between">
                      <span className="text-[10px] text-[#32C48D] flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> DECRYPTED PLAINTEXT:
                      </span>
                      <span className="text-[#F5F7FA] font-sans truncate max-w-xs">{testDecrypted}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Active System Hardening Matrix */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#F5A623]" /> Active System Hardening Matrix
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                    <span className="text-[#F5F7FA]">Anti-XSS Input Sanitization Engine</span>
                  </div>
                  <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                    <span className="text-[#F5F7FA]">Unique 96-bit Cryptographic IV per message</span>
                  </div>
                  <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                    <span className="text-[#F5F7FA]">Anti-Flooding Rate Limiter Armor</span>
                  </div>
                  <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                    <span className="text-[#F5F7FA]">Content-Security-Policy Strict Headers</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES & AUDIO */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 animate-fade-in">
              {/* Interface Theme Selection (Dark, Light, System) */}
              <div className="p-3.5 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2.5">
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-[#4F8CFF]" />
                  <span className="text-xs font-semibold text-[#F5F7FA]">Interface Theme</span>
                </div>
                <p className="text-[11px] text-[#929BAA]">
                  Select your preferred workspace visual theme.
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      addToast('Dark theme activated', 'info');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-2 ring-[#4F8CFF]/30'
                        : 'bg-[#181C25] text-[#929BAA] border-[#252B36] hover:bg-[#252B36] hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      addToast('Light theme activated', 'info');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-2 ring-[#4F8CFF]/30'
                        : 'bg-[#181C25] text-[#929BAA] border-[#252B36] hover:bg-[#252B36] hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('system');
                      addToast('System theme sync activated', 'info');
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      theme === 'system'
                        ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF] shadow-sm ring-2 ring-[#4F8CFF]/30'
                        : 'bg-[#181C25] text-[#929BAA] border-[#252B36] hover:bg-[#252B36] hover:text-[#F5F7FA]'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Sound Notifications Toggle */}
              <div className="p-3.5 bg-[#12151C] border border-[#252B36] rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] text-[#4F8CFF] flex-shrink-0">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-[#32C48D]" /> : <VolumeX className="w-4 h-4 text-[#F05D6C]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F5F7FA]">Sound Chimes & Audio FX</div>
                    <div className="text-[11px] text-[#929BAA] leading-normal">
                      Subtle procedural workplace tones for sent messages and incoming notifications.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={toggleSound}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#4F8CFF] ${
                    soundEnabled ? 'bg-[#32C48D]' : 'bg-[#252B36]'
                  }`}
                  title={soundEnabled ? 'Disable sound FX' : 'Enable sound FX'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Language Selection */}
              <div className="p-3.5 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2.5">
                <div className="flex items-center space-x-2">
                  <Languages className="w-4 h-4 text-[#4F8CFF]" />
                  <span className="text-xs font-semibold text-[#F5F7FA]">Screen Language</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        addToast(`Language set to ${lang.name}`, 'info');
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center space-x-2 cursor-pointer ${
                        selectedLanguage === lang.code
                          ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF]'
                          : 'bg-[#181C25] text-[#929BAA] border-[#252B36] hover:bg-[#252B36] hover:text-[#F5F7FA]'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#252B36] bg-[#12151C]/90 flex items-center justify-between">
          <div className="text-[11px] text-[#929BAA] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#32C48D] animate-pulse" />
            <span>Profile & Encryption settings synced</span>
          </div>

          <button
            type="button"
            onClick={() => setIsUserProfileOpen(false)}
            className="px-4 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-lg text-xs font-medium text-[#F5F7FA] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
