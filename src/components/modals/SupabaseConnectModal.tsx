import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Key,
  Globe,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../../lib/supabase';
import { useChat } from '../../context/ChatContext';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = useChat();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesFound?: boolean;
    storageFound?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both Supabase Project URL and Anon Key.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Temporarily save to test client
    saveSupabaseCredentials(url.trim(), anonKey.trim());
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);

    if (res.success) {
      addToast('Connected to Supabase successfully!', 'success');
    } else {
      addToast('Connection failed: ' + res.message, 'error');
    }
  };

  const handleSaveAndConnect = async () => {
    if (!url.trim() || !anonKey.trim()) {
      addToast('Please enter your Supabase URL and Anon Key', 'warning');
      return;
    }

    const saved = saveSupabaseCredentials(url.trim(), anonKey.trim());
    if (saved) {
      addToast('Supabase credentials saved and connected!', 'success');
      onClose();
      // Reload page to re-initialize complete Supabase real-time sync with fresh session
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      addToast('Failed to save credentials. Please check URL format.', 'error');
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    addToast('Supabase disconnected. Running in local storage mode.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(`-- View complete schema in project file: supabase_schema.sql`);
    setCopiedSql(true);
    addToast('Schema file path is supabase_schema.sql in project root', 'info');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#12151C] border border-[#252B36] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between bg-[#0E1118]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#4F8CFF]/10 text-[#4F8CFF] border border-[#4F8CFF]/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F7FA]">Supabase Cloud Connection</h2>
              <p className="text-xs text-[#929BAA]">
                Store users, messages, photos, videos, and WhatsApp voice notes persistently
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#1E2330] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#252B36] bg-[#0E1118]/60">
            <div className="flex items-center space-x-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isSupabaseConfigured
                    ? 'bg-[#32C48D] shadow-[0_0_10px_#32C48D]'
                    : 'bg-[#E5A83B] shadow-[0_0_10px_#E5A83B]'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-[#F5F7FA]">
                  {isSupabaseConfigured ? 'Supabase Connected' : 'Not Connected (Local Mode)'}
                </div>
                <div className="text-[11px] text-[#929BAA]">
                  {isSupabaseConfigured
                    ? 'Real-time database sync and chat-media cloud storage are active.'
                    : 'Data is currently saved only in your browser localStorage.'}
                </div>
              </div>
            </div>
            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-2.5 py-1 text-xs text-[#F05D6C] hover:bg-[#F05D6C]/10 border border-[#F05D6C]/30 rounded-lg transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[#4F8CFF]" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full h-10 px-3.5 text-xs bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg text-[#F5F7FA] placeholder-[#636D7E] outline-none font-mono"
              />
              <span className="text-[10px] text-[#929BAA] mt-1 block">
                Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-[#4F8CFF]" />
                <span>Supabase Anon / Public API Key</span>
              </label>
              <textarea
                rows={2}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full p-2.5 text-xs bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg text-[#F5F7FA] placeholder-[#636D7E] outline-none font-mono resize-none leading-relaxed"
              />
              <span className="text-[10px] text-[#929BAA] mt-1 block">
                Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API Keys &rarr; anon public
              </span>
            </div>
          </div>

          {/* Test Result Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
                testResult.success
                  ? 'bg-[#32C48D]/10 border-[#32C48D]/30 text-[#32C48D]'
                  : 'bg-[#F05D6C]/10 border-[#F05D6C]/30 text-[#F05D6C]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="font-semibold">{testResult.message}</div>
                {testResult.success && (
                  <div className="text-[11px] text-[#929BAA] space-y-0.5">
                    <div>&bull; Database Tables (profiles, messages, channels): Available</div>
                    <div>
                      &bull; Cloud Media Storage (chat-media):{' '}
                      {testResult.storageFound ? 'Ready (100MB per photo/video/audio)' : 'Not detected (Run schema script to create)'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SQL Schema helper box */}
          <div className="p-3.5 bg-[#0E1118] border border-[#252B36] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <HardDrive className="w-4 h-4 text-[#A78BFA]" />
              <div>
                <div className="text-xs font-medium text-[#F5F7FA]">Database Schema & Storage Script</div>
                <div className="text-[11px] text-[#929BAA]">
                  Run <code className="text-[#4F8CFF]">supabase_schema.sql</code> in your Supabase SQL Editor
                </div>
              </div>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 text-xs text-[#4F8CFF] hover:bg-[#4F8CFF]/10 rounded-lg flex items-center space-x-1 border border-[#4F8CFF]/30 transition-colors"
            >
              <span>Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#252B36] bg-[#0E1118] flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !url.trim() || !anonKey.trim()}
            className="px-3.5 py-2 text-xs font-semibold text-[#F5F7FA] bg-[#181C25] hover:bg-[#1E2330] border border-[#252B36] rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndConnect}
              disabled={!url.trim() || !anonKey.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F8CFF] hover:bg-[#3D7AE8] rounded-lg transition-all shadow-accent-glow cursor-pointer disabled:opacity-50"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
