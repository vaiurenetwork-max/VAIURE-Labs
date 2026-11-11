/**
 * VAIURE Studio — AI Filmmaking Assistant Drawer
 * Context-aware AI director powered by Gemini 3.8 Flash with review-before-apply workflow.
 */

import React, { useState } from 'react';
import { Sparkles, X, Send, Check, RefreshCw, Film, ArrowRight } from 'lucide-react';
import { StudioProject, StoryboardShot, AIAssistantMessage, AssistantProposal } from '../../../types/studio';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: StudioProject;
  selectedShot?: StoryboardShot;
  onApplyProposal: (proposal: AssistantProposal) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  project,
  selectedShot,
  onApplyProposal,
}) => {
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      id: 'm1',
      sender: 'ASSISTANT',
      text: `Hello Director. I am your VAIURE Filmmaking Copilot. I have context on "${project.name}" (${project.shots.length} shots, ${project.characters.length} characters). How can I help refine your storyboard, camera optics, or prompt continuity today?`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/prompt/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          projectContext: {
            name: project.name,
            genre: project.genre,
            characters: project.characters,
            locations: project.locations,
          },
          selectedShot,
        }),
      });

      if (!response.ok) throw new Error('Assistant API failure');
      const data = await response.json();

      const assistantMsg: AIAssistantMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ASSISTANT',
        text: data.reply || 'Here is the cinematographic advice.',
        timestamp: new Date().toLocaleTimeString(),
        proposal: data.proposal,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Local fallback
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ASSISTANT',
          text: `For ${selectedShot ? selectedShot.title : 'this scene'}, preserve 35mm anamorphic optics with raking chiaroscuro light and maintain consistent character wardrobe across adjacent shots.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (msgId: string, proposal: AssistantProposal) => {
    onApplyProposal(proposal);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.proposal
          ? { ...m, proposal: { ...m.proposal, status: 'APPLIED' as const } }
          : m
      )
    );
  };

  return (
    <div
      role="dialog"
      aria-label="AI Filmmaking Assistant"
      className="fixed inset-y-0 right-0 w-80 sm:w-96 z-50 bg-[#0A0A0F] border-l border-white/10 flex flex-col shadow-2xl select-none"
    >
      {/* Header */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            AI Filmmaking Copilot
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Context Banner */}
      <div className="px-4 py-2 bg-white/[0.03] border-b border-white/10 text-[10px] font-mono text-white/50 flex items-center justify-between">
        <span className="truncate max-w-[160px]">
          Target: {selectedShot ? `Shot ${selectedShot.shotNumber} (${selectedShot.title})` : 'Whole Project'}
        </span>
        <span className="text-cyan-400">{project.genre}</span>
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-b border-white/10 flex gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleSendMessage('Make this shot more dramatic with high-contrast chiaroscuro lighting.')}
          className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/10 text-[10px] font-mono text-white/70 whitespace-nowrap"
        >
          + More Dramatic
        </button>
        <button
          onClick={() => handleSendMessage('Audit character and wardrobe continuity for this shot.')}
          className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/10 text-[10px] font-mono text-white/70 whitespace-nowrap"
        >
          + Check Continuity
        </button>
        <button
          onClick={() => handleSendMessage('Suggest best camera movement and lens for this scene.')}
          className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/10 text-[10px] font-mono text-white/70 whitespace-nowrap"
        >
          + Camera & Lens
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ASSISTANT';
          return (
            <div
              key={msg.id}
              className={`p-3 rounded-xl space-y-2 text-xs font-mono ${
                isAi
                  ? 'bg-white/[0.04] border border-white/10 text-white/90'
                  : 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 ml-4'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] text-white/40">
                <span>{isAi ? 'VAIURE Copilot' : 'Director'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Proposal Review Card */}
              {msg.proposal && (
                <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                    <span>Proposed Change: {msg.proposal.summary}</span>
                  </div>
                  <div className="text-[10px] text-white/70 bg-black/40 p-2 rounded max-h-24 overflow-y-auto">
                    {msg.proposal.proposedValue}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {msg.proposal.status === 'APPLIED' ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Applied to Shot</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(msg.id, msg.proposal!)}
                        className="px-2.5 py-1 rounded bg-white text-black font-bold text-[10px] hover:bg-neutral-200 uppercase transition-colors"
                      >
                        Apply Changes
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white/50 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>AI Director is analyzing sequence continuity...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-[#09090D] flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask AI Director (e.g. adjust lighting, camera angle)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 px-3 py-2 rounded bg-black/50 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isLoading}
          className="p-2 rounded bg-white text-black disabled:opacity-30 hover:bg-neutral-200 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
