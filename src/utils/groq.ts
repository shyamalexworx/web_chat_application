/**
 * Groq Cloud AI Client for PulseChat AI Assistant
 * Ultra-fast LPU inference, 100% Free tier (no credit card required)
 * Official endpoint: https://api.groq.com/openai/v1/chat/completions (proxied via /api/groq in Vite dev)
 */

import type { AIMessage } from '../types';

export interface GroqModelInfo {
  id: string;
  name: string;
  tag: string;
  description: string;
}

export interface GroqToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface GroqChatResult {
  content: string;
  toolCalls?: GroqToolCall[];
}

// Verified active production chat models on Groq
export const GROQ_MODELS: GroqModelInfo[] = [
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    tag: 'Fast & Smart',
    description: 'High-speed conversational and reasoning model with ultra-low latency.',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    tag: 'Flagship 120B',
    description: 'Massive 120B parameter model for advanced coding, analysis, and writing.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    tag: 'Code & Math',
    description: 'High-precision 27B model excellent for coding and structured tasks.',
  },
];

// Native tool definitions for workspace actions
export const WORKSPACE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_channel',
      description: 'Create a new channel in the current workspace and navigate directly to it',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the channel to create, e.g. "design-critique" or "announcements"',
          },
          topic: {
            type: 'string',
            description: 'Optional topic or purpose for the channel',
          },
          isPrivate: {
            type: 'boolean',
            description: 'Whether the channel is private (defaults to false)',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_workspace',
      description: 'Create a new workspace in PulseChat and switch to it',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the workspace to create, e.g. "Marketing Hub"',
          },
          description: {
            type: 'string',
            description: 'Optional description of the workspace',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_message',
      description: 'Post a message to a channel or conversation in PulseChat',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The message text to send',
          },
          channelName: {
            type: 'string',
            description: 'Optional channel name to send to, e.g. "general" or "dch"',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_dm',
      description: 'Send a direct message to a team member in PulseChat',
      parameters: {
        type: 'object',
        properties: {
          userName: {
            type: 'string',
            description: 'The name of the person or team member to message',
          },
          content: {
            type: 'string',
            description: 'The message text content to send',
          },
        },
        required: ['userName', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Switch or navigate to a channel or direct message thread',
      parameters: {
        type: 'object',
        properties: {
          channelName: {
            type: 'string',
            description: 'The channel name to switch to, e.g. "general"',
          },
          userName: {
            type: 'string',
            description: 'The user name to open direct messages with',
          },
          workspaceName: {
            type: 'string',
            description: 'The workspace name to switch to, e.g. "rabil"',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'switch_workspace',
      description: 'Switch or change active workspace to an existing workspace (e.g. "rabil", "DHANUSH")',
      parameters: {
        type: 'object',
        properties: {
          workspaceName: {
            type: 'string',
            description: 'The name of the workspace to switch to, e.g. "rabil"',
          },
        },
        required: ['workspaceName'],
      },
    },
  },
];

const STORAGE_KEY_GROQ_API = 'pulsechat_groq_api_key';
const STORAGE_KEY_GROQ_MODEL = 'pulsechat_groq_selected_model';

/**
 * Get active Groq API Key
 * Checks .env / Vercel Environment Variables (VITE_GROQ_API_KEY) first, then browser localStorage
 */
export const getGroqApiKey = (): string => {
  const envKey = (import.meta.env.VITE_GROQ_API_KEY || '').trim();
  if (envKey && envKey !== 'gsk_your_groq_api_key_here') {
    return envKey;
  }
  try {
    const stored = (localStorage.getItem(STORAGE_KEY_GROQ_API) || '').trim();
    if (stored) return stored;
  } catch {
    // Ignore
  }
  return '';
};

/**
 * Persist Groq API Key in browser localStorage
 */
export const setGroqApiKey = (key: string): void => {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_GROQ_API, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GROQ_API);
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get saved model or default to stable active model
 */
export const getSavedGroqModel = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GROQ_MODEL);
    if (saved && !saved.includes('gemma2') && GROQ_MODELS.some((m) => m.id === saved)) {
      return saved;
    }
  } catch {
    // Fallback
  }
  return 'openai/gpt-oss-20b';
};

