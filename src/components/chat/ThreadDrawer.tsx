import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Send, MessageSquare, Smile, Paperclip } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { translateText } from '../../utils/translation';

export const ThreadDrawer: React.FC = () => {
  const {
    activeThreadMessage,
    setActiveThreadMessageId,
    threadReplies,
    sendThreadReply,
    channels,
    activeView,
    users,
    currentUser,
    selectedLanguage,
    t,
  } = useChat();

  const [replyText, setReplyText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [threadReplies.length]);

  if (!activeThreadMessage) return null;

  const parentSender = users.find((u) => u.id === activeThreadMessage.senderId);

  const handleSend = () => {
    if (!replyText.trim()) return;
    sendThreadReply(activeThreadMessage.id, replyText.trim());
    setReplyText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-md:fixed max-md:inset-0 max-md:top-12 max-md:w-full max-md:z-40 md:relative md:w-80 lg:w-96 bg-[#0F1117] border-l border-[#252B36] flex flex-col h-full flex-shrink-0 select-none z-20 animate-fade-in shadow-modal">
      {/* Thread Header */}
      <div className="h-11 min-h-[44px] border-b border-[#252B36] px-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-[#4F8CFF]" />
          <div>
            <h3 className="text-xs font-bold text-[#F5F7FA]">{t('thread')}</h3>
            <span className="text-[11px] text-[#929BAA]">
              #{activeChannel?.name ? translateText(activeChannel.name, selectedLanguage) : 'discussion'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveThreadMessageId(null)}
          className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-md transition-colors"
          title={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Scrollable Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto divide-y divide-[#252B36]/50">
        {/* Original Root Message */}
        <div className="py-3 bg-[#12151C]/60">
          <div className="px-3 pb-1 text-[10px] font-semibold text-[#4F8CFF] uppercase tracking-wider">
            {t('original_post')}
          </div>
          <MessageItem message={activeThreadMessage} />
        </div>

        {/* Replies List */}
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-semibold text-[#929BAA]">
            {threadReplies.length} {threadReplies.length === 1 ? t('reply') : t('replies')}
          </div>

          {threadReplies.map((reply, idx) => (
            <MessageItem
              key={reply.id}
              message={reply}
              previousMessage={idx > 0 ? threadReplies[idx - 1] : undefined}
            />
          ))}

          <div className="h-2" />
        </div>
      </div>

      {/* Reply Composer */}
      <div className="p-3 border-t border-[#252B36] bg-[#0B0D12]">
        <div className="bg-[#12151C] border border-[#252B36] focus-within:border-[#4F8CFF] rounded-xl p-2.5 transition-colors">
          <textarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('reply_in_thread')}
            className="w-full bg-transparent text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between pt-1 border-t border-[#252B36]/40">
            <span className="text-[10px] text-[#929BAA] font-mono">{t('shift_enter')}</span>
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                replyText.trim()
                  ? 'bg-[#4F8CFF] text-white hover:bg-[#3D7AE8]'
                  : 'bg-[#181C25] text-[#929BAA]/40 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

