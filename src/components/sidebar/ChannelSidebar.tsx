import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Users,
  Video,
  Mail,
  Check,
  X,
  Menu,
  Settings,
  Trash2,
} from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';
import { WorkspaceRailInner } from './WorkspaceRail';
import { translateText } from '../../utils/translation';

export const ChannelSidebar: React.FC = () => {
  const {
    currentUser,
    users,
    workspaces,
    activeWorkspace,
    channels,
    dms,
    invites,
    acceptInvite,
    declineInvite,
    activeView,
    setActiveView,
    setIsCreateChannelOpen,
    setIsNewDMOpen,
    setIsBrowseChannelsOpen,
    setIsCreateWorkspaceOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    startGoogleMeet,
    setIsGlobalSearchOpen,
    setIsWorkspaceSettingsOpen,
    setIsUserProfileOpen,
    deleteChannel,
    deleteDM,
    selectedLanguage,
    t,
  } = useChat();

  const [channelToDelete, setChannelToDelete] = useState<any | null>(null);
  const [dmToDelete, setDMToDelete] = useState<any | null>(null);

  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [starredCollapsed, setStarredCollapsed] = useState(false);

  // Filter channels for the active workspace: public channels OR private channels user is a member of
  const workspaceChannels = useMemo(() => {
    return (channels || []).filter((c) => {
      if (!c || c.workspaceId !== (activeWorkspace?.id || '')) return false;
      if (c.isPrivate) return Array.isArray(c.memberIds) && c.memberIds.includes(currentUser?.id);
      return true;
    });
  }, [channels, activeWorkspace?.id, currentUser?.id]);

  const starredChannels = useMemo(() => {
    return workspaceChannels.filter((c) => c && c.isStarred);
  }, [workspaceChannels]);

  const regularChannels = useMemo(() => {
    return workspaceChannels.filter((c) => c && !c.isStarred);
  }, [workspaceChannels]);

  // Filter DMs & Groups: only show direct messages and group conversations the current user is a participant of
  const workspaceDMs = useMemo(() => {
    return (dms || []).filter((d) => {
      if (!d || d.workspaceId !== (activeWorkspace?.id || '')) return false;
      return Array.isArray(d.participantIds) && d.participantIds.includes(currentUser?.id);
    });
  }, [dms, activeWorkspace?.id, currentUser?.id]);

  const starredDMs = useMemo(() => {
    return workspaceDMs.filter((d) => d && d.isStarred);
  }, [workspaceDMs]);

  const regularDMs = useMemo(() => {
    return workspaceDMs.filter((d) => d && !d.isStarred);
  }, [workspaceDMs]);

  const pendingReceivedInvites = (invites || []).filter(
    (inv) =>
      inv &&
      (inv.receiverId === currentUser?.id ||
        (currentUser?.email && inv.receiverId?.toLowerCase() === currentUser.email.toLowerCase())) &&
      inv.status === 'pending'
  );

  const getDMName = (dm: any) => {
    if (!dm) return 'Direct Message';
    if (dm.isGroup) {
      return dm.groupName || 'Group Chat';
    }
    const parts = Array.isArray(dm.participantIds) ? dm.participantIds : [];
    const otherUserId = parts.find((id: string) => id !== currentUser?.id) || parts[0];
    const otherUser = (users || []).find((u) => u && u.id === otherUserId);
    return otherUser ? otherUser.name : 'Direct Message';
  };

  const getDMParticipant = (dm: any) => {
    if (!dm || dm.isGroup) return null;
    const parts = Array.isArray(dm.participantIds) ? dm.participantIds : [];
    const otherUserId = parts.find((id: string) => id !== currentUser?.id) || parts[0];
    return (users || []).find((u) => u && u.id === otherUserId) || null;
  };

  const handleSelectView = (view: { type: 'channel' | 'dm'; id: string }) => {
    setActiveView(view);
    // User requested: menu bar collapses ONLY by clicking the menu bar icon
  };

  const handleCloseSidebar = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsSidebarCollapsed(true);
  };

  return (
    <>
      {/* Mobile overlay backdrop: touching closes/collapses the menu bar smoothly */}
      <div
        onClick={handleCloseSidebar}
        onTouchEnd={handleCloseSidebar}
        className={`md:hidden fixed inset-0 top-12 z-30 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto cursor-pointer'
        }`}
        aria-label="Close navigation menu"
      />

      <nav 
        aria-label="Workspace channels and messages"
        className={`bg-[#0F1117] border-r border-[#252B36] sidebar-chat-divider flex flex-row select-none flex-shrink-0 max-md:fixed max-md:left-0 max-md:top-12 max-md:bottom-0 max-md:h-[calc(100dvh-48px)] max-md:w-80 max-md:z-40 max-md:shadow-2xl max-md:transition-transform max-md:duration-300 max-md:ease-[cubic-bezier(0.16,1,0.3,1)] md:h-full md:transition-all md:duration-300 md:ease-[cubic-bezier(0.16,1,0.3,1)] md:origin-left ${
          isSidebarCollapsed
            ? 'max-md:-translate-x-full max-md:pointer-events-none md:w-0 md:opacity-0 md:-translate-x-12 md:pointer-events-none md:overflow-hidden md:border-none'
            : 'max-md:translate-x-0 max-md:pointer-events-auto md:w-64 md:opacity-100 md:translate-x-0'
        }`}
      >
        {/* MOBILE-ONLY WORKSPACE RAIL */}
        <div className="w-12 h-full bg-slate-50 dark:bg-[#0B0D12] flex-shrink-0 flex flex-col md:hidden">
          <WorkspaceRailInner isMobile={true} />
        </div>

        {/* CHANNELS & DMS MAIN SIDEBAR */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-[#0F1117]">
          {/* Workspace Header: Interactive & Functional */}
          <div className="h-11 min-h-[44px] flex-shrink-0 border-b border-slate-200 dark:border-[#252B36] px-2.5 sm:px-3 flex items-center justify-between bg-white dark:bg-[#0F1117]">
            <button
              onClick={() => setIsWorkspaceSettingsOpen(true)}
              className="flex items-center space-x-2 overflow-hidden flex-1 p-0.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-[#181C25] transition-colors text-left group"
              title="Open Workspace Settings & Switcher"
            >
              {activeWorkspace.avatar ? (
                <img
                  src={activeWorkspace.avatar}
                  alt=""
                  className="w-6 h-6 rounded-md object-cover flex-shrink-0 shadow-sm border border-slate-200 dark:border-[#252B36]"
                />
              ) : (
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
                >
                  {activeWorkspace.icon}
                </div>
              )}
              <div className="truncate flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-[#F5F7FA] tracking-tight truncate block leading-none group-hover:text-[#4F8CFF] transition-colors">
                  {translateText(activeWorkspace.name, selectedLanguage)}
                </span>
                <p className="text-[10px] font-medium text-slate-500 dark:text-[#929BAA] truncate leading-tight mt-0.5">
                  {activeWorkspace.membersCount} {t('members')}
                </p>
              </div>
            </button>
          </div>

      {/* Navigation List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-4">
        {/* PENDING CHAT INVITATIONS (SLACK STYLE) */}
        {pendingReceivedInvites.length > 0 && (
          <div className="bg-[#12151C] border border-[#4F8CFF]/40 rounded-xl p-2.5 mx-0.5 shadow-md">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#4F8CFF] mb-2">
              <Mail className="w-3.5 h-3.5" />
              <span>{t('invitations')} ({pendingReceivedInvites.length})</span>
            </div>
            <div className="space-y-1.5">
              {pendingReceivedInvites.map((inv) => {
                const sender = users.find((u) => u.id === inv.senderId);
                const senderName = sender?.name || 'Coworker';
                return (
                  <div key={inv.id} className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] flex items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <img
                        src={resolveUserAvatar(sender?.avatar, senderName)}
                        alt=""
                        className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-[#F5F7FA] truncate">{senderName}</p>
                        <p className="text-[10px] text-[#929BAA] truncate">
                          {inv.inviteType === 'channel'
                            ? `${t('channel')}: #${channels.find((c) => c.id === inv.conversationId)?.name || 'channel'}`
                            : t('direct_chat_invite')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptInvite(inv.id);
                        }}
                        className="p-1 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-white rounded transition-colors cursor-pointer"
                        title={t('accept')}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          declineInvite(inv.id);
                        }}
                        className="p-1 bg-[#F05D6C]/20 hover:bg-[#F05D6C] text-[#F05D6C] hover:text-white rounded transition-colors cursor-pointer"
                        title={t('decline')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty workspaces call-to-action */}
        {workspaces.length === 0 && (
          <div className="p-3 bg-[#12151C] border border-[#252B36] rounded-xl text-center space-y-2">
            <p className="text-xs font-semibold text-[#F5F7FA]">{t('no_workspaces_yet')}</p>
            <p className="text-[11px] text-[#929BAA]">{t('create_workspace_desc')}</p>
            <button
              onClick={() => setIsCreateWorkspaceOpen(true)}
              className="w-full py-1.5 px-3 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              + {t('create_workspace')}
            </button>
          </div>
        )}

        {/* STARRED SECTION */}
        {(starredChannels.length > 0 || starredDMs.length > 0) && (
          <div className="transition-opacity duration-150 ease-out">
            <div
              onClick={() => setStarredCollapsed(!starredCollapsed)}
              className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[#929BAA] hover:text-[#F5F7FA] cursor-pointer group"
            >
              <div className="flex items-center space-x-1.5">
                {starredCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-[#929BAA]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#929BAA]" />
                )}
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Star className="w-3 h-3 text-[#F5A623] fill-[#F5A623]" /> {t('starred')}
                </span>
              </div>
            </div>

            {!starredCollapsed && (
              <div className="mt-1 space-y-0.5">
                {starredChannels.map((ch) => {
                  const isActive = activeView.type === 'channel' && activeView.id === ch.id;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleSelectView({ type: 'channel', id: ch.id })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group cursor-pointer ${
                        isActive
                          ? 'bg-[#4F8CFF] text-white font-medium'
                          : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate min-w-0">
                        {ch.avatar ? (
                          <img src={ch.avatar} alt="" className="w-3.5 h-3.5 rounded object-cover flex-shrink-0" />
                        ) : ch.isPrivate ? (
                          <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#929BAA]'}`} />
                        ) : (
                          <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#929BAA]'}`} />
                        )}
                        <span className="truncate">{translateText(ch.name, selectedLanguage)}</span>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                        {ch.unreadCount > 0 && (
                          <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            {ch.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {starredDMs.map((dm) => {
                  const isActive = activeView.type === 'dm' && activeView.id === dm.id;
                  const partner = getDMParticipant(dm);
                  return (
                    <div
                      key={dm.id}
                      onClick={() => handleSelectView({ type: 'dm', id: dm.id })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group cursor-pointer ${
                        isActive
                          ? 'bg-[#4F8CFF] text-white font-medium'
                          : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate min-w-0">
                        {dm.isGroup ? (
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <div className="relative">
                            <img
                              src={resolveUserAvatar(partner?.avatar, partner?.name)}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#0F1117] ${
                                partner?.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                              }`}
                            />
                          </div>
                        )}
                        <span className="truncate">{translateText(getDMName(dm), selectedLanguage)}</span>
                        {dm.status === 'pending' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                      {dm.unreadCount > 0 && (
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                          <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {dm.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CHANNELS SECTION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[#929BAA] hover:text-[#F5F7FA] group">
            <div
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="flex items-center space-x-1.5 cursor-pointer"
            >
              {channelsCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-[#929BAA]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#929BAA]" />
              )}
              <span className="uppercase tracking-wider text-[11px]">
                {t('channels')} ({workspaceChannels.length})
              </span>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1 hover:bg-[#181C25] rounded text-[#929BAA] hover:text-[#F5F7FA]"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!channelsCollapsed && (
            <div className="mt-1 space-y-0.5">
              {regularChannels.map((ch) => {
                const isActive = activeView.type === 'channel' && activeView.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectView({ type: 'channel', id: ch.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group cursor-pointer ${
                      isActive
                        ? 'bg-[#4F8CFF] text-white font-medium shadow-sm'
                        : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      {ch.avatar ? (
                        <img src={ch.avatar} alt="" className="w-3.5 h-3.5 rounded object-cover flex-shrink-0" />
                      ) : ch.isPrivate ? (
                        <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#929BAA] group-hover:text-[#F5F7FA]'}`} />
                      ) : (
                        <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#929BAA] group-hover:text-[#F5F7FA]'}`} />
                      )}
                      <span className="truncate">{translateText(ch.name, selectedLanguage)}</span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                      {ch.unreadCount > 0 && (
                        <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {ch.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setIsCreateChannelOpen(true)}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#181C25] rounded-md transition-colors"
              >
                <div className="w-4 h-4 rounded bg-[#181C25] flex items-center justify-center border border-[#252B36]">
                  <Plus className="w-3 h-3" />
                </div>
                <span>{t('add_channel')}</span>
              </button>
            </div>
          )}
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-[#929BAA] hover:text-[#F5F7FA] group">
            <div
              onClick={() => setDmsCollapsed(!dmsCollapsed)}
              className="flex items-center space-x-1.5 cursor-pointer"
            >
              {dmsCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-[#929BAA]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#929BAA]" />
              )}
              <span className="uppercase tracking-wider text-[11px]">
                {t('direct_messages')} ({workspaceDMs.length})
              </span>
            </div>
            <button
              onClick={() => setIsNewDMOpen(true)}
              className="p-1 hover:bg-[#181C25] rounded text-[#929BAA] hover:text-[#F5F7FA] opacity-0 group-hover:opacity-100 transition-opacity"
              title="Start Direct Message"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {!dmsCollapsed && (
            <div className="mt-1 space-y-0.5">
              {regularDMs.map((dm) => {
                const isActive = activeView.type === 'dm' && activeView.id === dm.id;
                const partner = getDMParticipant(dm);
                return (
                  <div
                    key={dm.id}
                    onClick={() => handleSelectView({ type: 'dm', id: dm.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group cursor-pointer ${
                      isActive
                        ? 'bg-[#4F8CFF] text-white font-medium shadow-sm'
                        : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate min-w-0">
                      {dm.isGroup ? (
                        <div className={`w-4 h-4 rounded ${isActive ? 'bg-white/20 border-white/30' : 'bg-[#181C25] border-[#252B36]'} border flex items-center justify-center flex-shrink-0`}>
                          <Users className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#929BAA]'}`} />
                        </div>
                      ) : (
                        <div className="relative flex-shrink-0">
                          <img
                            src={resolveUserAvatar(partner?.avatar, partner?.name)}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#0F1117] ${
                              partner?.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                            }`}
                          />
                        </div>
                      )}
                      <span className="truncate">{translateText(getDMName(dm), selectedLanguage)}</span>
                      {dm.status === 'pending' && (
                        <span className="ml-1 px-1.5 py-0.2 text-[9px] font-semibold bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30 rounded">
                          Pending
                        </span>
                      )}
                    </div>

                    {dm.unreadCount > 0 && (
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                        <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {dm.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setIsNewDMOpen(true)}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#181C25] rounded-md transition-colors"
              >
                <div className="w-4 h-4 rounded bg-[#181C25] flex items-center justify-center border border-[#252B36]">
                  <Plus className="w-3 h-3" />
                </div>
                <span>{t('start_dm')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only Account Section across the bottom */}
      <div className="md:hidden h-11 min-h-[44px] border-t border-slate-200 dark:border-[#252B36] pl-1 pr-3 flex items-center justify-between bg-slate-50 dark:bg-[#0B0D12] flex-shrink-0">
        <button
          onClick={() => setIsUserProfileOpen(true)}
          className="flex items-center overflow-hidden flex-1 py-1 pl-0 pr-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-[#181C25] transition-colors text-left group cursor-pointer"
          title="Open Profile & Settings"
        >
          <div className="truncate flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-[#F5F7FA] truncate block leading-tight group-hover:text-[#4F8CFF]">
              {currentUser.name}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentUser.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'}`} />
              <span className="text-[10px] text-slate-500 dark:text-[#929BAA] truncate">
                {currentUser.isOnline ? t('online') : t('offline')} &bull; {currentUser.role}
              </span>
            </div>
          </div>
        </button>

        <button
          onClick={() => setIsUserProfileOpen(true)}
          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] hover:bg-slate-200 dark:hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
          title="Profile & Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
      </div>
    </nav>

    {/* Delete Channel Confirmation Modal */}
    {channelToDelete && (
      <div
        onClick={() => setChannelToDelete(null)}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal p-5 space-y-4 cursor-default text-left"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] rounded-xl flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[#F5F7FA]">
                {t('delete_channel')} #{channelToDelete.name}?
              </h3>
              <p className="text-xs text-[#929BAA] mt-1 leading-relaxed">
                {t('delete_channel_warning')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setChannelToDelete(null)}
              className="px-3 py-1.5 bg-[#12151C] hover:bg-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={async () => {
                const id = channelToDelete.id;
                setChannelToDelete(null);
                await deleteChannel(id);
              }}
              className="px-3.5 py-1.5 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {t('delete_channel')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete DM Confirmation Modal */}
    {dmToDelete && (
      <div
        onClick={() => setDMToDelete(null)}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal p-5 space-y-4 cursor-default text-left"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] rounded-xl flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[#F5F7FA]">{t('delete_conversation')}?</h3>
              <p className="text-xs text-[#929BAA] mt-1 leading-relaxed">
                {t('delete_channel_warning')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setDMToDelete(null)}
              className="px-3 py-1.5 bg-[#12151C] hover:bg-[#252B36] text-[#929BAA] hover:text-[#F5F7FA] text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={async () => {
                const id = dmToDelete.id;
                setDMToDelete(null);
                await deleteDM(id);
              }}
              className="px-3.5 py-1.5 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {t('delete_conversation')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
