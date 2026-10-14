import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Users,
  Sparkles,
} from 'lucide-react';

export const GoogleMeetModal: React.FC = () => {
  const {
    isGoogleMeetOpen,
    setIsGoogleMeetOpen,
    activeView,
    channels,
    currentUser,
    sendMessage,
    addToast,
  } = useChat();

  const [copied, setCopied] = useState(false);
  const [meetingUrl] = useState(() => {
    const code = Math.random().toString(36).substring(2, 5) + '-' +
                 Math.random().toString(36).substring(2, 6) + '-' +
                 Math.random().toString(36).substring(2, 5);
    return `https://meet.google.com/${code}`;
  });

  if (!isGoogleMeetOpen) return null;

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const handleOpenMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
    addToast('Opening Google Meet in new tab...', 'success');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    addToast('Google Meet link copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToChannel = () => {
    sendMessage(`🎥 **Google Meet Session Started**\nJoin the live video call: ${meetingUrl}\nStarted by @${currentUser.username}`);
    addToast(`Shared Google Meet link to #${activeChannel?.name || 'chat'}`, 'success');
    setIsGoogleMeetOpen(false);
  };

  return (
    <div 
      onClick={() => setIsGoogleMeetOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#32C48D]/15 rounded-lg border border-[#32C48D]/30 text-[#32C48D]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Google Meet Integration</h2>
              <p className="text-[11px] text-[#929BAA]">
                Instant real-time video conference for #{activeChannel?.name || 'workspace'}.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsGoogleMeetOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-[#929BAA]">
              <span className="font-medium text-[#F5F7FA]">Generated Meeting Room</span>
              <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] px-2 py-0.5 rounded-full font-bold">
                READY
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="flex-1 bg-[#181C25] border border-[#252B36] rounded-lg px-3 py-2 text-xs text-[#4F8CFF] font-mono outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-lg text-[#F5F7FA] flex items-center space-x-1 transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#32C48D]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleOpenMeet}
              className="w-full py-2.5 bg-[#32C48D] hover:bg-[#2BB27F] text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-accent-glow transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Launch Google Meet (New Tab)</span>
            </button>

            <button
              onClick={handleShareToChannel}
              className="w-full py-2.5 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Post Meet Link to Channel</span>
            </button>
          </div>

          <p className="text-[11px] text-[#929BAA] text-center pt-1">
            Google Meet opens securely with camera, screen share, and enterprise audio encryption.
          </p>
        </div>
      </div>
    </div>
  );
};

