import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Languages,
  Check,
  Globe,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Copy,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, translateText } from '../../utils/translation';

export const TranslationModal: React.FC = () => {
  const {
    isTranslationOpen,
    setIsTranslationOpen,
    selectedLanguage,
    setSelectedLanguage,
    autoTranslateEnabled,
    setAutoTranslateEnabled,
    translateActiveConversation,
    resetTranslations,
    activeView,
    channels,
    addToast,
  } = useChat();

  const [scratchText, setScratchText] = useState('');
  const [translatedResult, setTranslatedResult] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isTranslationOpen) return null;

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const handleTranslateCurrentChat = () => {
    translateActiveConversation(selectedLanguage);
    addToast(`Messages translated to ${currentLangObj.name}`, 'success');
  };

  const handleTranslateScratch = () => {
    if (!scratchText.trim()) return;
    const res = translateText(scratchText, selectedLanguage);
    setTranslatedResult(res);
  };

  const handleCopyScratch = () => {
    navigator.clipboard.writeText(translatedResult);
    setCopied(true);
    addToast('Translated text copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={() => setIsTranslationOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#12151C] rounded-lg border border-[#252B36] text-[#4F8CFF]">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Workspace Translation</h2>
              <p className="text-[11px] text-[#929BAA]">
                Multilingual channel communication & real-time message translation.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTranslationOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Target Language Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-2">
              Preferred Target Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      setAutoTranslateEnabled(true);
                      if (lang.code === 'en') {
                        resetTranslations();
                        addToast('Interface restored to English', 'info');
                      } else {
                        translateActiveConversation(lang.code);
                        addToast(`Workspace translated to ${lang.name} (${lang.nativeName})`, 'success');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-[#4F8CFF]/15 border-[#4F8CFF] text-[#F5F7FA]'
                        : 'bg-[#12151C] border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{lang.name}</div>
                      <div className="text-[10px] text-[#929BAA] truncate">{lang.nativeName}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-Time Auto Translate Toggle */}
          <div className="p-3.5 bg-[#12151C] border border-[#252B36] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-[#4F8CFF]" />
              <div>
                <div className="text-xs font-semibold text-[#F5F7FA]">
                  Real-time Auto-Translation
                </div>
                <div className="text-[11px] text-[#929BAA]">
                  Automatically translate incoming messages in #{activeChannel?.name || 'chat'} to {currentLangObj.name}.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !autoTranslateEnabled;
                setAutoTranslateEnabled(next);
                if (next) {
                  translateActiveConversation(selectedLanguage);
                } else {
                  resetTranslations();
                }
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoTranslateEnabled ? 'bg-[#4F8CFF]' : 'bg-[#252B36]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoTranslateEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTranslateCurrentChat}
              className="flex-1 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-semibold rounded-xl shadow-accent-glow flex items-center justify-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Translate Current Channel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetTranslations();
                addToast('Restored original language messages', 'info');
              }}
              className="py-2 px-3 bg-[#12151C] hover:bg-[#252B36] border border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] text-xs font-medium rounded-xl flex items-center space-x-1 transition-colors"
              title="Reset to Original"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Scratchpad Translator */}
          <div className="space-y-2 pt-2 border-t border-[#252B36]">
            <label className="block text-xs font-semibold text-[#F5F7FA]">
              Quick Text Translator
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={scratchText}
                onChange={(e) => setScratchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTranslateScratch()}
                placeholder="Type or paste phrase to translate..."
                className="flex-1 bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-1.5 text-xs text-[#F5F7FA] outline-none"
              />
              <button
                type="button"
                onClick={handleTranslateScratch}
                className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-xs font-medium text-[#4F8CFF] rounded-xl"
              >
                Translate
              </button>
            </div>

            {translatedResult && (
              <div className="p-3 bg-[#12151C] border border-[#4F8CFF]/30 rounded-xl flex items-center justify-between text-xs animate-slide-down">
                <span className="text-[#F5F7FA] font-medium">{translatedResult}</span>
                <button
                  onClick={handleCopyScratch}
                  className="p-1 hover:bg-[#181C25] rounded text-[#929BAA] hover:text-[#F5F7FA]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#32C48D]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

