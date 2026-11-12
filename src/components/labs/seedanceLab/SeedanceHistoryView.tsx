/**
 * VAIURE — SEEDANCE LAB GENERATION HISTORY
 * Monochromatic Production Render History Interface
 * Real generation records fetched from /api/ai/history with video playback, prompt reuse, and downloads.
 */

import React, { useState } from 'react';
import {
  Clock,
  Play,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Film,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PosBotHistoryItem, seedanceLabService } from '../../../services/seedanceLabService';

interface SeedanceHistoryViewProps {
  history: PosBotHistoryItem[];
  onRefresh: () => void;
  onReuseInGenerator: (item: PosBotHistoryItem) => void;
}

export const SeedanceHistoryView: React.FC<SeedanceHistoryViewProps> = ({
  history,
  onRefresh,
  onReuseInGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [activePlaybackItem, setActivePlaybackItem] = useState<PosBotHistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this generation record from history?')) return;
    setIsDeletingId(id);
    await seedanceLabService.deleteHistoryEntry(id);
    setIsDeletingId(null);
    onRefresh();
  };

  const filteredItems = history.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      (item.prompt && item.prompt.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.job_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModel =
      filterModel === 'all' ||
      item.model === filterModel ||
      (filterModel === 'seedance' && item.model.startsWith('seedance'));

    return matchesSearch && matchesModel;
  });

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header & Controls Strip */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <h1 className="text-lg font-semibold tracking-tight uppercase font-mono text-white">
                  Generation History
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/70">
                  {history.length} Total Records
                </span>
              </div>
              <p className="text-xs text-white/60">
                Persistent server-side generation archive for Seedance 2.5 and associated AI models.
              </p>
            </div>

            <button
              onClick={onRefresh}
              className="px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white/70" />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-white/[0.08]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prompt keywords or job identifier..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/[0.1] bg-black/60 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white transition-all font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-mono">
              {[
                { id: 'all', label: 'All Models' },
                { id: 'seedance', label: 'Seedance 2.5' },
                { id: 'seedance_25_15s', label: '15s T2V' },
                { id: 'seedance_25_30s', label: '30s T2V' },
                { id: 'seedance_25_15s_r2v', label: '15s R2V' },
                { id: 'seedance_25_30s_r2v', label: '30s R2V' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilterModel(opt.id)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                    filterModel === opt.id
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* History Grid */}
        {filteredItems.length === 0 ? (
          <div className="p-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center space-y-3">
            <Film className="w-8 h-8 text-white/30 mx-auto" />
            <div className="text-sm font-medium text-white/80">No Matching History Found</div>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              No generation records match your filter criteria. Try clearing search or generating a new video.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const hasVideo =
                item.result_url &&
                (item.result_url.endsWith('.mp4') ||
                  item.result_url.endsWith('.webm') ||
                  item.result_url.includes('.mp4'));

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/[0.1] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] p-4 space-y-3.5 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Media Container */}
                    <div
                      onClick={() => hasVideo && setActivePlaybackItem(item)}
                      className="w-full aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.08] relative flex items-center justify-center cursor-pointer"
                    >
                      {hasVideo ? (
                        <video
                          src={item.result_url!}
                          preload="metadata"
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-white/40">
                          <Film className="w-6 h-6" />
                          <span className="text-[10px] font-mono">{item.model}</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {hasVideo && (
                          <span className="p-2.5 rounded-full bg-white text-black shadow-lg">
                            <Play className="w-4 h-4 fill-black" />
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] font-mono text-white/80">
                        {item.model}
                      </div>

                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] font-mono text-white/80 uppercase">
                        {item.status}
                      </div>
                    </div>

                    {/* Metadata Header */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                      <span className="truncate max-w-[160px]">{item.job_code}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Prompt Preview */}
                    <p className="text-xs text-white/80 line-clamp-3 font-sans leading-relaxed">
                      {item.prompt || 'No prompt recorded'}
                    </p>

                    {/* Parameters Strip */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-white/50">
                      {item.parameters?.aspect_ratio && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          Ratio: {String(item.parameters.aspect_ratio)}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                        720P MP4
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                        {item.cost_generate} GEN
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onReuseInGenerator(item)}
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold uppercase tracking-wider hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>Reuse in Generator</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1">
                      {item.prompt && (
                        <button
                          onClick={() => handleCopyPrompt(item.id, item.prompt)}
                          title="Copy prompt"
                          className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {hasVideo && (
                        <a
                          href={item.result_url!}
                          download={`seedance_${item.job_code}.mp4`}
                          title="Download MP4"
                          className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDelete(item.id || item.job_code)}
                        title="Delete record"
                        disabled={isDeletingId === (item.id || item.job_code)}
                        className="p-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Playback Modal */}
      {activePlaybackItem && (
        <div
          onClick={() => setActivePlaybackItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full rounded-2xl border border-white/20 bg-neutral-950 overflow-hidden shadow-2xl space-y-4 p-5"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white font-semibold">
                {activePlaybackItem.job_code} · {activePlaybackItem.model}
              </span>
              <button
                onClick={() => setActivePlaybackItem(null)}
                className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
              <video
                src={activePlaybackItem.result_url!}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-white/80 font-sans leading-relaxed">
              {activePlaybackItem.prompt}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  onReuseInGenerator(activePlaybackItem);
                  setActivePlaybackItem(null);
                }}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer"
              >
                Apply to Generator
              </button>
              <a
                href={activePlaybackItem.result_url!}
                download={`seedance_${activePlaybackItem.job_code}.mp4`}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
