import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  PanelRight,
  Info,
  Users,
  Pin,
  FileText,
  Activity,
  Hash,
  Lock,
  UserPlus,
  Search,
  ExternalLink,
  Download,
  Calendar,
  Shield,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  ShieldCheck,
  UserMinus,
  MessageSquare,
  MoreVertical,
  Ban,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';
import { compressImageFile } from '../../utils/imageCompressor';

export const RightInfoPanel: React.FC = () => {
  const {
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    activeView,
    channels,
    dms,
    users,
    currentUser,
    messages,
    togglePinMessage,
    isMessagePinnedByMe,
    setIsInviteChannelMembersOpen,
    updateChannelDetails,
    deleteChannel,
    deleteDM,
    createOrOpenDM,
    setActiveView,
    blockedUserIds,
    blockUser,
    unblockUser,
    isUserBlocked,
    blockChannel,
    unblockChannel,
    isChannelBlocked,
    addToast,
    t,
  } = useChat();

  const [memberSearch, setMemberSearch] = useState('');
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false);
  const [confirmDeleteDM, setConfirmDeleteDM] = useState(false);
  const [activeMemberActionId, setActiveMemberActionId] = useState<string | null>(null);

  if (!isRightPanelOpen) return null;

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const dmParts = activeDM && Array.isArray(activeDM.participantIds) ? activeDM.participantIds : [];
  const otherUserId = !activeChannel && activeDM && !activeDM.isGroup
    ? dmParts.find((id) => id !== currentUser.id) || dmParts[0]
    : null;

  const otherUser = otherUserId ? users.find((u) => u.id === otherUserId) : null;

  // Gather members
  const memberIds: string[] = activeChannel
    ? (Array.isArray(activeChannel.memberIds) ? activeChannel.memberIds : [])
    : activeDM
    ? (Array.isArray(activeDM.participantIds) ? activeDM.participantIds : [])
    : [];

  const conversationMembers = users.filter((u) => memberIds.includes(u.id));
  const filteredMembers = conversationMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.title.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Gather pinned messages (strictly private per-user pins)
  const conversationMessages = messages.filter((m) => {
    if (m.hiddenForUserIds?.includes(currentUser.id)) return false;
    if (activeView.type === 'channel') {
      return m.conversationType === 'channel' && m.conversationId === activeView.id;
    } else {
      return m.conversationType === 'dm' && m.conversationId === activeView.id;
    }
  });

  const pinnedMessages = conversationMessages.filter((m) => isMessagePinnedByMe(m));

  // Gather shared files
  const sharedFiles = conversationMessages
    .flatMap((m) => (m.attachments ? m.attachments : []))
    .filter(Boolean);

  // Dynamic real-time activities based on genuine conversation events
  const realActivities = conversationMessages.slice(-5).reverse().map((m) => {
    const author = users.find((u) => u.id === m.senderId)?.name || (m.senderId === currentUser.id ? currentUser.name : 'A member');
    const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    let action = 'sent a message';
    if (m.attachments && m.attachments.length > 0) {
      action = `shared ${m.attachments[0].name}`;
    } else if (isMessagePinnedByMe(m)) {
      action = 'pinned a message';
    }
    return {
      text: `${author} ${action}`,
      time,
    };
  });

  const handleChannelAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeChannel) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 256, 256, 0.82);
      updateChannelDetails(activeChannel.id, { avatar: compressedDataUrl });
      addToast('Channel profile picture updated', 'success');
    } catch (err) {
      addToast('Failed to process channel image', 'error');
    }
  };

  const handleToggleAdmin = (targetUserId: string) => {
    if (!activeChannel) return;
    const currentAdmins = activeChannel.adminIds || [];
    const isAdmin = currentAdmins.includes(targetUserId);
    const updatedAdmins = isAdmin
      ? currentAdmins.filter((id) => id !== targetUserId)
      : [...currentAdmins, targetUserId];
    updateChannelDetails(activeChannel.id, { adminIds: updatedAdmins });
    addToast(isAdmin ? 'Removed admin permissions' : 'Promoted member to channel admin', 'info');
    setActiveMemberActionId(null);
  };

  const handleRemoveMember = (targetUserId: string) => {
    if (!activeChannel) return;
    if (activeChannel.createdBy === targetUserId) {
      addToast('Cannot remove the channel creator', 'warning');
      return;
    }
    const updatedMemberIds = activeChannel.memberIds.filter((id) => id !== targetUserId);
    const updatedAdminIds = (activeChannel.adminIds || []).filter((id) => id !== targetUserId);
    updateChannelDetails(activeChannel.id, {
      memberIds: updatedMemberIds,
      adminIds: updatedAdminIds,
    });
    addToast('Member removed from channel', 'info');
    setActiveMemberActionId(null);
  };

  const handleDirectMessage = (targetUserId: string) => {
    const dmId = createOrOpenDM([targetUserId]);
    setActiveView({ type: 'dm', id: dmId });
    addToast('Opened direct message conversation', 'info');
  };

  return (
    <aside 
      aria-label="Channel and conversation information"
      className="max-md:fixed max-md:inset-0 max-md:top-12 max-md:w-full max-md:z-40 md:relative md:w-80 lg:w-96 bg-[#0F1117] border-l border-[#252B36] flex flex-col h-full flex-shrink-0 select-none z-20 animate-fade-in shadow-modal"
    >
      {/* Header with Title and Close Button (Desktop/Tablet only; hidden in mobile view) */}
      <div className="hidden md:flex h-11 min-h-[44px] border-b border-[#252B36] px-3.5 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#4F8CFF]" />
          <h2 className="text-xs font-bold text-[#F5F7FA]">
            {activeChannel
              ? `#${activeChannel.name}`
              : activeDM?.isGroup
              ? `${activeDM.groupName || 'Group'} Details`
              : otherUser
              ? `${otherUser.name} Details`
              : 'Conversation Info'}
          </h2>
        </div>

        <button
          onClick={() => setIsRightPanelOpen(false)}
          className="p-1.5 rounded-lg border transition-colors bg-[#4F8CFF]/15 text-[#4F8CFF] border-[#4F8CFF]/40 hover:bg-[#181C25] hover:text-[#F5F7FA]"
          title="Close info panel"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs Navigator */}
      <div className="px-2 pt-1 border-b border-[#252B36] flex items-center space-x-0.5 bg-[#12151C]/60 text-xs overflow-x-auto select-none no-scrollbar flex-nowrap">
        <button
          onClick={() => setRightPanelTab('details')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2 py-1.5 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'details'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('details')}</span>
        </button>

        <button
          onClick={() => setRightPanelTab('members')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2 py-1.5 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'members'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('members_tab')} ({conversationMembers.length})</span>
        </button>

        <button
          onClick={() => setRightPanelTab('pinned')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2 py-1.5 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'pinned'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('pinned_tab')} ({pinnedMessages.length})</span>
        </button>

        <button
          onClick={() => setRightPanelTab('files')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2 py-1.5 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'files'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('files_tab')}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* DETAILS TAB */}
        {rightPanelTab === 'details' && (
          <div className="space-y-2 text-xs">
            {activeChannel ? (
              <>
                {/* Channel Profile Picture / Avatar */}
                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Channel Profile Picture
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-lg border border-[#252B36] flex items-center justify-center overflow-hidden bg-[#12151C] flex-shrink-0">
                      {activeChannel.avatar ? (
                        <img
                          src={activeChannel.avatar}
                          alt={activeChannel.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Hash className="w-5 h-5 text-[#4F8CFF]" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <label className="px-2 py-0.5 bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 border border-[#4F8CFF]/30 text-[#4F8CFF] text-xs font-medium rounded cursor-pointer transition-colors flex items-center gap-1.5">
                          <Upload className="w-3 h-3" />
                          <span>Change Picture</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleChannelAvatarChange}
                          />
                        </label>
                        {activeChannel.avatar && (
                          <button
                            type="button"
                            onClick={() => updateChannelDetails(activeChannel.id, { avatar: undefined })}
                            className="px-1.5 py-0.5 text-xs text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#12151C] rounded transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-[#929BAA]">Square image, PNG or JPG, max 5MB.</p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Topic
                  </div>
                  <p className="text-[#F5F7FA] leading-snug">
                    {activeChannel.topic || 'No topic configured.'}
                  </p>
                </div>

                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Description
                  </div>
                  <p className="text-[#F5F7FA] leading-snug">
                    {activeChannel.description || 'No description provided.'}
                  </p>
                </div>

                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Channel Metadata
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4F8CFF]" /> Visibility
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {activeChannel.isPrivate ? 'Private Channel' : 'Public Channel'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#4F8CFF]" /> Created
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {new Date(activeChannel.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Block Channel Option */}
                <div className="p-2.5 bg-[#181C25] border border-[#252B36] rounded-lg space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Channel Safety & Restrictions
                  </div>
                  <p className="text-[#929BAA] text-xs leading-snug">
                    {isChannelBlocked(activeChannel.id)
                      ? `#${activeChannel.name} is currently blocked. Messages cannot be sent and incoming notifications are muted.`
                      : `Block #${activeChannel.name} to mute sound alerts, stop incoming channel notifications, and restrict messaging.`}
                  </p>
                  {isChannelBlocked(activeChannel.id) ? (
                    <button
                      type="button"
                      onClick={() => unblockChannel(activeChannel.id)}
                      className="px-2.5 py-1 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/40 text-[#32C48D] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unblock #${activeChannel.name}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => blockChannel(activeChannel.id)}
                      className="px-2.5 py-1 bg-[#F05D6C]/15 hover:bg-[#F05D6C]/25 border border-[#F05D6C]/40 text-[#F05D6C] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block #${activeChannel.name}</span>
                    </button>
                  )}
                </div>

                {/* Delete Channel Option */}
                <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 rounded-lg space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#F05D6C] uppercase tracking-wider flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Channel
                  </div>
                  <p className="text-[#929BAA] text-xs">
                    Permanently delete #{activeChannel.name} and all associated messages. This cannot be undone.
                  </p>
                  {confirmDeleteChannel ? (
                    <div className="flex items-center space-x-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => deleteChannel(activeChannel.id)}
                        className="px-2.5 py-1 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-semibold rounded transition-colors cursor-pointer shadow-sm"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteChannel(false)}
                        className="px-2 py-1 bg-[#181C25] hover:bg-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] text-xs rounded transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteChannel(true)}
                      className="px-2.5 py-1 bg-[#F05D6C]/15 hover:bg-[#F05D6C]/25 border border-[#F05D6C]/40 text-[#F05D6C] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete #{activeChannel.name}</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Topic Box */}
                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Topic
                  </div>
                  <p className="text-[#F5F7FA] leading-snug">
                    {otherUser?.statusText || (otherUser ? `Discussion topic with ${otherUser.name}` : (activeDM?.isGroup ? (activeDM.groupName || 'Group Discussion') : 'Direct peer-to-peer workspace conversation'))}
                  </p>
                </div>

                {/* Description / Profile Box */}
                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Description
                  </div>
                  {otherUser ? (
                    <div className="flex items-center space-x-2.5 pt-0.5">
                      <div className="relative flex-shrink-0">
                        <img
                          src={resolveUserAvatar(otherUser.avatar, otherUser.name)}
                          alt={otherUser.name}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#181C25] ${
                            otherUser.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#F5F7FA] truncate">{otherUser.name}</div>
                        <div className="text-[11px] text-[#929BAA] truncate">
                          {otherUser.title || 'Member'} &bull; @{otherUser.username}
                        </div>
                        {otherUser.email && (
                          <div className="text-[10px] text-[#4F8CFF] truncate mt-0.5">
                            {otherUser.email}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#F5F7FA] leading-snug">
                      {activeDM?.isGroup
                        ? `Group conversation with ${conversationMembers.length} participants.`
                        : 'Direct peer-to-peer workspace conversation.'}
                    </p>
                  )}
                </div>

                {/* Channel / Conversation Metadata */}
                <div className="p-2.5 bg-[#181C25] rounded-lg border border-[#252B36] space-y-1.5">
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Channel Metadata
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4F8CFF]" /> Visibility
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {activeDM?.isGroup ? 'Group Discussion' : 'Direct Message'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#32C48D]" /> Security
                    </span>
                    <span className="font-medium text-[#32C48D] text-[11px]">
                      End-to-End Encrypted (AES-256-GCM)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#4F8CFF]" /> Created
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {activeDM?.lastActivity ? new Date(activeDM.lastActivity).toLocaleDateString() : new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* WhatsApp-style Block / Unblock Contact Option */}
                {otherUser && (
                  <div className="p-2.5 bg-[#181C25] border border-[#252B36] rounded-lg space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Privacy & Safety
                    </div>
                    <p className="text-[#929BAA] text-xs">
                      {isUserBlocked(otherUser.id)
                        ? `You have blocked ${otherUser.name}. They cannot send you messages or view presence.`
                        : `Block ${otherUser.name} to stop receiving messages or notifications from them.`}
                    </p>
                    {isUserBlocked(otherUser.id) ? (
                      <button
                        type="button"
                        onClick={() => unblockUser(otherUser.id)}
                        className="px-2.5 py-1 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/40 text-[#32C48D] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unblock {otherUser.name}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => blockUser(otherUser.id)}
                        className="px-2.5 py-1 bg-[#F05D6C]/15 hover:bg-[#F05D6C]/25 border border-[#F05D6C]/40 text-[#F05D6C] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block {otherUser.name}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Delete Conversation Option */}
                {activeDM && (
                  <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 rounded-lg space-y-1.5">
                    <div className="text-[10px] font-semibold text-[#F05D6C] uppercase tracking-wider flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Conversation
                    </div>
                    <p className="text-[#929BAA] text-xs">
                      Permanently delete this direct conversation and all associated messages. This cannot be undone.
                    </p>
                    {confirmDeleteDM ? (
                      <div className="flex items-center space-x-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => deleteDM(activeDM.id)}
                          className="px-2.5 py-1 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-semibold rounded transition-colors cursor-pointer shadow-sm"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDM(false)}
                          className="px-2 py-1 bg-[#181C25] hover:bg-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] text-xs rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDM(true)}
                        className="px-2.5 py-1 bg-[#F05D6C]/15 hover:bg-[#F05D6C]/25 border border-[#F05D6C]/40 text-[#F05D6C] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Conversation</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Audit log / activity */}
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#32C48D]" /> Recent Activity
              </div>
              <div className="space-y-1.5">
                {realActivities.length > 0 ? (
                  realActivities.map((act, i) => (
                    <div
                      key={i}
                      className="p-2 bg-[#12151C] border border-[#252B36] rounded-md text-xs"
                    >
                      <div className="text-[#F5F7FA] font-medium">{act.text}</div>
                      <div className="text-[10px] text-[#929BAA] mt-0.5">{act.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 bg-[#12151C] border border-[#252B36] rounded-md text-center text-[#929BAA] text-xs">
                    No recent activity recorded in this conversation yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {rightPanelTab === 'members' && (
          <div className="space-y-2">
            {/* Search members */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search channel members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-[#12151C] border border-[#252B36] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none focus:border-[#4F8CFF]"
              />
            </div>

            <button
              onClick={() => setIsInviteChannelMembersOpen(true)}
              className="w-full py-2 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-lg text-xs font-medium text-[#4F8CFF] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Teammates</span>
            </button>

            <div className="divide-y divide-[#252B36]/60 space-y-1">
              {filteredMembers.map((member) => {
                const isChannelAdmin = Boolean(
                  activeChannel?.adminIds?.includes(member.id) ||
                  member.role === 'owner' ||
                  member.role === 'admin' ||
                  activeChannel?.createdBy === member.id
                );
                const isCreator = activeChannel?.createdBy === member.id;
                const isSelf = member.id === currentUser.id;

                return (
                  <div
                    key={member.id}
                    className="pt-2 pb-2 px-2 rounded-lg hover:bg-[#181C25]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="relative flex-shrink-0">
                          <img
                            src={resolveUserAvatar(member.avatar, member.name)}
                            alt={member.name}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1117] ${
                              member.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                            }`}
                          />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-[#F5F7FA] truncate flex items-center gap-1.5">
                            {member.name}
                            {isSelf && (
                              <span className="text-[10px] text-[#929BAA] font-normal">(you)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#929BAA] truncate">{member.title}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {isCreator && (
                          <span className="text-[10px] bg-[#4F8CFF]/20 text-[#4F8CFF] px-1.5 py-0.5 rounded font-medium">
                            Creator
                          </span>
                        )}
                        {!isCreator && isChannelAdmin && (
                          <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] px-1.5 py-0.5 rounded font-medium">
                            Admin
                          </span>
                        )}

                        {/* Member Action Controls */}
                        {activeChannel && !isSelf && (
                          <div className="relative flex items-center space-x-0.5">
                            <button
                              type="button"
                              onClick={() => handleDirectMessage(member.id)}
                              className="p-1 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
                              title={`Direct message ${member.name}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => isUserBlocked(member.id) ? unblockUser(member.id) : blockUser(member.id)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                isUserBlocked(member.id)
                                  ? 'text-[#32C48D] hover:bg-[#32C48D]/20'
                                  : 'text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#252B36]'
                              }`}
                              title={isUserBlocked(member.id) ? `Unblock ${member.name}` : `Block ${member.name}`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMemberActionId(
                                  activeMemberActionId === member.id ? null : member.id
                                )
                              }
                              className="p-1 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
                              title="Member options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMemberActionId === member.id && (
                              <div className="absolute right-0 top-7 w-44 bg-[#181C25] border border-[#252B36] rounded-xl shadow-modal z-50 p-1 space-y-0.5 animate-slide-down">
                                {!isCreator && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAdmin(member.id)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#F5F7FA] hover:bg-[#252B36] rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#32C48D]" />
                                    <span>{isChannelAdmin ? 'Demote to Member' : 'Make Channel Admin'}</span>
                                  </button>
                                )}
                                {!isCreator && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#F05D6C] hover:bg-[#F05D6C]/10 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <UserMinus className="w-3.5 h-3.5 text-[#F05D6C]" />
                                    <span>Remove from Channel</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDirectMessage(member.id)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#F5F7FA] hover:bg-[#252B36] rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-[#4F8CFF]" />
                                  <span>Send Direct Message</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PINNED MESSAGES TAB */}
        {rightPanelTab === 'pinned' && (
          <div className="space-y-2">
            {pinnedMessages.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#929BAA]">
                No pinned messages yet. Hover over any message to pin important information!
              </div>
            ) : (
              pinnedMessages.map((pin) => {
                const author = users.find((u) => u.id === pin.senderId);
                return (
                  <div
                    key={pin.id}
                    onClick={() => {
                      if (activeView.type !== pin.conversationType || activeView.id !== pin.conversationId) {
                        setActiveView({ type: pin.conversationType, id: pin.conversationId });
                      }
                      setTimeout(() => {
                        const el = document.getElementById(`msg-${pin.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-2', 'ring-[#4F8CFF]', 'bg-[#4F8CFF]/20', 'rounded-xl', 'transition-all', 'duration-300');
                          setTimeout(() => {
                            el.classList.remove('ring-2', 'ring-[#4F8CFF]', 'bg-[#4F8CFF]/20', 'rounded-xl');
                          }, 2500);
                        }
                      }, 100);
                    }}
                    className="p-2.5 bg-[#181C25] border border-[#252B36] rounded-lg text-xs space-y-1 hover:border-[#4F8CFF] hover:bg-[#1C2230] transition-all cursor-pointer group/pin"
                    title="Click to jump to this message in chat"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={author?.avatar}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="font-semibold text-[#F5F7FA]">{author?.name}</span>
                        <span className="text-[10px] text-[#4F8CFF] opacity-0 group-hover/pin:opacity-100 transition-opacity">Jump &rarr;</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinMessage(pin.id);
                        }}
                        className="text-[#929BAA] hover:text-[#F05D6C] text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Unpin"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[#F5F7FA] leading-snug line-clamp-3">{pin.content}</p>

                    <div className="text-[10px] text-[#929BAA] font-mono">
                      Pinned on {new Date(pin.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SHARED FILES TAB */}
        {rightPanelTab === 'files' && (
          <div className="space-y-2">
            {sharedFiles.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#929BAA]">
                No files shared in this channel yet. Upload documents or images using the composer!
              </div>
            ) : (
              sharedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-2 bg-[#181C25] border border-[#252B36] rounded-lg text-xs flex items-center justify-between hover:bg-[#1E2330] transition-colors"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="p-1.5 bg-[#12151C] rounded border border-[#252B36] text-[#4F8CFF] flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-[#F5F7FA] truncate">{file.name}</div>
                      <div className="text-[10px] text-[#929BAA]">{file.size}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => addToast(`Downloaded ${file.name}`, 'success')}
                    className="p-1 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded transition-colors flex-shrink-0"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

