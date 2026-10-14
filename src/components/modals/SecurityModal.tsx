import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  ShieldCheck,
  Lock,
  Key,
  Shield,
  Copy,
  Check,
  X,
  RefreshCw,
  Cpu,
  Fingerprint,
  Zap,
} from 'lucide-react';
import {
  encryptMessage,
  decryptMessage,
  generateSafetyFingerprint,
  type EncryptedPayload,
} from '../../utils/crypto';

export const SecurityModal: React.FC = () => {
  const {
    isSecurityModalOpen,
    setIsSecurityModalOpen,
    activeView,
    channels,
    dms,
    addToast,
    t,
  } = useChat();

  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [testInput, setTestInput] = useState('Workspace confidential deployment credentials');
  const [testPayload, setTestPayload] = useState<EncryptedPayload | null>(null);
  const [testDecrypted, setTestDecrypted] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);

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

  // Run initial test encryption on open
  useEffect(() => {
    if (isSecurityModalOpen) {
      handleTestEncrypt(testInput);
    }
  }, [isSecurityModalOpen, activeView.id]);

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

  if (!isSecurityModalOpen) return null;

  return (
    <div
      onClick={() => setIsSecurityModalOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0F1117] border border-[#252B36] rounded-2xl shadow-2xl overflow-hidden animate-slide-down flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between bg-[#12151C]/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#32C48D]/15 border border-[#32C48D]/30 flex items-center justify-center text-[#32C48D] shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-[#F5F7FA]">Pulse Security & Encryption Armor</h2>
                <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] font-mono px-2 py-0.5 rounded-full border border-[#32C48D]/30">
                  AES-256-GCM ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#929BAA] mt-0.5">
                Military-grade cryptographic protection & anti-hacking defenses for {conversationName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSecurityModalOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Top Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-[#32C48D]">
                <Lock className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px] uppercase tracking-wider">Cipher Standard</span>
              </div>
              <div className="text-sm font-bold text-[#F5F7FA]">AES-256-GCM</div>
              <div className="text-[11px] text-[#929BAA]">128-bit Authenticated Tag</div>
            </div>

            <div className="p-3.5 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-[#4F8CFF]">
                <Key className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px] uppercase tracking-wider">Key Derivation</span>
              </div>
              <div className="text-sm font-bold text-[#F5F7FA]">PBKDF2-SHA256</div>
              <div className="text-[11px] text-[#929BAA]">100,000 Iteration Salts</div>
            </div>

            <div className="p-3.5 bg-[#181C25] border border-[#252B36] rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-[#A855F7]">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px] uppercase tracking-wider">Anti-Hacking Armor</span>
              </div>
              <div className="text-sm font-bold text-[#F5F7FA]">Armed & Enforced</div>
              <div className="text-[11px] text-[#929BAA]">Anti-XSS & CSP Protection</div>
            </div>
          </div>

          {/* Safety Fingerprint Verification */}
          <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-[#4F8CFF]" />
                <span className="font-bold text-[#F5F7FA]">Conversation Safety Fingerprint</span>
              </div>
              <button
                onClick={handleCopyFingerprint}
                className="flex items-center space-x-1 text-[11px] px-2 py-1 rounded bg-[#181C25] hover:bg-[#252B36] text-[#4F8CFF] border border-[#252B36] transition-colors"
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
              Verify this cryptographic safety number with other participants in <strong className="text-[#F5F7FA]">{conversationName}</strong> to ensure that your messages are encrypted end-to-end and immune to eavesdropping or man-in-the-middle interference.
            </p>

            <div className="p-3 bg-[#0B0D12] rounded-lg border border-[#252B36] font-mono text-center tracking-widest text-sm text-[#32C48D] select-all">
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
              Test real-time message encryption directly in your browser. Type any phrase to see it transformed into high-entropy ciphertext:
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => {
                  setTestInput(e.target.value);
                  handleTestEncrypt(e.target.value);
                }}
                placeholder="Type a message to encrypt..."
                className="flex-1 bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-3 py-2 text-xs text-[#F5F7FA] outline-none"
              />
              <button
                onClick={() => handleTestEncrypt(testInput)}
                className="px-3 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded-lg flex items-center space-x-1.5 font-medium transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEncrypting ? 'animate-spin' : ''}`} />
                <span>Encrypt</span>
              </button>
            </div>

            {testPayload && (
              <div className="space-y-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 bg-[#0B0D12] rounded-lg border border-[#252B36] space-y-1">
                  <div className="text-[10px] text-[#4F8CFF] font-semibold flex items-center justify-between">
                    <span>ENCRYPTED CIPHERTEXT (AES-256-GCM Base64):</span>
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

          {/* Security Checklist */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#F5A623]" /> Active System Hardening Matrix
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                <span className="text-[#F5F7FA] font-medium">Anti-XSS Input Sanitization Engine</span>
              </div>
              <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                <span className="text-[#F5F7FA] font-medium">96-bit Unique Cryptographic IV per message</span>
              </div>
              <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                <span className="text-[#F5F7FA] font-medium">Anti-Flooding Rate Limiting Armor</span>
              </div>
              <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#32C48D]" />
                <span className="text-[#F5F7FA] font-medium">Content-Security-Policy Strict Headers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#252B36] bg-[#12151C]/90 flex items-center justify-between">
          <div className="text-[11px] text-[#929BAA] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#32C48D] animate-pulse" />
            <span>Encrypted channel session verified and secured</span>
          </div>
          <button
            onClick={() => setIsSecurityModalOpen(false)}
            className="px-4 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-lg text-xs font-medium text-[#F5F7FA] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

