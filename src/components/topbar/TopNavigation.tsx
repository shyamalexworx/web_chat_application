import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Search,
  Bell,
  Video,
  X,
  Hash,
  Lock,
  ArrowRight,
  Zap,
  Trash2,
  Menu,
  Star,
  PanelRight,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { SquigglyText } from '../ui/squiggly-text';
import { EncryptedText } from '../ui/encrypted-text';
import { resolveUserAvatar } from '../../utils/avatar';

export const TopNavigation: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    removeNotification,
    clearAllNotifications,
    triggerLiveNotification,
    setActiveView,
    activeView,
    dms,
    currentUser,
    isMessagePinnedByMe,
    toggleStarChannel,
    toggleStarDM,
    toggleSidebarCollapsed,
    isRightPanelOpen,
    setIsRightPanelOpen,
    setRightPanelTab,
    startGoogleMeet,
    channels,
    users,
    messages,
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    acceptInvite,
    declineInvite,
    addToast,
    t,
  } = useChat();

  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'channels' | 'people' | 'messages' | 'files'>('all');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  const dmPartner = useMemo(() => {
    if (!activeDM || activeDM.isGroup) return null;
    const parts = Array.isArray(activeDM.participantIds) ? activeDM.participantIds : [];
    const otherUserId = parts.find((id) => id !== currentUser.id) || parts[0];
    return users.find((u) => u.id === otherUserId) || null;
  }, [activeDM, currentUser, users]);

  // Messages pinned in the active conversation by the current user
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

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open search bar on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchFocused(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 10);
      }
      if (e.key === 'Escape') {
        if (searchFocused) {
          setSearchFocused(false);
          searchInputRef.current?.blur();
        }
        if (isMobileSearchOpen) {
          setIsMobileSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused, isMobileSearchOpen]);

  // Live real-time search results calculated directly inline
  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return { channels: [], users: [], messages: [], files: [] };
    const q = searchInput.toLowerCase();

    const matchedChannels = (channels || [])
      .filter((c) => c && c.workspaceId === (activeWorkspace?.id || ''))
      .filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.topic || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
      );

    const matchedUsers = (users || []).filter(
      (u) =>
        u &&
        ((u.name || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.title || '').toLowerCase().includes(q))
    );

    const matchedMessages = (messages || []).filter(
      (m) => m && (m.content || '').toLowerCase().includes(q)
    );

    const matchedFiles = (messages || [])
      .flatMap((m) => (m && Array.isArray(m.attachments) ? m.attachments : []))
      .filter((att) => att && (att.name || '').toLowerCase().includes(q));

    return {
      channels: matchedChannels,
      users: matchedUsers,
      messages: matchedMessages,
      files: matchedFiles,
    };
  }, [searchInput, channels, users, messages, activeWorkspace]);

  const totalResultsCount =
    searchResults.channels.length +
    searchResults.users.length +
    searchResults.messages.length +
    searchResults.files.length;

  const getMessageBreadcrumb = (m: (typeof messages)[0]) => {
    const author = (users || []).find((u) => u.id === m.senderId);
    const authorName = author?.name || author?.username || 'Member';

    let channelOrDMName = '';
    let wsName = '';

    if (m.conversationType === 'channel') {
      const ch = (channels || []).find((c) => c.id === m.conversationId);
      channelOrDMName = ch ? ch.name : 'channel';
      const ws = ch ? (workspaces || []).find((w) => w.id === ch.workspaceId) : null;
      wsName = ws?.name || activeWorkspace?.name || 'Workspace';
    } else {
      const dm = (dms || []).find((d) => d.id === m.conversationId);
      if (dm?.isGroup) {
        channelOrDMName = dm.groupName || 'Group Chat';
      } else if (dm) {
        const partnerId = dm.participantIds.find((id) => id !== currentUser.id) || dm.participantIds[0];
        const partner = (users || []).find((u) => u.id === partnerId);
        channelOrDMName = partner?.name || 'Direct Message';
      } else {
        channelOrDMName = 'Direct Message';
      }
      const ws = dm?.workspaceId ? (workspaces || []).find((w) => w.id === dm.workspaceId) : null;
      wsName = ws?.name || activeWorkspace?.name || 'Workspace';
    }

    return `${wsName}->${channelOrDMName}->${authorName}`;
  };

  const handleJumpToMessage = (m: (typeof messages)[0]) => {
    if (m.conversationType === 'channel') {
      const ch = (channels || []).find((c) => c.id === m.conversationId);
      if (ch && ch.workspaceId && ch.workspaceId !== activeWorkspace.id) {
        setActiveWorkspaceId(ch.workspaceId);
      }
    } else if (m.conversationType === 'dm') {
      const dm = (dms || []).find((d) => d.id === m.conversationId);
      if (dm && dm.workspaceId && dm.workspaceId !== activeWorkspace.id) {
        setActiveWorkspaceId(dm.workspaceId);
      }
    }

    setActiveView({ type: m.conversationType, id: m.conversationId });

    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(`msg-${m.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[#4F8CFF]', 'bg-[#4F8CFF]/20', 'rounded-xl', 'transition-all', 'duration-300');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[#4F8CFF]', 'bg-[#4F8CFF]/20', 'rounded-xl');
        }, 2500);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryScroll, 120);
      }
    };
    setTimeout(tryScroll, 100);

    addToast('Jumped to message in conversation', 'info');
  };

  const renderFilterTabs = () => (
    <div className="px-3 py-2 border-b border-slate-200 dark:border-[#252B36] bg-slate-50 dark:bg-[#12151C]/70 flex items-center space-x-1.5 text-xs overflow-x-auto flex-shrink-0">
      {[
        { id: 'all', label: `All (${totalResultsCount})` },
        { id: 'channels', label: `Channels (${searchResults.channels.length})` },
        { id: 'people', label: `People (${searchResults.users.length})` },
        { id: 'messages', label: `Messages (${searchResults.messages.length})` },
        { id: 'files', label: `Files (${searchResults.files.length})` },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setSearchFilter(tab.id as typeof searchFilter)}
          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
            searchFilter === tab.id
              ? 'bg-[#4F8CFF] text-white'
              : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderResultsContent = (onItemClick: () => void) => {
    if (searchInput.trim().length > 0) {
      return (
        <div className="overflow-y-auto p-2 space-y-3 flex-1 text-xs">
          {totalResultsCount === 0 ? (
            <div className="p-6 text-center text-[#929BAA]">
              No matching results for "{searchInput}"
            </div>
          ) : (
            <>
              {/* Channels */}
              {(searchFilter === 'all' || searchFilter === 'channels') && searchResults.channels.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
                    Channels
                  </div>
                  {searchResults.channels.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setActiveView({ type: 'channel', id: ch.id });
                        onItemClick();
                      }}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#12151C] cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isPrivate ? <Lock className="w-3.5 h-3.5 text-[#929BAA]" /> : <Hash className="w-3.5 h-3.5 text-[#4F8CFF]" />}
                        <span className="font-semibold text-slate-900 dark:text-[#F5F7FA]">#{ch.name}</span>
                        <span className="text-[11px] text-[#929BAA] truncate max-w-xs">{ch.topic}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#929BAA] opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              )}

              {/* People */}
              {(searchFilter === 'all' || searchFilter === 'people') && searchResults.users.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
                    Team Members
                  </div>
                  {searchResults.users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        onItemClick();
                        addToast(`Opened member profile for ${u.name}`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#12151C] cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <img src={resolveUserAvatar(u.avatar, u.name)} alt="" className="w-5 h-5 rounded-md object-cover" />
                        <span className="font-semibold text-slate-900 dark:text-[#F5F7FA]">{u.name}</span>
                        <span className="text-[11px] text-[#929BAA]">@{u.username} &bull; {u.title}</span>
                      </div>
                      <span className="text-[10px] text-[#32C48D]">{u.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              {(searchFilter === 'all' || searchFilter === 'messages') && searchResults.messages.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
                    Messages
                  </div>
                  {searchResults.messages.map((m) => {
                    const author = (users || []).find((u) => u.id === m.senderId);
                    const breadcrumb = getMessageBreadcrumb(m);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          handleJumpToMessage(m);
                          onItemClick();
                        }}
                        className="px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#12151C] cursor-pointer space-y-1 transition-colors"
                      >
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#4F8CFF] truncate">
                          {author?.avatar ? (
                            <img src={resolveUserAvatar(author?.avatar, author?.name)} alt="" className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                          ) : null}
                          <span className="truncate">{breadcrumb}</span>
                        </div>
                        <div className="text-xs text-slate-900 dark:text-[#F5F7FA] line-clamp-2 leading-relaxed">{m.content}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div className="p-3 space-y-3 overflow-y-auto max-h-80 text-xs">
        <div className="flex items-center justify-between text-[11px] text-[#929BAA] px-1 pb-1 border-b border-slate-200 dark:border-[#252B36]">
          <span className="font-semibold text-slate-900 dark:text-[#F5F7FA]">Quick Search & Jump</span>
          <span className="hidden md:inline font-mono text-[10px] bg-slate-100 dark:bg-[#12151C] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#252B36]">ESC to close</span>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
            Channels
          </div>
          {(channels || [])
            .filter((c) => c && c.workspaceId === (activeWorkspace?.id || ''))
            .slice(0, 4)
            .map((ch) => (
            <div
              key={ch.id}
              onClick={() => {
                setActiveView({ type: 'channel', id: ch.id });
                onItemClick();
              }}
              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#12151C] cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-2 truncate">
                {ch.isPrivate ? <Lock className="w-3.5 h-3.5 text-[#929BAA]" /> : <Hash className="w-3.5 h-3.5 text-[#4F8CFF]" />}
                <span className="font-semibold text-slate-900 dark:text-[#F5F7FA]">#{ch.name}</span>
                <span className="text-[11px] text-[#929BAA] truncate max-w-xs">{ch.topic}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#929BAA] opacity-0 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <header className="h-12 min-h-[48px] flex-shrink-0 bg-white dark:bg-[#0B0D12] border-b border-slate-200 dark:border-[#252B36] flex items-center justify-between pl-0 pr-2 sm:pr-4 select-none z-40 max-md:z-50 relative">
      {/* Desktop/Laptop/Tablet Left: Brand Indicator (Aligned with 48px Workspace Rail) */}
      <div className="hidden md:flex items-center flex-shrink-0">
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          <div className="relative overflow-hidden rounded-lg w-8 h-8 flex-shrink-0 bg-slate-100 dark:bg-[#12151D] border border-blue-500/25 shadow-sm flex items-center justify-center">
            <img src="/logo.png" alt="PulseChat" className="w-full h-full object-contain p-1" />
          </div>
        </div>
        <div className="pl-1 pr-3 flex items-center cursor-pointer">
          <EncryptedText
            text="PulseChat"
            className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white brand-pulse-text"
            highlightClass="text-[#2563EB] dark:text-[#4F8CFF]"
          />
        </div>
      </div>

      {/* Mobile-only Left: Menu Button [☰] + Active Channel/DM Title [# channel1 ⭐️] */}
      <div className="flex md:hidden items-center space-x-1.5 flex-1 min-w-0 pr-1 pl-2 sm:pl-3">
        {/* Blue Arrow 1: Hamburger Menu button moved to top-left */}
        <button
          onClick={toggleSidebarCollapsed}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#12151C] dark:hover:bg-[#181C25] text-slate-600 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] border border-slate-200 dark:border-[#252B36] flex-shrink-0 cursor-pointer"
          title="Toggle workspace channels"
          aria-label="Toggle workspace navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Blue Arrow 2: Active Channel / DM title moved to top */}
        {activeChannel ? (
          <div 
            onClick={() => setIsRightPanelOpen(true)}
            className="flex items-center space-x-1 flex-1 min-w-0 cursor-pointer overflow-hidden"
            title="View channel info"
          >
            {activeChannel.avatar ? (
              <img
                src={activeChannel.avatar}
                alt={activeChannel.name}
                className="w-5 h-5 rounded-md object-cover flex-shrink-0 border border-slate-200 dark:border-[#252B36]"
              />
            ) : activeChannel.isPrivate ? (
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-[#929BAA] flex-shrink-0" />
            ) : (
              <Hash className="w-3.5 h-3.5 text-[#4F8CFF] flex-shrink-0" />
            )}
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
              {activeChannel.name}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarChannel(activeChannel.id);
              }}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-[#181C25] transition-colors flex-shrink-0 ${
                activeChannel.isStarred ? 'text-[#F5A623]' : 'text-slate-400 dark:text-[#929BAA]'
              }`}
              title={activeChannel.isStarred ? 'Unstar channel' : 'Star channel'}
            >
              <Star
                className={`w-3.5 h-3.5 ${activeChannel.isStarred ? 'fill-[#F5A623]' : ''}`}
              />
            </button>
          </div>
        ) : activeDM ? (
          <div 
            onClick={() => setIsRightPanelOpen(true)}
            className="flex items-center space-x-1.5 flex-1 min-w-0 cursor-pointer overflow-hidden"
            title="View conversation info"
          >
            {activeDM.isGroup ? (
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
                {activeDM.groupName || 'Group Chat'}
              </h2>
            ) : dmPartner ? (
              <>
                <div className="relative flex-shrink-0">
                  <img
                    src={resolveUserAvatar(dmPartner.avatar, dmPartner.name)}
                    alt={dmPartner.name}
                    className="w-5 h-5 rounded-md object-cover border border-slate-200 dark:border-[#252B36]"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-[#0F1117] ${
                      dmPartner.isOnline ? 'bg-[#32C48D]' : 'bg-[#929BAA]'
                    }`}
                  />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
                  {dmPartner.name}
                </h2>
              </>
            ) : (
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">
                Direct Message
              </h2>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleStarDM(activeDM.id);
              }}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-[#181C25] transition-colors flex-shrink-0 ${
                activeDM.isStarred ? 'text-[#F5A623]' : 'text-slate-400 dark:text-[#929BAA]'
              }`}
              title={activeDM.isStarred ? 'Unstar conversation' : 'Star conversation'}
            >
              <Star
                className={`w-3.5 h-3.5 ${activeDM.isStarred ? 'fill-[#F5A623]' : ''}`}
              />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">PulseChat</span>
          </div>
        )}
      </div>

      {/* Center: Real-time Live Search Input (Desktop & Tablet only) */}
      <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-xl mx-4 relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#929BAA] absolute left-3 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={t('search_placeholder')}
            className="w-full h-8 bg-slate-100 hover:bg-slate-200/70 focus:bg-white dark:bg-[#12151C] dark:hover:bg-[#181C25] dark:focus:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg pl-9 pr-14 text-xs text-slate-900 dark:text-[#F5F7FA] placeholder-slate-400 dark:placeholder-[#929BAA] outline-none transition-all shadow-sm"
          />

          {searchInput ? (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:text-[#929BAA] dark:hover:text-[#F5F7FA]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div 
              onClick={() => {
                setSearchFocused(true);
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1.5 hidden sm:flex items-center space-x-1 cursor-pointer"
              title="Press Ctrl+K to search"
            >
              <kbd className="text-[10px] bg-slate-200 dark:bg-[#181C25] border border-slate-300 dark:border-[#252B36] px-1.5 py-0.5 rounded text-slate-600 dark:text-[#929BAA] font-mono">
                Ctrl
              </kbd>
              <kbd className="text-[10px] bg-slate-200 dark:bg-[#181C25] border border-slate-300 dark:border-[#252B36] px-1.5 py-0.5 rounded text-slate-600 dark:text-[#929BAA] font-mono">
                K
              </kbd>
            </div>
          )}
        </div>

        {/* Live Search Results Dropdown (Desktop & Tablet) */}
        {searchFocused && (
          <div className="absolute top-10 inset-x-0 bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#252B36] rounded-xl shadow-xl z-50 overflow-hidden animate-slide-down max-h-96 flex flex-col">
            {searchInput.trim().length > 0 && renderFilterTabs()}
            {renderResultsContent(() => {
              setSearchFocused(false);
              setSearchInput('');
            })}
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-1 sm:space-x-2 relative flex-shrink-0">
        {/* Mobile Search Icon Button (placed left side of green Meet icon) */}
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(true);
            setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
          }}
          className="md:hidden p-1.5 rounded-lg border bg-slate-100 dark:bg-[#12151C] text-slate-600 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] border-slate-200 dark:border-[#252B36] hover:bg-slate-200 dark:hover:bg-[#181C25] transition-colors cursor-pointer"
          title="Search messages, channels, members"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Google Meet Trigger Button (The green icon) */}
        <button
          onClick={startGoogleMeet}
          className="p-1.5 md:px-2.5 md:py-1 flex items-center justify-center md:space-x-1.5 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/30 text-[#32C48D] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          title="Start Google Meet"
          aria-label="Start Google Meet"
        >
          <Video className="w-4 h-4 md:w-3.5 md:h-3.5" />
          <span className="hidden md:inline">{t('meet')}</span>
        </button>

        {/* Real-time Notification Icon in Top Right Corner */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !notifMenuOpen;
              setNotifMenuOpen(next);
              if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
              }
            }}
            className={`p-1.5 rounded-lg border transition-colors relative flex items-center justify-center cursor-pointer ${
              notifMenuOpen
                ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF]'
                : 'bg-slate-100 dark:bg-[#12151C] text-slate-600 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] border-slate-200 dark:border-[#252B36] hover:bg-slate-200 dark:hover:bg-[#181C25]'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#F05D6C] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B0D12]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Real-time Notifications Flyout Dropdown */}
          {notifMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 max-md:z-[55] bg-black/40 backdrop-blur-xs md:bg-transparent cursor-pointer" 
                onClick={() => setNotifMenuOpen(false)} 
              />
              <div className="max-md:fixed max-md:top-14 max-md:right-2 max-md:w-[calc(100vw-1rem)] max-md:max-w-sm max-md:z-[60] md:absolute md:right-0 md:mt-2 md:w-96 bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#252B36] rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-down">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-[#252B36] flex items-center justify-between bg-slate-50 dark:bg-[#12151C]/60">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#4F8CFF]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-[#F5F7FA]">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="text-[10px] bg-[#4F8CFF]/20 text-[#4F8CFF] font-semibold px-1.5 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-slate-500 hover:text-[#F05D6C] dark:text-[#929BAA] dark:hover:text-[#F05D6C] flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Clear all notifications"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#252B36]/40">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-[#929BAA]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          removeNotification(n.id);
                          if (n.targetType && n.targetId) {
                            if (n.targetType === 'channel') {
                              const ch = channels.find((c) => c.id === n.targetId);
                              if (ch && ch.workspaceId && ch.workspaceId !== activeWorkspace.id) {
                                setActiveWorkspaceId(ch.workspaceId);
                              }
                            } else if (n.targetType === 'dm') {
                              const dm = dms.find((d) => d.id === n.targetId);
                              if (dm && dm.workspaceId && dm.workspaceId !== activeWorkspace.id) {
                                setActiveWorkspaceId(dm.workspaceId);
                              }
                            }
                            setActiveView({ type: n.targetType, id: n.targetId });
                          }
                          setNotifMenuOpen(false);
                        }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-[#12151C] cursor-pointer transition-colors flex items-start space-x-3 group/notif"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800 dark:text-[#F5F7FA] truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#929BAA] font-mono">
                              {new Date(n.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-[#929BAA] mt-0.5 line-clamp-2">
                            {n.body}
                          </p>

                          {/* Quick Accept/Decline action for Invitations */}
                          {(n.type === 'invite' || n.id.startsWith('notif-inv-')) && (
                            <div className="flex items-center space-x-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-[#252B36]/50">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const invId = n.id.replace('notif-inv-', '');
                                  await acceptInvite(invId);
                                  removeNotification(n.id);
                                }}
                                className="px-2.5 py-1 bg-[#32C48D] hover:bg-[#28A775] text-white text-[11px] font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const invId = n.id.replace('notif-inv-', '');
                                  await declineInvite(invId);
                                  removeNotification(n.id);
                                }}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-[#252B36] dark:hover:bg-[#323946] text-slate-700 dark:text-[#929BAA] text-[11px] font-medium rounded-md transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="opacity-0 group-hover/notif:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-[#252B36] rounded text-slate-400 hover:text-[#F05D6C] transition-opacity flex-shrink-0 cursor-pointer"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Pinned Messages Indicator (Only visible when there is a pinned message by current user) */}
        {hasPinnedByMe && (
          <button
            type="button"
            onClick={() => {
              setRightPanelTab('pinned');
              setIsRightPanelOpen(true);
            }}
            className="md:hidden flex items-center space-x-1 px-2 py-1.5 rounded-lg border border-[#4F8CFF]/40 bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 text-[#4F8CFF] text-xs font-semibold transition-all cursor-pointer shadow-sm group animate-fade-in"
            title={`${pinnedMessagesByMe.length} message${pinnedMessagesByMe.length > 1 ? 's' : ''} pinned by you in this chat. Click to view.`}
            aria-label="View pinned messages"
          >
            <Pin className="w-3.5 h-3.5 fill-[#4F8CFF] rotate-45" />
            <span className="font-mono text-[11px] font-bold">{pinnedMessagesByMe.length}</span>
          </button>
        )}

        {/* Blue Arrow 3: Mobile Right Panel Toggle Button */}
        <button
          type="button"
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`md:hidden p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isRightPanelOpen
              ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF]'
              : 'bg-slate-100 dark:bg-[#12151C] text-slate-600 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] border-slate-200 dark:border-[#252B36] hover:bg-slate-200 dark:hover:bg-[#181C25]'
          }`}
          title="Toggle info panel"
          aria-label="Toggle info panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Search Full-screen Overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0B0D12]">
          {/* Top Search Bar */}
          <div className="h-12 min-h-[48px] px-3 flex items-center space-x-2 border-b border-slate-200 dark:border-[#252B36] bg-white dark:bg-[#0B0D12]">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchInput('');
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] hover:bg-slate-100 dark:hover:bg-[#181C25] transition-colors cursor-pointer"
              title="Close search"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#929BAA] absolute left-2.5 top-2.5" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full h-8 bg-slate-100 dark:bg-[#12151C] border border-slate-200 dark:border-[#252B36] focus:border-[#4F8CFF] rounded-lg pl-8 pr-7 text-xs text-slate-900 dark:text-[#F5F7FA] outline-none"
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:text-[#929BAA] dark:hover:text-[#F5F7FA]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Content & Results Area */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-[#0F1117]">
            {searchInput.trim().length > 0 && renderFilterTabs()}
            {renderResultsContent(() => {
              setIsMobileSearchOpen(false);
              setSearchInput('');
            })}
          </div>
        </div>
      )}
    </header>
  );
};
