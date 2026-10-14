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
} from 'lucide-react';

export const TopNavigation: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    removeNotification,
    clearAllNotifications,
    triggerLiveNotification,
    setActiveView,
    startGoogleMeet,
    channels,
    users,
    messages,
    activeWorkspace,
    addToast,
    t,
    isSupabaseConfigured,
    setIsSupabaseModalOpen,
  } = useChat();

  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'channels' | 'people' | 'messages' | 'files'>('all');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      if (e.key === 'Escape' && searchFocused) {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  // Live real-time search results calculated directly inline
  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return { channels: [], users: [], messages: [], files: [] };
    const q = searchInput.toLowerCase();

    const matchedChannels = channels
      .filter((c) => c.workspaceId === activeWorkspace.id)
      .filter((c) => c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q));

    const matchedUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
    );

    const matchedMessages = messages.filter((m) =>
      m.content.toLowerCase().includes(q)
    );

    const matchedFiles = messages
      .flatMap((m) => (m.attachments ? m.attachments : []))
      .filter((att) => att.name.toLowerCase().includes(q));

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

  return (
    <header className="h-12 min-h-[48px] flex-shrink-0 bg-[#0B0D12] border-b border-[#252B36] flex items-center justify-between px-4 select-none z-40 relative">
      {/* Left side: Brand Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3 w-auto sm:w-48 md:w-56 flex-shrink-0">
        <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-[#F5F7FA]">
          <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-pulse"></span>
          <span className="uppercase text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F5F7FA] to-[#929BAA]">
            PulseChat
          </span>
        </div>
      </div>

      {/* Center: Real-time Live Search Input (FIXED: Never blanks out, live inline dropdown) */}
      <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 sm:mx-4 relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={t('search_placeholder')}
            className="w-full h-8 bg-[#12151C] hover:bg-[#181C25] focus:bg-[#181C25] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg pl-9 pr-14 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none transition-all shadow-sm"
          />

          {searchInput ? (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-2 text-[#929BAA] hover:text-[#F5F7FA]"
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
              <kbd className="text-[10px] bg-[#181C25] border border-[#252B36] px-1.5 py-0.5 rounded text-[#929BAA] font-mono">
                Ctrl
              </kbd>
              <kbd className="text-[10px] bg-[#181C25] border border-[#252B36] px-1.5 py-0.5 rounded text-[#929BAA] font-mono">
                K
              </kbd>
            </div>
          )}
        </div>

        {/* Live Search Results Dropdown (Opens on Ctrl+K or Focus) */}
        {searchFocused && (
          <div className="absolute top-10 inset-x-0 bg-[#181C25] border border-[#252B36] rounded-xl shadow-modal z-50 overflow-hidden animate-slide-down max-h-96 flex flex-col">
            {searchInput.trim().length > 0 ? (
              <>
                {/* Filter pills */}
                <div className="px-3 py-2 border-b border-[#252B36] bg-[#12151C]/70 flex items-center space-x-1.5 text-xs overflow-x-auto">
                  {[
                    { id: 'all', label: `All (${totalResultsCount})` },
                { id: 'channels', label: `Channels (${searchResults.channels.length})` },
                { id: 'people', label: `People (${searchResults.users.length})` },
                { id: 'messages', label: `Messages (${searchResults.messages.length})` },
                { id: 'files', label: `Files (${searchResults.files.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
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

            {/* Results scroll area */}
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
                            setSearchFocused(false);
                            setSearchInput('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#12151C] cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {ch.isPrivate ? <Lock className="w-3.5 h-3.5 text-[#929BAA]" /> : <Hash className="w-3.5 h-3.5 text-[#4F8CFF]" />}
                            <span className="font-semibold text-[#F5F7FA]">#{ch.name}</span>
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
                            setSearchFocused(false);
                            setSearchInput('');
                            addToast(`Opened member profile for ${u.name}`, 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-lg hover:bg-[#12151C] cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <img src={u.avatar} alt="" className="w-5 h-5 rounded-md object-cover" />
                            <span className="font-semibold text-[#F5F7FA]">{u.name}</span>
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
                      {searchResults.messages.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setActiveView({ type: m.conversationType, id: m.conversationId });
                            setSearchFocused(false);
                            setSearchInput('');
                            addToast('Jumped to message', 'info');
                          }}
                          className="px-2.5 py-2 rounded-lg hover:bg-[#12151C] cursor-pointer space-y-0.5"
                        >
                          <div className="text-[11px] text-[#4F8CFF] font-medium">In #{m.conversationId}</div>
                          <div className="text-xs text-[#F5F7FA] line-clamp-1">{m.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            </>
            ) : (
              /* Quick Suggestions & Recent Jump list when opened via Ctrl+K or click */
              <div className="p-3 space-y-3 overflow-y-auto max-h-80 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#929BAA] px-1 pb-1 border-b border-[#252B36]">
                  <span className="font-semibold text-[#F5F7FA]">Quick Search & Jump</span>
                  <span className="font-mono text-[10px] bg-[#12151C] px-1.5 py-0.5 rounded border border-[#252B36]">ESC to close</span>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
                    Channels
                  </div>
                  {channels.filter((c) => c.workspaceId === activeWorkspace.id).slice(0, 4).map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setActiveView({ type: 'channel', id: ch.id });
                        setSearchFocused(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-[#12151C] cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isPrivate ? <Lock className="w-3.5 h-3.5 text-[#929BAA]" /> : <Hash className="w-3.5 h-3.5 text-[#4F8CFF]" />}
                        <span className="font-semibold text-[#F5F7FA]">#{ch.name}</span>
                        <span className="text-[11px] text-[#929BAA] truncate max-w-xs">{ch.topic}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#929BAA] opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider px-2 py-1">
                    Teammates
                  </div>
                  {users.slice(0, 3).map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSearchFocused(false);
                        addToast(`Jumped to ${u.name}`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-[#12151C] cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <img src={u.avatar} alt="" className="w-5 h-5 rounded-md object-cover" />
                        <span className="font-semibold text-[#F5F7FA]">{u.name}</span>
                        <span className="text-[11px] text-[#929BAA]">@{u.username}</span>
                      </div>
                      <span className="text-[10px] text-[#32C48D]">{u.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-2 relative">
        {/* Supabase Cloud Database Status Button */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
            isSupabaseConfigured
              ? 'bg-[#10B981]/15 hover:bg-[#10B981]/25 border-[#10B981]/30 text-[#34D399]'
              : 'bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border-[#F59E0B]/30 text-[#FBBF24]'
          }`}
          title="Supabase Database Connection & Storage"
        >
          <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`} />
          <span className="hidden md:inline">{isSupabaseConfigured ? 'Supabase' : 'Connect DB'}</span>
        </button>

        {/* Google Meet Trigger Button */}
        <button
          onClick={startGoogleMeet}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/30 text-[#32C48D] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          title="Start Google Meet"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('meet')}</span>
        </button>

        {/* Real-time Notification Icon in Top Right Corner */}
        <div className="relative">
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className={`p-1.5 rounded-lg border transition-colors relative flex items-center justify-center cursor-pointer ${
              notifMenuOpen
                ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] border-[#4F8CFF]'
                : 'bg-[#12151C] text-[#929BAA] hover:text-[#F5F7FA] border-[#252B36] hover:bg-[#181C25]'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#F05D6C] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#0B0D12]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Real-time Notifications Flyout Dropdown */}
          {notifMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent cursor-pointer" 
                onClick={() => setNotifMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal z-50 overflow-hidden animate-slide-down">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#252B36] flex items-center justify-between bg-[#12151C]/60">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#4F8CFF]" />
                    <span className="text-xs font-bold text-[#F5F7FA]">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="text-[10px] bg-[#4F8CFF]/20 text-[#4F8CFF] font-semibold px-1.5 py-0.5 rounded-full">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-[#929BAA] hover:text-[#F05D6C] flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Clear all notifications"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>

                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-[#252B36]/40">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#929BAA]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          removeNotification(n.id);
                          if (n.targetType && n.targetId) {
                            setActiveView({ type: n.targetType, id: n.targetId });
                          }
                          setNotifMenuOpen(false);
                        }}
                        className="p-3 hover:bg-[#12151C] cursor-pointer transition-colors flex items-start space-x-3 group/notif"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#F5F7FA] truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-[#929BAA] font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#929BAA] mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="opacity-0 group-hover/notif:opacity-100 p-1 hover:bg-[#252B36] rounded text-[#929BAA] hover:text-[#F05D6C] transition-opacity flex-shrink-0 cursor-pointer"
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
      </div>
    </header>
  );
};