export const setSavedGroqModel = (modelId: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_GROQ_MODEL, modelId);
  } catch {
    // Ignore
  }
};

/**
 * Fetch live active models from Groq API
 */
export async function fetchLiveGroqModels(apiKey?: string): Promise<GroqModelInfo[]> {
  const key = (apiKey || getGroqApiKey()).trim();
  if (!key) return GROQ_MODELS;

  const endpoint = import.meta.env.DEV
    ? '/api/groq/models'
    : 'https://api.groq.com/openai/v1/models';

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) return GROQ_MODELS;

    const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
    if (!Array.isArray(data.data)) return GROQ_MODELS;

    const activeChatModels = data.data
      .filter((m) => {
        const id = m.id.toLowerCase();
        return (
          m.active !== false &&
          !id.includes('whisper') &&
          !id.includes('guard') &&
          !id.includes('gemma2')
        );
      })
      .map((m) => {
        const known = GROQ_MODELS.find((k) => k.id === m.id);
        if (known) return known;
        return {
          id: m.id,
          name: m.id.split('/').pop() || m.id,
          tag: 'Cloud',
          description: `Active Groq LPU model (${m.id})`,
        };
      });

    return activeChatModels.length > 0 ? activeChatModels : GROQ_MODELS;
  } catch {
    return GROQ_MODELS;
  }
}

/**
 * Send a chat completion request to Groq API with native tool calling
 */
export async function sendGroqChat({
  messages,
  model = 'openai/gpt-oss-20b',
  apiKey,
  systemPrompt,
  signal,
}: {
  messages: AIMessage[];
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  signal?: AbortSignal;
}): Promise<GroqChatResult> {
  const keyToUse = (apiKey || getGroqApiKey()).trim();

  if (!keyToUse) {
    throw new Error(
      'Missing Groq API Key. Add VITE_GROQ_API_KEY to your .env file or enter your free key in the AI Assistant settings.'
    );
  }

  const safeModel = model.includes('gemma2') ? 'openai/gpt-oss-20b' : model;

  const endpoint = import.meta.env.DEV
    ? '/api/groq/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

  const system =
    systemPrompt ||
    'You are Pulse AI Assistant, a friendly, helpful, and concise AI workspace companion built into PulseChat. ' +
    'Provide clear, natural, and helpful answers. Format code snippets with markdown backticks (```lang ... ```). ' +
    'Keep responses well-structured and engaging.';

  const formattedMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: system },
  ];

  // Recent conversation history (keep last 16 messages for clean context)
  const recentMessages = messages
    .filter((m) => !m.error && m.content.trim().length > 0)
    .slice(-16);

  for (const m of recentMessages) {
    formattedMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  // Include tools and tool_choice: "auto" so Groq never throws "Tool choice is none, but model called a tool"
  const payload = {
    model: safeModel,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 2048,
    tools: WORKSPACE_TOOLS,
    tool_choice: 'auto',
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keyToUse}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err: unknown) {
    if (signal?.aborted) throw err;
    if (endpoint.startsWith('/api/groq')) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keyToUse}`,
        },
        body: JSON.stringify(payload),
        signal,
      });
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || errJson.message || '';
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 401) {
      throw new Error('Invalid Groq API Key. Please verify your key at console.groq.com/keys.');
    }
    if (response.status === 429) {
      throw new Error('Groq rate limit reached. Please wait a few seconds before sending another message.');
    }

    throw new Error(errorDetail || `Groq request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
      };
    }>;
  };

  const choice = data.choices?.[0]?.message;
  if (!choice) {
    throw new Error('Received an empty response from Groq AI.');
  }

  const toolCalls: GroqToolCall[] = [];
  if (Array.isArray(choice.tool_calls) && choice.tool_calls.length > 0) {
    for (const call of choice.tool_calls) {
      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || '{}');
      } catch {
        parsedArgs = {};
      }
      toolCalls.push({
        id: call.id,
        name: call.function.name,
        arguments: parsedArgs,
      });
    }
  }

  return {
    content: choice.content || '',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
