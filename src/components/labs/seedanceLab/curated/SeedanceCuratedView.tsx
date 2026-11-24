/**
 * VAIURE — SEEDANCE LAB "CURATED" MAIN WORKSPACE
 * Hosts two strictly separated environments:
 * 1. Explore Public Curates (Curator-approved & published creations only)
 * 2. My Private Curates (Owner-private creation vault)
 * Plus dedicated Curator Review Board visible strictly to authorized Curators & Admins.
 */

import React, { useState, useEffect } from 'react';
import { Globe, Lock, ShieldCheck } from 'lucide-react';
import {
  CuratedCategoryOption,
  UserCreation,
} from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';
import { PublicCuratedGalleryPanel } from './PublicCuratedGalleryPanel';
import { MyPrivateCuratesPanel } from './MyPrivateCuratesPanel';
import { CuratorReviewDashboard } from './CuratorReviewDashboard';
import { CreationDetailModal } from './CreationDetailModal';

export type CuratedEnvironmentTab = 'public' | 'private' | 'curator';

interface SeedanceCuratedViewProps {
  currentUserId?: string;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  initialEnvironment?: CuratedEnvironmentTab;
  onRequireAuth: () => void;
  onReusePromptInGenerator?: (creation: UserCreation) => void;
}

const DEFAULT_CATEGORIES: CuratedCategoryOption[] = [
  {
    id: 'ai-filmmaking',
    name: 'AI Filmmaking',
    description: 'Narrative shorts, directorial sequences, and Seedance 2.5 cinema.',
  },
  {
    id: 'cinematography-motion',
    name: 'Cinematography & Motion',
    description: 'Camera choreography, tracking shots, and kinetic lighting studies.',
  },
  {
    id: 'concept-stills',
    name: 'Concept Art & Stills',
    description: 'High-resolution keyframes, architectural frames, and look-dev plates.',
  },
  {
    id: 'character-studies',
    name: 'Character Studies',
    description: 'Identity-locked portraits, wardrobe sheets, and expressive performance plates.',
  },
  {
    id: 'worldbuilding',
    name: 'Worldbuilding & Environments',
    description: 'Spatial design, atmospheric landscapes, and sci-fi/period sets.',
  },
  {
    id: 'physics-vfx',
    name: 'Physics & VFX',
    description: 'Fluid simulation, cloth dynamics, destruction, and optical effects.',
  },
  {
    id: 'editorial-lookdev',
    name: 'Editorial & Look-Dev',
    description: 'Monochrome cinema, fashion films, and stylized visual essays.',
  },
];

export const SeedanceCuratedView: React.FC<SeedanceCuratedViewProps> = ({
  currentUserId,
  isAuthenticated,
  isAdmin = false,
  initialEnvironment = 'public',
  onRequireAuth,
  onReusePromptInGenerator,
}) => {
  const [activeEnv, setActiveEnv] = useState<CuratedEnvironmentTab>(initialEnvironment);
  const [categories, setCategories] = useState<CuratedCategoryOption[]>(DEFAULT_CATEGORIES);
  const [viewerIsCurator, setViewerIsCurator] = useState<boolean>(isAdmin);
  const [selectedPublishedId, setSelectedPublishedId] = useState<string | null>(null);
  const [publicRefreshSignal, setPublicRefreshSignal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    seedanceCuratedService
      .getMeta()
      .then((meta) => {
        if (cancelled) return;
        if (Array.isArray(meta.categories) && meta.categories.length > 0) {
          setCategories(meta.categories);
        }
        setViewerIsCurator(Boolean(meta.viewerIsCurator || isAdmin));
      })
      .catch(() => {
        if (!cancelled) setViewerIsCurator(isAdmin);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, isAdmin]);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar bg-black text-white p-4 sm:p-6 lg:p-8 select-text">
      <div className="max-w-[1560px] mx-auto space-y-6 pb-16">
        {/* Top Workspace Banner with Strict Environment Switcher */}
        <section className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-white/50">
              VAIURE · SEEDANCE CURATED ARCHIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-white">
              {activeEnv === 'public'
                ? 'Explore Public Curates'
                : activeEnv === 'private'
                ? 'My Private Curates'
                : 'Curator Review Studio'}
            </h1>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
              {activeEnv === 'public'
                ? 'Discover Seedance films and AI imagery explicitly submitted by creators and approved by platform curators.'
                : activeEnv === 'private'
                ? 'Your private personal creation vault. Every completed AI output saves here automatically and remains strictly private unless you choose to suggest it.'
                : 'Dedicated curator governance console for inspecting submissions, copyright/safety checklists, and public reports.'}
            </p>
          </div>

          {/* Strictly Separated Environment Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveEnv('public')}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide flex items-center gap-2 transition-all cursor-pointer ${
                activeEnv === 'public'
                  ? 'bg-white text-black font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)]'
                  : 'border border-white/[0.14] bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Explore Public Curates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEnv('private')}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide flex items-center gap-2 transition-all cursor-pointer ${
                activeEnv === 'private'
                  ? 'bg-white text-black font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)]'
                  : 'border border-white/[0.14] bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>My Private Curates</span>
            </button>

            {viewerIsCurator && (
              <button
                type="button"
                onClick={() => setActiveEnv('curator')}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide flex items-center gap-2 transition-all cursor-pointer ${
                  activeEnv === 'curator'
                    ? 'bg-white text-black font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)]'
                    : 'border border-white/[0.14] bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Curator Review</span>
              </button>
            )}
          </div>
        </section>

        {/* Active Environment Panel */}
        {activeEnv === 'public' && (
          <PublicCuratedGalleryPanel
            isAuthenticated={isAuthenticated}
            categories={categories}
            refreshSignal={publicRefreshSignal}
            onSelectPublished={(id) => setSelectedPublishedId(id)}
            onRequireAuth={onRequireAuth}
          />
        )}

        {activeEnv === 'private' && (
          <MyPrivateCuratesPanel
            isAuthenticated={isAuthenticated}
            categories={categories}
            onRequireAuth={onRequireAuth}
            onReusePromptInGenerator={onReusePromptInGenerator}
            onOpenPublishedId={(pubId) => setSelectedPublishedId(pubId)}
          />
        )}

        {activeEnv === 'curator' && viewerIsCurator && (
          <CuratorReviewDashboard
            onPublishedChanged={() => setPublicRefreshSignal((n) => n + 1)}
          />
        )}
      </div>

      {/* Public Creation Detail Modal */}
      {selectedPublishedId && (
        <CreationDetailModal
          publishedId={selectedPublishedId}
          currentUserId={currentUserId}
          isCurator={viewerIsCurator}
          isAuthenticated={isAuthenticated}
          categories={categories}
          onRequireAuth={onRequireAuth}
          onClose={() => setSelectedPublishedId(null)}
          onUpdated={() => setPublicRefreshSignal((n) => n + 1)}
        />
      )}
    </div>
  );
};
