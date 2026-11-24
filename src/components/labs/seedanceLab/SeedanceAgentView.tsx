/**
 * VAIURE — SEEDANCE LAB PERSONAL AI CREATIVE AGENT
 * Authenticated, strictly user-isolated AI assistant powered server-side by Gemini (@google/genai)
 * with editable Personal Creative Memory (characters, style prefs, storylines, instructions, prompts).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Brain,
  Plus,
  Trash2,
  Send,
  Check,
  Wand2,
  ArrowRight,
  BookmarkPlus,
  Image as ImageIcon,
  AlertTriangle,
  MessageSquare,
  Lock,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import {
  AgentActionMode,
  AgentConversation,
  AgentMemoryItem,
  AgentWorkspaceContext,
  CreativeMemoryCategory,
} from '../../../types/seedancePlatform';
import { agentWorkspaceService } from '../../../services/seedanceWorkspaceService';

interface SeedanceAgentViewProps {
  isAuthenticated: boolean;
  onRequireAuth?: () => void;
  workspaceContext?: AgentWorkspaceContext;
  onApplyPromptToGenerator?: (prompt: string) => void;
}

const MEMORY_CATEGORIES: Array<{ id: CreativeMemoryCategory; label: string }> = [
  { id: 'character', label: 'Character' },
  { id: 'style', label: 'Visual Style' },
  { id: 'storyline', label: 'Storyline' },
  { id: 'instruction', label: 'Instruction' },
  { id: 'prompt_history', label: 'Prompt History' },
];

export const SeedanceAgentView: React.FC<SeedanceAgentViewProps> = ({
  isAuthenticated,
  onRequireAuth,
  workspaceContext,
  onApplyPromptToGenerator,
}) => {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [memories, setMemories] = useState<AgentMemoryItem[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [panelTab, setPanelTab] = useState<'threads' | 'memory'>('memory');

  const [inputText, setInputText] = useState('');
  const [actionMode, setActionMode] = useState<AgentActionMode>('chat');
  const [refImageDataUrl, setRefImageDataUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedPromptId, setAppliedPromptId] = useState<string | null>(null);

  // Memory add/edit modal state
  const [editingMemory, setEditingMemory] = useState<AgentMemoryItem | null>(null);
  const [memCategory, setMemCategory] = useState<CreativeMemoryCategory>('character');
  const [memTitle, setMemTitle] = useState('');
  const [memContent, setMemContent] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [showMemoryForm, setShowMemoryForm] = useState(false);

  const refImageInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadWorkspace = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [memRes, convRes] = await Promise.all([
        agentWorkspaceService.getMemory(),
        agentWorkspaceService.getConversations(),
      ]);
      setMemoryEnabled(memRes.memoryEnabled);
      setMemories(memRes.items || []);
      setConversations(convRes.conversations || []);
      if (convRes.conversations?.length > 0 && !activeConvId) {
        setActiveConvId(convRes.conversations[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load Personal AI Agent workspace.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeConvId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length]);

  const handleToggleGlobalMemory = async () => {
    try {
      const res = await agentWorkspaceService.setMemoryEnabled(!memoryEnabled);
      setMemoryEnabled(res.memoryEnabled);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not toggle creative memory.');
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) return;
    setIsSavingMemory(true);
    setErrorMsg(null);
    try {
      if (editingMemory) {
        const res = await agentWorkspaceService.updateMemory(editingMemory.id, {
          category: memCategory,
          title: memTitle.trim(),
          content: memContent.trim(),
        });
        setMemories((prev) => prev.map((m) => (m.id === res.item.id ? res.item : m)));
      } else {
        const res = await agentWorkspaceService.addMemory({
          category: memCategory,
          title: memTitle.trim(),
          content: memContent.trim(),
          enabled: true,
        });
        setMemories((prev) => [res.item, ...prev]);
      }
      setEditingMemory(null);
      setMemTitle('');
      setMemContent('');
      setShowMemoryForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save creative memory.');
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleToggleMemoryItem = async (item: AgentMemoryItem) => {
    try {
      const res = await agentWorkspaceService.updateMemory(item.id, { enabled: !item.enabled });
      setMemories((prev) => prev.map((m) => (m.id === item.id ? res.item : m)));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update memory status.');
    }
  };

  const handleDeleteMemoryItem = async (id: string) => {
    try {
      await agentWorkspaceService.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove memory.');
    }
  };

  const handleQuickAction = async (mode: AgentActionMode, promptOverride?: string) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    const textToSend =
      promptOverride ||
      inputText.trim() ||
      (mode === 'improve_prompt'
        ? workspaceContext?.currentPrompt || 'Improve my current Seedance 2.5 prompt for complex physics and lighting.'
        : mode === 'generate_prompt'
        ? 'Generate a complete cinematic Seedance 2.5 scene prompt aligned with my Creative Memory.'
        : mode === 'continue_storyline'
        ? 'Continue our storyline into the next seamless shot while preserving full character & environment continuity.'
        : 'Analyze this reference frame and author a Seedance 2.5 prompt matching camera, lighting, and physics.');

    setIsSending(true);
    setErrorMsg(null);
    try {
      const res = await agentWorkspaceService.chat({
        conversationId: activeConvId || undefined,
        message: textToSend,
        actionMode: mode,
        workspaceContext,
        referenceImageDataUrl: refImageDataUrl || undefined,
      });

      setActiveConvId(res.conversation.id);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === res.conversation.id);
        return exists
          ? prev.map((c) => (c.id === res.conversation.id ? res.conversation : c))
          : [res.conversation, ...prev];
      });
      if (!promptOverride) {
        setInputText('');
      }
      setRefImageDataUrl(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Personal AI Agent request failed.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveSuggestionToMemory = async (promptText: string) => {
    try {
      const res = await agentWorkspaceService.addMemory({
        category: 'prompt_history',
        title: `Scene Blueprint (${new Date().toLocaleTimeString()})`,
        content: promptText,
        enabled: true,
      });
      setMemories((prev) => [res.item, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not save prompt to memory.');
    }
  };

  const handleNewThread = async () => {
    try {
      const res = await agentWorkspaceService.createConversation('Seedance Creative Session');
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConvId(res.conversation.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not create thread.');
    }
  };

  const handleDeleteThread = async (id: string) => {
    try {
      await agentWorkspaceService.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete conversation.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md w-full p-8 rounded-2xl border border-white/[0.14] bg-white/[0.035] text-center space-y-4">
          <Lock className="w-8 h-8 text-white/70 mx-auto" />
          <h2 className="text-lg font-serif uppercase tracking-tight">Personal AI Creative Agent</h2>
          <p className="text-xs text-white/60 leading-relaxed">
            Sign in to access your private Gemini creative assistant and isolated Personal Creative Memory (characters, style rules, storyline continuity, and prompt history).
          </p>
          {onRequireAuth && (
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-6 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
            >
              Sign In to Unlock Agent
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden bg-black text-white flex flex-col lg:flex-row select-text">
      {/* LEFT SIDEBAR: Memory & Conversation Threads */}
      <aside className="w-full lg:w-[370px] border-b lg:border-b-0 lg:border-r border-white/[0.12] bg-[#060608] flex flex-col max-h-[45vh] lg:max-h-full shrink-0">
        <div className="p-4 border-b border-white/[0.1] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-white" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Personal Memory
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleGlobalMemory}
            className={`px-2.5 py-1 rounded-md border text-[10px] font-mono uppercase transition-all cursor-pointer ${
              memoryEnabled
                ? 'border-white bg-white text-black font-bold'
                : 'border-white/20 bg-white/[0.04] text-white/60'
            }`}
          >
            {memoryEnabled ? 'Memory ON' : 'Memory OFF'}
          </button>
        </div>

        {/* Sub-Tabs: Memory vs Threads */}
        <div className="grid grid-cols-2 border-b border-white/[0.08] text-xs font-mono">
          <button
            type="button"
            onClick={() => setPanelTab('memory')}
            className={`py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              panelTab === 'memory'
                ? 'border-white text-white bg-white/[0.04] font-semibold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory ({memories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('threads')}
            className={`py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
              panelTab === 'threads'
                ? 'border-white text-white bg-white/[0.04] font-semibold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Threads ({conversations.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {panelTab === 'memory' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingMemory(null);
                  setMemTitle('');
                  setMemContent('');
                  setShowMemoryForm((v) => !v);
                }}
                className="w-full py-2 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showMemoryForm ? 'Close Form' : 'Add Creative Memory'}</span>
              </button>

              {showMemoryForm && (
                <form
                  onSubmit={handleSaveMemory}
                  className="p-3.5 rounded-xl border border-white/[0.16] bg-black/80 space-y-2.5 text-xs"
                >
                  <select
                    value={memCategory}
                    onChange={(e) => setMemCategory(e.target.value as CreativeMemoryCategory)}
                    className="w-full p-2 rounded-lg border border-white/[0.14] bg-[#0b0b0e] text-white font-mono text-xs"
                  >
                    {MEMORY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={memTitle}
                    onChange={(e) => setMemTitle(e.target.value)}
                    placeholder="Title (e.g. Lead Character — Kira)"
                    required
                    className="w-full p-2 rounded-lg border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs"
                  />
                  <textarea
                    value={memContent}
                    onChange={(e) => setMemContent(e.target.value)}
                    rows={3}
                    placeholder="Appearance locks, film stock preference, active storyline rule, or director note..."
                    required
                    className="w-full p-2 rounded-lg border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSavingMemory}
                    className="w-full py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
                  >
                    {isSavingMemory
                      ? 'Saving...'
                      : editingMemory
                      ? 'Update Memory'
                      : 'Save to Isolated Memory'}
                  </button>
                </form>
              )}

              {memories.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/45 font-mono border border-dashed border-white/10 rounded-xl">
                  No Personal Creative Memory entries yet. Add characters, visual styles, or storyline arcs to personalize every Seedance 2.5 prompt.
                </div>
              ) : (
                memories.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      item.enabled
                        ? 'border-white/[0.15] bg-white/[0.035]'
                        : 'border-white/[0.06] bg-white/[0.015] opacity-55'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.08] text-white/75">
                          {item.category.replace('_', ' ')}
                        </span>
                        <h4 className="text-xs font-semibold text-white mt-1">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMemoryItem(item)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase cursor-pointer border ${
                            item.enabled
                              ? 'border-white bg-white text-black font-bold'
                              : 'border-white/20 text-white/60'
                          }`}
                        >
                          {item.enabled ? 'ON' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemory(item);
                            setMemCategory(item.category);
                            setMemTitle(item.title);
                            setMemContent(item.content);
                            setShowMemoryForm(true);
                          }}
                          className="p-1 text-white/50 hover:text-white cursor-pointer"
                          title="Edit memory"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemoryItem(item.id)}
                          className="p-1 text-white/50 hover:text-white cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleNewThread}
                className="w-full py-2 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session Thread</span>
              </button>

              {conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/45 font-mono">
                  Send your first message to start a persistent conversation thread.
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                      activeConvId === conv.id
                        ? 'border-white bg-white/[0.08]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{conv.title}</div>
                      <div className="text-[10px] font-mono text-white/45">
                        {conv.messages?.length || 0} msgs ·{' '}
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(conv.id);
                      }}
                      className="p-1 text-white/40 hover:text-white cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONVERSATION WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Action Strip */}
        <div className="p-4 border-b border-white/[0.1] bg-black/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Seedance 2.5 Personal Creative Agent
            </span>
            {workspaceContext?.selectedModel && (
              <span className="px-2 py-0.5 rounded border border-white/15 bg-white/[0.04] text-[10px] font-mono text-white/70">
                Context: {workspaceContext.selectedModel} · {workspaceContext.resolution || '720P'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'improve_prompt', label: 'Improve Prompt' },
                { id: 'generate_prompt', label: 'Generate Prompt' },
                { id: 'continue_storyline', label: 'Continue Storyline' },
              ] as Array<{ id: AgentActionMode; label: string }>
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                disabled={isSending}
                onClick={() => handleQuickAction(btn.id)}
                className="px-2.5 py-1.5 rounded-lg border border-white/[0.15] bg-white/[0.04] hover:bg-white hover:text-black text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {btn.label}
              </button>
            ))}
            <button
              type="button"
              onClick={loadWorkspace}
              disabled={loading}
              className="p-1.5 rounded-lg border border-white/[0.12] text-white/60 hover:text-white cursor-pointer"
              title="Refresh workspace"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-white/25 bg-white/[0.06] text-xs text-white/90 flex items-center justify-between gap-3">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-[10px] font-mono uppercase text-white/60 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-3 py-10">
              <Wand2 className="w-8 h-8 text-white/40" />
              <h3 className="text-base font-serif text-white">
                Seedance 2.5 Creative Director & Memory Agent
              </h3>
              <p className="text-xs text-white/55 leading-relaxed">
                Ask to refine camera choreography, enforce character/wardrobe continuity across shots, analyze a reference plate, or author complex physics prompts grounded in your private Creative Memory.
              </p>
            </div>
          ) : (
            activeConversation.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 space-y-3 border ${
                      isUser
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.04] text-white border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] font-mono opacity-60 uppercase">
                      <span>{isUser ? 'You' : 'Seedance Creative Agent'}</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>

                    {msg.continuityWarnings && msg.continuityWarnings.length > 0 && (
                      <div className="p-2.5 rounded-lg border border-white/20 bg-black/50 space-y-1 text-[11px] font-mono text-white/85">
                        <div className="flex items-center gap-1.5 font-semibold uppercase text-[10px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Continuity Alerts</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-white/70 font-sans">
                          {msg.continuityWarnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {msg.suggestedPrompt && (
                      <div className="p-3 rounded-xl border border-white/[0.15] bg-black/70 space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/55 uppercase">
                          <span>Suggested Seedance 2.5 Prompt</span>
                          {msg.suggestedDuration && <span>{msg.suggestedDuration}s Shot</span>}
                        </div>
                        <p className="text-xs text-white/90 font-sans leading-relaxed whitespace-pre-wrap">
                          {msg.suggestedPrompt}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {onApplyPromptToGenerator && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyPromptToGenerator(msg.suggestedPrompt!);
                                setAppliedPromptId(msg.id);
                                setTimeout(() => setAppliedPromptId(null), 2000);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white text-black font-mono text-[10px] font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                              {appliedPromptId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Applied to Generator</span>
                                </>
                              ) : (
                                <>
                                  <span>Apply to Generator</span>
                                  <ArrowRight className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveSuggestionToMemory(msg.suggestedPrompt!)}
                            className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-white font-mono text-[10px] uppercase flex items-center gap-1.5 cursor-pointer"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            <span>Save to Memory</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Bottom Input Composer */}
        <div className="p-4 border-t border-white/[0.1] bg-[#060608] space-y-2.5">
          {refImageDataUrl && (
            <div className="flex items-center gap-2 text-xs font-mono text-white/75">
              <img
                src={refImageDataUrl}
                alt="Ref frame"
                className="w-10 h-10 rounded object-cover border border-white/20"
              />
              <span>Reference frame attached for analysis</span>
              <button
                type="button"
                onClick={() => setRefImageDataUrl(null)}
                className="underline text-white/50 hover:text-white cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={refImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setRefImageDataUrl(String(reader.result || ''));
                  setActionMode('analyze_reference');
                };
                reader.readAsDataURL(file);
              }}
            />

            <button
              type="button"
              onClick={() => refImageInputRef.current?.click()}
              title="Attach reference image for analysis"
              className="p-3 rounded-xl border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-white/75 hover:text-white cursor-pointer shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleQuickAction(actionMode);
                }
              }}
              rows={2}
              placeholder="Collaborate with your Seedance 2.5 AI Agent (e.g. 'Refine camera tracking and fabric wind physics for Scene 2')..."
              className="flex-1 p-3 rounded-xl border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs sm:text-sm focus:outline-none focus:border-white resize-none"
            />

            <button
              type="button"
              disabled={isSending}
              onClick={() => handleQuickAction(actionMode)}
              className="px-4 py-3 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Thinking...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
