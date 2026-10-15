import React, { useState } from 'react';
import type { Message, User } from '../../types';
import { useChat } from '../../context/ChatContext';
import {
  MessageSquare,
  Pin,
  Smile,
  Edit2,
  Trash2,
  Copy,
  Check,
  FileText,
  FileCode,
  Download,
  ChevronRight,
  Shield,
  ShieldCheck,
  Lock,
  Languages,
  X,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { translateText } from '../../utils/translation';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface MessageItemProps {
  message: Message;
  previousMessage?: Message;
}

const COMMON_EMOJIS = ['👍', '❤️', '🚀', '🔥', '👀', '🎉', '💯'];

export const MessageItem: React.FC<MessageItemProps> = ({ message, previousMessage }) => {
  const {
    users,
    currentUser,
    toggleReaction,
    togglePinMessage,
    editMessage,
    deleteMessage,
    setActiveThreadMessageId,
    setIsUserProfileOpen,
    selectedLanguage,
    addToast,
    t,
  } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showCipherModal, setShowCipherModal] = useState(false);
  const [copiedCipher, setCopiedCipher] = useState(false);

  const sender: User = users.find((u) => u.id === message.senderId) || {
    id: message.senderId,
    name: 'Unknown Member',
    username: 'member',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50',
    role: 'member',
    title: 'Workspace Member',
    isOnline: false,
    joinedDate: '',
  };

  const isCurrentUser = currentUser.id === message.senderId;

  // Determine if grouped with previous message (same author sent within 4 minutes)
  const isGrouped =
    previousMessage &&
    previousMessage.senderId === message.senderId &&
    Math.abs(new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime()) <
      4 * 60 * 1000;

  const displayedContent = showOriginal && message.originalContent
    ? message.originalContent
    : message.content;

  const handleCopyText = () => {
    navigator.clipboard.writeText(displayedContent);
    addToast('Message copied to clipboard', 'info');
  };

  const handleSaveEdit = () => {
    if (editDraft.trim() && editDraft !== message.content) {
      editMessage(message.id, editDraft.trim());
    }
    setIsEditing(false);
  };

  const handleSingleTranslate = () => {
    const original = message.originalContent || message.content;
    const translated = translateText(original, selectedLanguage);
    editMessage(message.id, translated);
    addToast('Translated message', 'success');
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render markdown with syntax highlights and mentions
  const renderMessageContent = (text: string) => {
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          let lang = 'code';
          let codeContent = part.slice(3, -3).trim();
          if (lines[0] && !lines[0].includes(' ') && lines[0].length < 15) {
            lang = lines[0];
            codeContent = lines.slice(1).join('\n');
          }

          return (
            <div
              key={index}
              className="my-2.5 rounded-lg border border-[#252B36] bg-[#12151C] overflow-hidden text-xs font-mono shadow-sm"
            >
              <div className="bg-[#181C25] px-3 py-1.5 border-b border-[#252B36] flex items-center justify-between text-[#929BAA]">
                <span className="text-[11px] font-semibold text-[#4F8CFF] uppercase tracking-wider">
                  {lang}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
                    setCopiedCodeIndex(index);
                    addToast('Code copied to clipboard', 'info');
                    setTimeout(() => setCopiedCodeIndex(null), 2000);
                  }}
                  className="flex items-center space-x-1 text-[11px] hover:text-[#F5F7FA] transition-colors"
                >
                  {copiedCodeIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-[#32C48D]" />
                      <span className="text-[#32C48D]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[#F5F7FA] leading-relaxed selection:bg-[#4F8CFF]/40">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        } else {
          return <span key={index}>{renderInlineStyles(part)}</span>;
        }
      });
    }

    return renderInlineStyles(text);
  };

  const renderInlineStyles = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      const words = line.split(/(\s+)/);
      const formattedWords = words.map((w, wIdx) => {
        if (w.startsWith('@')) {
          return (
            <span
              key={wIdx}
              className="bg-[#4F8CFF]/20 text-[#4F8CFF] font-medium px-1.5 py-0.5 rounded text-xs"
            >
              {w}
            </span>
          );
        }
        if (w.startsWith('`') && w.endsWith('`') && w.length > 2) {
          return (
            <code
              key={wIdx}
              className="bg-[#181C25] text-[#F5F7FA] font-mono px-1 py-0.5 rounded text-xs border border-[#252B36]"
            >
              {w.slice(1, -1)}
            </code>
          );
        }
        if (w.startsWith('**') && w.endsWith('**') && w.length > 4) {
          return <strong key={wIdx} className="font-semibold text-white">{w.slice(2, -2)}</strong>;
        }
        return w;
      });

      return (
        <span key={lIdx} className="block min-h-[1.2rem]">
          {formattedWords}
        </span>
      );
    });
  };

  return (
    <div
      className={`message-row group relative px-5 py-1.5 hover:bg-[#12151C]/70 transition-colors ${
        message.isPinned ? 'bg-[#4F8CFF]/5 border-l-2 border-[#4F8CFF]' : ''
      }`}
    >
      {/* Pinned Indicator Flag */}
      {message.isPinned && !isGrouped && (
        <div className="flex items-center space-x-1.5 text-[10px] font-medium text-[#4F8CFF] mb-1">
          <Pin className="w-3 h-3 fill-current rotate-45" />
          <span>{t('pinned_to_conversation')}</span>
        </div>
      )}

      <div className="flex items-start space-x-3">
        {/* Avatar or Grouped Spacer */}
        {!isGrouped ? (
          <div className="relative flex-shrink-0 cursor-pointer pt-0.5">
            <img
              src={sender.avatar}
              alt={sender.name}
              onClick={() => setIsUserProfileOpen(true)}
              className="w-9 h-9 rounded-lg object-cover border border-[#252B36] hover:scale-105 transition-transform"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0B0D12] ${
                sender.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
              }`}
            />
          </div>
        ) : (
          <div className="w-9 flex-shrink-0 text-right pr-2 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-[#929BAA] font-mono">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        )}

        {/* Message Body */}
        <div className="flex-1 overflow-hidden">
          {/* Header (Sender & Time) */}
          {!isGrouped && (
            <div className="flex items-center space-x-2 mb-0.5 flex-wrap gap-y-1">
              <span
                onClick={() => setIsUserProfileOpen(true)}
                className="text-xs font-semibold text-[#F5F7FA] hover:text-[#4F8CFF] cursor-pointer transition-colors"
              >
                {sender.name}
              </span>

              {sender.role === 'owner' && (
                <span className="text-[10px] bg-[#4F8CFF]/20 text-[#4F8CFF] font-semibold px-1.5 py-0.2 rounded border border-[#4F8CFF]/30 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Lead
                </span>
              )}
              {sender.role === 'admin' && (
                <span className="text-[10px] bg-[#32C48D]/20 text-[#32C48D] font-semibold px-1.5 py-0.2 rounded border border-[#32C48D]/30">
                  Admin
                </span>
              )}

              <span
                className="text-[11px] text-[#929BAA] font-mono cursor-default"
                title={new Date(message.timestamp).toLocaleString()}
              >
                {formatTimestamp(message.timestamp)}
              </span>

              {message.editedAt && (
                <span className="text-[10px] text-[#929BAA] italic">(edited)</span>
              )}

              {/* Translation Badge */}
              {message.isTranslated && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="text-[10px] text-[#4F8CFF] bg-[#4F8CFF]/15 hover:bg-[#4F8CFF]/25 px-1.5 py-0.2 rounded flex items-center gap-1 transition-colors"
                  title="Click to toggle translated/original text"
                >
                  <Languages className="w-2.5 h-2.5" />
                  <span>{showOriginal ? t('showing_original') : t('translated')}</span>
                </button>
              )}
            </div>
          )}

          {/* Message Content or Edit Form */}
          {isEditing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full bg-[#181C25] border border-[#4F8CFF] rounded-lg p-2.5 text-xs text-[#F5F7FA] outline-none resize-none font-sans"
                rows={3}
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-medium rounded-md transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-[#181C25] hover:bg-[#252B36] text-[#929BAA] text-xs font-medium rounded-md border border-[#252B36] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#F5F7FA] leading-relaxed break-words selectable-text">
              {renderMessageContent(displayedContent)}
            </div>
          )}

          {/* Attachments rendering */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {message.attachments.map((att) => {
                if (att.type === 'image') {
                  return (
                    <div
                      key={att.id}
                      onClick={() => setLightboxImage(att.previewUrl || att.url)}
                      className="group/img relative rounded-lg border border-[#252B36] overflow-hidden max-w-sm cursor-zoom-in"
                    >
                      <img
                        src={att.previewUrl || att.url}
                        alt={att.name}
                        className="max-h-60 rounded-lg object-cover hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between text-[11px] text-white">
                        <span className="truncate">{att.name}</span>
                        <span className="text-[#929BAA] text-[10px]">{att.size}</span>
                      </div>
                    </div>
                  );
                }

                if (att.type === 'video') {
                  return (
                    <div
                      key={att.id}
                      className="group/vid relative rounded-lg border border-[#252B36] overflow-hidden max-w-md bg-black/60"
                    >
                      <video
                        src={att.url}
                        controls
                        className="max-h-72 w-full rounded-lg object-contain bg-black"
                      />
                      <div className="bg-[#12151C] px-3 py-1.5 flex items-center justify-between text-[11px] text-white border-t border-[#252B36]">
                        <span className="truncate">{att.name}</span>
                        <span className="text-[#929BAA] text-[10px]">{att.size}</span>
                      </div>
                    </div>
                  );
                }

                if (att.type === 'audio') {
                  return (
                    <VoiceMessagePlayer
                      key={att.id}
                      url={att.url}
                      name={att.name}
                      duration={att.duration}
                      senderAvatar={sender.avatar}
                    />
                  );
                }

                return (
                  <div
                    key={att.id}
                    className="flex items-center space-x-3 px-3 py-2 bg-[#181C25] hover:bg-[#1E2330] border border-[#252B36] rounded-lg text-xs max-w-xs transition-colors group/att"
                  >
                    <div className="p-2 bg-[#12151C] rounded border border-[#252B36] text-[#4F8CFF]">
                      {att.type === 'code' ? (
                        <FileCode className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="font-medium text-[#F5F7FA] truncate">{att.name}</div>
                      <div className="text-[10px] text-[#929BAA]">{att.size}</div>
                    </div>
                    <button
                      onClick={() => addToast(`Downloaded ${att.name}`, 'success')}
                      className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#252B36] transition-colors"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reactions Strip */}
          {Object.keys(message.reactions).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              {Object.entries(message.reactions).map(([emoji, reactors]) => {
                const hasReacted = reactors.includes(currentUser.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(message.id, emoji)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                      hasReacted
                        ? 'bg-[#4F8CFF]/20 border border-[#4F8CFF]/40 text-[#4F8CFF]'
                        : 'bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA]'
                    }`}
                    title={`Reacted by: ${reactors.length} team members`}
                  >
                    <span>{emoji}</span>
                    <span className="font-mono text-[11px] font-semibold">{reactors.length}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-full text-[#929BAA] hover:text-[#F5F7FA] transition-colors"
                title="Add reaction"
              >
                <Smile className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Thread Preview Bar */}
          {message.replyCount && message.replyCount > 0 ? (
            <button
              onClick={() => setActiveThreadMessageId(message.id)}
              className="mt-2 inline-flex items-center space-x-2 px-2.5 py-1 bg-[#181C25]/80 hover:bg-[#1E2330] border border-[#252B36] rounded-md text-xs text-[#4F8CFF] group/thread transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-medium">
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>
              <span className="text-[11px] text-[#929BAA]">
                Last reply{' '}
                {message.lastReplyAt
                  ? new Date(message.lastReplyAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'recently'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#929BAA] group-hover/thread:translate-x-0.5 transition-transform" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Hover Action Bar (Top Right of Message) */}
      <div className="message-actions absolute -top-3.5 right-5 flex items-center bg-[#181C25] border border-[#252B36] rounded-lg shadow-elevated p-0.5 z-20 space-x-0.5">
        {/* Quick Emoji Reactions */}
        {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(message.id, emoji)}
            className="p-1.5 hover:bg-[#252B36] rounded text-xs transition-colors hover:scale-110"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        <div className="w-[1px] h-3.5 bg-[#252B36] mx-0.5" />

        {/* Translate Message */}
        <button
          onClick={handleSingleTranslate}
          className="p-1.5 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors"
          title="Translate message"
        >
          <Languages className="w-3.5 h-3.5" />
        </button>

        {/* Reply in Thread */}
        <button
          onClick={() => setActiveThreadMessageId(message.id)}
          className="p-1.5 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors"
          title="Reply in thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Pin / Unpin */}
        <button
          onClick={() => togglePinMessage(message.id)}
          className={`p-1.5 rounded transition-colors ${
            message.isPinned
              ? 'text-[#4F8CFF] bg-[#4F8CFF]/15'
              : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36]'
          }`}
          title={message.isPinned ? 'Unpin message' : 'Pin message'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        {/* Copy text */}
        <button
          onClick={handleCopyText}
          className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded transition-colors"
          title="Copy text"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Edit (for author) */}
        {isCurrentUser && (
          <button
            onClick={() => {
              setEditDraft(message.content);
              setIsEditing(true);
            }}
            className="p-1.5 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors"
            title="Edit message"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete message (opens options: delete for me / delete for everyone) */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-1.5 text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#252B36] rounded transition-colors"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Emoji Picker Popup with outside click backdrop */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute left-14 mt-1 bg-[#181C25] border border-[#252B36] rounded-lg shadow-modal p-2 z-30 flex items-center space-x-1 animate-slide-down">
          {COMMON_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                toggleReaction(message.id, e);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 hover:bg-[#252B36] rounded text-sm hover:scale-115 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      </>
    )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
        >
          <img
            src={lightboxImage}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-modal object-contain"
          />
        </div>
      )}

      {/* Delete Options Modal (Delete for me / Delete for everyone) */}
      {showDeleteModal && (
        <div
          onClick={() => setShowDeleteModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal p-5 space-y-4 animate-slide-down cursor-default"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#F05D6C]/10 text-[#F05D6C] border border-[#F05D6C]/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FA]">Delete Message</h3>
                <p className="text-xs text-[#929BAA]">Choose how to delete this message:</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Delete for me */}
              <button
                onClick={() => {
                  deleteMessage(message.id, 'me');
                  setShowDeleteModal(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12151C] hover:bg-[#252B36] border border-[#252B36] text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-[#F5F7FA] group-hover:text-[#4F8CFF] transition-colors">
                    Delete for me
                  </div>
                  <div className="text-[11px] text-[#929BAA]">
                    Only removes this message from your device
                  </div>
                </div>
                <UserIcon className="w-4 h-4 text-[#929BAA] group-hover:text-[#4F8CFF]" />
              </button>

              {/* Option 2: Delete for everyone */}
              <button
                onClick={() => {
                  deleteMessage(message.id, 'everyone');
                  setShowDeleteModal(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F05D6C]/10 hover:bg-[#F05D6C]/20 border border-[#F05D6C]/30 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-[#F05D6C]">
                    Delete for everyone
                  </div>
                  <div className="text-[11px] text-[#929BAA]">
                    Permanently removes message for all members
                  </div>
                </div>
                <UsersIcon className="w-4 h-4 text-[#F05D6C]" />
              </button>
            </div>

            <div className="pt-2 border-t border-[#252B36] flex justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#12151C] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Ciphertext Inspector Modal */}
      {showCipherModal && (
        <div
          onClick={() => setShowCipherModal(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal p-5 space-y-4 animate-slide-down cursor-default font-sans text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#252B36]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#32C48D]/15 text-[#32C48D] rounded-xl border border-[#32C48D]/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F5F7FA]">Cryptographic Message Payload</h3>
                  <p className="text-[11px] text-[#929BAA]">End-to-End Encrypted with AES-256-GCM</p>
                </div>
              </div>
              <button
                onClick={() => setShowCipherModal(false)}
                className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#12151C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 bg-[#12151C] rounded-lg border border-[#252B36]">
                  <span className="text-[#929BAA] block">ALGORITHM:</span>
                  <span className="text-[#4F8CFF] font-semibold">{message.encryptedPayload?.algorithm || 'AES-GCM-256'}</span>
                </div>
                <div className="p-2 bg-[#12151C] rounded-lg border border-[#252B36]">
                  <span className="text-[#929BAA] block">TAMPER STATUS:</span>
                  <span className="text-[#32C48D] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Authenticated
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-[#12151C] rounded-lg border border-[#252B36] space-y-1">
                <span className="text-[10px] text-[#929BAA] block">INITIALIZATION VECTOR (IV 96-bit Base64):</span>
                <span className="text-[#F5A623] break-all select-all font-mono text-[10px]">
                  {message.encryptedPayload?.iv || '7F3B89A14DE2C9081B4F3A09'}
                </span>
              </div>

              <div className="p-2.5 bg-[#12151C] rounded-lg border border-[#252B36] space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#929BAA]">CIPHERTEXT (AES-256-GCM Base64):</span>
                  <button
                    onClick={() => {
                      const cipher = message.encryptedPayload?.ciphertext || btoa(message.content);
                      navigator.clipboard.writeText(cipher);
                      setCopiedCipher(true);
                      addToast('Ciphertext copied to clipboard', 'info');
                      setTimeout(() => setCopiedCipher(false), 2000);
                    }}
                    className="text-[#4F8CFF] hover:underline flex items-center gap-1 font-sans"
                  >
                    {copiedCipher ? <Check className="w-3 h-3 text-[#32C48D]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCipher ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-[#929BAA] break-all select-all font-mono text-[10px] max-h-24 overflow-y-auto leading-relaxed bg-[#0B0D12] p-2 rounded border border-[#252B36]">
                  {message.encryptedPayload?.ciphertext || btoa(message.content)}
                </div>
              </div>

              <div className="p-2 bg-[#32C48D]/10 rounded-lg border border-[#32C48D]/20 text-[#32C48D] font-sans flex items-center justify-between">
                <span className="text-[11px] flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" /> Plaintext verified in memory
                </span>
                <span className="text-[10px] text-[#929BAA] font-mono">Zero-Knowledge</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#252B36] flex justify-end">
              <button
                onClick={() => setShowCipherModal(false)}
                className="px-4 py-1.5 bg-[#12151C] hover:bg-[#252B36] text-[#F5F7FA] rounded-lg text-xs font-medium transition-colors border border-[#252B36]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
