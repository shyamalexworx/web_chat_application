import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Search, Hash, Lock, Users, Plus, Check } from 'lucide-react';

export const BrowseChannelsModal: React.FC = () => {
  const {
    isBrowseChannelsOpen,
    setIsBrowseChannelsOpen,
    channels,
    activeWorkspace,
    currentUser,
    setActiveView,
    updateChannelDetails,
    setIsCreateChannelOpen,
    addToast,
  } = useChat();

  const [query, setQuery] = useState('');

  if (!isBrowseChannelsOpen) return null;

  const workspaceChannels = (channels || []).filter((c) => c && c.workspaceId === (activeWorkspace?.id || ''));
  const filtered = workspaceChannels.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.topic || '').toLowerCase().includes(query.toLowerCase())
  );

  const handleJoinOrJump = (channelId: string) => {
    const channel = (channels || []).find((c) => c && c.id === channelId);
    if (channel) {
      const currentMembers = Array.isArray(channel.memberIds) ? channel.memberIds : [];
      if (!currentMembers.includes(currentUser?.id)) {
        updateChannelDetails(channelId, {
          memberIds: [...currentMembers, currentUser?.id || 'guest'],
        });
        addToast(`Joined #${channel.name}`, 'success');
      }
    }
    setActiveView({ type: 'channel', id: channelId });
    setIsBrowseChannelsOpen(false);
  };

  return (
    <div 
      onClick={() => setIsBrowseChannelsOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#F5F7FA]">All Channels</h2>
            <p className="text-[11px] text-[#929BAA]">
              Explore channels in {activeWorkspace.name} and join discussions.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsBrowseChannelsOpen(false);
                setIsCreateChannelOpen(true);
              }}
              className="px-3 py-1.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Channel</span>
            </button>
            <button
              onClick={() => setIsBrowseChannelsOpen(false)}
              className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#252B36] bg-[#12151C]/60">
          <div className="relative">
            <Search className="w-4 h-4 text-[#929BAA] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by channel name, description, or topic..."
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#252B36]/50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#929BAA]">
              No channels matched "{query}".
            </div>
          ) : (
            filtered.map((ch) => {
              const chMembers = Array.isArray(ch.memberIds) ? ch.memberIds : [];
              const isMember = chMembers.includes(currentUser?.id);
              return (
                <div
                  key={ch.id}
                  className="py-3.5 first:pt-0 flex items-center justify-between hover:bg-[#12151C]/40 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-1 truncate pr-4">
                    <div className="flex items-center space-x-2">
                      {ch.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 text-[#929BAA]" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-[#929BAA]" />
                      )}
                      <span className="text-xs font-semibold text-[#F5F7FA]">{ch.name}</span>
                      {isMember && (
                        <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Joined
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#929BAA] truncate max-w-md">
                      {ch.topic || ch.description}
                    </p>
                    <div className="text-[10px] text-[#636D7E] flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3" /> {chMembers.length} members
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinOrJump(ch.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                      isMember
                        ? 'bg-[#181C25] hover:bg-[#252B36] text-[#F5F7FA] border border-[#252B36]'
                        : 'bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white shadow-sm'
                    }`}
                  >
                    {isMember ? 'Open Channel' : 'Join Channel'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

