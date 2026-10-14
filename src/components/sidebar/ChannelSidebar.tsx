import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Hash,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Users,
  Search,
  Video,
  PanelLeftClose,
} from 'lucide-react';

export const ChannelSidebar: React.FC = () => {
  const {
    currentUser,
    users,
    activeWorkspace,
    channels,
    dms,
    activeView,
    setActiveView,
    setIsCreateChannelOpen,
    setIsNewDMOpen,
    setIsBrowseChannelsOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    startGoogleMeet,
    setIsGlobalSearchOpen,
    setIsWorkspaceSettingsOpen,
    t,
  } = useChat();

  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [starredCollapsed, setStarredCollapsed] = useState(false);

  // Filter channels for the active workspace: public channels OR private channels user is a member of
  const workspaceChannels = channels.filter((c) => {
    if (c.workspaceId !== activeWorkspace.id) return false;
    if (c.isPrivate) return c.memberIds.includes(currentUser.id);
    return true;
  });
  const starredChannels = workspaceChannels.filter((c) => c.isStarred);
  const regularChannels = workspaceChannels.filter((c) => !c.isStarred);

  // Filter DMs & Groups: only show direct messages and group conversations the current user is a participant of
  const workspaceDMs = dms.filter((d) => {
    if (d.workspaceId !== activeWorkspace.id) return false;
    return d.participantIds.includes(currentUser.id);
  });
  const starredDMs = workspaceDMs.filter((d) => d.isStarred);
  const regularDMs = workspaceDMs.filter((d) => !d.isStarred);

  const getDMName = (dm: typeof workspaceDMs[0]) => {
    if (dm.isGroup) {
      return dm.groupName || 'Group Chat';
    }
    const otherUserId = dm.participantIds.find((id) => id !== currentUser.id) || dm.participantIds[0];
    const otherUser = users.find((u) => u.id === otherUserId);
    return otherUser ? otherUser.name : 'Direct Message';
  };

  const getDMParticipant = (dm: typeof workspaceDMs[0]) => {
    if (dm.isGroup) return null;
    const otherUserId = dm.participantIds.find((id) => id !== currentUser.id) || dm.participantIds[0];
    return users.find((u) => u.id === otherUserId) || null;
  };

  const handleSelectView = (view: { type: 'channel' | 'dm'; id: string }) => {
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768 && !isSidebarCollapsed) {
      toggleSidebarCollapsed();
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop: click outside to dismiss sidebar */}
      {!isSidebarCollapsed && (
        <div
          onClick={toggleSidebarCollapsed}
          className="md:hidden fixed inset-0 top-12 z-30 bg-black/60 backdrop-blur-xs transition-opacity"
          aria-label="Close channels sidebar"
        />
      )}

      <nav 
        aria-label="Workspace channels and messages"
        className={`bg-[#0F1117] border-r border-[#252B36] flex flex-col h-full select-none flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left max-md:fixed max-md:left-12 max-md:top-12 max-md:bottom-0 max-md:w-72 max-md:z-40 max-md:shadow-2xl ${
          isSidebarCollapsed
            ? 'w-0 opacity-0 -translate-x-full md:-translate-x-12 pointer-events-none overflow-hidden border-none'
            : 'w-64 opacity-100 translate-x-0'
        }`}
      >
      {/* Workspace Header: Interactive & Functional (Click to open workspace settings) */}
      <div className="h-14 min-h-[56px] flex-shrink-0 border-b border-[#252B36] px-3 flex items-center justify-between bg-[#0F1117]">
        <button
          onClick={() => setIsWorkspaceSettingsOpen(true)}
          className="flex items-center space-x-2.5 overflow-hidden flex-1 p-1 rounded-lg hover:bg-[#181C25] transition-colors text-left group"
          title="Open Workspace Settings & Switcher"
        >
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
            style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
          >
            {activeWorkspace.icon}
          </div>
          <div className="truncate flex-1 min-w-0">
            <span className="text-sm font-bold text-[#F5F7FA] tracking-tight truncate block leading-tight group-hover:text-[#4F8CFF] transition-colors">
              {activeWorkspace.name}
            </span>
            <p className="text-[11px] font-medium text-[#929BAA] truncate">
              {activeWorkspace.membersCount} {t('members')} &bull; {activeWorkspace.plan}
            </p>
          </div>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-4">
        {/* STARRED SECTION */}
        {(starredChannels.length > 0 || starredDMs.length > 0) && (
          <div>
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
                    <button
                      key={ch.id}
                      onClick={() => handleSelectView({ type: 'channel', id: ch.id })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group ${
                        isActive
                          ? 'bg-[#4F8CFF] text-white font-medium'
                          : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {ch.unreadCount > 0 && (
                        <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {ch.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}

                {starredDMs.map((dm) => {
                  const isActive = activeView.type === 'dm' && activeView.id === dm.id;
                  const partner = getDMParticipant(dm);
                  return (
                    <button
                      key={dm.id}
                      onClick={() => handleSelectView({ type: 'dm', id: dm.id })}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group ${
                        isActive
                          ? 'bg-[#4F8CFF] text-white font-medium'
                          : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {dm.isGroup ? (
                          <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <div className="relative">
                            <img
                              src={partner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
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
                        <span className="truncate">{getDMName(dm)}</span>
                      </div>
                    </button>
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
                onClick={() => setIsBrowseChannelsOpen(true)}
                className="p-1 hover:bg-[#181C25] rounded text-[#929BAA] hover:text-[#F5F7FA]"
                title="Browse Channels"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
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
                  <button
                    key={ch.id}
                    onClick={() => handleSelectView({ type: 'channel', id: ch.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group ${
                      isActive
                        ? 'bg-[#4F8CFF] text-white font-medium shadow-sm'
                        : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {ch.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 flex-shrink-0 text-[#929BAA] group-hover:text-[#F5F7FA]" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 flex-shrink-0 text-[#929BAA] group-hover:text-[#F5F7FA]" />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </div>

                    {ch.unreadCount > 0 && (
                      <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {ch.unreadCount}
                      </span>
                    )}
                  </button>
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
                  <button
                    key={dm.id}
                    onClick={() => handleSelectView({ type: 'dm', id: dm.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors group ${
                      isActive
                        ? 'bg-[#4F8CFF] text-white font-medium shadow-sm'
                        : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {dm.isGroup ? (
                        <div className="w-4 h-4 rounded bg-[#181C25] border border-[#252B36] flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-[#929BAA]" />
                        </div>
                      ) : (
                        <div className="relative flex-shrink-0">
                          <img
                            src={partner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
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
                      <span className="truncate">{getDMName(dm)}</span>
                    </div>

                    {dm.unreadCount > 0 && (
                      <span className="bg-[#4F8CFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {dm.unreadCount}
                      </span>
                    )}
                  </button>
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
    </nav>
    </>
  );
};
