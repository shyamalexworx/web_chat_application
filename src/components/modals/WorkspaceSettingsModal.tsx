import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Settings,
  Users,
  Shield,
  Link,
  Copy,
  Trash2,
  Check,
  Building2,
  Upload,
} from 'lucide-react';

export const WorkspaceSettingsModal: React.FC = () => {
  const {
    isWorkspaceSettingsOpen,
    setIsWorkspaceSettingsOpen,
    activeWorkspace,
    updateWorkspace,
    users,
    currentUser,
    addToast,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [name, setName] = useState(activeWorkspace.name);
  const [description, setDescription] = useState(activeWorkspace.description);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isWorkspaceSettingsOpen) return null;

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace(activeWorkspace.id, { name, description });
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(`https://pulsechat.app/join/${activeWorkspace.slug}`);
    setCopiedLink(true);
    addToast('Invite link copied to clipboard', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWorkspaceAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be less than 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateWorkspace(activeWorkspace.id, { avatar: dataUrl });
        addToast('Workspace profile picture updated', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const workspaceMembers = users.filter((u) => {
    if (activeWorkspace.memberIds && activeWorkspace.memberIds.length > 0) {
      return activeWorkspace.memberIds.includes(u.id);
    }
    return u.id === activeWorkspace.ownerId || u.id === currentUser.id;
  });

  return (
    <div 
      onClick={() => setIsWorkspaceSettingsOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {activeWorkspace.avatar ? (
              <img
                src={activeWorkspace.avatar}
                alt=""
                className="w-8 h-8 rounded-xl object-cover border border-[#252B36]"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
              >
                {activeWorkspace.icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">{activeWorkspace.name} Settings</h2>
              <p className="text-[11px] text-[#929BAA]">
                Manage workspace permissions, team members, and enterprise preferences.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWorkspaceSettingsOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 pt-2 border-b border-[#252B36] flex items-center space-x-2 bg-[#12151C]/60 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'general'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            Members & Roles ({workspaceMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'danger'
                ? 'border-[#F05D6C] text-[#F05D6C]'
                : 'border-transparent text-[#929BAA] hover:text-[#F05D6C]'
            }`}
          >
            Data & Danger Zone
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              {/* Workspace Profile Picture Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-2">
                  Workspace Profile Picture
                </label>
                <div className="flex items-center space-x-3.5">
                  <div className="relative group flex-shrink-0">
                    {activeWorkspace.avatar ? (
                      <img
                        src={activeWorkspace.avatar}
                        alt={activeWorkspace.name}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#252B36] shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
                      >
                        {activeWorkspace.icon}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <label className="px-3 py-1.5 bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 border border-[#4F8CFF]/30 text-[#4F8CFF] text-xs font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Workspace Picture</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleWorkspaceAvatarChange}
                        />
                      </label>
                      {activeWorkspace.avatar && (
                        <button
                          type="button"
                          onClick={() => updateWorkspace(activeWorkspace.id, { avatar: undefined })}
                          className="px-2.5 py-1.5 text-xs text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#12151C] rounded-lg transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#929BAA]">
                      Recommended: square image, PNG or JPG, max 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                  Workspace Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] outline-none resize-none"
                />
              </div>

              {/* Invite Link */}
              <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2">
                <div className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-[#4F8CFF]" /> Team Invite Link
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://pulsechat.app/join/${activeWorkspace.slug}`}
                    className="flex-1 bg-[#181C25] border border-[#252B36] rounded-lg px-3 py-1.5 text-xs text-[#929BAA] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-3 py-1.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-semibold rounded-xl shadow-accent-glow transition-all"
                >
                  Save Settings
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="text-xs text-[#929BAA] pb-2">
                Assign administrator roles, manage member access, and monitor team presence.
              </div>

              {workspaceMembers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#929BAA]">
                  No members currently in this workspace.
                </div>
              ) : (
                <div className="divide-y divide-[#252B36]/50">
                  {workspaceMembers.map((member) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between hover:bg-[#12151C]/40 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="relative">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1117] ${
                              member.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                            }`}
                          />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                            {member.name}
                            {member.id === currentUser.id && (
                              <span className="text-[10px] text-[#4F8CFF] font-medium">(you)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#929BAA] truncate">
                            {member.title} &bull; {member.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-[#929BAA] bg-[#12151C] border border-[#252B36] px-2.5 py-1 rounded-lg capitalize">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F05D6C]/10 border border-[#F05D6C]/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#F05D6C]">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Workspace</span>
                </div>
                <p className="text-[11px] text-[#929BAA]">
                  Deleting this workspace removes all channels, direct messages, files, and memberships permanently.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    addToast('Workspace deletion is disabled in demo mode', 'warning');
                  }}
                  className="px-3 py-1.5 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

