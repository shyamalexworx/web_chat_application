import React, { useState } from 'react';
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
} from 'lucide-react';

export const ChatHeader: React.FC = () => {
  const {
    activeView,
    channels,
    dms,
    users,
    currentUser,
    toggleStarChannel,
    toggleStarDM,
    updateChannelDetails,
    isRightPanelOpen,
    setIsRightPanelOpen,
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

  const handleSaveTopic = () => {
    if (activeChannel) {
      updateChannelDetails(activeChannel.id, { topic: topicDraft });
      setIsEditingTopic(false);
    }
  };

  return (
    <header className="h-14 min-h-[56px] flex-shrink-0 bg-[#0F1117] border-b border-[#252B36] px-3 sm:px-4 flex items-center justify-between select-none z-10">
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
              {activeChannel.isPrivate ? (
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
                    src={dmPartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
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
        ) : null}
      </div>

      {/* Action Controls on the Right (Panel Toggle) */}
      {!isRightPanelOpen && (
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setIsRightPanelOpen(true)}
            className="p-1.5 rounded-lg border transition-colors bg-[#12151C] text-[#929BAA] hover:text-[#F5F7FA] border-[#252B36] hover:bg-[#181C25] cursor-pointer"
            title="Open info panel"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
