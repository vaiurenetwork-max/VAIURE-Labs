/**
 * VAIURE — SEEDANCE LAB "MY PRIVATE CURATES" PERSONAL CREATION LIBRARY
 * Strictly owner-private gallery holding ALL completed AI generations across Seedance 2.5,
 * Image Studio, Canvas Studio, and Midjourney bridges.
 * Nothing here is ever publicly visible unless submitted & approved by Curators.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Search,
  FolderPlus,
  Folder,
  Trash2,
  Edit3,
  Download,
  Send,
  X,
  RotateCcw,
  Film,
  Image as ImageIcon,
  Check,
  RefreshCw,
  FolderCheck,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import {
  CreationCollection,
  CuratedCategoryOption,
  CuratedMediaType,
  CurationSubmission,
  UserCreation,
} from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';
import { SubmitForCurationModal } from './SubmitForCurationModal';

interface MyPrivateCuratesPanelProps {
  isAuthenticated: boolean;
  categories: CuratedCategoryOption[];
  onRequireAuth: () => void;
  onReusePromptInGenerator?: (creation: UserCreation) => void;
  onOpenPublishedId?: (publishedId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  not_submitted: 'Private Only',
  submitted: 'Submitted · Pending Review',
  under_review: 'Under Curator Review',
  approved: 'Approved · Published',
  published: 'Published in Public Curates',
  rejected: 'Not Approved · Private Only',
  withdrawn: 'Withdrawn · Private Only',
  revision_requested: 'Revision Requested · Private Only',
};

export const MyPrivateCuratesPanel: React.FC<MyPrivateCuratesPanelProps> = ({
  isAuthenticated,
  categories,
  onRequireAuth,
  onReusePromptInGenerator,
  onOpenPublishedId,
}) => {
  const [creations, setCreations] = useState<UserCreation[]>([]);
  const [collections, setCollections] = useState<CreationCollection[]>([]);
  const [submissions, setSubmissions] = useState<CurationSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [mediaFilter, setMediaFilter] = useState<'ALL' | CuratedMediaType>('ALL');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Personal Collection UI
  const [newColName, setNewColName] = useState('');
  const [creatingCol, setCreatingCol] = useState(false);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [renamingColVal, setRenamingColVal] = useState('');
  const [confirmDeleteColId, setConfirmDeleteColId] = useState<string | null>(null);

  // Creation Inspect / Edit / Delete / Submit
  const [inspectCreation, setInspectCreation] = useState<UserCreation | null>(null);
  const [editingCreation, setEditingCreation] = useState<UserCreation | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editProject, setEditProject] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<UserCreation | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const loadPrivateLibrary = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await seedanceCuratedService.listPrivateCreations({
        mediaType: mediaFilter,
        collectionId: selectedCollectionId || undefined,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setCreations(res.creations);
      setCollections(res.collections);
      setSubmissions(res.submissions);
    } catch (err: any) {
      flash(err?.message || 'Unable to load My Private Curates.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, mediaFilter, selectedCollectionId, statusFilter, searchQuery]);

  useEffect(() => {
    loadPrivateLibrary();
  }, [loadPrivateLibrary]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-10 text-center space-y-4">
        <Lock className="w-8 h-8 text-white/40 mx-auto" />
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-serif text-white">My Private Curates</h3>
          <p className="text-xs text-white/55 leading-relaxed">
            Every Seedance video and AI image you generate is captured automatically into your encrypted personal library. Sign in to view, organize, and selectively suggest work for Public Curates.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
        >
          Sign In to Access Vault
        </button>
      </div>
    );
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    setCreatingCol(true);
    try {
      await seedanceCuratedService.createCollection(newColName.trim());
      setNewColName('');
      await loadPrivateLibrary();
      flash('Collection created.');
    } catch (err: any) {
      flash(err?.message || 'Failed to create collection.');
    } finally {
      setCreatingCol(false);
    }
  };

  const handleSaveRenameCollection = async (colId: string) => {
    if (!renamingColVal.trim()) return;
    try {
      await seedanceCuratedService.renameCollection(colId, renamingColVal.trim());
      setRenamingColId(null);
      await loadPrivateLibrary();
      flash('Collection renamed.');
    } catch (err: any) {
      flash(err?.message || 'Rename failed.');
    }
  };

  const handleDeleteCollection = async (colId: string) => {
    try {
      await seedanceCuratedService.deleteCollection(colId);
      if (selectedCollectionId === colId) setSelectedCollectionId('');
      setConfirmDeleteColId(null);
      await loadPrivateLibrary();
      flash('Collection removed.');
    } catch (err: any) {
      flash(err?.message || 'Delete failed.');
    }
  };

  const handleToggleCollectionItem = async (
    collectionId: string,
    creation: UserCreation
  ) => {
    const inCol = creation.collectionIds.includes(collectionId);
    try {
      await seedanceCuratedService.assignToCollection(collectionId, creation.id, !inCol);
      await loadPrivateLibrary();
    } catch (err: any) {
      flash(err?.message || 'Update failed.');
    }
  };

  const openEditModal = (c: UserCreation) => {
    setEditingCreation(c);
    setEditTitle(c.title);
    setEditDesc(c.description || '');
    setEditTags((c.tags || []).join(', '));
    setEditProject(c.projectName || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCreation) return;
    try {
      await seedanceCuratedService.updatePrivateCreation(editingCreation.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        projectName: editProject.trim(),
      });
      setEditingCreation(null);
      await loadPrivateLibrary();
      flash('Private creation metadata saved.');
    } catch (err: any) {
      flash(err?.message || 'Failed to update creation.');
    }
  };

  const handleDeleteCreation = async (creationId: string) => {
    try {
      await seedanceCuratedService.deletePrivateCreation(creationId);
      setConfirmDeleteId(null);
      if (inspectCreation?.id === creationId) setInspectCreation(null);
      await loadPrivateLibrary();
      flash('Creation permanently deleted.');
    } catch (err: any) {
      flash(err?.message || 'Delete failed.');
    }
  };

  const handleWithdraw = async (submissionId: string) => {
    try {
      await seedanceCuratedService.withdrawSubmission(submissionId);
      await loadPrivateLibrary();
      flash('Withdrawn from public curation. Creation remains private.');
    } catch (err: any) {
      flash(err?.message || 'Withdraw failed.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar: Personal Collections */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-white">
                Collections
              </h3>
              <p className="text-[11px] text-white/45">Private folders</p>
            </div>
            <Lock className="w-3.5 h-3.5 text-white/50" />
          </div>

          <form onSubmit={handleCreateCollection} className="flex gap-1.5">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="New folder name..."
              maxLength={80}
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/35"
            />
            <button
              type="submit"
              disabled={creatingCol || !newColName.trim()}
              title="Create Collection"
              className="px-2.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedCollectionId('')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                !selectedCollectionId
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/75 hover:bg-white/[0.06]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span>All Private Curates</span>
              </span>
              <span className="font-mono text-[10px] tabular-nums opacity-70">
                {creations.length}
              </span>
            </button>

            {collections.map((col) => {
              const active = selectedCollectionId === col.id;
              return (
                <div
                  key={col.id}
                  className={`rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 transition-all ${
                    active ? 'bg-white text-black' : 'text-white/75 hover:bg-white/[0.06]'
                  }`}
                >
                  {renamingColId === col.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="text"
                        value={renamingColVal}
                        onChange={(e) => setRenamingColVal(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-0.5 rounded bg-black text-white text-xs border border-white/25"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRenameCollection(col.id)}
                        className="p-1 text-white bg-black rounded cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedCollectionId(col.id)}
                        className="flex-1 min-w-0 text-left text-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate font-medium">{col.name}</span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-[10px] tabular-nums opacity-65">
                          {col.itemCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingColId(col.id);
                            setRenamingColVal(col.name);
                          }}
                          className="p-1 opacity-55 hover:opacity-100 cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {confirmDeleteColId === col.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCollection(col.id)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black text-white cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteColId(col.id)}
                            className="p-1 opacity-55 hover:opacity-100 cursor-pointer"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submission Status Tracker Summary */}
        <div className="rounded-2xl border border-white/[0.1] bg-white/[0.025] p-4 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-white/75">
            Curation Submissions ({submissions.length})
          </div>
          {submissions.length === 0 ? (
            <p className="text-[11px] text-white/45">
              You have not suggested any private creations for Public Curates yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {submissions.slice(0, 8).map((sub) => (
                <div
                  key={sub.id}
                  className="p-2.5 rounded-xl border border-white/[0.08] bg-black/40 space-y-1"
                >
                  <div className="text-xs font-medium text-white truncate">
                    {sub.proposedTitle}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                    <span>{sub.status.replace('_', ' ')}</span>
                    {(sub.status === 'SUBMITTED' ||
                      sub.status === 'UNDER_REVIEW' ||
                      sub.status === 'APPROVED') && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(sub.id)}
                        className="text-white/70 hover:text-white underline cursor-pointer"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content: Controls & Private Creation Grid */}
      <div className="lg:col-span-9 space-y-5">
        {/* Privacy Guarantee Header & Filter Toolbar */}
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Lock className="w-3.5 h-3.5 text-white shrink-0" />
              <span>
                Private Personal Vault · Auto-saves completed generations · Never public unless you submit and curators approve.
              </span>
            </div>

            {notice && (
              <span className="text-xs font-mono text-white bg-white/[0.08] border border-white/[0.15] px-3 py-1 rounded-lg">
                {notice}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Media Tabs: ALL | IMAGES | VIDEOS */}
            <div className="flex items-center gap-1.5">
              {(['ALL', 'IMAGES', 'VIDEOS'] as const).map((tab) => {
                const value: 'ALL' | CuratedMediaType =
                  tab === 'IMAGES' ? 'IMAGE' : tab === 'VIDEOS' ? 'VIDEO' : 'ALL';
                const active = mediaFilter === value;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMediaFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-black font-semibold'
                        : 'border border-white/[0.12] bg-white/[0.03] text-white/70 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs font-mono text-white/80"
              >
                <option value="ALL">All Statuses</option>
                <option value="not_submitted">Private Only</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="published">Published</option>
                <option value="revision_requested">Revision Requested</option>
                <option value="rejected">Not Approved</option>
                <option value="withdrawn">Withdrawn</option>
              </select>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, titles, models..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/35"
                />
              </div>

              <button
                type="button"
                onClick={loadPrivateLibrary}
                disabled={loading}
                className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/75 cursor-pointer"
                title="Refresh Private Curates"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Creations Grid */}
        {loading && creations.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-xs font-mono text-white/50">
            Synchronizing your private AI creations...
          </div>
        ) : creations.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-white/30 mx-auto" />
            <div className="text-sm font-medium text-white">No Private Creations Found</div>
            <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
              Completed videos from Seedance 2.5 and generated images from Image Studio or VaiByte Canvas automatically appear here. Failed jobs are excluded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {creations.map((c) => {
              const statusText = STATUS_LABEL[c.publicationStatus] || c.publicationStatus;
              const canSubmit =
                c.publicationStatus === 'not_submitted' ||
                c.publicationStatus === 'rejected' ||
                c.publicationStatus === 'withdrawn' ||
                c.publicationStatus === 'revision_requested';
              const activeSub = submissions.find((s) => s.id === c.activeSubmissionId);

              return (
                <article
                  key={c.id}
                  className="rounded-2xl border border-white/[0.12] bg-white/[0.03] hover:border-white/25 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Media Preview */}
                    <div
                      onClick={() => setInspectCreation(c)}
                      className="relative w-full aspect-video bg-neutral-950 border-b border-white/[0.08] overflow-hidden cursor-pointer group"
                    >
                      {c.mediaType === 'VIDEO' ? (
                        <video
                          src={c.mediaStreamUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            e.currentTarget.play().catch(() => undefined);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                          }}
                        />
                      ) : (
                        <img
                          src={c.mediaStreamUrl}
                          alt={c.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}

                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-white/[0.15] text-[10px] font-mono text-white">
                        {c.mediaType === 'VIDEO' ? (
                          <Film className="w-3 h-3" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        <span>{c.mediaType}</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectCreation(c);
                        }}
                        className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/75 border border-white/[0.2] text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Inspect Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white line-clamp-1">
                          {c.title}
                        </h3>
                        <span className="text-[10px] font-mono text-white/45 shrink-0 tabular-nums">
                          {new Date(c.generatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Zero-pill inline spec line */}
                      <div className="text-[11px] font-mono text-white/55 tabular-nums truncate">
                        {c.aiModel} · {c.resolution} · {c.aspectRatio}
                        {c.durationSeconds ? ` · ${c.durationSeconds}s` : ''}
                      </div>

                      <p className="text-xs text-white/65 line-clamp-2 min-h-[2rem]">
                        {c.description || c.prompt || 'Generated AI creation'}
                      </p>

                      {/* Status Line */}
                      <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-white/80 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-white/50" />
                          <span>{statusText}</span>
                        </span>
                        {c.publishedCreationId &&
                          c.publicationStatus === 'published' &&
                          onOpenPublishedId && (
                            <button
                              type="button"
                              onClick={() => onOpenPublishedId(c.publishedCreationId!)}
                              className="text-white underline cursor-pointer"
                            >
                              View Public
                            </button>
                          )}
                      </div>

                      {c.latestReviewNotes && (
                        <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-white/75 line-clamp-2">
                          Reviewer: {c.latestReviewNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Controls */}
                  <div className="px-4 py-3 border-t border-white/[0.08] bg-black/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {canSubmit ? (
                        <button
                          type="button"
                          onClick={() => setSubmitTarget(c)}
                          className="flex-1 py-2 px-3 rounded-lg bg-white text-black font-semibold text-[11px] uppercase tracking-wider hover:bg-white/90 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Suggest for Public Curation</span>
                        </button>
                      ) : activeSub &&
                        (activeSub.status === 'SUBMITTED' ||
                          activeSub.status === 'UNDER_REVIEW' ||
                          activeSub.status === 'APPROVED') ? (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(activeSub.id)}
                          className="flex-1 py-2 px-3 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-white text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Withdraw Submission</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        title="Edit Metadata"
                        className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.09] text-white/80 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAssignTargetId(assignTargetId === c.id ? null : c.id)
                        }
                        title="Organize into Collections"
                        className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.09] text-white/80 cursor-pointer"
                      >
                        <FolderCheck className="w-3.5 h-3.5" />
                      </button>

                      {c.downloadUrl && (
                        <a
                          href={c.downloadUrl}
                          download
                          title="Download Original Asset"
                          className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.09] text-white/80 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {confirmDeleteId === c.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCreation(c.id)}
                          className="px-2 py-1.5 rounded-lg bg-white text-black font-mono text-[10px] font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(c.id)}
                          title="Delete Creation"
                          className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.12] text-white/75 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inline Collection Picker */}
                    {assignTargetId === c.id && (
                      <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                        <div className="text-[10px] font-mono uppercase text-white/50">
                          Assign to Private Collections
                        </div>
                        {collections.length === 0 ? (
                          <div className="text-[11px] text-white/45">
                            Create a folder in the sidebar first.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {collections.map((col) => {
                              const checked = c.collectionIds.includes(col.id);
                              return (
                                <button
                                  key={col.id}
                                  type="button"
                                  onClick={() => handleToggleCollectionItem(col.id, c)}
                                  className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-all ${
                                    checked
                                      ? 'bg-white text-black font-semibold'
                                      : 'border border-white/[0.15] text-white/70 hover:text-white'
                                  }`}
                                >
                                  {checked ? '✓ ' : '+ '}
                                  {col.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Private Creation Inspector Modal */}
      {inspectCreation && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/[0.15] bg-[#09090b] text-white flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.1] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  PRIVATE CREATION · {inspectCreation.aiModel} · {inspectCreation.resolution}
                </div>
                <h3 className="text-sm font-semibold text-white truncate">
                  {inspectCreation.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectCreation(null)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
              <div className="w-full rounded-xl overflow-hidden bg-black border border-white/[0.1] flex items-center justify-center max-h-[52vh]">
                {inspectCreation.mediaType === 'VIDEO' ? (
                  <video
                    src={inspectCreation.mediaStreamUrl}
                    controls
                    autoPlay
                    loop
                    className="max-h-[50vh] max-w-full"
                  />
                ) : (
                  <img
                    src={inspectCreation.mediaStreamUrl}
                    alt={inspectCreation.title}
                    className="max-h-[50vh] max-w-full object-contain"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.02] space-y-1.5">
                  <div className="font-mono text-[10px] uppercase text-white/50">
                    Private Prompt
                  </div>
                  <p className="text-white/85 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto no-scrollbar">
                    {inspectCreation.prompt || 'No prompt recorded'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.02] space-y-1.5 font-mono">
                  <div className="text-[10px] uppercase text-white/50">
                    Generation Parameters
                  </div>
                  <div className="text-white/80 space-y-1 tabular-nums">
                    <div>Job Code: {inspectCreation.sourceJobId}</div>
                    <div>Pipeline: {inspectCreation.sourcePipeline}</div>
                    <div>Aspect Ratio: {inspectCreation.aspectRatio}</div>
                    <div>Resolution: {inspectCreation.resolution}</div>
                    {inspectCreation.durationSeconds && (
                      <div>Duration: {inspectCreation.durationSeconds}s</div>
                    )}
                    <div>Generated: {new Date(inspectCreation.generatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {onReusePromptInGenerator && (
                  <button
                    type="button"
                    onClick={() => {
                      onReusePromptInGenerator(inspectCreation);
                      setInspectCreation(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white cursor-pointer"
                  >
                    Load in Generator
                  </button>
                )}
                {inspectCreation.downloadUrl && (
                  <a
                    href={inspectCreation.downloadUrl}
                    download
                    className="px-4 py-2 rounded-xl border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectCreation;
                    setInspectCreation(null);
                    setSubmitTarget(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Suggest for Public Curation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingCreation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg rounded-2xl border border-white/[0.15] bg-[#0a0a0c] p-6 space-y-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Private Creation Details</h3>
              <button
                type="button"
                onClick={() => setEditingCreation(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-white/55">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-white/55">
                Personal Notes / Description
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-sm text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-white/55">Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="scene1, test"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-white/55">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  placeholder="Film or Studio Project"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCreation(null)}
                className="px-4 py-2 rounded-xl border border-white/[0.12] text-xs text-white/75 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suggest for Public Curation Modal */}
      {submitTarget && (
        <SubmitForCurationModal
          creation={submitTarget}
          categories={categories}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={() => {
            loadPrivateLibrary();
            flash('Submitted for Curator Review. Creation stays private until approved.');
          }}
        />
      )}
    </div>
  );
};
