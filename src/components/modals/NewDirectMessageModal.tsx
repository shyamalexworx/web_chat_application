import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Search, Check, Users, User, ArrowRight, Send } from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';

export const NewDirectMessageModal: React.FC = () => {
  const {
    isNewDMOpen,
    setIsNewDMOpen,
    users,
    currentUser,
    createOrOpenDM,
  } = useChat();

  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  if (!isNewDMOpen) return null;

  const eligibleUsers = users.filter((u) => u.id !== currentUser.id);
  const filteredUsers = eligibleUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds((prev) => prev.filter((uid) => uid !== id));
    } else {
      setSelectedUserIds((prev) => [...prev, id]);
    }
  };

  const handleStart = () => {
    if (selectedUserIds.length === 0) return;
    createOrOpenDM(selectedUserIds, groupName.trim() || undefined);
    setSelectedUserIds([]);
    setGroupName('');
    setSearch('');
    setIsNewDMOpen(false);
  };

  return (
    <div 
      onClick={() => setIsNewDMOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#F5F7FA]">Direct Messages & Invites</h2>
            <p className="text-[11px] text-[#929BAA]">
              Send a chat invite to a coworker or select multiple people for a group chat.
            </p>
          </div>

          <button
            onClick={() => setIsNewDMOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Pills Area */}
        <div className="p-3 border-b border-[#252B36] bg-[#12151C]/60 space-y-2">
          {selectedUserIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUserIds.map((id) => {
                const u = users.find((user) => user.id === id);
                if (!u) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center space-x-1.5 bg-[#4F8CFF]/20 border border-[#4F8CFF]/40 text-[#4F8CFF] px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    <img src={resolveUserAvatar(u.avatar, u.name)} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    <span>{u.name}</span>
                    <button
                      onClick={() => toggleSelectUser(id)}
                      className="hover:text-white ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Group Name input if multi-select */}
          {selectedUserIds.length > 1 && (
            <div className="pt-1">
              <input
                type="text"
                placeholder="Give this group a name (e.g. Mobile Core Sprint)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-[#181C25] border border-[#252B36] rounded-lg px-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none focus:border-[#4F8CFF]"
              />
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coworkers by name or title..."
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-[#252B36]/50">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#929BAA]">
              No coworkers matched "{search}".
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => toggleSelectUser(u.id)}
                  className={`py-2.5 px-3 flex items-center justify-between rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#4F8CFF]/10' : 'hover:bg-[#12151C]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="relative flex-shrink-0">
                      <img
                        src={resolveUserAvatar(u.avatar, u.name)}
                        alt={u.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1117] ${
                          u.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                        }`}
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#F5F7FA]">{u.name}</div>
                      <div className="text-[11px] text-[#929BAA] truncate">
                        {u.title} &bull; @{u.username}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#4F8CFF] border-[#4F8CFF] text-white'
                        : 'border-[#252B36] bg-[#181C25]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#252B36] flex items-center justify-between">
          <div className="text-xs text-[#929BAA]">
            {selectedUserIds.length === 0
              ? 'Select 1 or more participants'
              : `${selectedUserIds.length} participant${selectedUserIds.length > 1 ? 's' : ''} selected`}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsNewDMOpen(false)}
              className="px-4 py-2 bg-[#12151C] hover:bg-[#252B36] text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] rounded-xl border border-[#252B36] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={selectedUserIds.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                selectedUserIds.length > 0
                  ? 'bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white shadow-accent-glow cursor-pointer'
                  : 'bg-[#12151C] text-[#929BAA]/50 cursor-not-allowed'
              }`}
            >
              <span>{selectedUserIds.length > 1 ? 'Start Group Discussion' : 'Send Chat Invite'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

