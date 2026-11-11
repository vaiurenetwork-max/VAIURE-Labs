import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Wand2,
  Film,
  Download,
  Languages,
  Layers,
  ArrowRight,
  BookOpen,
  Share2,
  RefreshCw,
  Sliders,
  Feather,
} from 'lucide-react';
import {
  generateEditorialCopy,
  polishDraftCopy,
  generateCinemaCopy,
  translateEditorialCopy,
  duplicatePost,
  exportUserArchiveCopy,
  generateCopyShareLink,
} from '../../services/copyService';
import {
  CopyTone,
  CopyCategory,
  GeneratedCopyItem,
  CopyCinemaResponse,
} from '../../types/copy';
import { UserProfile, SocialPost } from '../../types/social';

interface CopyAssistantModalProps {
  isOpen: boolean;
  currentUser: UserProfile | null;
  posts: SocialPost[];
  onClose: () => void;
  onApplyToNewPost?: (data: {
    title: string;
    caption: string;
    category: any;
    tags: string;
    aiTools: string;
  }) => void;
}

export const CopyAssistantModal: React.FC<CopyAssistantModalProps> = ({
  isOpen,
  currentUser,
  posts,
  onClose,
  onApplyToNewPost,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'polish' | 'cinema' | 'duplicate' | 'archive'>('generate');

  // Tab 1: Generate state
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<CopyTone>('luxury-editorial');
  const [category, setCategory] = useState<CopyCategory>('COUTURE');
  const [targetLang, setTargetLang] = useState<'en' | 'zh' | 'fr' | 'ja' | 'id'>('en');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCopyItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tab 2: Polish state
  const [draftText, setDraftText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishedResult, setPolishedResult] = useState<{
    polishedCopy: string;
    headlineSuggestion: string;
    editorialCritique: string;
    suggestedTags: string[];
  } | null>(null);

  // Tab 3: Cinema state
  const [cinemaTitle, setCinemaTitle] = useState('');
  const [cinemaGenre, setCinemaGenre] = useState('Sci-Fi / Synthetic Noir');
  const [cinemaVision, setCinemaVision] = useState('');
  const [isGeneratingCinema, setIsGeneratingCinema] = useState(false);
  const [cinemaResult, setCinemaResult] = useState<CopyCinemaResponse | null>(null);

  // Tab 4: Duplicate Post state
  const [selectedPostId, setSelectedPostId] = useState('');
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateSuccessMessage, setDuplicateSuccessMessage] = useState<string | null>(null);

  // Tab 5: Archive Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateCopy = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateEditorialCopy({
        topic: topic.trim(),
        tone,
        category,
        targetLanguage: targetLang,
        visualPrompt: visualPrompt.trim() || undefined,
        artistName: currentUser?.displayName || 'VAIURE Creator',
      });
      if (res.success && res.copy) {
        setGeneratedResult(res.copy);
      }
    } catch (err: any) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePolishCopy = async () => {
    if (!draftText.trim()) return;
    setIsPolishing(true);
    try {
      const res = await polishDraftCopy({
        draftText: draftText.trim(),
        tone,
      });
      if (res.success) {
        setPolishedResult({
          polishedCopy: res.polishedCopy,
          headlineSuggestion: res.headlineSuggestion,
          editorialCritique: res.editorialCritique,
          suggestedTags: res.suggestedTags,
        });
      }
    } catch (err: any) {
      console.error('Polish error:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleGenerateCinema = async () => {
    if (!cinemaTitle.trim()) return;
    setIsGeneratingCinema(true);
    try {
      const res = await generateCinemaCopy({
        title: cinemaTitle.trim(),
        genre: cinemaGenre,
        directorVision: cinemaVision.trim() || undefined,
      });
      if (res.success) {
        setCinemaResult(res);
      }
    } catch (err: any) {
      console.error('Cinema error:', err);
    } finally {
      setIsGeneratingCinema(false);
    }
  };

  const handleDuplicatePost = async () => {
    if (!selectedPostId || !currentUser?.id) return;
    setIsDuplicating(true);
    setDuplicateSuccessMessage(null);
    try {
      const res = await duplicatePost(selectedPostId, currentUser.id, duplicateTitle.trim() || undefined);
      if (res.success) {
        setDuplicateSuccessMessage(`Work successfully duplicated as "${res.item.title}" (ID: ${res.newId})`);
      }
    } catch (err: any) {
      setDuplicateSuccessMessage(`Duplication failed: ${err.message}`);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleExportArchive = async () => {
    if (!currentUser?.id) return;
    setIsExporting(true);
    setExportMessage(null);
    try {
      const res = await exportUserArchiveCopy(currentUser.id);
      if (res.success) {
        const jsonStr = JSON.stringify(res, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.archiveName || `vaiure_archive_${currentUser.username}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportMessage(`Successfully exported archive copy (${res.metrics.totalPosts} posts)!`);
      }
    } catch (err: any) {
      setExportMessage(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const userPosts = posts.filter((p) => p.authorId === currentUser?.id || p.authorUsername === currentUser?.username);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#07070a] border border-white/15 text-white max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wider uppercase font-mono">
                  VAIURE COPY ENGINE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-white/10 text-white/80 border border-white/10">
                  GEMINI 3.8 FLASH
                </span>
              </div>
              <p className="text-xs text-white/50 font-serif italic">
                Editorial Copywriter & Neural Content Replication Engine
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-white/60 hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-white/10 bg-black/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'generate'
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI COPYWRITER</span>
          </button>

          <button
            onClick={() => setActiveTab('polish')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'polish'
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>COPY POLISHER</span>
          </button>

          <button
            onClick={() => setActiveTab('cinema')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'cinema'
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>CINEMA DOSSIER</span>
          </button>

          <button
            onClick={() => setActiveTab('duplicate')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'duplicate'
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CLONE & DUPLICATE</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-white text-white font-semibold bg-white/5'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ARCHIVE EXPORT</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: AI COPYWRITER */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">
                    Concept / Topic / Subject
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Kinetic chrome drapery under midnight monsoon"
                    className="w-full bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">Editorial Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as CopyTone)}
                    className="w-full bg-[#0a0a0e] border border-white/15 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  >
                    <option value="luxury-editorial">Luxury Haute Editorial</option>
                    <option value="avant-garde">Avant-Garde Architectural</option>
                    <option value="minimalist">Minimalist Japanese / Nordic</option>
                    <option value="cybernetic">Cybernetic / Synthetic Post-Human</option>
                    <option value="manifesto">Curatorial Manifesto</option>
                    <option value="cinematic-noir">Cinematic Noir Evocative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CopyCategory)}
                    className="w-full bg-[#0a0a0e] border border-white/15 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  >
                    <option value="COUTURE">COUTURE</option>
                    <option value="EDITORIAL">EDITORIAL</option>
                    <option value="CINEMA">CINEMA</option>
                    <option value="DIGITAL FASHION">DIGITAL FASHION</option>
                    <option value="ARTWORK">ARTWORK</option>
                    <option value="EXPERIMENTAL">EXPERIMENTAL</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">Language</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value as any)}
                    className="w-full bg-[#0a0a0e] border border-white/15 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  >
                    <option value="en">English (Vogue / VAIURE Archive)</option>
                    <option value="zh">Chinese (简体中文 先锋艺术)</option>
                    <option value="fr">French (Haute Couture Paris)</option>
                    <option value="ja">Japanese (東京先鋭審美)</option>
                    <option value="id">Indonesian (Budaya Visual Kontemporer)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateCopy}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full py-2 px-4 bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 h-[38px]"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>SYNTHESIZING...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>GENERATE COPY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Result Output */}
              {generatedResult && (
                <div className="mt-6 border border-white/15 bg-white/[0.02] p-5 space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono text-white/50 uppercase tracking-widest">
                      SYNTHESIZED EDITORIAL PACKAGE
                    </span>
                    {onApplyToNewPost && (
                      <button
                        onClick={() => {
                          onApplyToNewPost({
                            title: generatedResult.headline,
                            caption: generatedResult.caption,
                            category,
                            tags: generatedResult.hashtags.join(' '),
                            aiTools: generatedResult.suggestedAiTools.join(', '),
                          });
                          onClose();
                        }}
                        className="text-xs font-mono px-3 py-1 bg-white text-black hover:bg-neutral-200 flex items-center gap-1.5 transition-colors font-semibold"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>INSERT INTO PUBLISHER</span>
                      </button>
                    )}
                  </div>

                  {/* Headline */}
                  <div className="space-y-1 group relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/40 uppercase">Headline</span>
                      <button
                        onClick={() => copyToClipboard(generatedResult.headline, 'headline')}
                        className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'headline' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'headline' ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif tracking-tight text-white font-medium">
                      {generatedResult.headline}
                    </h3>
                    {generatedResult.subheadline && (
                      <p className="text-xs font-mono text-white/60 tracking-wider">
                        {generatedResult.subheadline}
                      </p>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/40 uppercase">Caption</span>
                      <button
                        onClick={() => copyToClipboard(generatedResult.caption, 'caption')}
                        className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'caption' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'caption' ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                      {generatedResult.caption}
                    </p>
                  </div>

                  {/* Manifesto Paragraph */}
                  {generatedResult.manifestoParagraph && (
                    <div className="space-y-1 bg-black/40 border border-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-white/40 uppercase">Manifesto Lead</span>
                        <button
                          onClick={() => copyToClipboard(generatedResult.manifestoParagraph || '', 'manifesto')}
                          className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                        >
                          {copiedKey === 'manifesto' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'manifesto' ? 'COPIED' : 'COPY'}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-400 italic font-serif leading-relaxed">
                        "{generatedResult.manifestoParagraph}"
                      </p>
                    </div>
                  )}

                  {/* Tags & AI Tools */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-[11px] font-mono text-white/40 uppercase block mb-1.5">
                        Aesthetic Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedResult.hashtags.map((tag, idx) => (
                          <button
                            key={idx}
                            onClick={() => copyToClipboard(tag, `tag_${idx}`)}
                            className="text-[11px] font-mono px-2 py-0.5 bg-white/5 border border-white/10 hover:border-white/30 text-white/70"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-mono text-white/40 uppercase block mb-1.5">
                        Recommended Tooling Pipeline
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedResult.suggestedAiTools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-mono px-2 py-0.5 bg-white/10 text-white/80"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COPY POLISHER */}
          {activeTab === 'polish' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/70 uppercase">
                  Paste Rough Draft, Visual Prompt, or Concept Notes
                </label>
                <textarea
                  rows={4}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="e.g. Model in futuristic latex dress in Tokyo rain, neon lights reflections, looking lonely and powerful..."
                  className="w-full bg-white/5 border border-white/15 p-3 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none font-sans"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePolishCopy}
                  disabled={isPolishing || !draftText.trim()}
                  className="py-2 px-6 bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPolishing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>ELEVATING...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>ELEVATE TO LUXURY EDITORIAL</span>
                    </>
                  )}
                </button>
              </div>

              {polishedResult && (
                <div className="border border-white/15 bg-white/[0.02] p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-white/40 uppercase">Suggested Headline</span>
                    <h4 className="text-lg font-serif text-white font-medium">
                      {polishedResult.headlineSuggestion}
                    </h4>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/40 uppercase">Polished Editorial Copy</span>
                      <button
                        onClick={() => copyToClipboard(polishedResult.polishedCopy, 'polished')}
                        className="text-xs text-white/50 hover:text-white flex items-center gap-1 font-mono"
                      >
                        {copiedKey === 'polished' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'polished' ? 'COPIED' : 'COPY PROSE'}</span>
                      </button>
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed font-sans bg-black/40 border border-white/10 p-4">
                      {polishedResult.polishedCopy}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-white/60 font-mono">
                    <span>Curatorial critique: {polishedResult.editorialCritique}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CINEMA DOSSIER */}
          {activeTab === 'cinema' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">Film Title</label>
                  <input
                    type="text"
                    value={cinemaTitle}
                    onChange={(e) => setCinemaTitle(e.target.value)}
                    placeholder="e.g. THE SYNTHETIC ODYSSEY"
                    className="w-full bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/70 uppercase">Genre / Atmosphere</label>
                  <input
                    type="text"
                    value={cinemaGenre}
                    onChange={(e) => setCinemaGenre(e.target.value)}
                    placeholder="e.g. Speculative Sci-Fi / Cybernetic Drama"
                    className="w-full bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-white/70 uppercase">Director Vision / Concept</label>
                <textarea
                  rows={2}
                  value={cinemaVision}
                  onChange={(e) => setCinemaVision(e.target.value)}
                  placeholder="e.g. An AI android reconstructing feelings through tactile fabric memories..."
                  className="w-full bg-white/5 border border-white/15 p-3 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateCinema}
                  disabled={isGeneratingCinema || !cinemaTitle.trim()}
                  className="py-2 px-6 bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingCinema ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>DIRECTING...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-3.5 h-3.5" />
                      <span>GENERATE CINEMA DOSSIER</span>
                    </>
                  )}
                </button>
              </div>

              {cinemaResult && (
                <div className="border border-white/15 bg-white/[0.02] p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white/40 uppercase">Magnetic Logline</span>
                      <button
                        onClick={() => copyToClipboard(cinemaResult.logline, 'logline')}
                        className="text-xs text-white/50 hover:text-white flex items-center gap-1 font-mono"
                      >
                        {copiedKey === 'logline' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>COPY</span>
                      </button>
                    </div>
                    <p className="text-base font-serif italic text-white leading-snug">
                      "{cinemaResult.logline}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-white/40 uppercase">Full Synopsis</span>
                    <p className="text-sm text-neutral-300 font-sans leading-relaxed">
                      {cinemaResult.oneParagraphSynopsis}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="bg-black/30 border border-white/5 p-3">
                      <span className="text-[11px] font-mono text-white/40 uppercase block mb-1">
                        Visual Treatment
                      </span>
                      <p className="text-xs text-neutral-300 font-mono">
                        {cinemaResult.visualTreatment}
                      </p>
                    </div>

                    <div className="bg-black/30 border border-white/5 p-3">
                      <span className="text-[11px] font-mono text-white/40 uppercase block mb-1">
                        Sound & Score Direction
                      </span>
                      <p className="text-xs text-neutral-300 font-mono">
                        {cinemaResult.soundAndScoreDirection}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLONE & DUPLICATE */}
          {activeTab === 'duplicate' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-white/70 uppercase">
                  Select Work to Clone / Duplicate
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full bg-[#0a0a0e] border border-white/15 px-3 py-2.5 text-sm text-white focus:border-white focus:outline-none font-mono"
                >
                  <option value="">-- Choose from archive ({posts.length} available) --</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.category}] {p.title} (by @{p.authorUsername})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-white/70 uppercase">
                  Custom Duplicate Title (Optional)
                </label>
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  placeholder="e.g. Synthetic Veil (Remix Edition)"
                  className="w-full bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white focus:outline-none"
                />
              </div>

              <button
                onClick={handleDuplicatePost}
                disabled={isDuplicating || !selectedPostId}
                className="py-2.5 px-6 bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDuplicating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>DUPLICATING IN FIRESTORE...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>DUPLICATE WORK NOW</span>
                  </>
                )}
              </button>

              {duplicateSuccessMessage && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  {duplicateSuccessMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ARCHIVE EXPORT */}
          {activeTab === 'archive' && (
            <div className="space-y-6">
              <div className="border border-white/15 bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider font-mono">
                      Export Archive Copy (.JSON)
                    </h4>
                    <p className="text-xs text-white/50">
                      Creates a complete, portable archival copy of your published works, media metadata, and collections.
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs font-mono text-white/60">
                    Logged in as: <span className="text-white">@{currentUser?.username || 'anonymous'}</span>
                  </div>

                  <button
                    onClick={handleExportArchive}
                    disabled={isExporting || !currentUser?.id}
                    className="w-full sm:w-auto py-2 px-6 bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>EXPORTING...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>DOWNLOAD ARCHIVE COPY</span>
                      </>
                    )}
                  </button>
                </div>

                {exportMessage && (
                  <div className="p-3 bg-white/10 border border-white/20 text-xs font-mono text-white">
                    {exportMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
