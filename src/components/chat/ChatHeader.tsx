import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Hash,
  Lock,
  Star,
  Users,
  PanelRight,
  Edit2,
  Check,
  X,
  Menu,
  Clock,
  Pin,
} from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';

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
    t,
  } = useChat();

  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState('');

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const getDMParticipant = () => {
    if (!activeDM || activeDM.isGroup) return null;
    const otherUserId = activeDM.participantIds.find((id) => id !== currentUser.id) || activeDM.participantIds[0];
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

  const handleSaveTopic = () => {
    if (activeChannel) {
      updateChannelDetails(activeChannel.id, { topic: topicDraft });
      setIsEditingTopic(false);
    }
  };

  return (
    <header className="hidden md:flex h-14 min-h-[56px] flex-shrink-0 bg-[#0F1117] border-b border-[#252B36] px-3 sm:px-4 items-center justify-between select-none z-10">
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
              <h2 className="text-sm font-bold text-[#F5F7FA]">{activeChannel.name}</h2>
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

            {/* Editable Topic */}
            {isEditingTopic ? (
              <div className="flex items-center space-x-1 flex-1 max-w-md">
                <input
                  type="text"
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  className="bg-[#12151C] border border-[#4F8CFF] rounded px-2 py-0.5 text-xs text-[#F5F7FA] outline-none w-full"
                  autoFocus
                />
                <button
                  onClick={handleSaveTopic}
                  className="p-1 hover:bg-[#181C25] rounded text-[#32C48D]"
                  title="Save topic"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingTopic(false)}
                  className="p-1 hover:bg-[#181C25] rounded text-[#F05D6C]"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setTopicDraft(activeChannel.topic);
                  setIsEditingTopic(true);
                }}
                className="text-xs text-[#929BAA] truncate cursor-pointer hover:text-[#F5F7FA] flex items-center gap-1 group"
                title="Click to edit topic"
              >
                <span className="truncate">{activeChannel.topic || 'Add a topic...'}</span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#4F8CFF] flex-shrink-0 transition-opacity" />
              </div>
            )}
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
                {activeDM.isGroup ? activeDM.groupName : dmPartner?.name}
              </h2>
              {activeDM.status === 'pending' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 rounded-md">
                  <Clock className="w-3 h-3" />
                  <span>Pending Invite</span>
                </span>
              )}
              <button
                onClick={() => toggleStarDM(activeDM.id)}
                className={`p-1 rounded hover:bg-[#181C25] transition-colors ${
                  activeDM.isStarred ? 'text-[#F5A623]' : 'text-[#929BAA] hover:text-[#F5F7FA]'
                }`}
                title={activeDM.isStarred ? 'Unstar' : 'Star'}
              >
                <Star className={`w-3.5 h-3.5 ${activeDM.isStarred ? 'fill-[#F5A623]' : ''}`} />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#252B36] mx-1 flex-shrink-0" />

            <div className="text-xs text-[#929BAA] truncate">
              {activeDM.isGroup
                ? `${activeDM.participantIds.length} ${t('members')}`
                : `${dmPartner?.title || 'Team member'} • ${
                    dmPartner?.isOnline ? t('online') : t('offline')
                  }`}
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-[#F5F7FA]">PulseChat</h2>
            <span className="text-xs text-[#929BAA]">Select or create a conversation to start</span>
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
