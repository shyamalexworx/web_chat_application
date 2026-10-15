import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  X,
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  ArrowRight,
  RotateCcw,
  Code2,
  FileText,
  Lightbulb,
  CornerDownLeft,
} from 'lucide-react';
import type { AIMessage } from '../../types';

const INITIAL_AI_MESSAGES: AIMessage[] = [
  {
    id: 'ai-welcome',
    role: 'assistant',
    content: "👋 Hi there! I'm your AI Assistant. You can chat with me, ask questions, or ask me to help write messages. How are you doing today?",
    timestamp: new Date().toISOString(),
  },
];

// Simple, natural basic-level conversational responder
const getBasicConversationResponse = (promptText: string, channelName?: string): string => {
  const text = promptText.trim().toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|hiya|howdy|yo|good\s*(morning|afternoon|evening))\b/i.test(text)) {
    const greetings = [
      "Hello! 👋 How's your day going? What can I help you with today?",
      "Hi there! 😊 Great to chat with you. How can I help you out today?",
      "Hey! Hope you're having a good day! Feel free to ask me anything or just chat.",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // How are you
  if (/how\s+are\s+you|how['’]s\s+it\s+going|how\s+do\s+you\s+do|how\s+are\s+things/i.test(text)) {
    return "I'm doing great, thank you for asking! 😊 How are things going on your end?";
  }

  // User says they are good/fine/great
  if (/i['’]?m\s*(good|fine|doing\s*well|great|okay|alright)|doing\s*(good|well|great)/i.test(text)) {
    return "That's wonderful to hear! ✨ Is there anything I can help you with in your workspace today, or are you just exploring?";
  }

  // User says they are tired/busy/stressed
  if (/tired|busy|stressed|exhausted|overwhelmed/i.test(text)) {
    return "Hang in there! Workspace days can get busy. Take a short breather or grab some water. If there's any message or note I can help you draft to take some weight off your shoulders, just let me know! ☕";
  }

  // Who are you / What is your name
  if (/who\s+are\s+you|what\s+is\s+your\s+name|what\s+are\s+you/i.test(text)) {
    return "I'm your AI Assistant here in PulseChat! 🤖\n\nYou can chat with me naturally, ask questions, have me draft messages, or get quick summaries of your channels. I'm here to make work a little easier and more fun!";
  }

  // What can you do / Help
  if (/what\s+can\s+you\s+do|help|features|what\s+do\s+you\s+do/i.test(text)) {
    return "Here are a few simple things I can help you with:\n\n• **Casual Chat**: Ask me anything or just say hi!\n• **Draft Messages**: Tell me what you want to say to a teammate and I'll draft it for you.\n• **Summarize**: Type 'summarize' to get a quick recap of recent messages.\n• **Tell a Joke**: Need a quick smile? Just ask for a joke! 😄\n• **Explain Topics**: Ask me to explain a concept simply.\n\nWhat would you like to try?";
  }

  // Jokes
  if (/joke|funny|laugh/i.test(text)) {
    const jokes = [
      "Why do programmers prefer dark mode?\nBecause light attracts bugs! 🐛😄",
      "Why did the computer catch a cold?\nBecause it left its Windows open! 🪟🤧",
      "How many programmers does it take to change a light bulb?\nNone, that's a hardware problem! 💡💻",
      "Why was the JavaScript developer sad?\nBecause they didn't know how to 'null' their feelings! 😂",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Thank you
  if (/thank|thanks|thx|appreciate/i.test(text)) {
    return "You're very welcome! 😊 Always happy to help. Let me know if you need anything else!";
  }

  // Goodbyes
  if (/bye|goodbye|see\s+ya|talk\s+to\s+you\s+later|cya/i.test(text)) {
    return "Goodbye! Have a wonderful day ahead! 👋 Feel free to message me whenever you need anything.";
  }

  // Draft a message
  if (/draft|write\s+a\s+message|compose|send\s+a\s+message/i.test(text)) {
    return `Here is a friendly draft you can use:\n\n"Hi team! Just wanted to check in and see how everyone is progressing today. Let me know if you need any feedback or if we should sync up!"\n\nClick **Post to Channel** below to share it directly, or let me know if you want to change it! ✍️`;
  }

  // Summarize channel
  if (/summarize|summary|recap/i.test(text)) {
    return `📋 **Quick Recap for #${channelName || 'this conversation'}**:\n\n• Team members have shared recent project updates and checked in on task status.\n• Communication has been clear with no blockers reported.\n• Everything is moving forward smoothly!`;
  }

  // Time / Date
  if (/time|date|today/i.test(text)) {
    const now = new Date();
    return `Today is **${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**, and the current time is **${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}**. 🕒`;
  }

  // General questions or statements
  return `That makes sense! You asked about: "${promptText.trim()}".\n\nI'm here to help—would you like me to draft a quick message about this, explain it more simply, or chat about something else? 😊`;
};

export const AIAssistantDrawer: React.FC = () => {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    activeView,
    channels,
    activeConversationMessages,
    sendMessage,
    addToast,
  } = useChat();

  const [aiMessages, setAiMessages] = useState<AIMessage[]>(INITIAL_AI_MESSAGES);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChannel = activeView.type === 'channel'
    ? channels.find((c) => c.id === activeView.id)
    : null;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [aiMessages, isThinking]);

  if (!isAIAssistantOpen) return null;

  const handleResetChat = () => {
    setAiMessages(INITIAL_AI_MESSAGES);
    addToast('AI chat conversation restarted', 'info');
  };

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: AIMessage = {
      id: 'ai-user-' + Date.now(),
      role: 'user',
      content: promptText.trim(),
      timestamp: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Natural conversation reply with short, friendly delay
    setTimeout(() => {
      const aiResponseText = getBasicConversationResponse(promptText, activeChannel?.name);

      const assistantMsg: AIMessage = {
        id: 'ai-resp-' + Date.now(),
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 700);
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

  return (
    <aside 
      aria-label="AI Assistant"
      className="max-md:fixed max-md:top-12 max-md:bottom-0 max-md:inset-x-0 max-md:w-full max-md:h-[calc(100dvh-48px)] max-md:z-50 md:relative md:w-80 lg:w-96 bg-[#0F1117] border-l border-[#252B36] flex flex-col h-full flex-shrink-0 z-30 animate-fade-in shadow-modal"
    >
      {/* Header */}
      <div className="h-14 border-b border-[#252B36] px-4 flex items-center justify-between bg-[#12151C]/90 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4F8CFF] to-[#A855F7] flex items-center justify-center text-white shadow-accent-glow flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#F5F7FA] flex items-center gap-1.5">
              Pulse AI Assistant
              <span className="text-[9px] bg-[#32C48D]/20 text-[#32C48D] px-1.5 py-0.2 rounded font-mono font-semibold">
                Online
              </span>
            </div>
            <div className="text-[11px] text-[#929BAA]">
              Friendly workspace assistant
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetChat}
            className="p-2 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title="Restart conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAIAssistantOpen(false)}
            className="p-2 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#181C25] rounded-lg transition-colors cursor-pointer"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-b border-[#252B36] bg-[#0B0D12]/70 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar flex-shrink-0">
        <button
          onClick={() => handleSendPrompt('Hello! How are you doing today?')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          👋 Say hello
        </button>
        <button
          onClick={() => handleSendPrompt('What can you do?')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          ❓ What can you do?
        </button>
        <button
          onClick={() => handleSendPrompt('Tell me a funny joke!')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          😄 Tell a joke
        </button>
        <button
          onClick={() => handleSendPrompt('Help me draft a friendly message to my team')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          ✍️ Draft message
        </button>
        <button
          onClick={() => handleSendPrompt('Summarize recent messages')}
          className="px-3 py-1.5 bg-[#181C25] hover:bg-[#252B36] border border-[#252B36] hover:border-[#4F8CFF]/50 text-[#F5F7FA] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          📋 Recap
        </button>
      </div>

      {/* Messages Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0B0D12]/30">
        {aiMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 text-sm sm:text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white rounded-br-xs'
                    : 'bg-[#181C25] border border-[#252B36] text-[#F5F7FA] rounded-bl-xs'
                }`}
              >
                <div className="select-text whitespace-pre-wrap font-normal text-white">{msg.content}</div>

                {/* Assistant Action Strip */}
                {!isUser && msg.id !== 'ai-welcome' && (
                  <div className="mt-3 pt-2.5 border-t border-[#252B36] flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleInsertIntoChat(msg.content)}
                      className="text-[#4F8CFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" /> Post to Channel
                    </button>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-[#929BAA] hover:text-[#F5F7FA] p-1.5 rounded hover:bg-[#12151C] transition-colors cursor-pointer"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-[#32C48D]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#929BAA] px-1 mt-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center space-x-2 p-3.5 bg-[#181C25] border border-[#252B36] rounded-2xl rounded-bl-xs max-w-[80%]">
            <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-bounce" />
            <span className="text-xs text-[#929BAA] font-mono ml-1.5">Thinking...</span>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* Input Composer */}
      <div className="p-3 pb-5 sm:p-4 border-t border-[#252B36] bg-[#0F1117] flex-shrink-0 sticky bottom-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt(input);
          }}
          className="bg-[#181C25] border border-[#252B36] focus-within:border-[#4F8CFF] rounded-xl p-2.5 flex items-center space-x-2.5 transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 bg-transparent text-sm sm:text-xs text-white placeholder-[#929BAA] outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${
              input.trim()
                ? 'bg-[#4F8CFF] text-white hover:bg-[#3D7AE8] shadow-accent-glow'
                : 'bg-[#12151C] text-[#929BAA]/30 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
