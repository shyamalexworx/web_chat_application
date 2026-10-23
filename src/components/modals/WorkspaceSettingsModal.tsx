import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Settings,
  Link,
  Copy,
  Trash2,
  Check,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';
import { resolveUserAvatar } from '../../utils/avatar';
import { uploadChatMedia, isSupabaseConfigured } from '../../lib/supabase';
import { translateText } from '../../utils/translation';

export const WorkspaceSettingsModal: React.FC = () => {
  const {
    isWorkspaceSettingsOpen,
    setIsWorkspaceSettingsOpen,
    activeWorkspace,
    updateWorkspace,
    deleteWorkspace,
    users,
    currentUser,
    isUserBlocked,
    blockUser,
    unblockUser,
    blockWorkspace,
    unblockWorkspace,
    isWorkspaceBlocked,
    selectedLanguage,
    addToast,
    t,
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

  const handleWorkspaceAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 256, 256, 0.82);
      // Immediately set local avatar so UI responds instantly
      updateWorkspace(activeWorkspace.id, { avatar: compressedDataUrl });
      addToast('Workspace profile picture updated', 'success');

      // Upload to cloud storage for a fast permanent public URL accessible to all users
      try {
        if (isSupabaseConfigured) {
          const uploaded = await uploadChatMedia(file, file.name, 'images');
          if (uploaded?.url) {
            updateWorkspace(activeWorkspace.id, { avatar: uploaded.url });
          }
        }
      } catch (cloudErr) {
        console.warn('Workspace cloud avatar notice:', cloudErr);
      }
    } catch (err) {
      addToast('Failed to process workspace image', 'error');
    }
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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[88vh] cursor-default"
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeWorkspace.avatar ? (
              <img
                src={activeWorkspace.avatar}
                alt=""
                className="w-7 h-7 rounded-lg object-cover border border-[#252B36]"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
              >
                {activeWorkspace.icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA] leading-tight">
                {translateText(activeWorkspace.name, selectedLanguage)} {t('details')}
              </h2>
              <p className="text-[10px] text-[#929BAA] leading-tight mt-0.5">
                {translateText('Manage workspace permissions, team members, and preferences.', selectedLanguage)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWorkspaceSettingsOpen(false)}
            className="p-1 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-2 md:px-4 border-b border-[#252B36] flex items-center space-x-0.5 md:space-x-1 bg-[#12151C]/60 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('general')}
            className={`whitespace-nowrap flex-shrink-0 text-[11px] md:text-xs px-2 md:px-3 py-1.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            {t('about')}
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`whitespace-nowrap flex-shrink-0 text-[11px] md:text-xs px-2 md:px-3 py-1.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-[#4F8CFF] text-[#4F8CFF]'
                : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
            }`}
          >
            {t('members_tab')} ({workspaceMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`whitespace-nowrap flex-shrink-0 text-[11px] md:text-xs px-2 md:px-3 py-1.5 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'danger'
                ? 'border-[#F05D6C] text-[#F05D6C]'
                : 'border-transparent text-[#929BAA] hover:text-[#F05D6C]'
            }`}
          >
            {translateText('Danger Zone', selectedLanguage)}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-3">
              {/* Workspace Profile Picture Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
                  {translateText('Workspace Profile Picture', selectedLanguage)}
                </label>
                <div className="flex items-center space-x-3">
                  <div className="relative group flex-shrink-0">
                    {activeWorkspace.avatar ? (
                      <img
                        src={activeWorkspace.avatar}
                        alt={translateText(activeWorkspace.name, selectedLanguage)}
                        className="w-11 h-11 rounded-xl object-cover border border-[#252B36] shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: activeWorkspace.iconBg || '#4F8CFF' }}
                      >
                        {activeWorkspace.icon}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <label className="px-2.5 py-1 bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 border border-[#4F8CFF]/30 text-[#4F8CFF] text-[11px] font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t('change_picture')}</span>
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
                          className="px-2 py-1 text-[11px] text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#12151C] rounded-lg transition-colors cursor-pointer"
                        >
                          {t('remove')}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[#929BAA]">
                      {t('image_hint')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1">
                  {t('workspace_name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F7FA] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F7FA] mb-1">
                  {t('description')}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F7FA] outline-none resize-none"
                />
              </div>

              {/* Invite Link */}
              <div className="p-2.5 bg-[#12151C] border border-[#252B36] rounded-xl space-y-1.5">
                <div className="text-[11px] font-semibold text-[#F5F7FA] flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-[#4F8CFF]" /> {translateText('Team Invite Link', selectedLanguage)}
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`https://pulsechat.app/join/${activeWorkspace.slug}`}
                    className="flex-1 bg-[#181C25] border border-[#252B36] rounded-lg px-2.5 py-1 text-xs text-[#929BAA] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="px-2.5 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-medium rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? translateText('Copied', selectedLanguage) : translateText('Copy', selectedLanguage)}</span>
                  </button>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-semibold rounded-lg shadow-accent-glow transition-all cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="text-xs text-[#929BAA] pb-2">
                {translateText('Assign administrator roles, manage member access, and monitor team presence.', selectedLanguage)}
              </div>

              {workspaceMembers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#929BAA]">
                  {translateText('No members currently in this workspace.', selectedLanguage)}
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
                            src={resolveUserAvatar(member.avatar, member.name)}
                            alt={translateText(member.name, selectedLanguage)}
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
                            {translateText(member.name, selectedLanguage)}
                            {member.id === currentUser.id && (
                              <span className="text-[10px] text-[#4F8CFF] font-medium">(you)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#929BAA] truncate">
                            {member.title ? translateText(member.title, selectedLanguage) : ''} &bull; {member.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-[#929BAA] bg-[#12151C] border border-[#252B36] px-2.5 py-1 rounded-lg capitalize">
                          {t(member.role)}
                        </span>
                        {member.id !== currentUser.id && (
                          isUserBlocked(member.id) ? (
                            <button
                              type="button"
                              onClick={() => unblockUser(member.id)}
                              className="px-2 py-1 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/40 text-[#32C48D] text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              {translateText('Unblock', selectedLanguage)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => blockUser(member.id)}
                              className="px-2 py-1 bg-[#F05D6C]/10 hover:bg-[#F05D6C]/20 border border-[#F05D6C]/30 text-[#F05D6C] text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              {translateText('Block', selectedLanguage)}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-4">
              {/* Block Workspace Option */}
              <div className="p-4 bg-[#181C25] border border-[#252B36] rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{translateText('Block Workspace Access & Notifications', selectedLanguage)}</span>
                </div>
                <p className="text-[11px] text-[#929BAA] leading-relaxed">
                  {isWorkspaceBlocked(activeWorkspace.id)
                    ? `"${translateText(activeWorkspace.name, selectedLanguage)}" ` + translateText('is currently blocked. All incoming notifications, sound chimes, and channel alerts from this workspace are silenced.', selectedLanguage)
                    : translateText('Block', selectedLanguage) + ` "${translateText(activeWorkspace.name, selectedLanguage)}" ` + translateText('to silence all incoming notifications, sound chimes, and activity alerts across all its channels and chats.', selectedLanguage)}
                </p>
                {isWorkspaceBlocked(activeWorkspace.id) ? (
                  <button
                    type="button"
                    onClick={() => unblockWorkspace(activeWorkspace.id)}
                    className="px-3 py-1.5 bg-[#32C48D]/15 hover:bg-[#32C48D]/25 border border-[#32C48D]/40 text-[#32C48D] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{translateText('Unblock Workspace', selectedLanguage)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => blockWorkspace(activeWorkspace.id)}
                    className="px-3 py-1.5 bg-[#F05D6C]/15 hover:bg-[#F05D6C]/25 border border-[#F05D6C]/40 text-[#F05D6C] text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    <span>{translateText('Block Workspace', selectedLanguage)}</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-[#F05D6C]/10 border border-[#F05D6C]/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#F05D6C]">
                  <Trash2 className="w-4 h-4" />
                  <span>{translateText('Delete Workspace', selectedLanguage)}</span>
                </div>
                <p className="text-[11px] text-[#929BAA]">
                  {translateText('Deleting this workspace removes all channels, direct messages, files, and memberships permanently.', selectedLanguage)}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to permanently delete "${activeWorkspace.name}"? This action cannot be undone.`)) {
                      try {
                        await deleteWorkspace(activeWorkspace.id);
                        setIsWorkspaceSettingsOpen(false);
                      } catch (err) {
                        addToast('Failed to delete workspace', 'error');
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-[#F05D6C] hover:bg-[#D94554] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {translateText('Delete Workspace', selectedLanguage)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

