import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Hash, Lock, Globe, UserPlus, Check, Search, Mail } from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';

export const CreateChannelModal: React.FC = () => {
  const {
    isCreateChannelOpen,
    setIsCreateChannelOpen,
    createChannel,
    channels,
    activeWorkspace,
    users,
    invites,
    dms,
    currentUser,
    inviteUsersToChannel,
    addToast,
  } = useChat();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');

  // Determine who the current user is personally connected to via an accepted invitation
  const connectedUserIds = useMemo(() => {
    const ids = new Set<string>();
    invites.forEach((inv) => {
      if (inv.status === 'accepted') {
        if (inv.senderId === currentUser.id && inv.receiverId) {
          ids.add(inv.receiverId);
        }
        if (
          (inv.receiverId === currentUser.id ||
            (currentUser.email && inv.receiverId.toLowerCase() === currentUser.email.toLowerCase())) &&
          inv.senderId
        ) {
          ids.add(inv.senderId);
        }
      }
    });

    dms.forEach((d) => {
      if (d.participantIds.includes(currentUser.id) && d.status !== 'pending') {
        d.participantIds.forEach((pid) => {
          if (pid !== currentUser.id) ids.add(pid);
        });
      }
    });

    return ids;
  }, [invites, dms, currentUser.id, currentUser.email]);

  const connectedMembers = users.filter(
    (u) => u.id !== currentUser.id && connectedUserIds.has(u.id)
  );

  const filteredMembers = connectedMembers.filter(
    (u) =>
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds((prev) => prev.filter((uid) => uid !== id));
    } else {
      setSelectedUserIds((prev) => [...prev, id]);
    }
  };

  if (!isCreateChannelOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
    if (!cleanName) {
      setError('Please provide a channel name.');
      return;
    }
    const alreadyExists = (channels || []).some(
      (c) => c && c.workspaceId === activeWorkspace?.id && (c.name || '').toLowerCase() === cleanName
    );
    if (alreadyExists) {
      setError(`A channel named #${cleanName} already exists in this workspace.`);
      return;
    }
    const created = createChannel(cleanName, topic, description, isPrivate, selectedUserIds);

    if (inviteEmail.trim()) {
      inviteUsersToChannel(created.id, [], inviteEmail.trim()).catch(() => {});
    }

    setName('');
    setTopic('');
    setDescription('');
    setIsPrivate(false);
    setSelectedUserIds([]);
    setMemberSearch('');
    setInviteEmail('');
    setError('');
    setIsCreateChannelOpen(false);
  };

  return (
    <div 
      onClick={() => setIsCreateChannelOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden max-h-[88vh] flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#252B36] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#12151C] rounded-lg border border-[#252B36] text-[#4F8CFF]">
              {isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Create a Channel</h2>
              <p className="text-[11px] text-[#929BAA]">
                Channels are where team discussions happen around projects and topics.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateChannelOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#929BAA]">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  setError('');
                }}
                placeholder="e.g. mobile-release, sprint-planning"
                className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-8 pr-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Topic <span className="text-[#929BAA] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Description <span className="text-[#929BAA] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context or guidelines for this channel"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none resize-none"
            />
          </div>

          {/* ADD PEOPLE SECTION */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-[#4F8CFF]" />
              <label className="text-xs font-semibold text-[#F5F7FA]">
                Add People to Channel
              </label>
            </div>

            {/* Quick Email Invite */}
            <div>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-3" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite coworker by email (optional)..."
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
                />
              </div>
            </div>

            {/* Connected Members Checklist (Only shown if connected members exist) */}
            {connectedMembers.length > 0 ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search connected teammates..."
                    className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-[#252B36]/30 bg-[#12151C]/60 p-2 rounded-xl border border-[#252B36]">
                  {filteredMembers.length === 0 ? (
                    <div className="p-2 text-center text-xs text-[#929BAA]">
                      No matching connected teammates.
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const isSelected = selectedUserIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleSelectUser(member.id)}
                          className={`pt-1.5 pb-1.5 px-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#4F8CFF]/15 text-[#4F8CFF]' : 'hover:bg-[#181C25]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <img
                              src={resolveUserAvatar(member.avatar, member.name)}
                              alt={member.name}
                              className="w-6 h-6 rounded-md object-cover border border-[#252B36]"
                            />
                            <div className="truncate">
                              <span className="text-xs font-medium text-[#F5F7FA] block truncate">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-[#929BAA] block truncate">
                                @{member.username}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? 'bg-[#4F8CFF] border-[#4F8CFF] text-white' : 'border-[#252B36] bg-[#12151C]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-[#929BAA]">
                  {selectedUserIds.length} connected teammate{selectedUserIds.length === 1 ? '' : 's'} selected to join
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-[#929BAA] bg-[#12151C]/40 p-2.5 rounded-xl border border-[#252B36]">
                Only personally connected teammates can be added directly. Use the email field above to invite new coworkers!
              </p>
            )}
          </div>

          {/* Privacy Toggle */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-3 bg-[#12151C] border border-[#252B36] rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-[#181C25] text-[#4F8CFF] mt-0.5">
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#F5F7FA]">
                    Make Private Channel
                  </div>
                  <div className="text-[11px] text-[#929BAA]">
                    {isPrivate
                      ? 'Only invited members can view and access this channel.'
                      : 'Anyone in your workspace can view and join this channel.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isPrivate ? 'bg-[#4F8CFF]' : 'bg-[#252B36]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#252B36]">
            <button
              type="button"
              onClick={() => setIsCreateChannelOpen(false)}
              className="px-4 py-2 bg-[#12151C] hover:bg-[#252B36] text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] rounded-xl border border-[#252B36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-xs font-semibold text-white rounded-xl shadow-accent-glow transition-all"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

