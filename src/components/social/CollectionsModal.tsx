import React, { useState } from 'react';
import { UserProfile, SocialPost, UserCollection } from '../../types/social';
import { X, Plus, Lock, Globe, Bookmark, Trash2, ArrowRight } from 'lucide-react';

interface CollectionsModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  posts: SocialPost[];
  onClose: () => void;
  onSelectPost: (post: SocialPost) => void;
  onCreateCollection: (title: string, description: string, isPrivate: boolean) => void;
  onRemoveFromCollection: (postId: string, collectionId: string) => void;
}

export const CollectionsModal: React.FC<CollectionsModalProps> = ({
  isOpen,
  currentUser,
  posts,
  onClose,
  onSelectPost,
  onCreateCollection,
  onRemoveFromCollection,
}) => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    currentUser.collections[0]?.id || ''
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const currentCollection = currentUser.collections.find((c) => c.id === selectedCollectionId) || currentUser.collections[0];
  const collectionPosts = currentCollection
    ? posts.filter((p) => currentCollection.postIds.includes(p.id))
    : [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateCollection(newTitle.trim(), newDesc.trim(), isPrivate);
    setNewTitle('');
    setNewDesc('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl overflow-y-auto p-4 sm:p-6 md:p-12 select-text">
      <div className="relative w-full max-w-5xl bg-[#09090b] border border-white/15 my-auto text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header bar */}
        <div className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
            COLLECTIONS
          </div>
          <button
            onClick={onClose}
            aria-label="Close Collections"
            className="text-white/60 hover:text-white p-1 transition-colors flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase"
          >
            <span>CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10 space-y-8 overflow-y-auto max-h-[82vh]">
          {/* Top collections bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex flex-wrap items-center gap-3">
              {currentUser.collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`px-4 py-2 text-xs font-mono tracking-wider uppercase transition-colors flex items-center gap-2 border ${
                    selectedCollectionId === col.id
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {col.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  <span>{col.title}</span>
                  <span className="text-[10px] opacity-60">({col.postIds.length})</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-4 py-2 border border-white/20 hover:border-white text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW COLLECTION</span>
            </button>
          </div>

          {/* Create New Collection Inline Panel */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="p-6 border border-white/15 bg-neutral-950 space-y-4">
              <div className="text-xs font-mono tracking-widest text-white/50 uppercase">
                CREATE NEW COLLECTION
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="COLLECTION TITLE (E.G. 'FUTURE FASHION')"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2 text-xs text-white uppercase placeholder-white/30 focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="w-full h-full py-2 px-3 border border-white/15 text-xs font-mono uppercase flex items-center justify-center gap-2 text-white/80 hover:text-white"
                  >
                    {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>{isPrivate ? 'PRIVATE MOODBOARD' : 'PUBLIC ARCHIVE'}</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description of thematic focus (optional)..."
                className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-1.5 border border-white/15 text-xs font-mono uppercase text-white/60 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-white text-black text-xs font-mono uppercase font-semibold hover:bg-neutral-200"
                >
                  CREATE MOODBOARD
                </button>
              </div>
            </form>
          )}

          {/* Current Collection Info */}
          {currentCollection && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase">
                {currentCollection.isPrivate ? (
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PRIVATE</span>
                ) : (
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> PUBLIC ARCHIVE</span>
                )}
                <span>·</span>
                <span>UPDATED {currentCollection.updatedAt}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-light uppercase tracking-tight text-white">
                {currentCollection.title}
              </h2>
              {currentCollection.description && (
                <p className="text-xs text-neutral-400 font-light max-w-2xl">
                  {currentCollection.description}
                </p>
              )}
            </div>
          )}

          {/* Moodboard Grid Layout */}
          {collectionPosts.length === 0 ? (
            <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
              NOTHING SAVED
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {collectionPosts.map((post) => (
                <div
                  key={post.id}
                  className="group relative aspect-[3/4] bg-neutral-900 border border-white/10 overflow-hidden cursor-pointer"
                >
                  {post.media[0]?.url ? (
                    <img
                      src={post.media[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform"
                      onClick={() => {
                        onSelectPost(post);
                        onClose();
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono text-white/70 uppercase">
                        {post.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromCollection(post.id, currentCollection.id);
                        }}
                        className="text-white/60 hover:text-red-400 p-1 bg-black/60 border border-white/15"
                        title="Remove from collection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div
                      onClick={() => {
                        onSelectPost(post);
                        onClose();
                      }}
                    >
                      <h4 className="text-xs font-serif uppercase tracking-tight text-white line-clamp-2">
                        {post.title}
                      </h4>
                      <p className="text-[10px] font-mono text-white/40 pt-1">
                        @{post.authorUsername}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
