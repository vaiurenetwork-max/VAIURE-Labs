/**
 * VAIURE — COLLAPSIBLE AI AGENT COPILOT DRAWER (IN-GENERATOR)
 * Runs right inside SeedanceVideoGenerator so users can optimize, generate, or check
 * storyline continuity using their Personal Creative Memory without leaving the canvas.
 */

import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, Check, Send, AlertTriangle } from 'lucide-react';
import { AgentActionMode, AgentWorkspaceContext } from '../../../types/seedancePlatform';
import { agentWorkspaceService } from '../../../services/seedanceWorkspaceService';

interface SeedanceAgentCopilotDrawerProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  workspaceContext: AgentWorkspaceContext;
  onClose: () => void;
  onApplyPrompt: (prompt: string) => void;
  onRequireAuth?: () => void;
  onOpenFullAgent?: () => void;
}

export const SeedanceAgentCopilotDrawer: React.FC<SeedanceAgentCopilotDrawerProps> = ({
  isOpen,
  isAuthenticated,
  workspaceContext,
  onClose,
  onApplyPrompt,
  onRequireAuth,
  onOpenFullAgent,
}) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const runAction = async (mode: AgentActionMode, customMessage?: string) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const message =
        customMessage ||
        instruction.trim() ||
        (mode === 'improve_prompt'
          ? workspaceContext.currentPrompt || 'Improve my Seedance 2.5 scene prompt.'
          : mode === 'continue_storyline'
          ? 'Continue my storyline from the current prompt with flawless visual continuity.'
          : 'Generate a fresh Seedance 2.5 prompt matching my Creative Memory.');

      const res = await agentWorkspaceService.chat({
        message,
        actionMode: mode,
        workspaceContext,
      });
      setReply(res.reply);
      setSuggestedPrompt(res.suggestedPrompt || null);
      setWarnings(res.continuityWarnings || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI Agent Copilot failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.16] bg-[#0a0a0d] p-4 space-y-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-white">
            AI Agent Copilot (Memory-Aware)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenFullAgent && (
            <button
              type="button"
              onClick={onOpenFullAgent}
              className="text-[10px] font-mono uppercase text-white/60 hover:text-white underline cursor-pointer"
            >
              Open Full Agent
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => runAction('improve_prompt')}
          className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white hover:text-black text-[10px] font-mono uppercase cursor-pointer"
        >
          Improve Current Prompt
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => runAction('generate_prompt')}
          className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white hover:text-black text-[10px] font-mono uppercase cursor-pointer"
        >
          Generate From Memory
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => runAction('continue_storyline')}
          className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white hover:text-black text-[10px] font-mono uppercase cursor-pointer"
        >
          Continue Storyline
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runAction('chat', instruction.trim());
            }
          }}
          placeholder="Ask Copilot (e.g. 'Add volumetric rain & anamorphic lens flare')..."
          className="flex-1 p-2.5 rounded-lg border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs focus:outline-none focus:border-white"
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={() => runAction('chat', instruction.trim())}
          className="px-3 py-2.5 rounded-lg bg-white text-black font-mono text-[11px] font-semibold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          <span>{isLoading ? '...' : 'Ask'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg border border-white/20 bg-white/[0.05] text-xs text-white/85">
          {errorMsg}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-2.5 rounded-lg border border-white/15 bg-black/60 text-[11px] text-white/80 space-y-1">
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase text-white">
            <AlertTriangle className="w-3 h-3" /> Continuity Check
          </div>
          {warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {reply && (
        <div className="p-3 rounded-xl border border-white/[0.1] bg-black/60 space-y-2 text-xs text-white/85">
          <p className="leading-relaxed whitespace-pre-wrap">{reply}</p>
          {suggestedPrompt && (
            <div className="p-2.5 rounded-lg border border-white/[0.14] bg-white/[0.03] space-y-2">
              <div className="text-[10px] font-mono uppercase text-white/50">
                Suggested Seedance Prompt
              </div>
              <p className="text-xs text-white leading-relaxed">{suggestedPrompt}</p>
              <button
                type="button"
                onClick={() => {
                  onApplyPrompt(suggestedPrompt);
                  setApplied(true);
                  setTimeout(() => setApplied(false), 1800);
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-black font-mono text-[10px] font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                {applied ? (
                  <>
                    <Check className="w-3 h-3" /> <span>Applied</span>
                  </>
                ) : (
                  <>
                    <span>Apply to Prompt</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
