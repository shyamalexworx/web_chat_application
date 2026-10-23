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
import type { AIMessage, AIConversation, Message, AIPendingMessageAction } from '../../types';
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
    workspaces,
    activeWorkspace,
    createWorkspace,
    setActiveWorkspaceId,
    users,
    t,
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
   * Note: For sending messages to channels or DMs, a pendingAction confirmation is required from user.
   */
  const executeAIAction = (actionJson: {
    action: string;
    name?: string;
    description?: string;
    topic?: string;
    isPrivate?: boolean;
    channelName?: string;
    userName?: string;
    workspaceName?: string;
    content?: string;
    targetLanguage?: string;
  }): { text: string; pendingAction?: AIPendingMessageAction } => {
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
        return { text: `✅ **Action executed**: Created and switched to new workspace **${wsName}**.` };
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
        return { text: `✅ **Action executed**: Created and navigated to channel **#${rawName}**.` };
      }

      // 3. Prepare Send Message to a Channel (REQUIRES USER CONFIRMATION)
      if (actionJson.action === 'send_message') {
        const msgText = actionJson.content?.trim();
        if (!msgText) return { text: '⚠️ No message content specified.' };

        let targetCh = null;
        if (actionJson.channelName) {
          const chName = actionJson.channelName.replace(/^#/, '').toLowerCase().trim();
          targetCh = channels.find((c) => c.name.toLowerCase() === chName);
        }
        if (!targetCh && activeView.type === 'channel') {
          targetCh = channels.find((c) => c.id === activeView.id);
        }
        if (!targetCh) {
          targetCh = channels[0];
        }

        const chNameStr = targetCh ? `#${targetCh.name}` : '#channel';
        return {
          text: `I have prepared your message for **${chNameStr}**. Please confirm below before I send it to the channel:`,
          pendingAction: {
            type: 'channel',
            targetId: targetCh ? targetCh.id : '',
            targetName: chNameStr,
            content: msgText,
            status: 'pending',
          },
        };
      }

      // 4. Prepare Send Direct Message to a Person (REQUIRES USER CONFIRMATION)
      if (actionJson.action === 'send_dm') {
        const targetUserName = actionJson.userName?.replace(/^@/, '').toLowerCase().trim();
        const msgText = actionJson.content?.trim();
        if (!targetUserName || !msgText) return { text: '⚠️ Missing recipient name or message content.' };

        const targetUser = users.find(
          (u) =>
            u.name.toLowerCase().includes(targetUserName) ||
            u.email.toLowerCase().includes(targetUserName)
        );

        if (!targetUser) {
          const availableList = users.map((u) => u.name).join(', ');
          return { text: `⚠️ Could not find team member matching "${actionJson.userName}". Available members: ${availableList}` };
        }

        return {
          text: `I have prepared your direct message for **@${targetUser.name}**. Please confirm below before I send it:`,
          pendingAction: {
            type: 'dm',
            targetId: targetUser.id,
            targetName: `@${targetUser.name}`,
            content: msgText,
            status: 'pending',
          },
        };
      }

      // 5. Start / Open Personal Chat with a User
      if (
        actionJson.action === 'start_personal_chat' ||
        actionJson.action === 'create_dm' ||
        actionJson.action === 'open_dm'
      ) {
        const targetUserName = (actionJson.userName || actionJson.name || '').replace(/^@/, '').toLowerCase().trim();
        if (!targetUserName) return { text: '⚠️ Missing team member name.' };

        const targetUser = users.find(
          (u) =>
            u.name.toLowerCase().includes(targetUserName) ||
            u.email.toLowerCase().includes(targetUserName)
        );

        if (!targetUser) {
          const availableList = users.map((u) => u.name).join(', ');
          return { text: `⚠️ Could not find team member matching "${targetUserName}". Available members: ${availableList}` };
        }

        const dmId = createOrOpenDM([targetUser.id]);
        if (dmId) {
          setActiveView({ type: 'dm', id: dmId });
          addToast(`Opened personal chat with @${targetUser.name}!`, 'success');
          return { text: `✅ **Action executed**: Opened personal chat with **@${targetUser.name}**.` };
        }
      }

      // 6. Navigate / Switch to a Workspace, Channel, or DM
      if (actionJson.action === 'switch_workspace' || actionJson.action === 'change_workspace' || (actionJson.action === 'navigate' && actionJson.workspaceName)) {
        const rawWs = (actionJson.workspaceName || actionJson.name || '').replace(/workspace$/i, '').trim().toLowerCase();
        const targetWs = workspaces.find((w) =>
          w.name.toLowerCase() === rawWs ||
          w.name.toLowerCase().includes(rawWs) ||
          rawWs.includes(w.name.toLowerCase())
        );
        if (targetWs) {
          setActiveWorkspaceId(targetWs.id);
          addToast(`Switched to workspace "${targetWs.name}"`, 'success');
          return { text: `✅ Switched to workspace **${targetWs.name}**.` };
        }
        const available = workspaces.map((w) => `"${w.name}"`).join(', ');
        return { text: `⚠️ Workspace "${actionJson.workspaceName || actionJson.name}" not found. Available workspaces: ${available}` };
      }

      if (actionJson.action === 'navigate') {
        if (actionJson.channelName) {
          const chName = actionJson.channelName.replace(/^#/, '').toLowerCase().trim();
          const targetCh = channels.find((c) => c.name.toLowerCase() === chName);
          if (targetCh) {
            setActiveView({ type: 'channel', id: targetCh.id });
            return { text: `✅ Switched to channel **#${targetCh.name}**.` };
          }
        }
        if (actionJson.userName) {
          const uName = actionJson.userName.replace(/^@/, '').toLowerCase().trim();
          const targetUser = users.find((u) => u.name.toLowerCase().includes(uName));
          if (targetUser) {
            const dmId = createOrOpenDM([targetUser.id]);
            setActiveView({ type: 'dm', id: dmId });
            return { text: `✅ Opened direct message with **@${targetUser.name}**.` };
          }
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Action failed';
      return { text: `⚠️ Could not execute action: ${errMsg}` };
    }
    return { text: '' };
  };

  /**
   * Processes the raw AI response, extracts and executes any pulse-action blocks
   */
  const processAIResponseWithActions = (
    rawResponse: string
  ): { text: string; pendingAction?: AIPendingMessageAction } => {
    const actionRegex = /```(?:pulse-action|json-action)\s*([\s\S]*?)\s*```/;
    const match = actionRegex.exec(rawResponse);

    if (match) {
      try {
        const actionJson = JSON.parse(match[1].trim());
        const actionRes = executeAIAction(actionJson);
        const cleanContent = rawResponse.replace(actionRegex, '').trim();
        const combinedText = cleanContent
          ? `${cleanContent}\n\n${actionRes.text}`
          : actionRes.text;
        return { text: combinedText, pendingAction: actionRes.pendingAction };
      } catch (parseErr) {
        console.warn('Failed to parse AI action JSON:', parseErr);
      }
    }
    return { text: rawResponse };
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

    // Identify target channel/chat for summarization or discussion
    const targetChannel = mentionedChannel || (activeView.type === 'channel' ? channels.find((c) => c.id === activeView.id) : null);
    const targetMsgs = targetChannel
      ? messages.filter((m) => m.conversationId === targetChannel.id && !m.hiddenForUserIds?.includes(currentUser?.id || ''))
      : activeConversationMessages;

    const formattedTarget = targetMsgs
      .slice(-50)
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

    let extraChannelContext = '';
    if (mentionedChannel && mentionedChannel.id !== activeView.id) {
      extraChannelContext = `\nFOCUSED CHANNEL: #${mentionedChannel.name} (${targetMsgs.length} messages)\n`;
    }

    const channelNamesList = channels.map((c) => `#${c.name}`).join(', ');
    const memberNamesList = users.map((u) => `@${u.name}`).join(', ');

    return `You are Pulse AI Assistant, the dedicated workspace intelligence and action copilot embedded directly inside the PulseChat web application.
Your SOLE purpose is to serve this workspace ("${activeWorkspace?.name || 'PulseChat Workspace'}"), its members, and its conversations.

CURRENT WORKSPACE CONTEXT:
- Application: PulseChat
- Active Workspace: ${activeWorkspace?.name || 'Workspace'}
- Available Workspaces: ${workspaces.map((w) => `"${w.name}"`).join(', ')}
- Logged-in User: ${currentUser?.name || 'User'}
- Channels Available: ${channelNamesList || '#general'}
- Workspace Members: ${memberNamesList}
- Currently Focused Channel/Chat: ${targetChannel ? '#' + targetChannel.name : currentTargetName}
${extraChannelContext}
================================================================================
WORKSPACE CONVERSATION MESSAGES TO ANALYZE / SUMMARIZE (${targetChannel ? '#' + targetChannel.name : currentTargetName}):
${formattedTarget || '(No messages in this channel/conversation yet)'}
================================================================================

CAPABILITIES & REAL-TIME ACTIONS:
You have native tools available to perform real workspace actions:
- switch_workspace: Switch or change active workspace to an existing workspace
- create_channel: Create a new channel and navigate to it
- create_workspace: Create a new workspace and switch to it
- start_personal_chat: Open/create a personal direct message conversation with a team member
- send_message: Post a message to a channel (NOTE: this requires user confirmation before sending)
- send_dm: Send a direct message to a team member (NOTE: this requires user confirmation before sending)
- summarize_channel: Summarize discussion in a channel
- translate_message: Translate a message to another language

CRITICAL OPERATING RULES:
1. SUMMARIZATION RULE: When the user asks to summarize a channel, recap discussions, or explain what happened in a channel:
   - You MUST summarize ONLY the messages listed under "WORKSPACE CONVERSATION MESSAGES TO ANALYZE / SUMMARIZE" above.
   - You must NEVER summarize this assistant conversation history or your own past answers.
   - If the channel has 0 messages, state clearly: "The channel #${targetChannel?.name || 'selected'} does not have any messages yet to summarize."
   - Structure summaries clearly: Main Topics Discussed, Key Decisions, and Action Items.
2. MESSAGE SENDING RULE: When the user asks to send a message to a channel or personal chat, inform the user you have prepared the message and require their confirmation before posting.
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

  const handleConfirmPendingMessage = (msgId: string) => {
    const msg = aiMessages.find((m) => m.id === msgId);
    if (!msg || !msg.pendingAction || msg.pendingAction.status !== 'pending') return;

    const { type, targetId, targetName, content } = msg.pendingAction;
    if (type === 'channel') {
      if (targetId && (activeView.type !== 'channel' || activeView.id !== targetId)) {
        setActiveView({ type: 'channel', id: targetId });
      }
      setTimeout(() => {
        sendMessage(content);
      }, 150);
    } else {
      if (targetId) {
        const dmId = createOrOpenDM([targetId]);
        if (dmId) {
          setActiveView({ type: 'dm', id: dmId });
        }
      }
      setTimeout(() => {
        sendMessage(content);
      }, 150);
    }

    updateCurrentConversationMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          return {
            ...m,
            pendingAction: { ...m.pendingAction, status: 'confirmed' },
          };
        }
        return m;
      })
    );
    addToast(`Message sent to ${targetName}!`, 'success');
  };

  const handleCancelPendingMessage = (msgId: string) => {
    updateCurrentConversationMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          return {
            ...m,
            pendingAction: { ...m.pendingAction, status: 'cancelled' },
          };
        }
        return m;
      })
    );
    addToast('Message sending cancelled', 'info');
  };

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isThinking) return;

    // Check conversational confirmation/cancellation for pending action
    const lastAssistantMsg = [...aiMessages].reverse().find((m) => m.role === 'assistant');
    if (
      lastAssistantMsg &&
      lastAssistantMsg.pendingAction &&
      lastAssistantMsg.pendingAction.status === 'pending'
    ) {
      const isAffirmative = /^(yes|confirm|send|send it|sure|do it|ok|okay|yep|proceed|go ahead)/i.test(trimmed);
      const isNegative = /^(no|cancel|stop|dont send|don't send|nevermind|abort)/i.test(trimmed);

      if (isAffirmative) {
        handleConfirmPendingMessage(lastAssistantMsg.id);
        const userMsg: AIMessage = {
          id: 'ai-user-' + Date.now(),
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };
        const confirmedAssistantMsg: AIMessage = {
          id: 'ai-resp-' + (Date.now() + 1),
          role: 'assistant',
          content: `✅ Sent your message to **${lastAssistantMsg.pendingAction.targetName}**:\n> "${lastAssistantMsg.pendingAction.content}"`,
          timestamp: new Date().toISOString(),
        };
        updateCurrentConversationMessages((prev) => [...prev, userMsg, confirmedAssistantMsg]);
        setInput('');
        return;
      }

      if (isNegative) {
        handleCancelPendingMessage(lastAssistantMsg.id);
        const userMsg: AIMessage = {
          id: 'ai-user-' + Date.now(),
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };
        const cancelledAssistantMsg: AIMessage = {
          id: 'ai-resp-' + (Date.now() + 1),
          role: 'assistant',
          content: `❌ Cancelled. The message was not sent to **${lastAssistantMsg.pendingAction.targetName}**.`,
          timestamp: new Date().toISOString(),
        };
        updateCurrentConversationMessages((prev) => [...prev, userMsg, cancelledAssistantMsg]);
        setInput('');
        return;
      }
    }

    // Summarization request interceptor: ensures ONLY channel messages are summarized
    const isSummaryRequest = /(?:summariz|summary|recap|overview|what happened|catch up)/i.test(trimmed);
    if (isSummaryRequest) {
      const promptLower = trimmed.toLowerCase();
      const mentionedChannel = channels.find(
        (c) =>
          promptLower.includes(c.name.toLowerCase()) ||
          promptLower.includes(`#${c.name.toLowerCase()}`)
      );
      const targetChannel =
        mentionedChannel ||
        (activeView.type === 'channel' ? channels.find((c) => c.id === activeView.id) : null);

      if (targetChannel) {
        const channelMsgs = messages.filter(
          (m) => m.conversationId === targetChannel.id && !m.hiddenForUserIds?.includes(currentUser?.id || '')
        );

        if (channelMsgs.length === 0) {
          const userMsg: AIMessage = {
            id: 'ai-user-' + Date.now(),
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
          };
          const emptyAssistantMsg: AIMessage = {
            id: 'ai-resp-' + Date.now(),
            role: 'assistant',
            content: `ℹ️ The channel **#${targetChannel.name}** has no messages yet to summarize.\n\nOnce team members chat in this channel, ask me again and I will provide a structured summary of topics and decisions!`,
            timestamp: new Date().toISOString(),
          };
          updateCurrentConversationMessages((prev) => [...prev, userMsg, emptyAssistantMsg]);
          setInput('');
          return;
        }
      }
    }

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

    // Instant proactive execution for workspace change commands
    const wsSwitchRegex = /(?:change|switch|go|move)\s+(?:to\s+)?(?:the\s+)?(?:workspace\s+)?["']?([^"'\n\.\?]+?)["']?(?:\s+workspace)?$/i;
    const switchMatch = trimmed.match(wsSwitchRegex);
    if (switchMatch && switchMatch[1]) {
      const candidate = switchMatch[1].replace(/workspace$/i, '').trim().toLowerCase();
      const matchedWs = workspaces.find((w) =>
        w.name.toLowerCase() === candidate ||
        w.name.toLowerCase().includes(candidate) ||
        candidate.includes(w.name.toLowerCase())
      );
      if (matchedWs) {
        setActiveWorkspaceId(matchedWs.id);
        addToast(`Switched to workspace "${matchedWs.name}"`, 'success');
        const assistantMsg: AIMessage = {
          id: 'ai-resp-' + Date.now(),
          role: 'assistant',
          content: `✅ Switched to workspace **${matchedWs.name}**.\n\nAll channels, teammates, and discussions for **${matchedWs.name}** are now active in your workspace. What would you like to explore next?`,
          timestamp: new Date().toISOString(),
        };
        updateCurrentConversationMessages(() => [...updatedMessages, assistantMsg]);
        return;
      }
    }

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
      let pendingActionToAttach: AIPendingMessageAction | undefined = undefined;

      if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
        for (const call of chatResult.toolCalls) {
          const actionRes = executeAIAction({
            action: call.name,
            ...call.arguments,
          });
          if (actionRes.text) {
            toolActionResults.push(actionRes.text);
          }
          if (actionRes.pendingAction) {
            pendingActionToAttach = actionRes.pendingAction;
          }
        }
      }

      // 2. Also process any fallback pulse-action blocks in text content
      const fallbackResult = processAIResponseWithActions(chatResult.content);
      let textContent = fallbackResult.text;
      if (fallbackResult.pendingAction && !pendingActionToAttach) {
        pendingActionToAttach = fallbackResult.pendingAction;
      }

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
        pendingAction: pendingActionToAttach,
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
      let pendingActionToAttach: AIPendingMessageAction | undefined = undefined;

      if (chatResult.toolCalls && chatResult.toolCalls.length > 0) {
        for (const call of chatResult.toolCalls) {
          const actionRes = executeAIAction({
            action: call.name,
            ...call.arguments,
          });
          if (actionRes.text) {
            toolActionResults.push(actionRes.text);
          }
          if (actionRes.pendingAction) {
            pendingActionToAttach = actionRes.pendingAction;
          }
        }
      }

      const fallbackResult = processAIResponseWithActions(chatResult.content);
      let textContent = fallbackResult.text;
      if (fallbackResult.pendingAction && !pendingActionToAttach) {
        pendingActionToAttach = fallbackResult.pendingAction;
      }

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
        pendingAction: pendingActionToAttach,
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
      className="max-md:fixed max-md:top-12 max-md:bottom-0 max-md:inset-x-0 max-md:w-full max-md:h-[calc(100dvh-48px)] max-md:z-50 md:relative md:w-80 lg:w-96 bg-white dark:bg-[#0F1117] border-l border-slate-200 dark:border-[#252B36] flex flex-col h-full flex-shrink-0 z-30 animate-fade-in shadow-modal"
    >
      {/* Header */}
      <div className="h-11 min-h-[44px] border-b border-slate-200 dark:border-[#252B36] px-3 flex items-center justify-between bg-white dark:bg-[#12151C]/90 flex-shrink-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          {/* Website's standard AI Bot icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#4F8CFF] to-[#A855F7] flex items-center justify-center text-white shadow-accent-glow flex-shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 dark:text-[#F5F7FA]">
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
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] dark:hover:bg-[#181C25]'
            }`}
            title={t('conversation_history')}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={handleStartNewChat}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] dark:hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title={t('start_new_conversation')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCurrentChat}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] dark:hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title={t('reset_current_conversation')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAIAssistantOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] dark:hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title={t('cancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation History Drawer Overlay */}
      {showHistory && (
        <div className="border-b border-slate-200 dark:border-[#252B36] bg-white dark:bg-[#12151C] p-3 text-xs space-y-2.5 animate-fade-in shadow-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-[#F5F7FA] text-xs">{t('conversations')}</span>
            <button
              onClick={handleStartNewChat}
              className="px-2 py-1 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> {t('new_chat')}
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
                      ? 'bg-slate-100 dark:bg-[#181C25] border border-[#4F8CFF]/40 text-slate-900 dark:text-[#F5F7FA]'
                      : 'hover:bg-slate-100 dark:hover:bg-[#181C25]/60 text-slate-600 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA]'
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
                    <div className="text-[10px] text-slate-400 dark:text-[#929BAA]/70 font-mono">
                      {conv.messages.length} messages •{' '}
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </button>

                  {isDeleting ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDeleteConversation(conv.id)}
                        className="px-1.5 py-0.5 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 dark:text-[#929BAA] dark:hover:text-white text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 dark:text-[#929BAA] dark:hover:text-red-400 rounded transition-opacity cursor-pointer"
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
      <div className="px-2.5 py-1.5 border-b border-slate-200 dark:border-[#252B36] bg-slate-50 dark:bg-[#0B0D12]/70 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar flex-shrink-0">
        <button
          onClick={() => handleSendPrompt('Hello! How can you help me in this workspace?')}
          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-[#181C25] dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF]/50 text-slate-700 dark:text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          👋 Say hello
        </button>
        <button
          onClick={() => handleSendPrompt('Summarize the recent conversation messages in this channel')}
          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-[#181C25] dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF]/50 text-slate-700 dark:text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          📋 Summarize channel
        </button>
        <button
          onClick={() => handleSendPrompt('Create a new channel called announcements')}
          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-[#181C25] dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF]/50 text-slate-700 dark:text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          ⚡ Create channel
        </button>
        <button
          onClick={() => handleSendPrompt('Create a new workspace named Project Launch')}
          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-[#181C25] dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF]/50 text-slate-700 dark:text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          🏢 New workspace
        </button>
        <button
          onClick={() => handleSendPrompt('Help me draft a friendly check-in message for my team')}
          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-[#181C25] dark:hover:bg-[#252B36] border border-slate-200 dark:border-[#252B36] hover:border-[#4F8CFF]/50 text-slate-700 dark:text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          ✍️ Draft message
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#F8FAFC] dark:bg-[#0B0D12]">
        {aiMessages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[94%] sm:max-w-[88%] rounded-xl px-3 py-2 text-xs leading-snug shadow-sm transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-br-xs'
                    : msg.error
                    ? 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-[#F5F7FA] rounded-bl-xs'
                    : 'bg-white dark:bg-[#181C25] border border-slate-200/90 dark:border-[#252B36] text-slate-800 dark:text-[#F5F7FA] rounded-bl-xs shadow-2xs'
                }`}
              >
                {/* Content rendering */}
                {isUser ? (
                  <div className="select-text whitespace-pre-wrap font-normal text-white">
                    {msg.content}
                  </div>
                ) : (
                  <>
                    <AIMarkdown content={msg.content} />

                    {/* Pending Message Confirmation Card (requires user confirmation before sending) */}
                    {msg.pendingAction && (
                      <div className="mt-2.5 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Send className="w-3.5 h-3.5" />
                            <span>{t('confirm_send_message')}</span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              msg.pendingAction.status === 'confirmed'
                                ? 'bg-[#32C48D]/20 text-[#32C48D]'
                                : msg.pendingAction.status === 'cancelled'
                                ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-amber-500/20 text-amber-500'
                            }`}
                          >
                            {msg.pendingAction.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          <span className="text-slate-500 dark:text-[#929BAA] font-medium">{t('recipient')}:</span>{' '}
                          <strong className="text-slate-900 dark:text-[#F5F7FA]">{msg.pendingAction.targetName}</strong>
                        </div>

                        <div className="p-2 bg-white/80 dark:bg-[#12151C] rounded border border-slate-200 dark:border-[#252B36] text-xs text-slate-800 dark:text-[#F5F7FA] italic break-words">
                          "{msg.pendingAction.content}"
                        </div>

                        {msg.pendingAction.status === 'pending' ? (
                          <div className="flex items-center space-x-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleConfirmPendingMessage(msg.id)}
                              className="px-2.5 py-1 bg-[#32C48D] hover:bg-[#28A775] text-white text-xs font-semibold rounded flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{t('confirm_and_send')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelPendingMessage(msg.id)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-[#181C25] hover:bg-slate-300 dark:hover:bg-[#252B36] text-slate-700 dark:text-[#929BAA] hover:text-slate-900 dark:hover:text-[#F5F7FA] border border-slate-300 dark:border-[#252B36] text-xs font-semibold rounded flex items-center space-x-1.5 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>{t('cancel')}</span>
                            </button>
                          </div>
                        ) : msg.pendingAction.status === 'confirmed' ? (
                          <div className="text-xs text-[#32C48D] font-medium flex items-center space-x-1.5 pt-0.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Message sent to {msg.pendingAction.targetName}!</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-[#929BAA] italic pt-0.5">
                            {t('send_cancelled')}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Assistant Action Strip */}
                {!isUser && msg.id !== 'ai-welcome' && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#252B36] flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleInsertIntoChat(msg.content)}
                        className="text-[#2563EB] dark:text-[#4F8CFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer text-[11px]"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" /> Post to Channel
                      </button>

                      {msg.error && (
                        <button
                          onClick={handleRetryLast}
                          className="px-2 py-0.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-300 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Thumbs up / down feedback */}
                      <button
                        onClick={() => handleFeedback(msg.id, 'like')}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-[#12151C] transition-colors cursor-pointer ${
                          msg.feedback === 'like' ? 'text-[#32C48D]' : 'text-slate-400 dark:text-[#929BAA] hover:text-slate-700 dark:hover:text-[#F5F7FA]'
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'dislike')}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-[#12151C] transition-colors cursor-pointer ${
                          msg.feedback === 'dislike' ? 'text-red-500' : 'text-slate-400 dark:text-[#929BAA] hover:text-slate-700 dark:hover:text-[#F5F7FA]'
                        }`}
                        title="Poor response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Regenerate */}
                      <button
                        onClick={() => handleRegenerate(index)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] rounded hover:bg-slate-100 dark:hover:bg-[#12151C] transition-colors cursor-pointer"
                        title="Regenerate response"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-slate-400 hover:text-slate-700 dark:text-[#929BAA] dark:hover:text-[#F5F7FA] p-1 rounded hover:bg-slate-100 dark:hover:bg-[#12151C] transition-colors cursor-pointer"
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

              <span className="text-[10px] text-slate-400 dark:text-[#929BAA] px-1 mt-1 font-mono">
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
          <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#181C25] border border-slate-200 dark:border-[#252B36] rounded-xl rounded-bl-xs max-w-[80%] shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce" />
              <span className="text-xs text-slate-500 dark:text-[#929BAA] font-mono ml-1.5">
                {t('thinking')}
              </span>
            </div>
            <button
              onClick={handleStopGeneration}
              className="text-slate-400 hover:text-red-500 dark:text-[#929BAA] dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-[#12151C] transition-colors cursor-pointer"
              title={t('stop_generation')}
            >
              <StopCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="h-1" />
      </div>

      {/* Input Composer - Symmetrical vertical alignment & even placeholder spacing */}
      <div className="p-2 sm:p-2.5 border-t border-slate-200 dark:border-[#252B36] bg-white dark:bg-[#0F1117] flex-shrink-0 sticky bottom-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="bg-slate-100 hover:bg-slate-200/50 focus-within:bg-white dark:bg-[#181C25] dark:hover:bg-[#181C25] dark:focus-within:bg-[#181C25] border border-slate-200 dark:border-[#252B36] focus-within:border-[#4F8CFF] rounded-lg px-2.5 py-1.5 flex items-center space-x-2 transition-colors min-h-[38px] shadow-2xs"
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
            placeholder={t('ask_ai_placeholder')}
            className="flex-1 bg-transparent text-sm sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#929BAA] outline-none resize-none p-0 m-0 leading-normal block"
            style={{ minHeight: '18px', maxHeight: '100px' }}
          />
          {isThinking ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="p-1 rounded-md text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-300 transition-all cursor-pointer flex-shrink-0"
              title={t('stop_generation')}
            >
              <StopCircle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-1 rounded-md text-xs transition-all cursor-pointer flex-shrink-0 ${
                input.trim()
                  ? 'bg-gradient-to-r from-[#4F8CFF] to-[#A855F7] text-white hover:opacity-90 shadow-accent-glow'
                  : 'bg-slate-200 text-slate-400 dark:bg-[#12151C] dark:text-[#929BAA]/30 cursor-not-allowed'
              }`}
              title={t('send')}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>
    </aside>
  );
};
