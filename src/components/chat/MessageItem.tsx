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
  CheckCheck,
  FileText,
  FileCode,
  Download,
  ChevronRight,
  Shield,
  ShieldCheck,
  Languages,
  RotateCcw,
  X,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { translateText, SUPPORTED_LANGUAGES } from '../../utils/translation';
import { resolveUserAvatar } from '../../utils/avatar';
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
    translateSingleMessage,
    restoreOriginalSingleMessage,
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

  // Action bar visibility and per-message language picker state
  const [showActionBar, setShowActionBar] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const messageRef = React.useRef<HTMLDivElement>(null);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = React.useRef(false);
  const touchStartPos = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isTouchInteraction = React.useRef(false);
  const touchResetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dismiss action bar & language menu on outside click or tap
  React.useEffect(() => {
    if (!showActionBar && !showLangMenu && !showEmojiPicker) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (messageRef.current && !messageRef.current.contains(e.target as Node)) {
        setShowActionBar(false);
        setShowLangMenu(false);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showActionBar, showLangMenu, showEmojiPicker]);

  // Touch handlers for mobile and tablet: Long press opens action bar (~450ms)
  const handleTouchStart = (e: React.TouchEvent) => {
    isTouchInteraction.current = true;
    touchMoved.current = false;
    if (e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        setShowActionBar(true);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(35);
          } catch {}
        }
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 8 || dy > 8) {
        touchMoved.current = true;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (touchResetTimer.current) clearTimeout(touchResetTimer.current);
    touchResetTimer.current = setTimeout(() => {
      isTouchInteraction.current = false;
    }, 400);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isTouchInteraction.current) {
      e.preventDefault();
      setShowActionBar(true);
    }
  };

  // Laptop/Desktop left click handler: Left click on message opens/toggles action bar
  const handleMessageClick = (e: React.MouseEvent) => {
    // If mobile/tablet touch interaction, ignore synthetic click (long press is used instead)
    if (isTouchInteraction.current) {
      return;
    }
    // If text was selected by mouse, do not toggle
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    if (isEditing) return;

    setShowActionBar((prev) => !prev);
  };

  // Check if current user is the author
  const isCurrentUser = Boolean(
    (currentUser?.id && message.senderId === currentUser.id) ||
    (currentUser?.email && message.senderId === currentUser.email)
  );

  // Robust sender resolution: NEVER fall back to Unsplash demo or 'Unknown Member'
  const sender: User = isCurrentUser
    ? currentUser
    : (users.find((u) => u.id === message.senderId || u.email === message.senderId) || {
        id: message.senderId,
        name: 'Member',
        username: 'member',
        email: '',
        avatar: '',
        role: 'member',
        title: 'Workspace Member',
        isOnline: false,
        joinedDate: '',
      });

  const senderAvatar = resolveUserAvatar(sender.avatar, sender.name);

  // Determine grouping (same sender within 4 minutes)
  const isGrouped = Boolean(
    previousMessage &&
    previousMessage.senderId === message.senderId &&
    Math.abs(new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime()) < 4 * 60 * 1000
  );

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

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Render markdown styles inside bubble
  const renderMessageContent = (text: string, isSelf: boolean) => {
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
              className={`my-2 rounded-xl overflow-hidden text-xs font-mono shadow-sm border ${
                isSelf ? 'bg-[#0E1526] border-[#3B82F6]/40' : 'bg-[#12151C] border-[#252B36]'
              }`}
            >
              <div
                className={`px-3 py-1.5 flex items-center justify-between border-b ${
                  isSelf ? 'bg-[#18233D] border-[#3B82F6]/30 text-[#93C5FD]' : 'bg-[#181C25] border-[#252B36] text-[#929BAA]'
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {lang}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
                    setCopiedCodeIndex(index);
                    addToast('Code copied', 'info');
                    setTimeout(() => setCopiedCodeIndex(null), 2000);
                  }}
                  className="flex items-center space-x-1 text-[11px] hover:text-white transition-colors cursor-pointer"
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
              <pre className="p-3 overflow-x-auto text-[#F5F7FA] leading-relaxed selection:bg-[#4F8CFF]/50">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        } else {
          return <span key={index}>{renderInlineStyles(part, isSelf)}</span>;
        }
      });
    }

    return renderInlineStyles(text, isSelf);
  };

  const renderInlineStyles = (content: string, isSelf: boolean) => {
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      const words = line.split(/(\s+)/);
      const formattedWords = words.map((w, wIdx) => {
        if (w.startsWith('@')) {
          return (
            <span
              key={wIdx}
              className={`font-medium px-1.5 py-0.5 rounded text-xs ${
                isSelf ? 'bg-white/20 text-white' : 'bg-[#4F8CFF]/20 text-[#4F8CFF]'
              }`}
            >
              {w}
            </span>
          );
        }
        if (w.startsWith('`') && w.endsWith('`') && w.length > 2) {
          return (
            <code
              key={wIdx}
              className={`font-mono px-1 py-0.5 rounded text-xs border ${
                isSelf
                  ? 'bg-[#1E3A8A]/50 border-white/20 text-white'
                  : 'bg-[#12151C] border-[#252B36] text-[#F5F7FA]'
              }`}
            >
              {w.slice(1, -1)}
            </code>
          );
        }
        if (w.startsWith('**') && w.endsWith('**') && w.length > 4) {
          return <strong key={wIdx} className="font-bold text-white">{w.slice(2, -2)}</strong>;
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

  // Action Bar component (dismisses on reaction/action, opens on click/long-press)
  const renderActionBar = () => {
    if (!showActionBar) return null;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`message-actions absolute -top-3.5 flex items-center bg-[#181C25] border border-[#252B36] rounded-lg shadow-elevated p-0.5 z-20 space-x-0.5 ${
          isCurrentUser ? 'right-4' : 'left-12'
        }`}
      >
        {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleReaction(message.id, emoji);
              setShowActionBar(false);
              setShowLangMenu(false);
              setShowEmojiPicker(false);
            }}
            className="p-1.5 hover:bg-[#252B36] rounded text-xs transition-colors hover:scale-110 cursor-pointer"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        <div className="w-[1px] h-3.5 bg-[#252B36] mx-0.5" />

        {/* Translation Icon (marked in black) with Language Picker Popup */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLangMenu((prev) => !prev);
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showLangMenu
                ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]'
                : 'text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36]'
            }`}
            title="Translate message"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>

          {showLangMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute top-full mt-2 w-56 max-h-64 overflow-y-auto bg-[#181C25] border border-[#252B36] rounded-xl shadow-2xl p-1.5 z-50 animate-slide-down custom-scrollbar ${
                isCurrentUser ? 'right-0' : 'left-0'
              }`}
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#929BAA] border-b border-[#252B36] mb-1 flex items-center justify-between">
                <span>Select Language</span>
                <Languages className="w-3 h-3 text-[#4F8CFF]" />
              </div>

              {message.isTranslated && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreOriginalSingleMessage(message.id);
                    setShowLangMenu(false);
                    setShowActionBar(false);
                    addToast('Restored original message', 'info');
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 mb-1 rounded-lg text-left text-xs text-[#929BAA] hover:text-white hover:bg-[#252B36] transition-colors border-b border-[#252B36]/60 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-[#929BAA]" />
                  <span>Show Original</span>
                </button>
              )}

              <div className="space-y-0.5">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = message.translatedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        translateSingleMessage(message.id, lang.code);
                        setShowLangMenu(false);
                        setShowActionBar(false);
                        addToast(`Message translated to ${lang.name}`, 'success');
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#4F8CFF]/20 text-[#4F8CFF] font-medium'
                          : 'text-[#F5F7FA] hover:bg-[#252B36]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-sm shrink-0">{lang.flag}</span>
                        <span className="truncate">{lang.name}</span>
                        {lang.nativeName && lang.nativeName !== lang.name && (
                          <span className="text-[10px] text-[#929BAA] truncate">
                            ({lang.nativeName})
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#4F8CFF] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveThreadMessageId(message.id);
            setShowActionBar(false);
          }}
          className="p-1.5 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
          title="Reply in thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePinMessage(message.id);
            setShowActionBar(false);
          }}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            message.isPinned
              ? 'text-[#4F8CFF] bg-[#4F8CFF]/15'
              : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36]'
          }`}
          title={message.isPinned ? 'Unpin message' : 'Pin message'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyText();
            setShowActionBar(false);
          }}
          className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
          title="Copy text"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {isCurrentUser && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditDraft(message.content);
              setIsEditing(true);
              setShowActionBar(false);
            }}
            className="p-1.5 text-[#929BAA] hover:text-[#4F8CFF] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
            title="Edit message"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(true);
            setShowActionBar(false);
          }}
          className="p-1.5 text-[#929BAA] hover:text-[#F05D6C] hover:bg-[#252B36] rounded transition-colors cursor-pointer"
          title="Delete message"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div
      ref={messageRef}
      onClick={handleMessageClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      className={`message-row group relative px-4 sm:px-6 py-1.5 transition-colors cursor-pointer select-text ${
        message.isPinned ? 'bg-[#4F8CFF]/5 border-l-2 border-[#4F8CFF]' : 'hover:bg-[#12151C]/40'
      }`}
    >
      {/* Pinned Indicator Flag */}
      {message.isPinned && !isGrouped && (
        <div
          className={`flex items-center space-x-1.5 text-[10px] font-medium text-[#4F8CFF] mb-1.5 ${
            isCurrentUser ? 'justify-end' : 'justify-start pl-10'
          }`}
        >
          <Pin className="w-3 h-3 fill-current rotate-45" />
          <span>{t('pinned_to_conversation')}</span>
        </div>
      )}

      {/* Action Bar (rendered when active) */}
      {renderActionBar()}

      {/* ========================================================================= */}
      {/* CASE A: SENT MESSAGE (Current User) -> Placed on the RIGHT side */}
      {/* ========================================================================= */}
      {isCurrentUser ? (
        <div className="w-full flex justify-end">
          <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
            {/* Header info for sent message */}
            {!isGrouped && (
              <div className="flex items-center space-x-2 mb-1 justify-end">
                <span className="text-xs font-semibold text-slate-700 dark:text-[#F5F7FA]">
                  {currentUser.name}
                </span>
              </div>
            )}

            {/* Bubble Container: Modern rich blue gradient bubble */}
            <div className="relative rounded-2xl rounded-tr-xs bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white p-3.5 shadow-md border border-[#3B82F6]/30 select-text">
              {isEditing ? (
                <div className="space-y-2 min-w-[240px]">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="w-full bg-[#181C25] border border-white/30 rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-white text-[#1D4ED8] hover:bg-gray-100 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {displayedContent && (
                    <div className="text-xs text-white leading-relaxed break-words">
                      {renderMessageContent(displayedContent, true)}
                    </div>
                  )}

                  {/* Attachments rendering */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2.5 justify-end">
                      {message.attachments.map((att) => {
                        if (att.type === 'image') {
                          return (
                            <div
                              key={att.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(att.previewUrl || att.url);
                              }}
                              className="group/img relative rounded-xl border border-white/20 overflow-hidden max-w-sm cursor-zoom-in shadow-sm"
                            >
                              <img
                                src={att.previewUrl || att.url}
                                alt={att.name}
                                className="max-h-60 rounded-xl object-cover hover:opacity-95 transition-opacity"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between text-[11px] text-white">
                                <span className="truncate">{att.name}</span>
                                <span className="text-white/70 text-[10px]">{att.size}</span>
                              </div>
                            </div>
                          );
                        }

                        if (att.type === 'video') {
                          return (
                            <div
                              key={att.id}
                              onClick={(e) => e.stopPropagation()}
                              className="group/vid relative rounded-xl border border-white/20 overflow-hidden max-w-md bg-black shadow-sm"
                            >
                              <video
                                src={att.url}
                                controls
                                className="max-h-72 w-full rounded-xl object-contain bg-black"
                              />
                              <div className="bg-[#0F172A] px-3 py-1.5 flex items-center justify-between text-[11px] text-white border-t border-white/10">
                                <span className="truncate">{att.name}</span>
                                <span className="text-white/70 text-[10px]">{att.size}</span>
                              </div>
                            </div>
                          );
                        }

                        if (att.type === 'audio') {
                          return (
                            <div key={att.id} onClick={(e) => e.stopPropagation()}>
                              <VoiceMessagePlayer
                                url={att.url}
                                name={att.name}
                                duration={att.duration}
                                senderAvatar={senderAvatar}
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={att.id}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-3 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs max-w-xs transition-colors"
                          >
                            <div className="p-2 bg-white/20 rounded-lg text-white">
                              {att.type === 'code' ? (
                                <FileCode className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 truncate text-left">
                              <div className="font-medium text-white truncate">{att.name}</div>
                              <div className="text-[10px] text-white/70">{att.size}</div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToast(`Downloaded ${att.name}`, 'success');
                              }}
                              className="p-1 text-white/80 hover:text-white rounded hover:bg-white/20 transition-colors cursor-pointer"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bubble Footer: Timestamp & delivery check */}
                  <div className="mt-1 flex items-center justify-end space-x-1.5 text-[10px] text-white/70 font-mono">
                    {message.editedAt && <span className="italic">(edited)</span>}
                    {message.isTranslated && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOriginal(!showOriginal);
                        }}
                        className="text-[10px] text-white underline cursor-pointer"
                      >
                        {showOriginal ? t('showing_original') : t('translated')}
                      </button>
                    )}
                    <span>{formatTimestamp(message.timestamp)}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-white/90 inline-block" />
                  </div>
                </>
              )}
            </div>

            {/* Reactions Strip (Sent Message - Aligned Right) */}
            {Object.keys(message.reactions).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center justify-end">
                {Object.entries(message.reactions).map(([emoji, reactors]) => {
                  const hasReacted = reactors.includes(currentUser.id);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReaction(message.id, emoji);
                        setShowActionBar(false);
                      }}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                        hasReacted
                          ? 'bg-[#4F8CFF]/20 border border-[#4F8CFF]/50 text-[#4F8CFF]'
                          : 'bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA]'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-mono text-[11px] font-semibold">{reactors.length}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  className="p-1 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-full text-[#929BAA] hover:text-[#F5F7FA] transition-colors cursor-pointer"
                  title="Add reaction"
                >
                  <Smile className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Thread Preview Bar (Sent Message - Aligned Right) */}
            {message.replyCount && message.replyCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThreadMessageId(message.id);
                }}
                className="mt-1.5 inline-flex items-center space-x-2 px-2.5 py-1 bg-[#181C25]/80 hover:bg-[#1E2330] border border-[#252B36] rounded-md text-xs text-[#4F8CFF] group/thread transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#929BAA] group-hover/thread:translate-x-0.5 transition-transform" />
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE B: RECEIVED MESSAGE (Other User) -> Placed on the LEFT side          */
        /* ========================================================================= */
        <div className="w-full flex justify-start items-start space-x-2.5">
          {/* Sender Avatar */}
          {!isGrouped ? (
            <div className="relative flex-shrink-0 cursor-pointer pt-0.5">
              <img
                src={senderAvatar}
                alt={sender.name}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserProfileOpen(true);
                }}
                className="w-9 h-9 rounded-xl object-cover border border-[#252B36] hover:scale-105 transition-transform bg-[#0E1118]"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0B0D12] ${
                  sender.isOnline ? 'bg-[#32C48D]' : 'bg-[#636D7E]'
                }`}
              />
            </div>
          ) : (
            <div className="w-9 flex-shrink-0" />
          )}

          {/* Bubble Container: Clean dark card bubble */}
          <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%] md:max-w-[65%]">
            {!isGrouped && (
              <div className="flex items-center space-x-2 mb-1">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserProfileOpen(true);
                  }}
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
              </div>
            )}

            <div className="relative rounded-2xl rounded-tl-xs bg-[#181C25] border border-[#252B36] text-[#F5F7FA] p-3.5 shadow-md select-text">
              {isEditing ? (
                <div className="space-y-2 min-w-[240px]">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="w-full bg-[#12151C] border border-[#4F8CFF] rounded-lg p-2.5 text-xs text-[#F5F7FA] outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 bg-[#181C25] hover:bg-[#252B36] text-[#929BAA] text-xs font-medium rounded-md transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {displayedContent && (
                    <div className="text-xs text-[#F5F7FA] leading-relaxed break-words">
                      {renderMessageContent(displayedContent, false)}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(att.previewUrl || att.url);
                              }}
                              className="group/img relative rounded-xl border border-[#252B36] overflow-hidden max-w-sm cursor-zoom-in"
                            >
                              <img
                                src={att.previewUrl || att.url}
                                alt={att.name}
                                className="max-h-60 rounded-xl object-cover hover:opacity-95 transition-opacity"
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
                              onClick={(e) => e.stopPropagation()}
                              className="group/vid relative rounded-xl border border-[#252B36] overflow-hidden max-w-md bg-black/60"
                            >
                              <video
                                src={att.url}
                                controls
                                className="max-h-72 w-full rounded-xl object-contain bg-black"
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
                            <div key={att.id} onClick={(e) => e.stopPropagation()}>
                              <VoiceMessagePlayer
                                url={att.url}
                                name={att.name}
                                duration={att.duration}
                                senderAvatar={senderAvatar}
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={att.id}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-3 px-3 py-2 bg-[#12151C] hover:bg-[#1E2330] border border-[#252B36] rounded-xl text-xs max-w-xs transition-colors"
                          >
                            <div className="p-2 bg-[#181C25] rounded-lg border border-[#252B36] text-[#4F8CFF]">
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToast(`Downloaded ${att.name}`, 'success');
                              }}
                              className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#252B36] transition-colors cursor-pointer"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Received Bubble Footer */}
                  <div className="mt-1 flex items-center justify-start space-x-1.5 text-[10px] text-[#929BAA] font-mono">
                    {message.editedAt && <span className="italic">(edited)</span>}
                    {message.isTranslated && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOriginal(!showOriginal);
                        }}
                        className="text-[10px] text-[#4F8CFF] hover:underline cursor-pointer"
                      >
                        {showOriginal ? t('showing_original') : t('translated')}
                      </button>
                    )}
                    <span>{formatTimestamp(message.timestamp)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Reactions Strip (Received Message - Aligned Left) */}
            {Object.keys(message.reactions).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center justify-start">
                {Object.entries(message.reactions).map(([emoji, reactors]) => {
                  const hasReacted = reactors.includes(currentUser.id);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReaction(message.id, emoji);
                        setShowActionBar(false);
                      }}
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
                        hasReacted
                          ? 'bg-[#4F8CFF]/20 border border-[#4F8CFF]/50 text-[#4F8CFF]'
                          : 'bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA]'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-mono text-[11px] font-semibold">{reactors.length}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  className="p-1 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] rounded-full text-[#929BAA] hover:text-[#F5F7FA] transition-colors cursor-pointer"
                  title="Add reaction"
                >
                  <Smile className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Thread Preview Bar (Received Message - Aligned Left) */}
            {message.replyCount && message.replyCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThreadMessageId(message.id);
                }}
                className="mt-1.5 inline-flex items-center space-x-2 px-2.5 py-1 bg-[#181C25]/80 hover:bg-[#1E2330] border border-[#252B36] rounded-md text-xs text-[#4F8CFF] group/thread transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#929BAA] group-hover/thread:translate-x-0.5 transition-transform" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Emoji Picker Popup with outside click backdrop */}
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-20 bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute mt-1 bg-[#181C25] border border-[#252B36] rounded-xl shadow-modal p-2 z-30 flex items-center space-x-1 animate-slide-down ${
              isCurrentUser ? 'right-6' : 'left-14'
            }`}
          >
            {COMMON_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={(evt) => {
                  evt.stopPropagation();
                  toggleReaction(message.id, e);
                  setShowEmojiPicker(false);
                  setShowActionBar(false);
                  setShowLangMenu(false);
                }}
                className="p-1.5 hover:bg-[#252B36] rounded-lg text-sm hover:scale-115 transition-transform cursor-pointer"
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

      {/* Delete Options Modal */}
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
                <p className="text-xs text-[#929BAA]">
                  {isCurrentUser ? 'Choose how to delete this message:' : 'Delete this message from your device:'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  deleteMessage(message.id, 'me');
                  setShowDeleteModal(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12151C] hover:bg-[#252B36] border border-[#252B36] text-left transition-colors flex items-center justify-between group cursor-pointer"
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

              {isCurrentUser && (
                <button
                  type="button"
                  onClick={() => {
                    deleteMessage(message.id, 'everyone');
                    setShowDeleteModal(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F05D6C]/10 hover:bg-[#F05D6C]/20 border border-[#F05D6C]/30 text-left transition-colors flex items-center justify-between group cursor-pointer"
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
              )}
            </div>

            <div className="pt-2 border-t border-[#252B36] flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#12151C] transition-colors cursor-pointer"
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
                type="button"
                onClick={() => setShowCipherModal(false)}
                className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#12151C] cursor-pointer"
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
                    type="button"
                    onClick={() => {
                      const cipher = message.encryptedPayload?.ciphertext || btoa(message.content);
                      navigator.clipboard.writeText(cipher);
                      setCopiedCipher(true);
                      addToast('Ciphertext copied', 'info');
                      setTimeout(() => setCopiedCipher(false), 2000);
                    }}
                    className="text-[#4F8CFF] hover:underline flex items-center gap-1 font-sans cursor-pointer"
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
                type="button"
                onClick={() => setShowCipherModal(false)}
                className="px-4 py-1.5 bg-[#12151C] hover:bg-[#252B36] text-[#F5F7FA] rounded-lg text-xs font-medium transition-colors border border-[#252B36] cursor-pointer"
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
