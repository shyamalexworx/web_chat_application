import React from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Command, Keyboard } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen } = useChat();

  if (!isKeyboardShortcutsOpen) return null;

  const shortcuts = [
    { category: 'Navigation', keys: ['Ctrl', 'K'], desc: 'Open global search & switcher' },
    { category: 'Navigation', keys: ['Esc'], desc: 'Dismiss modals or close threads' },
    { category: 'Messaging', keys: ['Enter'], desc: 'Send message' },
    { category: 'Messaging', keys: ['Shift', 'Enter'], desc: 'Insert new line without sending' },
    { category: 'Formatting', keys: ['**text**'], desc: 'Bold text' },
    { category: 'Formatting', keys: ['*text*'], desc: 'Italic text' },
    { category: 'Formatting', keys: ['`code`'], desc: 'Inline code block' },
    { category: 'Formatting', keys: ['```lang'], desc: 'Multi-line code snippet' },
  ];

  return (
    <div 
      onClick={() => setIsKeyboardShortcutsOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-[#4F8CFF]" />
            <h2 className="text-sm font-bold text-[#F5F7FA]">Keyboard Shortcuts</h2>
          </div>

          <button
            onClick={() => setIsKeyboardShortcutsOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 space-y-3">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[#12151C] transition-colors"
            >
              <span className="text-xs text-[#F5F7FA]">{sc.desc}</span>
              <div className="flex items-center space-x-1">
                {sc.keys.map((k, idx) => (
                  <kbd
                    key={idx}
                    className="bg-[#12151C] border border-[#252B36] text-[11px] font-mono text-[#4F8CFF] px-2 py-0.5 rounded shadow-subtle"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

