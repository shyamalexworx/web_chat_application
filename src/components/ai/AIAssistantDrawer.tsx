import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Bot,
  Send,
  Copy,
  Check,
  RotateCcw,
  CornerDownLeft,
  ThumbsUp,
  ThumbsDown,
  History,
  Trash2,
  Plus,
  RefreshCw,
  StopCircle,
} from 'lucide-react';
import type { AIMessage, AIConversation, Message } from '../../types';
import {
  sendGroqChat,
  getGroqApiKey,
  getSavedGroqModel,
} from '../../utils/groq';
import { AIMarkdown } from './AIMarkdown';

const WELCOME_MESSAGE: AIMessage = {
  id: 'ai-welcome',
  role: 'assistant',
  content:
    "👋 Hi there! I'm your **Pulse AI Workspace Assistant**.\n\nI can directly interact with your workspace to:\n• **Create channels & workspaces**\n• **Send messages to channels or team members**\n• **Summarize discussions and search messages**\n• **Draft announcements and replies**\n\nWhat would you like me to do today?",
  timestamp: new Date().toISOString(),
};

const createNewConversation = (): AIConversation => ({
  id: 'conv-' + Date.now(),
  title: 'Workspace Chat',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [WELCOME_MESSAGE],
});

export const AIAssistantDrawer: React.FC = () => {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    sendMessage,
    addToast,
    currentUser,
    activeView,
    setActiveView,
    channels,
    createChannel,
    dms,
    createOrOpenDM,
    messages,
    activeConversationMessages,
    activeWorkspace,
    createWorkspace,
    setActiveWorkspaceId,
    users,
  } = useChat();

  const userId = currentUser?.id || 'guest';
  const storageKey = `pulsechat_ai_conversations_${userId}`;

  // Conversations state with localStorage persistence
  const [conversations, setConversations] = useState<AIConversation[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createNewConversation()];
  });

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    return conversations[0]?.id || 'conv-default';
  });

  const currentConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0] || createNewConversation();
  const aiMessages = currentConversation.messages;

  // View modes
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Input & Generation state
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(conversations));
    } catch (err) {
      console.warn('Failed to persist AI conversations to localStorage:', err);
    }
  }, [conversations, storageKey]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [aiMessages, isThinking]);

  if (!isAIAssistantOpen) return null;

  const updateCurrentConversationMessages = (
    updater: (prevMsgs: AIMessage[]) => AIMessage[]
  ) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConversation.id) {
          const newMessages = updater(c.messages);
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: newMessages,
          };
        }
        return c;
      })
    );
  };

  /**
   * Executes AI-requested workspace actions (create workspace, create channel, send message, send DM)
   */
  const executeAIAction = (actionJson: {
    action: string;
    name?: string;
    description?: string;
    topic?: string;
    isPrivate?: boolean;
    channelName?: string;
    userName?: string;
    content?: string;
  }): string => {
    try {
      // 1. Create a Workspace
      if (actionJson.action === 'create_workspace') {
        const wsName = actionJson.name?.trim() || 'New Workspace';
        const wsDesc = actionJson.description?.trim() || 'Created by Pulse AI';
        const newWs = createWorkspace(wsName, wsDesc);
        if (newWs?.id) {
          setActiveWorkspaceId(newWs.id);
        }
        addToast(`Workspace "${wsName}" created by AI!`, 'success');
        return `✅ **Action executed**: Created and switched to new workspace **${wsName}**.`;
      }

      // 2. Create a Channel
      if (actionJson.action === 'create_channel') {
        const rawName = (actionJson.name || 'new-channel').replace(/^#/, '').toLowerCase().trim();
        const chTopic = actionJson.topic || actionJson.description || 'Created by Pulse AI';
        const chDesc = actionJson.description || 'Created by Pulse AI';
        const isPriv = !!actionJson.isPrivate;
        const newCh = createChannel(rawName, chTopic, chDesc, isPriv);
        if (newCh?.id) {
          setActiveView({ type: 'channel', id: newCh.id });
        }
        addToast(`Channel #${rawName} created by AI!`, 'success');
        return `✅ **Action executed**: Created and navigated to channel **#${rawName}**.`;
      }

      // 3. Send a Message to a Channel
      if (actionJson.action === 'send_message') {
        const msgText = actionJson.content?.trim();
        if (!msgText) return '⚠️ No message content specified.';

        if (actionJson.channelName) {
          const chName = actionJson.channelName.replace(/^#/, '').toLowerCase().trim();
          const targetCh = channels.find((c) => c.name.toLowerCase() === chName);
          if (targetCh) {
            setActiveView({ type: 'channel', id: targetCh.id });
          }
        }

        setTimeout(() => {
          sendMessage(msgText);
        }, 200);

        addToast('Message posted to channel by AI!', 'success');
        return `✅ **Action executed**: Posted your message to the channel:\n> "${msgText}"`;
      }

      // 4. Send a Direct Message to a Person
      if (actionJson.action === 'send_dm') {
        const targetUserName = actionJson.userName?.replace(/^@/, '').toLowerCase().trim();
        const msgText = actionJson.content?.trim();
        if (!targetUserName || !msgText) return '⚠️ Missing user or message content.';

        const targetUser = users.find(
          (u) =>
            u.name.toLowerCase().includes(targetUserName) ||
            u.email.toLowerCase().includes(targetUserName)
        );

        if (!targetUser) {
          const availableList = users.map((u) => u.name).join(', ');
          return `⚠️ Could not find team member matching "${actionJson.userName}". Available members: ${availableList}`;
        }

        const dmId = createOrOpenDM([targetUser.id]);
        if (dmId) {
          setActiveView({ type: 'dm', id: dmId });
          setTimeout(() => {
            sendMessage(msgText);
          }, 200);
          addToast(`Direct message sent to @${targetUser.name}!`, 'success');
          return `✅ **Action executed**: Sent direct message to **@${targetUser.name}**:\n> "${msgText}"`;
        }
      }

      // 5. Navigate / Switch to a Channel or DM
      if (actionJson.action === 'navigate') {
        if (actionJson.channelName) {
          const chName = actionJson.channelName.replace(/^#/, '').toLowerCase().trim();
          const targetCh = channels.find((c) => c.name.toLowerCase() === chName);
          if (targetCh) {
            setActiveView({ type: 'channel', id: targetCh.id });
            return `✅ Switched to channel **#${targetCh.name}**.`;
          }
        }
        if (actionJson.userName) {
          const uName = actionJson.userName.replace(/^@/, '').toLowerCase().trim();
          const targetUser = users.find((u) => u.name.toLowerCase().includes(uName));
          if (targetUser) {
            const dmId = createOrOpenDM([targetUser.id]);
            setActiveView({ type: 'dm', id: dmId });
            return `✅ Opened direct message with **@${targetUser.name}**.`;
          }
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Action failed';
      return `⚠️ Could not execute action: ${errMsg}`;
    }
    return '';
  };

  /**
   * Processes the raw AI response, extracts and executes any pulse-action blocks
   */
  const processAIResponseWithActions = (rawResponse: string): string => {
    const actionRegex = /```(?:pulse-action|json-action)\s*([\s\S]*?)\s*```/;
    const match = actionRegex.exec(rawResponse);

    if (match) {
      try {
        const actionJson = JSON.parse(match[1].trim());
        const actionResultText = executeAIAction(actionJson);
        const cleanContent = rawResponse.replace(actionRegex, '').trim();
        return cleanContent ? `${cleanContent}\n\n${actionResultText}` : actionResultText;
      } catch (parseErr) {
        console.warn('Failed to parse AI action JSON:', parseErr);
      }
    }
    return rawResponse;
  };

  /**
   * Constructs live workspace context, message history, and action execution capabilities
   */
  const buildWebsiteContext = (userPrompt: string): string => {
    let currentTargetName = 'Workspace';
    if (activeView.type === 'channel') {
      const ch = channels.find((c) => c.id === activeView.id);
      currentTargetName = ch ? `#${ch.name}` : 'Channel';
    } else if (activeView.type === 'dm') {
      const dm = dms.find((d) => d.id === activeView.id);
      const partnerId = dm?.participantIds.find((p: string) => p !== currentUser?.id);
      const partner = users.find((u) => u.id === partnerId);
      currentTargetName = partner ? `Direct Message with @${partner.name}` : 'Direct Message';
    }

    const promptLower = userPrompt.toLowerCase();
    const mentionedChannel = channels.find(
      (c) =>
        promptLower.includes(c.name.toLowerCase()) ||
        promptLower.includes(`#${c.name.toLowerCase()}`)
    );

    let extraChannelContext = '';
    if (mentionedChannel && mentionedChannel.id !== activeView.id) {
      const channelMsgs = messages
        .filter((m) => m.conversationId === mentionedChannel.id)
        .slice(-35);

      const formattedOther = channelMsgs
        .map((m) => {
          const sender = users.find((u) => u.id === m.senderId)?.name || 'Member';
          const time = new Date(m.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `[${time}] ${sender}: ${m.content}`;
        })
        .join('\n');

      extraChannelContext = `\nMESSAGES IN #${mentionedChannel.name}:\n${
        formattedOther || '(No messages in this channel yet)'
      }\n`;
    }

    const formattedActive = activeConversationMessages
      .slice(-45)
      .map((m: Message) => {
        const sender =
          users.find((u) => u.id === m.senderId)?.name ||
          (m.senderId === currentUser?.id ? 'You' : 'Member');
        const time = new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `[${time}] ${sender}: ${m.content}`;
      })
      .join('\n');

    const channelNamesList = channels.map((c) => `#${c.name}`).join(', ');
    const memberNamesList = users.map((u) => `@${u.name}`).join(', ');

    return `You are Pulse AI Assistant, the dedicated workspace intelligence and action copilot embedded directly inside the PulseChat web application.
Your SOLE purpose is to serve this workspace ("${activeWorkspace?.name || 'PulseChat Workspace'}"), its members, and its conversations.

CURRENT WORKSPACE CONTEXT:
- Application: PulseChat
- Active Workspace: ${activeWorkspace?.name || 'Workspace'}
- Logged-in User: ${currentUser?.name || 'User'}
- Channels Available: ${channelNamesList || '#general'}
- Workspace Members: ${memberNamesList}
- Currently Active Channel/Chat: ${currentTargetName}

RECENT CONVERSATION MESSAGES IN CURRENT VIEW (${currentTargetName}):
${formattedActive || '(No messages yet in this conversation)'}
${extraChannelContext}

CAPABILITIES & REAL-TIME ACTIONS:
You have native tools available to perform real workspace actions:
- create_channel: Create a new channel and navigate to it
- create_workspace: Create a new workspace and switch to it
- send_message: Send a message to a channel or current conversation
- send_dm: Send a direct message to a team member
- navigate: Switch to a channel or direct message

IMPORTANT OPERATING RULES:
1. NEVER claim that you cannot create workspaces, channels, or send messages. You have native tools to execute them directly.
2. NEVER claim you cannot access workspace messages or discussions. You have full access to the messages provided above.
3. Keep all responses focused, helpful, and directly relevant to PulseChat and team discussions. Use clean Markdown formatting.`;
  };

  const handleStartNewChat = () => {
    const newConv = createNewConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setShowHistory(false);
    addToast('Started new AI conversation', 'info');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewConversation();
        setActiveConvId(fresh.id);
        return [fresh];
      }
      if (activeConvId === id) {
        setActiveConvId(remaining[0].id);
      }
      return remaining;
    });
    setDeleteConfirmId(null);
    addToast('Conversation deleted', 'info');
  };

  const handleResetCurrentChat = () => {
    updateCurrentConversationMessages(() => [WELCOME_MESSAGE]);
    addToast('AI conversation reset', 'info');
  };

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isThinking) return;

    const activeKey = getGroqApiKey();
    if (!activeKey) {
      const keyWarningMsg: AIMessage = {
        id: 'ai-err-' + Date.now(),
        role: 'assistant',
        error: true,
        content:
          '⚠️ **Groq API Key Missing**\n\nPlease add `VITE_GROQ_API_KEY=gsk_...` to your `.env` file to enable AI responses.',
        timestamp: new Date().toISOString(),
      };
      updateCurrentConversationMessages((prev) => [...prev, keyWarningMsg]);
      return;
    }

    const userMsg: AIMessage = {
      id: 'ai-user-' + Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...aiMessages, userMsg];
    updateCurrentConversationMessages(() => updatedMessages);
    setInput('');
    setIsThinking(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const chatResult = await sendGroqChat({
        messages: updatedMessages,
        model: getSavedGroqModel(),
        apiKey: activeKey,
        systemPrompt: buildWebsiteContext(trimmed),
        signal: controller.signal,
      });

      // 1. Process native tool calls
      const toolActionResults: string[] = [];
      if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
        for (const call of chatResult.toolCalls) {
          const resText = executeAIAction({
            action: call.name,
            ...call.arguments,
          });
          if (resText) {
            toolActionResults.push(resText);
          }
        }
      }

      // 2. Also process any fallback pulse-action blocks in text content
      let textContent = processAIResponseWithActions(chatResult.content);

      if (toolActionResults.length > 0) {
        const actionSummary = toolActionResults.join('\n\n');
        textContent = textContent ? `${textContent}\n\n${actionSummary}` : actionSummary;
      }

      if (!textContent) {
        textContent = '✅ Action completed successfully.';
      }

      const assistantMsg: AIMessage = {
        id: 'ai-resp-' + Date.now(),
        role: 'assistant',
        content: textContent,
        timestamp: new Date().toISOString(),
      };

      updateCurrentConversationMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        const abortedMsg: AIMessage = {
          id: 'ai-aborted-' + Date.now(),
          role: 'assistant',
          content: '*(Response generation stopped)*',
          timestamp: new Date().toISOString(),
        };
        updateCurrentConversationMessages((prev) => [...prev, abortedMsg]);
      } else {
        const errorText = err instanceof Error ? err.message : 'Unknown Groq AI error';
        const errorMsg: AIMessage = {
          id: 'ai-err-' + Date.now(),
          role: 'assistant',
          error: true,
          content: `⚠️ **AI Error**: ${errorText}`,
          timestamp: new Date().toISOString(),
        };
        updateCurrentConversationMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  };

  const handleRegenerate = async (msgIndex: number) => {
    if (isThinking) return;
    const priorMessages = aiMessages.slice(0, msgIndex);
    const lastUserMsg = [...priorMessages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    const truncated = aiMessages.slice(0, msgIndex);
    updateCurrentConversationMessages(() => truncated);
    setIsThinking(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const chatResult = await sendGroqChat({
        messages: truncated,
        model: getSavedGroqModel(),
        apiKey: getGroqApiKey(),
        systemPrompt: buildWebsiteContext(lastUserMsg.content),
        signal: controller.signal,
      });

      const toolActionResults: string[] = [];
      if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
        for (const call of chatResult.toolCalls) {
          const resText = executeAIAction({
            action: call.name,
            ...call.arguments,
          });
          if (resText) {
            toolActionResults.push(resText);
          }
        }
      }

      let textContent = processAIResponseWithActions(chatResult.content);
      if (toolActionResults.length > 0) {
        const actionSummary = toolActionResults.join('\n\n');
        textContent = textContent ? `${textContent}\n\n${actionSummary}` : actionSummary;
      }
      if (!textContent) {
        textContent = '✅ Action completed successfully.';
      }

      const assistantMsg: AIMessage = {
        id: 'ai-resp-' + Date.now(),
        role: 'assistant',
        content: textContent,
        timestamp: new Date().toISOString(),
      };

      updateCurrentConversationMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Regeneration failed';
      const errorMsg: AIMessage = {
        id: 'ai-err-' + Date.now(),
        role: 'assistant',
        error: true,
        content: `⚠️ **Regeneration Error**: ${errorText}`,
        timestamp: new Date().toISOString(),
      };
      updateCurrentConversationMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryLast = () => {
    const lastUser = [...aiMessages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const filtered = aiMessages.filter((m) => !m.error);
    updateCurrentConversationMessages(() => filtered);
    handleSendPrompt(lastUser.content);
  };

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    updateCurrentConversationMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const current = m.feedback;
          const next = current === type ? null : type;
          return { ...m, feedback: next };
        }
        return m;
      })
    );
    addToast(type === 'like' ? 'Thank you for your feedback!' : 'Feedback recorded', 'info');
  };

  const handleInsertIntoChat = (content: string) => {
    sendMessage(content);
    addToast('Inserted and shared in current conversation!', 'success');
    setIsAIAssistantOpen(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(input);
    }
  };

  return (
    <aside
      aria-label="AI Assistant"
      className="max-md:fixed max-md:top-12 max-md:bottom-0 max-md:inset-x-0 max-md:w-full max-md:h-[calc(100dvh-48px)] max-md:z-50 md:relative md:w-80 lg:w-96 bg-[#0F1117] border-l border-[#252B36] flex flex-col h-full flex-shrink-0 z-30 animate-fade-in shadow-modal"
    >
      {/* Header */}
      <div className="h-14 border-b border-[#252B36] px-3.5 flex items-center justify-between bg-[#12151C]/90 flex-shrink-0">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          {/* Website's standard AI Bot icon */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4F8CFF] to-[#A855F7] flex items-center justify-center text-white shadow-accent-glow flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#F5F7FA]">
              Pulse AI
            </div>
          </div>
        </div>

        {/* Clean Action Icons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showHistory
                ? 'bg-[#4F8CFF]/20 text-[#4F8CFF]'
                : 'text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25]'
            }`}
            title="Conversation history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={handleStartNewChat}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCurrentChat}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title="Reset current conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAIAssistantOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation History Drawer Overlay */}
      {showHistory && (
        <div className="border-b border-[#252B36] bg-[#12151C] p-3 text-xs space-y-2.5 animate-fade-in shadow-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F5F7FA] text-xs">Conversations</span>
            <button
              onClick={handleStartNewChat}
              className="px-2 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> New Chat
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
            {conversations.map((conv) => {
              const isActive = conv.id === currentConversation.id;
              const isDeleting = deleteConfirmId === conv.id;
              return (
                <div
                  key={conv.id}
                  className={`group px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-[#181C25] border border-[#4F8CFF]/40 text-[#F5F7FA]'
                      : 'hover:bg-[#181C25]/60 text-[#929BAA] hover:text-[#F5F7FA]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowHistory(false);
                    }}
                    className="flex-1 text-left truncate cursor-pointer mr-2"
                  >
                    <div className="font-medium text-xs truncate">
                      {conv.title || 'Untitled Chat'}
                    </div>
                    <div className="text-[10px] text-[#929BAA]/70 font-mono">
                      {conv.messages.length} messages •{' '}
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </button>

                  {isDeleting ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDeleteConversation(conv.id)}
                        className="px-1.5 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-1.5 py-0.5 text-[#929BAA] hover:text-white text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#929BAA] hover:text-red-400 rounded transition-opacity cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Quick Prompt Chips tailored for workspace */}
      <div className="px-3 py-2 border-b border-[#252B36] bg-[#0B0D12]/70 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar flex-shrink-0">
        <button
          onClick={() => handleSendPrompt('Hello! How can you help me in this workspace?')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          👋 Say hello
        </button>
        <button
          onClick={() => handleSendPrompt('Summarize the recent conversation messages in this channel')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          📋 Summarize channel
        </button>
        <button
          onClick={() => handleSendPrompt('Create a new channel called announcements')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          ⚡ Create channel
        </button>
        <button
          onClick={() => handleSendPrompt('Create a new workspace named Project Launch')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          🏢 New workspace
        </button>
        <button
          onClick={() => handleSendPrompt('Help me draft a friendly check-in message for my team')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          ✍️ Draft message
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0B0D12]/30">
        {aiMessages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[94%] sm:max-w-[88%] rounded-2xl p-3.5 text-sm sm:text-xs leading-relaxed shadow-sm transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-br-xs'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/30 text-[#F5F7FA] rounded-bl-xs'
                    : 'bg-[#181C25] border border-[#252B36] text-[#F5F7FA] rounded-bl-xs'
                }`}
              >
                {/* Content rendering */}
                {isUser ? (
                  <div className="select-text whitespace-pre-wrap font-normal text-white">
                    {msg.content}
                  </div>
                ) : (
                  <AIMarkdown content={msg.content} />
                )}

                {/* Assistant Action Strip */}
                {!isUser && msg.id !== 'ai-welcome' && (
                  <div className="mt-3 pt-2.5 border-t border-[#252B36] flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInsertIntoChat(msg.content)}
                        className="text-[#4F8CFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer text-[11px]"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" /> Post to Channel
                      </button>

                      {msg.error && (
                        <button
                          onClick={handleRetryLast}
                          className="px-2 py-0.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Thumbs up / down feedback */}
                      <button
                        onClick={() => handleFeedback(msg.id, 'like')}
                        className={`p-1 rounded hover:bg-[#12151C] transition-colors cursor-pointer ${
                          msg.feedback === 'like' ? 'text-[#32C48D]' : 'text-[#929BAA] hover:text-[#F5F7FA]'
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'dislike')}
                        className={`p-1 rounded hover:bg-[#12151C] transition-colors cursor-pointer ${
                          msg.feedback === 'dislike' ? 'text-red-400' : 'text-[#929BAA] hover:text-[#F5F7FA]'
                        }`}
                        title="Poor response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Regenerate */}
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="p-1 text-[#929BAA] hover:text-[#F5F7FA] rounded hover:bg-[#12151C] transition-colors cursor-pointer"
                        title="Regenerate response"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[#929BAA] hover:text-[#F5F7FA] p-1 rounded hover:bg-[#12151C] transition-colors cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[#32C48D]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-[#929BAA] px-1 mt-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center justify-between p-3.5 bg-[#181C25] border border-[#252B36] rounded-2xl rounded-bl-xs max-w-[80%]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce" />
              <span className="text-xs text-[#929BAA] font-mono ml-1.5">
                Thinking...
              </span>
            </div>
            <button
              onClick={handleStopGeneration}
              className="text-[#929BAA] hover:text-red-400 p-1 rounded hover:bg-[#12151C] transition-colors cursor-pointer"
              title="Stop generating"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* Input Composer - Symmetrical vertical alignment & even placeholder spacing */}
      <div className="p-3 pb-5 sm:p-4 border-t border-[#252B36] bg-[#0F1117] flex-shrink-0 sticky bottom-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="bg-[#181C25] border border-[#252B36] focus-within:border-[#4F8CFF] rounded-xl px-3 py-2 flex items-center space-x-2 transition-colors min-h-[44px]"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-sm sm:text-xs text-white placeholder-[#929BAA] outline-none resize-none p-0 m-0 leading-normal block"
            style={{ minHeight: '18px', maxHeight: '100px' }}
          />
          {isThinking ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="p-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all cursor-pointer flex-shrink-0"
              title="Stop generation"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer flex-shrink-0 ${
                input.trim()
                  ? 'bg-gradient-to-r from-[#4F8CFF] to-[#A855F7] text-white hover:opacity-90 shadow-accent-glow'
                  : 'bg-[#12151C] text-[#929BAA]/30 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </aside>
  );
};
