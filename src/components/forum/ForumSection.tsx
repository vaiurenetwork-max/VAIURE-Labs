import React, { useState, useEffect } from 'react';
import { ForumThread, ForumTopic } from '../../types/forum';
import { UserProfile } from '../../types/social';
import { ForumThreadCard } from './ForumThreadCard';
import { NewThreadModal } from './NewThreadModal';
import { subscribeToForumThreads, createForumThread } from '../../services/forumService';
import { useLanguage } from '../../services/i18n';
import {
  MessageSquare,
  Search,
  Plus,
  Sparkles,
  TrendingUp,
  Filter,
  Hash,
  Terminal,
  Layers,
} from 'lucide-react';

interface ForumSectionProps {
  currentUser: UserProfile;
  onOpenAuthModal?: () => void;
  onOpenProfile?: (userId: string) => void;
}

const TOPICS: { label: string; value: string }[] = [
  { label: 'ALL DISCOURSE', value: 'ALL' },
  { label: 'PROMPT CRAFT', value: 'Prompt Engineering' },
  { label: 'AESTHETIC CRITIQUE', value: 'Aesthetic Critique' },
  { label: 'CINEMA DIRECTION', value: 'Cinema Direction' },
  { label: 'SYNTHETIC RUNWAY', value: 'Synthetic Runway' },
  { label: 'WORKFLOW & TECH', value: 'Workflow & Tech' },
  { label: 'TOOLS & MODELS', value: 'Tools & Models' },
];

export const ForumSection: React.FC<ForumSectionProps> = ({
  currentUser,
  onOpenAuthModal,
  onOpenProfile,
}) => {
  const { t } = useLanguage();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);

  // Subscribe to real-time forum threads
  useEffect(() => {
    setIsLoading(true);
    const filter = selectedTopic === 'ALL' ? null : selectedTopic;
    const unsub = subscribeToForumThreads(filter, currentUser.id, (liveThreads) => {
      setThreads(liveThreads);
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedTopic, currentUser.id]);

  const handleCreateThreadSubmit = async (data: any) => {
    await createForumThread(currentUser, data);
  };

  const handleOpenComposer = () => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    setIsNewThreadOpen(true);
  };

  // Filter threads by search query
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.content.toLowerCase().includes(q) ||
      t.authorUsername.toLowerCase().includes(q) ||
      t.authorDisplayName.toLowerCase().includes(q) ||
      t.topic.toLowerCase().includes(q)
    );
  });

  return (
    <section id="forum" className="w-full bg-[#050507] text-white py-12 md:py-20 border-t border-white/10 select-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-emerald-400 uppercase mb-1.5">
              <span>{t('navForum')}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-tight text-white font-light">
              {t('allDiscourse')}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-light mt-1 max-w-xl">
              Real-time discussions and updates from creators.
            </p>
          </div>

          <button
            onClick={handleOpenComposer}
            className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newThread')}</span>
          </button>
        </div>

        {/* Inline Quick Composer Bar */}
        <div
          onClick={handleOpenComposer}
          className="p-4 bg-[#0d0d10] border border-white/15 rounded-xl hover:border-white/30 transition-all cursor-pointer shadow-lg mb-8 flex items-center gap-3.5"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white/70">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                className="w-full h-full object-cover filter grayscale"
              />
            ) : (
              <span>{currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'IV'}</span>
            )}
          </div>
          <div className="flex-1 text-xs text-white/40 font-sans tracking-wide">
            {t('postAThreadPlaceholder')}
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-white/10 text-white font-mono text-[11px] uppercase tracking-wider rounded-lg border border-white/15 hover:bg-white/20 transition-colors cursor-pointer"
          >
            {t('post')}
          </button>
        </div>

        {/* Topics Filter & Search Bar */}
        <div className="space-y-4 mb-6">
          {/* Topic Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TOPICS.map((top) => {
              const isSelected = selectedTopic === top.value;
              return (
                <button
                  key={top.value}
                  onClick={() => setSelectedTopic(top.value)}
                  className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors border ${
                    isSelected
                      ? 'bg-white text-black border-white font-medium'
                      : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white bg-black/40'
                  }`}
                >
                  {top.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dispatches, prompt keywords, authors, or topics..."
              className="w-full bg-[#0d0d10] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-sans"
            />
          </div>
        </div>

        {/* Thread Feed Stream */}
        <div className="bg-[#09090b] border border-white/15 rounded-xl divide-y divide-white/10 shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-24 text-center space-y-3 font-mono text-xs text-white/40 uppercase tracking-widest">
              <span>LOADING THREADS...</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="py-24 text-center space-y-3 px-6">
              <MessageSquare className="w-8 h-8 text-white/20 mx-auto" />
              <h3 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                NO THREADS FOUND
              </h3>
              <p className="text-xs text-white/40 font-light max-w-sm mx-auto">
                {searchQuery
                  ? 'No threads match your search terms.'
                  : 'Be the first creator to start a conversation in this topic.'}
              </p>
              <button
                onClick={handleOpenComposer}
                className="mt-2 px-4 py-2 bg-white text-black text-xs font-mono uppercase font-semibold hover:bg-neutral-200 transition-colors inline-block cursor-pointer"
              >
                START A THREAD
              </button>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <ForumThreadCard
                key={thread.id}
                thread={thread}
                currentUser={currentUser}
                onOpenAuthModal={onOpenAuthModal}
                onOpenProfile={onOpenProfile}
              />
            ))
          )}
        </div>
      </div>

      {/* New Thread Modal (Matches reference image) */}
      <NewThreadModal
        isOpen={isNewThreadOpen}
        currentUser={currentUser}
        initialTopic={selectedTopic === 'ALL' ? 'General Discourse' : (selectedTopic as ForumTopic)}
        onClose={() => setIsNewThreadOpen(false)}
        onSubmit={handleCreateThreadSubmit}
      />
    </section>
  );
};
