import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageItem } from './MessageItem';
import { Hash, Lock, Users, Sparkles, ArrowDown } from 'lucide-react';

export const MessageList: React.FC = () => {
  const {
    activeConversationMessages,
    activeView,
    channels,
    dms,
    users,
    currentUser,
    setIsRightPanelOpen,
    setRightPanelTab,
    t,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const dmPartner = activeDM && !activeDM.isGroup
    ? users.find((u) => u.id === (activeDM.participantIds.find((id) => id !== currentUser.id) || activeDM.participantIds[0]))
    : null;

  // Auto-scroll inside container only (prevents ancestor/window scrolling)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeConversationMessages.length]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Group messages by Date
  const formatDateLabel = (isoDate: string) => {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col relative bg-[#0B0D12]"
    >
      <div className="py-4 space-y-4">
        {/* Onboarding Header Banner at top of channel history */}
        <div className="px-5 pt-6 pb-4 border-b border-[#252B36]/50">
          {activeChannel ? (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#181C25] border border-[#252B36] flex items-center justify-center text-[#4F8CFF] mb-3 shadow-subtle">
                {activeChannel.isPrivate ? (
                  <Lock className="w-6 h-6" />
                ) : (
                  <Hash className="w-6 h-6" />
                )}
              </div>
              <h1 className="text-xl font-bold text-[#F5F7FA]">
                {t('welcome_to')} #{activeChannel.name}!
              </h1>
              <p className="text-xs text-[#929BAA] mt-1.5 max-w-xl leading-relaxed">
                {activeChannel.description || t('this_channel_is_for')}
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsRightPanelOpen(true);
                    setRightPanelTab('members');
                  }}
                  className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] text-xs font-medium text-[#F5F7FA] border border-[#252B36] rounded-lg transition-colors flex items-center space-x-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#4F8CFF]" />
                  <span>{t('view_members')} ({activeChannel.memberIds.length})</span>
                </button>
              </div>
            </div>
          ) : activeDM ? (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#181C25] border border-[#252B36] flex items-center justify-center text-[#4F8CFF] mb-3 overflow-hidden shadow-subtle">
                {activeDM.isGroup ? (
                  <Users className="w-6 h-6" />
                ) : (
                  <img
                    src={dmPartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <h1 className="text-xl font-bold text-[#F5F7FA]">
                {activeDM.isGroup ? activeDM.groupName : dmPartner?.name}
              </h1>
              <p className="text-xs text-[#929BAA] mt-1 max-w-xl">
                {activeDM.isGroup
                  ? `${t('group_conversation_with')} (${activeDM.participantIds.length} ${t('members')})`
                  : `${t('dm_beginning')} ${dmPartner?.name} (${dmPartner?.title}).`}
              </p>
            </div>
          ) : null}
        </div>

        {/* Message stream grouped by date */}
        {activeConversationMessages.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#929BAA]">
            {t('no_messages_yet')}
          </div>
        ) : (
          (() => {
            let lastDate = '';
            return activeConversationMessages.map((msg, idx) => {
              const msgDate = formatDateLabel(msg.timestamp);
              const showDateDivider = msgDate !== lastDate;
              lastDate = msgDate;
              const prevMsg = idx > 0 ? activeConversationMessages[idx - 1] : undefined;

              return (
                <React.Fragment key={msg.id}>
                  {showDateDivider && (
                    <div className="relative flex items-center justify-center my-4 select-none px-5">
                      <div className="absolute inset-x-5 h-[1px] bg-[#252B36]" />
                      <span className="relative bg-[#181C25] border border-[#252B36] text-[11px] font-semibold text-[#929BAA] px-3 py-1 rounded-full shadow-subtle">
                        {msgDate}
                      </span>
                    </div>
                  )}

                  <MessageItem message={msg} previousMessage={prevMsg} />
                </React.Fragment>
              );
            });
          })()
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>
    </div>
  );
};

