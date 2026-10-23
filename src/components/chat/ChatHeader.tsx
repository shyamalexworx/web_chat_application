import React, { useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Hash,
  Lock,
  Star,
  Users,
  PanelRight,
  Menu,
  Clock,
  Pin,
} from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';
import { translateText } from '../../utils/translation';

export const ChatHeader: React.FC = () => {
  const {
    activeView,
    channels,
    dms,
    users,
    messages,
    currentUser,
    isMessagePinnedByMe,
    toggleStarChannel,
    toggleStarDM,
    updateChannelDetails,
    isRightPanelOpen,
    setIsRightPanelOpen,
    setRightPanelTab,
    toggleSidebarCollapsed,
    selectedLanguage,
    t,
  } = useChat();

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const getDMParticipant = () => {
    if (!activeDM || activeDM.isGroup) return null;
    const parts = Array.isArray(activeDM.participantIds) ? activeDM.participantIds : [];
    const otherUserId = parts.find((id) => id !== currentUser.id) || parts[0];
    return users.find((u) => u.id === otherUserId) || null;
  };

  const dmPartner = getDMParticipant();

  // Find messages pinned in this conversation by the current user (in channels and personal messages)
  const pinnedMessagesByMe = useMemo(() => {
    return messages.filter((m) => {
      if (activeView.type === 'channel') {
        if (m.conversationType !== 'channel' || m.conversationId !== activeView.id) return false;
      } else if (activeView.type === 'dm') {
        if (m.conversationType !== 'dm') return false;
        if (m.conversationId !== activeView.id && m.conversationId !== activeDM?.id) return false;
      } else {
        return false;
      }
      return isMessagePinnedByMe(m);
    });
  }, [messages, activeView, activeDM, isMessagePinnedByMe]);

  const hasPinnedByMe = pinnedMessagesByMe.length > 0;

  return (
    <header className="hidden md:flex h-11 min-h-[44px] flex-shrink-0 bg-[#0F1117] border-b border-[#252B36] px-3 sm:px-4 items-center justify-between select-none z-10">
      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={toggleSidebarCollapsed}
        className="md:hidden p-1.5 mr-2 rounded-lg bg-[#12151C] hover:bg-[#181C25] text-[#929BAA] hover:text-[#F5F7FA] border border-[#252B36] flex-shrink-0 cursor-pointer"
        title="Toggle workspace channels"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Title & Topic Details */}
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden flex-1 min-w-0">
        {activeChannel ? (
          <>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {activeChannel.avatar ? (
                <img
                  src={activeChannel.avatar}
                  alt={activeChannel.name}
                  className="w-5 h-5 rounded-md object-cover flex-shrink-0 border border-[#252B36]"
                />
              ) : activeChannel.isPrivate ? (
                <Lock className="w-4 h-4 text-[#929BAA]" />
              ) : (
                <Hash className="w-4 h-4 text-[#929BAA]" />
              )}
              <h2 className="text-sm font-bold text-[#F5F7FA]">{translateText(activeChannel.name, selectedLanguage)}</h2>
              <button
                onClick={() => toggleStarChannel(activeChannel.id)}
                className={`p-1 rounded hover:bg-[#181C25] transition-colors ${
                  activeChannel.isStarred ? 'text-[#F5A623]' : 'text-[#929BAA] hover:text-[#F5F7FA]'
                }`}
                title={activeChannel.isStarred ? 'Unstar channel' : 'Star channel'}
              >
                <Star
                  className={`w-3.5 h-3.5 ${activeChannel.isStarred ? 'fill-[#F5A623]' : ''}`}
                />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#252B36] mx-1 flex-shrink-0" />

            {/* Channel Description (Clicking opens details panel) */}
            <button
              type="button"
              onClick={() => {
                setRightPanelTab('details');
                setIsRightPanelOpen(true);
              }}
              className="text-xs text-[#929BAA] truncate cursor-pointer hover:text-[#F5F7FA] flex items-center gap-1 group text-left max-w-xs sm:max-w-md transition-colors"
              title="Click to view channel description in details"
            >
              <span className="truncate">
                {activeChannel.description
                  ? translateText(activeChannel.description, selectedLanguage)
                  : t('add_description')}
              </span>
            </button>
          </>
        ) : activeDM ? (
          <>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {activeDM.isGroup ? (
                <div className="w-6 h-6 rounded bg-[#181C25] border border-[#252B36] flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-[#4F8CFF]" />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={resolveUserAvatar(dmPartner?.avatar, dmPartner?.name)}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1117] ${
                      dmPartner?.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                    }`}
                  />
                </div>
              )}
              <h2 className="text-sm font-bold text-[#F5F7FA]">
                {activeDM.isGroup
                  ? (activeDM.groupName ? translateText(activeDM.groupName, selectedLanguage) : 'Group')
                  : (dmPartner?.name ? translateText(dmPartner.name, selectedLanguage) : 'User')}
              </h2>
              {activeDM.status === 'pending' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 rounded-md">
                  <Clock className="w-3 h-3" />
                  <span>{t('pending_invite')}</span>
                </span>
              )}
              <button
                onClick={() => toggleStarDM(activeDM.id)}
                className={`p-1 rounded hover:bg-[#181C25] transition-colors ${
                  activeDM.isStarred ? 'text-[#F5A623]' : 'text-[#929BAA] hover:text-[#F5F7FA]'
                }`}
                title={activeDM.isStarred ? t('unstar_channel') : t('star_channel')}
              >
                <Star className={`w-3.5 h-3.5 ${activeDM.isStarred ? 'fill-[#F5A623]' : ''}`} />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#252B36] mx-1 flex-shrink-0" />

            <div className="text-xs text-[#929BAA] truncate">
              {activeDM.isGroup
                ? `${(activeDM.participantIds || []).length} ${t('members')}`
                : `${dmPartner?.title ? translateText(dmPartner.title, selectedLanguage) : t('team_members')} • ${
                    dmPartner?.isOnline ? t('online') : t('offline')
                  }`}
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-[#F5F7FA]">PulseChat</h2>
            <span className="text-xs text-[#929BAA]">{t('select_or_create_conv')}</span>
          </div>
        )}
      </div>

      {/* Action Controls on the Right (Pin Indication & Panel Toggle) */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Pinned Messages Indicator (Only visible when there is a message pinned in the chat AND only for the person who pinned it) */}
        {hasPinnedByMe && (
          <button
            type="button"
            onClick={() => {
              setRightPanelTab('pinned');
              setIsRightPanelOpen(true);
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-[#4F8CFF]/40 bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 text-[#4F8CFF] text-xs font-semibold transition-all cursor-pointer shadow-sm group animate-fade-in"
            title={`${pinnedMessagesByMe.length} message${pinnedMessagesByMe.length > 1 ? 's' : ''} pinned by you in this chat. Click to view.`}
          >
            <Pin className="w-3.5 h-3.5 fill-[#4F8CFF] rotate-45" />
            <span className="font-mono text-[11px] font-bold">{pinnedMessagesByMe.length}</span>
          </button>
        )}

        {!isRightPanelOpen && (
          <button
            onClick={() => setIsRightPanelOpen(true)}
            className="p-1.5 rounded-lg border transition-colors bg-[#12151C] text-[#929BAA] hover:text-[#F5F7FA] border-[#252B36] hover:bg-[#181C25] cursor-pointer"
            title="Open info panel"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
