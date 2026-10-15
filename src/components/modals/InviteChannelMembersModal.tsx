import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Search, Check, UserPlus, Hash, Lock, Users, Mail, ShieldCheck } from 'lucide-react';
import { resolveUserAvatar } from '../../utils/avatar';

export const InviteChannelMembersModal: React.FC = () => {
  const {
    isInviteChannelMembersOpen,
    setIsInviteChannelMembersOpen,
    activeView,
    channels,
    users,
    invites,
    dms,
    currentUser,
    inviteUsersToChannel,
    addToast,
  } = useChat();

  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInviteChannelMembersOpen) return null;

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  if (!activeChannel) return null;

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

  // Only users who are personally connected with invitation AND not already members of this channel
  const connectedMembers = users.filter(
    (u) => u.id !== currentUser.id && connectedUserIds.has(u.id) && !activeChannel.memberIds.includes(u.id)
  );

  const filteredUsers = connectedMembers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds((prev) => prev.filter((uid) => uid !== id));
    } else {
      setSelectedUserIds((prev) => [...prev, id]);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0 && !customEmail.trim()) {
      addToast('Please select at least one coworker or enter an email.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteUsersToChannel(activeChannel.id, selectedUserIds, customEmail.trim() || undefined);
      addToast(`Invitation sent to join #${activeChannel.name}!`, 'success');
      setSelectedUserIds([]);
      setCustomEmail('');
      setSearch('');
      setIsInviteChannelMembersOpen(false);
    } catch (err: any) {
      addToast(err?.message || 'Failed to send channel invitations', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => setIsInviteChannelMembersOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#252B36] flex items-center justify-between bg-[#12151C]/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F8CFF]/15 border border-[#4F8CFF]/30 flex items-center justify-center text-[#4F8CFF]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-1.5">
                Add People to
                <span className="text-[#4F8CFF] flex items-center">
                  {activeChannel.isPrivate ? <Lock className="w-3.5 h-3.5 mr-0.5 inline" /> : <Hash className="w-3.5 h-3.5 mr-0.5 inline" />}
                  {activeChannel.name}
                </span>
              </h2>
              <p className="text-[11px] text-[#929BAA]">
                Invite teammates to collaborate in this channel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteChannelMembersOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleInviteSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Direct Email Invite Field */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#4F8CFF]" />
              <span>Invite via Email Address</span>
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="coworker@company.com"
              className="w-full h-10 bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 text-xs text-[#F5F7FA] placeholder-[#636D7E] outline-none transition-colors"
            />
          </div>

          {/* Connected Members Selection (Only shown when user is connected to them personally with invitation) */}
          {connectedMembers.length > 0 ? (
            <>
              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#252B36]" />
                </div>
                <div className="relative bg-[#181C25] px-3 text-[10px] font-semibold text-[#929BAA] tracking-wider uppercase">
                  Or select from connected team members
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search connected teammates by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F7FA] placeholder-[#636D7E] outline-none transition-colors"
                />
              </div>

              {/* User List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-[#252B36]/40">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#929BAA]">
                    No matching connected teammates found.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleSelectUser(user.id)}
                        className={`pt-2 pb-2 px-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#4F8CFF]/15 border border-[#4F8CFF]/30'
                            : 'hover:bg-[#12151C]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={resolveUserAvatar(user.avatar, user.name)}
                            alt={user.name}
                            className="w-8 h-8 rounded-lg object-cover border border-[#252B36]"
                          />
                          <div className="truncate">
                            <div className="text-xs font-semibold text-[#F5F7FA] truncate">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-[#929BAA] truncate">
                              @{user.username} &bull; {user.email}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-[#4F8CFF] border-[#4F8CFF] text-white'
                              : 'border-[#252B36] bg-[#12151C]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="p-3.5 bg-[#12151C]/60 border border-[#252B36] rounded-xl text-center space-y-1.5">
              <div className="w-7 h-7 mx-auto rounded-lg bg-[#4F8CFF]/15 text-[#4F8CFF] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#F5F7FA]">Private & Verified Invitations</p>
              <p className="text-[11px] text-[#929BAA] leading-relaxed max-w-xs mx-auto">
                Coworkers only appear here once you are connected with them personally via an accepted chat invitation. Enter their email address above to invite them to this channel!
              </p>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-[#252B36] flex items-center justify-between">
            <span className="text-[11px] text-[#929BAA]">
              {selectedUserIds.length} coworker{selectedUserIds.length === 1 ? '' : 's'} selected
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsInviteChannelMembersOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-[#12151C] hover:bg-[#252B36] text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (selectedUserIds.length === 0 && !customEmail.trim())}
                className={`px-4 py-2 rounded-xl bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-semibold transition-all shadow-accent-glow cursor-pointer ${
                  isSubmitting || (selectedUserIds.length === 0 && !customEmail.trim())
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitations'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

