import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Settings,
  Users,
  Shield,
  Link,
  Copy,
  RotateCcw,
  Trash2,
  Check,
  Building2,
  CreditCard,
} from 'lucide-react';

export const WorkspaceSettingsModal: React.FC = () => {
  const {
    isWorkspaceSettingsOpen,
    setIsWorkspaceSettingsOpen,
    activeWorkspace,
    updateWorkspace,
    users,
    currentUser,
    resetToDemoData,
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
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
            >
              {activeWorkspace.icon}
            </div>
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
            General & Plan
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            Members & Roles ({users.length})
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

              {/* Plan Card */}
              <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#4F8CFF]" />
                    <span className="text-xs font-semibold text-[#F5F7FA]">Enterprise Grid Plan</span>
                  </div>
                  <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-[#929BAA]">
                  Includes unlimited message history, sub-15ms WebSocket routing, audit trails, and 99.99% uptime SLA.
                </p>
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

              <div className="divide-y divide-[#252B36]/50">
                {users.map((member) => (
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
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#F5F7FA]">
                  <RotateCcw className="w-4 h-4 text-[#4F8CFF]" />
                  <span>Reset Demo Workspace Data</span>
                </div>
                <p className="text-[11px] text-[#929BAA]">
                  Restore the default sample team messages, channels, attachments, and demo accounts.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetToDemoData();
                    setIsWorkspaceSettingsOpen(false);
                  }}
                  className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-xs font-medium text-[#F5F7FA] rounded-lg transition-colors"
                >
                  Reset to Default Demo State
                </button>
              </div>

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
                  className="px-3 py-1.5 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-medium rounded-lg transition-colors"
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

