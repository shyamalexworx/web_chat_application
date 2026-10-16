import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Search,
  Hash,
  Lock,
  User,
  MessageSquare,
  FileText,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    messages,
    channels,
    users,
    activeWorkspace,
    setActiveView,
    addToast,
  } = useChat();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'messages' | 'channels' | 'people' | 'files'>('all');

  const results = useMemo(() => {
    if (!query.trim()) return { channels: [], users: [], messages: [], files: [] };

    const q = query.toLowerCase();

    // Matching channels
    const matchingChannels = channels
      .filter((c) => c.workspaceId === activeWorkspace.id)
      .filter((c) => c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q));

    // Matching users
    const matchingUsers = users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
    );

    // Matching messages
    const matchingMessages = messages.filter((m) =>
      m.content.toLowerCase().includes(q)
    );

    // Matching files
    const matchingFiles = messages
      .flatMap((m) => (m.attachments ? m.attachments : []))
      .filter((att) => att.name.toLowerCase().includes(q));

    return {
      channels: matchingChannels,
      users: matchingUsers,
      messages: matchingMessages,
      files: matchingFiles,
    };
  }, [query, channels, users, messages, activeWorkspace]);

  const totalResultsCount =
    results.channels.length +
    results.users.length +
    results.messages.length +
    results.files.length;

  const handleSelectChannel = (id: string) => {
    setActiveView({ type: 'channel', id });
    setIsGlobalSearchOpen(false);
  };

  const handleSelectMessage = (m: (typeof messages)[0]) => {
    setActiveView({ type: m.conversationType, id: m.conversationId });
    setIsGlobalSearchOpen(false);
    addToast('Jumped to message in conversation', 'info');
  };

  if (!isGlobalSearchOpen) return null;

  return (
    <div 
      onClick={() => setIsGlobalSearchOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-16 p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[80vh] cursor-default"
      >
        {/* Search Header */}
        <div className="p-4 border-b border-[#252B36] flex items-center space-x-3 bg-[#12151C]/60">
          <Search className="w-5 h-5 text-[#4F8CFF] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything: messages, channels, team members, or files..."
            className="flex-1 bg-transparent text-sm text-[#F5F7FA] placeholder-[#929BAA] outline-none"
            autoFocus
          />
          <kbd className="text-[10px] bg-[#181C25] border border-[#252B36] px-2 py-1 rounded text-[#929BAA] font-mono">
            ESC
          </kbd>
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills Strip */}
        <div className="px-4 py-2 border-b border-[#252B36] flex items-center space-x-1 text-xs bg-[#12151C]/30 overflow-x-auto">
          {[
            { id: 'all', label: `All Results (${totalResultsCount})` },
            { id: 'channels', label: `Channels (${results.channels.length})` },
            { id: 'messages', label: `Messages (${results.messages.length})` },
            { id: 'people', label: `People (${results.users.length})` },
            { id: 'files', label: `Files (${results.files.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-[#4F8CFF] text-white shadow-sm'
                  : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-12 text-center text-xs text-[#929BAA] space-y-2">
              <Search className="w-8 h-8 text-[#929BAA]/40 mx-auto" />
              <p>Type keywords to search across channels, direct messages, files, and members.</p>
              <div className="flex items-center justify-center space-x-2 pt-2">
                <span className="text-[11px] bg-[#12151C] border border-[#252B36] px-2 py-1 rounded text-[#929BAA]">
                  Pro tip: search "WebSocket" or "@elena"
                </span>
              </div>
            </div>
          ) : totalResultsCount === 0 ? (
            <div className="py-12 text-center text-xs text-[#929BAA]">
              No results found matching "{query}".
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-[#252B36]/60">
              {/* Channels Results */}
              {(filterType === 'all' || filterType === 'channels') && results.channels.length > 0 && (
                <div className="pt-2 first:pt-0">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider mb-2">
                    Channels
                  </div>
                  <div className="space-y-1">
                    {results.channels.map((ch) => (
                      <div
                        key={ch.id}
                        onClick={() => handleSelectChannel(ch.id)}
                        className="p-2.5 hover:bg-[#12151C] rounded-xl cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          {ch.isPrivate ? (
                            <Lock className="w-4 h-4 text-[#929BAA]" />
                          ) : (
                            <Hash className="w-4 h-4 text-[#4F8CFF]" />
                          )}
                          <div className="truncate">
                            <span className="text-xs font-semibold text-[#F5F7FA]">#{ch.name}</span>
                            <span className="text-[11px] text-[#929BAA] ml-2 truncate">
                              {ch.topic}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#929BAA] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* People Results */}
              {(filterType === 'all' || filterType === 'people') && results.users.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider mb-2">
                    Team Members
                  </div>
                  <div className="space-y-1">
                    {results.users.map((u) => (
                      <div
                        key={u.id}
                        className="p-2.5 hover:bg-[#12151C] rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={u.avatar}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div>
                            <div className="text-xs font-semibold text-[#F5F7FA]">{u.name}</div>
                            <div className="text-[11px] text-[#929BAA]">
                              {u.title} &bull; @{u.username}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#32C48D] bg-[#32C48D]/15 px-2 py-0.5 rounded-full font-medium">
                          {u.isOnline ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Results */}
              {(filterType === 'all' || filterType === 'messages') && results.messages.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider mb-2">
                    Messages
                  </div>
                  <div className="space-y-2">
                    {results.messages.map((m) => {
                      const author = users.find((u) => u.id === m.senderId);
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMessage(m)}
                          className="p-3 bg-[#12151C]/60 hover:bg-[#12151C] border border-[#252B36] rounded-xl cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <img
                                src={author?.avatar}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span className="text-xs font-semibold text-[#F5F7FA]">
                                {author?.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#929BAA] font-mono">
                              {new Date(m.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#F5F7FA] line-clamp-2 leading-relaxed">
                            {m.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files Results */}
              {(filterType === 'all' || filterType === 'files') && results.files.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider mb-2">
                    Files
                  </div>
                  <div className="space-y-1">
                    {results.files.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 bg-[#12151C]/60 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <FileText className="w-4 h-4 text-[#4F8CFF]" />
                          <span className="text-xs font-medium text-[#F5F7FA] truncate">
                            {file.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#929BAA] font-mono">{file.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

