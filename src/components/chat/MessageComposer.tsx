import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import type { Attachment } from '../../types';
import {
  Paperclip,
  Smile,
  Send,
  Mic,
  X,
  Trash2,
  Image as ImageIcon,
  Video,
  Clock,
  Mail,
} from 'lucide-react';
import { globalVoiceRecorder } from '../../utils/audioRecorder';
import { uploadChatMedia, isSupabaseConfigured } from '../../lib/supabase';

const EMOJI_CATEGORIES = [
  { name: 'Frequently Used', emojis: ['👍', '❤️', '🔥', '🚀', '👀', '🎉', '👏', '💯', '✨'] },
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😎', '🤓', '🥳'] },
  { name: 'Work & Tech', emojis: ['💻', '⚡', '⚙️', '📊', '📈', '🛠️', '🔒', '🔑', '💡', '📝', '📌', '☕', '🧠', '🌐', '🎯'] },
  { name: 'Hands & Gestures', emojis: ['👋', '🙌', '🤝', '✌️', '🤞', '🤙', '✊', '👊', '🫡', '🙏', '💪', '👆', '👇'] },
];

export const MessageComposer: React.FC = () => {
  const {
    activeView,
    channels,
    dms,
    users,
    currentUser,
    activeWorkspace,
    invites,
    acceptInvite,
    declineInvite,
    sendMessage,
    typingUsers,
    addToast,
    t,
  } = useChat();

  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  const activeDM = activeView.type === 'dm'
    ? dms.find((d) => d.id === activeView.id)
    : null;

  // Fallback to active workspace channel so composer NEVER vanishes during transitions or on mobile
  const currentChannel = activeChannel || (!activeDM ? (channels.find((c) => c.workspaceId === activeWorkspace?.id) || channels[0] || null) : null);

  const dmPartner = activeDM && !activeDM.isGroup
    ? users.find((u) => u.id === (activeDM.participantIds.find((id) => id !== currentUser.id) || activeDM.participantIds[0]))
    : null;

  const placeholderText = currentChannel
    ? `${t('message')} #${currentChannel.name}`
    : activeDM
    ? `${t('message')} ${activeDM.isGroup ? activeDM.groupName : dmPartner?.name || 'chat'}`
    : t('type_message');

  // Handle send
  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    sendMessage(content, attachments);
    setContent('');
    setAttachments([]);
    setActiveFormats({});
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+B shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertFormat('**', '**', 'bold');
    }
    // Ctrl+I shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertFormat('*', '*', 'italic');
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Insert markdown helper with active toggle feedback
  const insertFormat = (before: string, after: string = '', formatKey?: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const fallback = selected || (formatKey === 'codeblock' ? 'console.log("hello");' : 'text');
    const replacement = before + fallback + (after || before);
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    if (formatKey) {
      setActiveFormats((prev) => ({ ...prev, [formatKey]: !prev[formatKey] }));
      addToast(`Applied ${formatKey} formatting`, 'info');
    }

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + (selected ? selected.length : fallback.length);
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 10);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(async (file) => {
      const isImg = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const category = isImg ? 'images' : isVideo ? 'videos' : 'documents';
      const fileType = isImg ? 'image' : isVideo ? 'video' : 'document';

      // 1. If Supabase is connected, upload to Supabase cloud storage bucket 'chat-media'
      if (isSupabaseConfigured) {
        try {
          addToast(`Uploading ${file.name} to cloud storage...`, 'info');
          const uploaded = await uploadChatMedia(file, file.name, category);
          if (uploaded) {
            setAttachments((prev) => [...prev, uploaded]);
            addToast(`Uploaded ${file.name}`, 'success');
            return;
          }
        } catch (err) {
          console.warn('Cloud upload failed, falling back to local data URL:', err);
        }
      }

      // 2. Local fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        const newAtt: Attachment = {
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: fileType,
          url: resultUrl,
          previewUrl: isImg ? resultUrl : undefined,
        };
        setAttachments((prev) => [...prev, newAtt]);
        addToast(`Attached ${file.name}`, 'info');
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const startVoiceRecording = async () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    const hasMic = await globalVoiceRecorder.start();
    if (hasMic) {
      addToast('Recording voice message... Speak into your microphone', 'info');
    } else {
      addToast('Recording voice note (synthesis engine active)', 'info');
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    globalVoiceRecorder.cancel();
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    addToast('Voice message discarded', 'info');
  };

  const sendVoiceRecording = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecordingVoice(false);

    try {
      const res = await globalVoiceRecorder.stop();
      const actualDuration = Math.max(1, recordingSeconds || res.duration || 1);
      const mins = Math.floor(actualDuration / 60);
      const secs = actualDuration % 60;
      const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      let audioUrl = res.url;
      if (isSupabaseConfigured) {
        try {
          const uploaded = await uploadChatMedia(
            res.blob,
            `voice_${Date.now()}.webm`,
            'voice'
          );
          if (uploaded) {
            audioUrl = uploaded.url;
          }
        } catch (err) {
          console.warn('Cloud voice upload failed, using local audio:', err);
        }
      }

      const voiceAtt: Attachment = {
        id: 'voice-' + Date.now(),
        name: `voice_message_${formattedDuration}.wav`,
        size: `${Math.max(12, Math.round(res.blob.size / 1024))} KB`,
        type: 'audio',
        url: audioUrl,
        duration: actualDuration,
      };

      // Send immediately like WhatsApp voice notes
      sendMessage('', [voiceAtt]);
      setRecordingSeconds(0);
      addToast('Voice note sent!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to record voice message', 'error');
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (!currentChannel && !activeDM) {
    return (
      <div className="px-3 sm:px-4 pt-1 pb-2.5 sm:pb-[11px] pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] bg-[#0B0D12] select-none flex-shrink-0 relative z-10 w-full">
        <div className="bg-[#12151C] border border-[#252B36] rounded-xl p-3 flex items-center justify-between text-xs text-[#929BAA]">
          <span>Select or join a channel to start messaging</span>
        </div>
      </div>
    );
  }

  if (activeDM && activeDM.status === 'pending') {
    const isInviter = activeDM.invitedBy === currentUser.id;
    return (
      <div className="px-4 py-3 bg-[#0B0D12] select-none flex-shrink-0 border-t border-[#252B36]/50">
        {isInviter ? (
          <div className="p-4 bg-[#12151C] border border-[#252B36] rounded-xl flex items-center space-x-3 text-xs">
            <div className="w-9 h-9 rounded-xl bg-[#F5A623]/15 text-[#F5A623] flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-[#F5F7FA] text-sm">Invitation Sent</span>
              <p className="text-[11px] text-[#929BAA] mt-0.5">
                Waiting for {dmPartner?.name || 'recipient'} to accept your chat invite. Messaging will unlock automatically once accepted.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#12151C] border border-[#4F8CFF]/50 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center space-x-3 text-[#F5F7FA]">
              <div className="w-10 h-10 rounded-xl bg-[#4F8CFF]/20 text-[#4F8CFF] flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-[#F5F7FA] text-sm">{dmPartner?.name || 'Coworker'} invited you to chat</span>
                <p className="text-[11px] text-[#929BAA] mt-0.5">
                  Accept this invitation to start messaging, sharing files, and sending voice notes.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  const inv = invites.find(
                    (i) => (i.conversationId === activeDM.id || (i.senderId === dmPartner?.id && i.receiverId === currentUser.id)) && i.status === 'pending'
                  );
                  if (inv) acceptInvite(inv.id);
                }}
                className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  const inv = invites.find(
                    (i) => (i.conversationId === activeDM.id || (i.senderId === dmPartner?.id && i.receiverId === currentUser.id)) && i.status === 'pending'
                  );
                  if (inv) declineInvite(inv.id);
                }}
                className="px-3 py-2 bg-[#181C25] hover:bg-[#252B36] text-[#929BAA] hover:text-[#F05D6C] border border-[#252B36] rounded-lg transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 pt-1 pb-2.5 sm:pb-[11px] pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] bg-[#0B0D12] select-none flex-shrink-0 relative z-10 w-full">
      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 ? (
        <div className="h-5 px-1 flex items-center space-x-2 text-[11px] text-[#929BAA] animate-fade-in">
          <span className="flex space-x-1 items-center">
            <span className="w-1.5 h-1.5 bg-[#4F8CFF] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-[#4F8CFF] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-[#4F8CFF] rounded-full animate-bounce"></span>
          </span>
          <span className="font-medium text-[#F5F7FA]">
            {typingUsers.map((u) => u.name).join(', ')}
          </span>
          <span>{typingUsers.length === 1 ? t('typing_single') : t('typing_plural')}</span>
        </div>
      ) : (
        <div className="h-1" />
      )}

      {/* Main Composer Box / WhatsApp Voice Recording Console */}
      {isRecordingVoice ? (
        <div className="bg-[#12151C] border border-[#32C48D] rounded-xl p-3 flex items-center justify-between shadow-modal animate-fade-in">
          {/* Left: Pulsing red dot + Recording status + Live timer */}
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F05D6C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F05D6C]"></span>
            </span>
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="font-semibold text-[#F5F7FA]">Recording...</span>
              <span className="text-[#32C48D] bg-[#32C48D]/15 px-2 py-0.5 rounded font-bold">
                {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' : ''}{recordingSeconds % 60}
              </span>
            </div>
          </div>

          {/* Middle: WhatsApp animated waveform bars */}
          <div className="hidden sm:flex items-center space-x-1 h-7 px-4">
            {[10, 18, 14, 26, 12, 22, 28, 16, 24, 30, 14, 20, 26, 18, 12].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-[#32C48D] rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.6 + (i % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Right Actions: Discard & Send */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="p-2 rounded-lg bg-[#181C25] hover:bg-[#F05D6C]/20 text-[#929BAA] hover:text-[#F05D6C] border border-[#252B36] transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Discard recording"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs hidden md:inline">Cancel</span>
            </button>

            <button
              type="button"
              onClick={sendVoiceRecording}
              className="px-4 py-2 rounded-lg bg-[#32C48D] hover:bg-[#2EB882] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Send voice note"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice Note</span>
            </button>
          </div>
        </div>
      ) : (
      <div className="bg-[#12151C] border border-[#252B36] focus-within:border-[#4F8CFF] rounded-xl overflow-hidden shadow-subtle transition-colors">
        {/* Formatting Toolbar (Highlighted in Image 2 - 100% Functional with active feedback) */}
        <div className="px-3 py-1.5 bg-[#181C25] border-b border-[#252B36] flex items-center justify-between text-[#929BAA] overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1">
            {/* Bold */}
            <button
              type="button"
              onClick={() => insertFormat('**', '**', 'bold')}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold font-serif transition-colors ${
                activeFormats.bold ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'hover:text-[#F5F7FA] hover:bg-[#252B36]'
              }`}
              title="Bold (**text**)"
            >
              B
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => insertFormat('*', '*', 'italic')}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs italic font-serif transition-colors ${
                activeFormats.italic ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'hover:text-[#F5F7FA] hover:bg-[#252B36]'
              }`}
              title="Italic (*text*)"
            >
              I
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={() => insertFormat('~~', '~~', 'strike')}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs line-through transition-colors ${
                activeFormats.strike ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'hover:text-[#F5F7FA] hover:bg-[#252B36]'
              }`}
              title="Strikethrough (~~text~~)"
            >
              S
            </button>

            <div className="w-[1px] h-3.5 bg-[#252B36] mx-1" />

            {/* Inline Code */}
            <button
              type="button"
              onClick={() => insertFormat('`', '`', 'inline-code')}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono transition-colors ${
                activeFormats['inline-code'] ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]' : 'hover:text-[#F5F7FA] hover:bg-[#252B36]'
              }`}
              title="Inline Code (`code`)"
            >
              &lt;&gt;
            </button>

            {/* Code Block */}
            <button
              type="button"
              onClick={() => insertFormat('```typescript\n', '\n```', 'codeblock')}
              className="px-2 h-7 flex items-center space-x-1 rounded text-xs font-mono hover:text-[#F5F7FA] hover:bg-[#252B36] transition-colors"
              title="Code Snippet Block"
            >
              <span className="text-[11px] font-bold">Code</span>
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => insertFormat('> ', '', 'quote')}
              className="w-7 h-7 flex items-center justify-center rounded text-xs font-serif font-bold hover:text-[#F5F7FA] hover:bg-[#252B36] transition-colors"
              title="Quote (> quote)"
            >
              &ldquo;&rdquo;
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => insertFormat('- ', '', 'list')}
              className="w-7 h-7 flex items-center justify-center rounded text-xs font-mono hover:text-[#F5F7FA] hover:bg-[#252B36] transition-colors"
              title="Bulleted List (- item)"
            >
              &bull;&equiv;
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#929BAA] hidden sm:block">
            {t('shift_enter')}
          </div>
        </div>

        {/* Draft Attachments Preview */}
        {attachments.length > 0 && (
          <div className="p-2.5 bg-[#181C25]/40 border-b border-[#252B36] flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center space-x-2 bg-[#181C25] border border-[#252B36] px-2.5 py-1 rounded-lg text-xs"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[#4F8CFF]" />
                ) : att.type === 'video' ? (
                  <Video className="w-3.5 h-3.5 text-[#A78BFA]" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5 text-[#4F8CFF]" />
                )}
                <span className="text-[#F5F7FA] max-w-[140px] truncate">{att.name}</span>
                <span className="text-[10px] text-[#929BAA]">{att.size}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 hover:bg-[#252B36] rounded text-[#929BAA] hover:text-[#F05D6C]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="w-full bg-transparent text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none resize-none leading-relaxed font-sans max-h-48 min-h-[22px]"
          />
        </div>

        {/* Composer Bottom Bar (Attachments, Emoji, Voice, Send) */}
        <div className="h-11 px-3 flex items-center justify-between border-t border-[#252B36]/50">
          <div className="flex items-center space-x-1">
            {/* File Upload Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.json,.js,.ts"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-md transition-colors"
              title="Add attachment"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Emoji Picker Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-md transition-colors relative"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Voice Memo Button (WhatsApp-style) */}
            <button
              type="button"
              onClick={startVoiceRecording}
              className="p-1.5 rounded-md transition-colors text-[#929BAA] hover:text-[#32C48D] hover:bg-[#181C25] cursor-pointer"
              title="Record voice note (WhatsApp style)"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() && attachments.length === 0}
            className={`h-8 px-2.5 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-all ${
              content.trim() || attachments.length > 0
                ? 'bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white shadow-accent-glow cursor-pointer'
                : 'bg-[#181C25] text-[#929BAA]/50 cursor-not-allowed'
            }`}
            title="Send message (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      )}

      {/* Popover Emoji Picker with outside click backdrop */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute bottom-28 left-4 w-72 bg-[#181C25] border border-[#252B36] rounded-xl shadow-modal p-3 z-40 animate-slide-down">
            <div className="flex items-center justify-between pb-2 border-b border-[#252B36] mb-2">
              <span className="text-xs font-semibold text-[#F5F7FA]">{t('reactions_emojis')}</span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-[#929BAA] hover:text-[#F5F7FA] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-3">
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <div className="text-[10px] font-semibold text-[#929BAA] uppercase tracking-wider mb-1">
                    {cat.name}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {cat.emojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => insertEmoji(e)}
                        className="p-1.5 hover:bg-[#252B36] rounded text-base hover:scale-115 transition-transform text-center"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
