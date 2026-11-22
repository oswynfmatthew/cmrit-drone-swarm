import React, { useEffect, useRef, useState } from 'react';
import {
  ReasoningLevel,
  SwarmAiConversation,
  SwarmAiMessage,
} from '../types';
import {
  BrainCircuit,
  Download,
  History,
  ImagePlus,
  MessageSquare,
  Plus,
  Trash2,
  ArrowUp,
  Loader2,
  Eye,
  X,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';

interface SwarmAiViewProps {
  backgroundImageUrl: string | null;
  backgroundImageName: string | null;
  conversations: SwarmAiConversation[];
  activeConversationId: string;
  messages: SwarmAiMessage[];
  isStreaming: boolean;
  reasoningLevel: ReasoningLevel;
  setReasoningLevel: (level: ReasoningLevel) => void;
  includeVisualFrame: boolean;
  setIncludeVisualFrame: (val: boolean) => void;
  draftPrompt: string;
  setDraftPrompt: (val: string) => void;
  onSendMessage: (promptText: string, attachedImages: string[]) => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onClearAllHistory: () => void;
}

function renderInlineTokens(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-[#140c0e] border border-red-900/50 text-rose-300 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

const FormattedAiMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={`pre-${i}`}
          className="my-2.5 p-3.5 rounded-xl bg-[#050507] border border-zinc-800 overflow-x-auto text-xs font-mono text-rose-200 leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      blocks.push(
        <div key={`tbl-${i}`} className="my-3 overflow-x-auto border border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#050507] text-zinc-300 border-b border-zinc-800">
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    {renderInlineTokens(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#13141b]">
                  {r.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 font-mono text-xs tabular-nums">
                      {renderInlineTokens(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-red-400 pt-2.5 pb-1">
          {renderInlineTokens(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-white pt-3 pb-1 border-b border-zinc-800">
          {renderInlineTokens(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-white pt-3 pb-1">
          {renderInlineTokens(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-5 list-disc text-zinc-200 text-sm">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineTokens(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-5 list-decimal text-zinc-200 text-sm">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineTokens(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (!line.trim()) {
      blocks.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="text-sm text-zinc-200 leading-relaxed">
        {renderInlineTokens(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{blocks}</div>;
};

async function readImageFileAsCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read uploaded image.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 800) * scale));
        const h = Math.max(1, Math.round((img.height || 600) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export const SwarmAiView: React.FC<SwarmAiViewProps> = ({
  backgroundImageUrl,
  backgroundImageName,
  conversations,
  activeConversationId,
  messages,
  isStreaming,
  reasoningLevel,
  setReasoningLevel,
  includeVisualFrame,
  setIncludeVisualFrame,
  draftPrompt,
  setDraftPrompt,
  onSendMessage,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onClearAllHistory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'history'>('chat');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showVisualFrameInfo, setShowVisualFrameInfo] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeSubTab === 'chat') {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isStreaming, activeSubTab]);

  // Show "Download Brief" button strictly ONLY after the AI has responded and finished streaming
  const hasCompletedAiResponse =
    !isStreaming &&
    messages.some((m) => m.role === 'assistant' && !m.error && m.content.trim().length > 0);

  const savedHistoryList = conversations.filter((c) => c.messages.length > 0);

  const handleImagePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 4 - attachedImages.length);
    const chosen = Array.from(files).slice(0, remainingSlots);
    const compressed: string[] = [];
    for (const f of chosen) {
      if (!f.type.startsWith('image/')) continue;
      try {
        compressed.push(await readImageFileAsCompressedDataUrl(f));
      } catch {
        // skip unreadable image
      }
    }
    if (compressed.length > 0) {
      setAttachedImages((prev) => [...prev, ...compressed].slice(0, 4));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      await handleImagePick(dt.files);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) return;
    if (!draftPrompt.trim() && attachedImages.length === 0) return;

    const textToSend =
      draftPrompt.trim() || 'Analyze the uploaded image(s) in detail.';
    onSendMessage(textToSend, attachedImages);
    setDraftPrompt('');
    setAttachedImages([]);
    setActiveSubTab('chat');
  };

  const handleDownloadBrief = () => {
    if (!hasCompletedAiResponse) return;
    const lines = [
      '# Swarm AI Briefing',
      `- Exported: ${new Date().toLocaleString()}`,
      `- Active Scene: ${backgroundImageName || 'Tactical Simulation Grid'}`,
      '',
      ...messages.map((m) => {
        const speaker = m.role === 'user' ? 'You' : 'Swarm AI';
        return `### ${speaker} (${new Date(m.timestamp).toLocaleTimeString()})\n${m.content}\n`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swarm-ai-brief-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1600);
    } catch {
      // clipboard unavailable
    }
  };

  const starterPrompts = [
    'Give me a complete mission briefing on current drone locations, battery levels, and zone coverage.',
    'If Drone D2 fails mid-flight, explain how the swarm compensates and impacts scan completion.',
    'Summarize all detected targets with coordinates and prioritize the top rescue dispatches.',
    'Explain our hardware stack: Jetson Orin NX, 360° LiDAR SLAM, 802.11s mesh, and ToF bathymetry.',
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      {/* Top Bar: Chat | History Tab + New Chat + Download Brief (only after response) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0c10] border border-zinc-800 rounded-xl px-4 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white tracking-tight">Swarm AI</h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#050507] border border-zinc-800 rounded-lg">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === 'chat'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeSubTab === 'history'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({savedHistoryList.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasCompletedAiResponse && (
            <button
              onClick={handleDownloadBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161720] hover:bg-[#1e202c] border border-red-600/40 text-xs font-semibold text-rose-200 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-red-400" />
              <span>Download Brief</span>
            </button>
          )}

          <button
            onClick={() => {
              onNewChat();
              setAttachedImages([]);
              setActiveSubTab('chat');
            }}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold shadow-[0_0_18px_-4px_rgba(220,38,38,0.65)] transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* TAB A: HISTORY TAB */}
      {activeSubTab === 'history' && (
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl p-5 space-y-4 min-h-[520px] shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Conversation History</h3>
              <p className="text-xs text-zinc-400">
                Select any past conversation to review responses or continue asking follow-ups.
              </p>
            </div>
            {savedHistoryList.length > 0 && (
              <button
                onClick={onClearAllHistory}
                disabled={isStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-600/40 text-red-300 hover:bg-red-950/60 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {savedHistoryList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <History className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-semibold text-zinc-200">No conversations yet</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Start chatting with Swarm AI in the Chat tab and your conversations will be saved here automatically.
              </p>
              <button
                onClick={() => setActiveSubTab('chat')}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Start a Conversation
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {savedHistoryList.map((conv) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      setActiveSubTab('chat');
                    }}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                      isActive
                        ? 'bg-[#151115] border-red-600/60 shadow-[0_0_20px_-8px_rgba(220,38,38,0.5)]'
                        : 'bg-[#06070a] border-zinc-800 hover:border-red-600/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="truncate">{conv.title}</span>
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {lastMsg.content || lastMsg.error || 'Attached image query'}
                        </p>
                      )}
                      <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 tabular-nums pt-0.5">
                        <span>{conv.messages.length} messages</span>
                        <span aria-hidden="true">/</span>
                        <span>{new Date(conv.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      title="Delete conversation"
                      className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB B: CLEAN CHATGPT-STYLE CHAT WORKSPACE */}
      {activeSubTab === 'chat' && (
        <div className="bg-[#0b0c10] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden min-h-[580px] max-h-[75vh] shadow-2xl">
          {/* Scrollable Message Canvas */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 bg-[#060709]">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-10 space-y-8 text-center">
                <div className="space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#120d10] border border-red-600/45 shadow-[0_0_24px_-6px_rgba(220,38,38,0.6)] flex items-center justify-center mx-auto">
                    <BrainCircuit className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    What would you like to know about the swarm?
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Ask anything about drone telemetry, zone scan results, hardware architecture, or
                    upload any image below for instant AI vision analysis.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {starterPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(prompt, attachedImages)}
                      disabled={isStreaming}
                      className="p-3.5 rounded-xl bg-[#0e0f15] hover:bg-[#171115] border border-zinc-800 hover:border-red-600/50 text-xs text-zinc-200 leading-relaxed transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#191114] border border-red-700/45 text-zinc-100 space-y-2.5 shadow-lg">
                        {msg.uploadedImages && msg.uploadedImages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.uploadedImages.map((src, idx) => (
                              <img
                                key={idx}
                                src={src}
                                alt={`Uploaded frame ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="max-h-40 rounded-lg border border-red-800/60 object-cover"
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-end gap-2 tabular-nums">
                          {msg.reasoningLevel && <span>Thinking: {msg.reasoningLevel}</span>}
                          {msg.includedVisualFrame && <span>· Visual Frame</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-start gap-3.5">
                      <div className="w-7 h-7 rounded-lg bg-[#140d10] border border-red-600/45 flex items-center justify-center shrink-0 mt-0.5">
                        <BrainCircuit className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {msg.error ? (
                          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <span>{msg.error}</span>
                          </div>
                        ) : msg.content ? (
                          <>
                            <FormattedAiMarkdown content={msg.content} />
                            {!isStreaming && (
                              <div className="pt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                                <button
                                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                                  className="inline-flex items-center gap-1 hover:text-zinc-200 transition cursor-pointer"
                                >
                                  {copiedMsgId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-red-400 font-mono py-1.5">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Thinking ({reasoningLevel.toLowerCase()})...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                <div ref={scrollEndRef} />
              </div>
            )}
          </div>

          {/* Bottom ChatGPT-Style Composer */}
          <div className="p-3 sm:p-4 bg-[#0b0c10] border-t border-zinc-800">
            <form
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto bg-[#060709] border border-zinc-700/80 focus-within:border-red-600/80 rounded-2xl p-3 space-y-2.5 transition"
            >
              {showVisualFrameInfo && (
                <div className="px-3 py-2 rounded-xl bg-[#130d10] border border-red-800/50 text-[11px] text-zinc-300 flex items-start justify-between gap-2">
                  <span>
                    <strong className="text-red-400">What Visual Frame does:</strong> When ON,
                    Swarm AI automatically attaches the current GCS aerial/satellite map image to
                    your message so Gemini Vision can inspect roads, flooded areas, roofs, and damage
                    directly alongside live drone telemetry. Turn OFF for faster text-only telemetry replies.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVisualFrameInfo(false)}
                    className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  {attachedImages.map((imgSrc, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={imgSrc}
                        alt={`Attachment ${idx + 1}`}
                        className="w-16 h-16 rounded-xl object-cover border border-red-700/50"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAttachedImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-200 hover:text-red-400 flex items-center justify-center cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={2}
                placeholder="Ask Swarm AI anything or upload / paste an image..."
                className="w-full bg-transparent px-1.5 py-1 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-zinc-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleImagePick(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachedImages.length >= 4 || isStreaming}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#14151c] hover:bg-[#1d1e28] disabled:opacity-40 border border-zinc-700 hover:border-red-600/50 text-xs font-medium text-zinc-200 transition whitespace-nowrap cursor-pointer"
                    title="Upload images (up to 4)"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-red-400" />
                    <span>Upload Image</span>
                  </button>

                  {/* 3-Level Thinking Selector: Low / Medium / High */}
                  <div className="flex items-center gap-0.5 p-0.5 bg-[#14151c] border border-zinc-700 rounded-lg">
                    <span className="px-2 text-[11px] text-zinc-400 font-medium">Thinking:</span>
                    {(['LOW', 'MEDIUM', 'HIGH'] as ReasoningLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setReasoningLevel(lvl)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          reasoningLevel === lvl
                            ? 'bg-red-600 text-white shadow'
                            : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        {lvl === 'LOW' ? 'Low' : lvl === 'MEDIUM' ? 'Medium' : 'High'}
                      </button>
                    ))}
                  </div>

                  {backgroundImageUrl && (
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setIncludeVisualFrame(!includeVisualFrame)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg border text-[11px] font-semibold transition whitespace-nowrap cursor-pointer ${
                          includeVisualFrame
                            ? 'bg-red-600/20 text-rose-200 border-red-500/50'
                            : 'bg-[#14151c] text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                        title="Toggle attaching the active GCS aerial/satellite map image to your prompt"
                      >
                        <Eye className="w-3.5 h-3.5 text-red-400" />
                        <span>Visual Frame: {includeVisualFrame ? 'ON' : 'OFF'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVisualFrameInfo(!showVisualFrameInfo)}
                        className="px-2 py-1.5 rounded-r-lg border border-l-0 border-zinc-700 bg-[#14151c] text-zinc-400 hover:text-red-400 transition cursor-pointer"
                        title="What does Visual Frame do?"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={(!draftPrompt.trim() && attachedImages.length === 0) || isStreaming}
                  className="w-9 h-9 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-35 text-white flex items-center justify-center shadow-[0_0_16px_-3px_rgba(220,38,38,0.7)] transition shrink-0 cursor-pointer"
                  title="Send message"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
