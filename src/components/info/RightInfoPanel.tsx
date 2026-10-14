import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  PanelRight,
  Info,
  Users,
  Pin,
  FileText,
  Activity,
  Hash,
  Lock,
  UserPlus,
  Search,
  ExternalLink,
  Download,
  Calendar,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

export const RightInfoPanel: React.FC = () => {
  const {
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    activeView,
    channels,
    dms,
    users,
    currentUser,
    messages,
    togglePinMessage,
    addToast,
    t,
  } = useChat();

  const [memberSearch, setMemberSearch] = useState('');

  if (!isRightPanelOpen) return null;

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  // Gather members
  const memberIds = activeChannel
    ? activeChannel.memberIds
    : activeDM
    ? activeDM.participantIds
    : [];

  const conversationMembers = users.filter((u) => memberIds.includes(u.id));
  const filteredMembers = conversationMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.title.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Gather pinned messages
  const conversationMessages = messages.filter((m) => {
    if (m.hiddenForUserIds?.includes(currentUser.id)) return false;
    if (activeView.type === 'channel') {
      return m.conversationType === 'channel' && m.conversationId === activeView.id;
    } else {
      return m.conversationType === 'dm' && m.conversationId === activeView.id;
    }
  });

  const pinnedMessages = conversationMessages.filter((m) => m.isPinned);

  // Gather shared files
  const sharedFiles = conversationMessages
    .flatMap((m) => (m.attachments ? m.attachments : []))
    .filter(Boolean);

  const mockActivities = [
    { text: 'Elena Rostova updated channel topic', time: '2 hours ago' },
    { text: 'Marcus Chen shared realtime-architecture-v2.png', time: '4 hours ago' },
    { text: 'Alex Rivera pinned a benchmark report', time: 'Yesterday' },
    { text: 'David Kim joined the channel', time: '3 days ago' },
  ];

  return (
    <aside 
      aria-label="Channel and conversation information"
      className="max-md:fixed max-md:inset-0 max-md:top-12 max-md:w-full max-md:z-40 md:relative md:w-80 lg:w-96 bg-[#0F1117] border-l border-[#252B36] flex flex-col h-full flex-shrink-0 select-none z-20 animate-fade-in shadow-modal"
    >
      {/* Header with Title and Close Button */}
      <div className="h-14 border-b border-[#252B36] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#4F8CFF]" />
          <h2 className="text-xs font-bold text-[#F5F7FA]">
            {activeChannel ? `#${activeChannel.name}` : (t('channel_details') || 'Conversation Info')}
          </h2>
        </div>

        <button
          onClick={() => setIsRightPanelOpen(false)}
          className="p-1.5 rounded-lg border transition-colors bg-[#4F8CFF]/15 text-[#4F8CFF] border-[#4F8CFF]/40 hover:bg-[#181C25] hover:text-[#F5F7FA]"
          title="Close info panel"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs Navigator */}
      <div className="px-2 pt-1.5 border-b border-[#252B36] flex items-center space-x-0.5 bg-[#12151C]/60 text-xs overflow-x-auto select-none no-scrollbar flex-nowrap">
        <button
          onClick={() => setRightPanelTab('details')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2.5 py-2 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'details'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('details')}</span>
        </button>

        <button
          onClick={() => setRightPanelTab('members')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2.5 py-2 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'members'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('members_tab')} ({conversationMembers.length})</span>
        </button>

        <button
          onClick={() => setRightPanelTab('pinned')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2.5 py-2 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'pinned'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('pinned_tab')} ({pinnedMessages.length})</span>
        </button>

        <button
          onClick={() => setRightPanelTab('files')}
          className={`flex items-center space-x-1 whitespace-nowrap flex-shrink-0 px-2.5 py-2 border-b-2 font-medium transition-colors ${
            rightPanelTab === 'files'
              ? 'border-[#4F8CFF] text-[#4F8CFF]'
              : 'border-transparent text-[#929BAA] hover:text-[#F5F7FA]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t('files_tab')}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* DETAILS TAB */}
        {rightPanelTab === 'details' && (
          <div className="space-y-4 text-xs">
            {activeChannel ? (
              <>
                <div className="p-3 bg-[#181C25] rounded-xl border border-[#252B36] space-y-2">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Topic
                  </div>
                  <p className="text-[#F5F7FA] leading-relaxed">
                    {activeChannel.topic || 'No topic configured.'}
                  </p>
                </div>

                <div className="p-3 bg-[#181C25] rounded-xl border border-[#252B36] space-y-2">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Description
                  </div>
                  <p className="text-[#F5F7FA] leading-relaxed">
                    {activeChannel.description || 'No description provided.'}
                  </p>
                </div>

                <div className="p-3 bg-[#181C25] rounded-xl border border-[#252B36] space-y-2.5">
                  <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider">
                    Channel Metadata
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#4F8CFF]" /> Visibility
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {activeChannel.isPrivate ? 'Private Channel' : 'Public Channel'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#929BAA]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#4F8CFF]" /> Created
                    </span>
                    <span className="font-medium text-[#F5F7FA]">
                      {new Date(activeChannel.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 bg-[#181C25] rounded-xl border border-[#252B36] space-y-2">
                <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider">
                  Conversation Type
                </div>
                <p className="text-[#F5F7FA]">
                  {activeDM?.isGroup
                    ? 'Group conversation with multiple participants.'
                    : 'Direct peer-to-peer workspace conversation.'}
                </p>
              </div>
            )}

            {/* Audit log / activity */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-[#929BAA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#32C48D]" /> Recent Activity
              </div>
              <div className="space-y-2">
                {mockActivities.map((act, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[#12151C] border border-[#252B36] rounded-lg text-xs"
                  >
                    <div className="text-[#F5F7FA] font-medium">{act.text}</div>
                    <div className="text-[10px] text-[#929BAA] mt-0.5">{act.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS TAB */}
        {rightPanelTab === 'members' && (
          <div className="space-y-3">
            {/* Search members */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#929BAA] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search channel members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-[#12151C] border border-[#252B36] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none focus:border-[#4F8CFF]"
              />
            </div>

            <button
              onClick={() => addToast('Invite link copied to clipboard!', 'success')}
              className="w-full py-2 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-lg text-xs font-medium text-[#4F8CFF] flex items-center justify-center space-x-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Teammates</span>
            </button>

            <div className="divide-y divide-[#252B36]/60 space-y-1">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="pt-2 pb-2 flex items-center justify-between hover:bg-[#181C25]/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="relative flex-shrink-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-7 h-7 rounded-lg object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0F1117] ${
                          member.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                        }`}
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#F5F7FA] truncate flex items-center gap-1.5">
                        {member.name}
                        {member.id === currentUser.id && (
                          <span className="text-[10px] text-[#929BAA] font-normal">(you)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#929BAA] truncate">{member.title}</div>
                    </div>
                  </div>

                  {member.role === 'owner' && (
                    <span className="text-[10px] bg-[#4F8CFF]/20 text-[#4F8CFF] px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      Lead
                    </span>
                  )}
                  {member.role === 'admin' && (
                    <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PINNED MESSAGES TAB */}
        {rightPanelTab === 'pinned' && (
          <div className="space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#929BAA]">
                No pinned messages yet. Hover over any message to pin important information!
              </div>
            ) : (
              pinnedMessages.map((pin) => {
                const author = users.find((u) => u.id === pin.senderId);
                return (
                  <div
                    key={pin.id}
                    className="p-3 bg-[#181C25] border border-[#252B36] rounded-xl text-xs space-y-2 hover:border-[#4F8CFF]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={author?.avatar}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="font-semibold text-[#F5F7FA]">{author?.name}</span>
                      </div>
                      <button
                        onClick={() => togglePinMessage(pin.id)}
                        className="text-[#929BAA] hover:text-[#F05D6C] text-[11px] flex items-center gap-1"
                        title="Unpin"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[#F5F7FA] leading-relaxed line-clamp-3">{pin.content}</p>

                    <div className="text-[10px] text-[#929BAA] font-mono">
                      Pinned on {new Date(pin.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SHARED FILES TAB */}
        {rightPanelTab === 'files' && (
          <div className="space-y-3">
            {sharedFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#929BAA]">
                No files shared in this channel yet. Upload documents or images using the composer!
              </div>
            ) : (
              sharedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-[#181C25] border border-[#252B36] rounded-xl text-xs flex items-center justify-between hover:bg-[#1E2330] transition-colors"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="p-2 bg-[#12151C] rounded border border-[#252B36] text-[#4F8CFF] flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-[#F5F7FA] truncate">{file.name}</div>
                      <div className="text-[10px] text-[#929BAA]">{file.size}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => addToast(`Downloaded ${file.name}`, 'success')}
                    className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded transition-colors flex-shrink-0"
                    title="Download file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

