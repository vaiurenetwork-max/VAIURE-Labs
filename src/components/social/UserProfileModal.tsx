import React, { useState, useEffect } from 'react';
import { UserProfile, SocialPost } from '../../types/social';
import { ForumThread } from '../../types/forum';
import {
  X,
  Grid,
  MessageSquare,
  Bookmark,
  Info,
  Settings,
  Shield,
  LogOut,
  Camera,
  Globe,
  MapPin,
  Heart,
  MessageCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { AdministratorBadge } from '../admin/AdministratorBadge';
import { ChangeUsernameModal } from '../settings/ChangeUsernameModal';
import { EditProfileModal } from './EditProfileModal';
import { subscribeToForumThreads } from '../../services/forumService';

interface UserProfileModalProps {
  user: UserProfile | null;
  currentUser: UserProfile;
  posts: SocialPost[];
  isOpen: boolean;
  isAdmin?: boolean;
  initialTab?: 'posts' | 'threads' | 'saved' | 'about';
  onClose: () => void;
  onToggleFollow: (username: string) => void;
  onSelectPost: (post: SocialPost) => void;
  onOpenDirectMessage: (user: UserProfile, isCollab?: boolean) => void;
  onOpenCreateCollection?: () => void;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
  onOpenWallet?: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onUsernameChanged?: (newUsername: string, lastUsernameChangeAt: string) => void;
  onUpdateProfile?: (updates: {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: string;
  }) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  posts,
  isOpen,
  isAdmin = false,
  initialTab = 'posts',
  onClose,
  onToggleFollow,
  onSelectPost,
  onOpenDirectMessage,
  onSignOut,
  onOpenSettings,
  onOpenAdmin,
  onUsernameChanged,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'threads' | 'saved' | 'about'>(initialTab);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const [userThreads, setUserThreads] = useState<ForumThread[]>([]);
  const [lightboxThreadImage, setLightboxThreadImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load threads for this user
  useEffect(() => {
    if (!isOpen || !user?.username) {
      setUserThreads([]);
      return;
    }

    const unsub = subscribeToForumThreads(null, currentUser.id, (allThreads) => {
      const filtered = (allThreads || []).filter(
        (t) => t.authorUsername === user.username || (user.id && t.authorId === user.id)
      );
      setUserThreads(filtered);
    });

    return () => unsub();
  }, [isOpen, user?.username, user?.id, currentUser.id]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxThreadImage) {
          setLightboxThreadImage(null);
        } else if (!isEditProfileOpen && !isChangeUsernameOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isEditProfileOpen, isChangeUsernameOpen, lightboxThreadImage]);

  if (!isOpen || !user) return null;

  const isCurrent = user.username === currentUser.username || (currentUser.id && user.id === currentUser.id);
  const userPosts = posts.filter(
    (p) => p.authorUsername === user.username || (user.id && p.authorId === user.id)
  );

  const isAdministrator =
    user.specialBadge === 'ADMINISTRATOR' ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    user.username?.toLowerCase() === 'yinnefuxia' ||
    user.email?.toLowerCase() === 'fuxiayinne@gmail.com' ||
    user.email?.toLowerCase() === 'rachvan420@gmail.com' ||
    user.id === '4LWdLrdimeYc9fBtCUVcRLuCCn93';

  const userCollections = user.collections || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${user.displayName || user.username}'s profile`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-xl overflow-y-auto p-0 sm:p-4 md:p-6 select-text"
    >
      <div className="relative w-full max-w-4xl min-h-screen sm:min-h-0 bg-[#07070a] border-0 sm:border sm:border-white/10 text-white shadow-2xl flex flex-col overflow-hidden max-h-[96vh]">
        {/* Minimal Sticky Top Bar */}
        <div className="sticky top-0 z-20 bg-[#07070a]/95 backdrop-blur border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-white/50 uppercase">
              @{user.username}
            </span>
            {(user.verified || isAdministrator) && (
              <span className="text-[10px] font-mono text-amber-400">✓</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Main Profile Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 space-y-8">
          {/* A. PROFILE HEADER (Instagram-Inspired Clean Vertical Structure) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 pb-6 border-b border-white/10">
            {/* Avatar Circle */}
            <div className="relative group shrink-0 mx-auto sm:mx-0">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden border border-white/20 bg-neutral-900 flex items-center justify-center">
                {Boolean(user.avatar && user.avatar.trim()) ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName || user.username}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl font-serif text-white/60 uppercase">
                    {(user.username || 'VA').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {isCurrent && (
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  aria-label="Change profile photo"
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                >
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-mono uppercase tracking-wider">Edit</span>
                </button>
              )}
            </div>

            {/* User Credentials & Action Buttons */}
            <div className="flex-1 min-w-0 w-full space-y-3.5">
              {/* Row 1: Username & Primary Actions */}
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-serif uppercase tracking-tight text-white font-light">
                    @{user.username}
                  </h1>
                  {isAdministrator && <AdministratorBadge size="sm" />}
                </div>

                {/* Profile Actions */}
                <div className="flex items-center gap-2">
                  {isCurrent ? (
                    <>
                      <button
                        onClick={() => setIsEditProfileOpen(true)}
                        className="px-3.5 py-1.5 border border-white/25 hover:border-white text-xs font-mono tracking-wider uppercase text-white hover:bg-white/5 transition-all cursor-pointer rounded-sm"
                      >
                        Edit profile
                      </button>

                      {onOpenSettings && (
                        <button
                          onClick={onOpenSettings}
                          aria-label="Settings"
                          title="Settings"
                          className="p-1.5 border border-white/20 hover:border-white text-white/70 hover:text-white transition-colors cursor-pointer rounded-sm"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}

                      {isAdmin && onOpenAdmin && (
                        <button
                          onClick={onOpenAdmin}
                          aria-label="Admin console"
                          title="Admin console"
                          className="p-1.5 border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer rounded-sm"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}

                      {onSignOut && (
                        <button
                          onClick={onSignOut}
                          aria-label="Sign out"
                          title="Sign out"
                          className="p-1.5 border border-white/20 hover:border-red-500/60 text-white/50 hover:text-red-400 transition-colors cursor-pointer rounded-sm"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onToggleFollow(user.username)}
                        className={`px-4 py-1.5 text-xs font-mono tracking-wider uppercase transition-all rounded-sm cursor-pointer ${
                          user.isFollowing
                            ? 'border border-white/25 text-white/70 hover:border-white/50 hover:text-white'
                            : 'bg-white text-black font-semibold hover:bg-neutral-200'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>

                      <button
                        onClick={() => onOpenDirectMessage(user)}
                        className="px-3.5 py-1.5 border border-white/25 hover:border-white text-xs font-mono tracking-wider uppercase text-white hover:bg-white/5 transition-colors cursor-pointer rounded-sm"
                      >
                        Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Metrics */}
              <div className="flex items-center gap-6 sm:gap-8 text-xs font-sans text-neutral-300 pt-0.5">
                <div>
                  <span className="font-semibold text-white font-mono tabular-nums mr-1.5">
                    {userPosts.length}
                  </span>
                  <span className="text-white/50 font-mono text-[11px] uppercase tracking-wider">
                    posts
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-white font-mono tabular-nums mr-1.5">
                    {user.followersCount || 0}
                  </span>
                  <span className="text-white/50 font-mono text-[11px] uppercase tracking-wider">
                    followers
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-white font-mono tabular-nums mr-1.5">
                    {user.followingCount || 0}
                  </span>
                  <span className="text-white/50 font-mono text-[11px] uppercase tracking-wider">
                    following
                  </span>
                </div>
              </div>

              {/* Row 3: Display Name & Bio */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-serif font-medium uppercase tracking-tight text-white">
                    {user.displayName || user.username}
                  </h2>
                  {user.role && (
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded-sm">
                      {user.role}
                    </span>
                  )}
                </div>

                {user.bio ? (
                  <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed whitespace-pre-line max-w-2xl font-sans">
                    {user.bio}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs font-mono text-white/50">
                  {user.location && (
                    <span className="flex items-center gap-1 text-neutral-400">
                      <MapPin className="w-3 h-3 text-white/40" />
                      <span>{user.location}</span>
                    </span>
                  )}

                  {user.website && (
                    <a
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/80 hover:text-white hover:underline flex items-center gap-1 transition-colors"
                    >
                      <Globe className="w-3 h-3 text-white/40" />
                      <span>{user.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* C. PROFILE CONTENT NAVIGATION (Minimal Tabs) */}
          <div className="border-b border-white/10">
            <nav className="flex items-center justify-center gap-8 sm:gap-12 text-xs font-mono tracking-widest uppercase">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-3 flex items-center gap-1.5 relative transition-colors cursor-pointer ${
                  activeTab === 'posts' ? 'text-white font-medium' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Posts</span>
                {activeTab === 'posts' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('threads')}
                className={`py-3 flex items-center gap-1.5 relative transition-colors cursor-pointer ${
                  activeTab === 'threads' ? 'text-white font-medium' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Threads</span>
                {activeTab === 'threads' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                )}
              </button>

              {(isCurrent || userCollections.length > 0) && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`py-3 flex items-center gap-1.5 relative transition-colors cursor-pointer ${
                    activeTab === 'saved' ? 'text-white font-medium' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved</span>
                  {activeTab === 'saved' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('about')}
                className={`py-3 flex items-center gap-1.5 relative transition-colors cursor-pointer ${
                  activeTab === 'about' ? 'text-white font-medium' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About</span>
                {activeTab === 'about' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                )}
              </button>
            </nav>
          </div>

          {/* D. CONTENT GRID (Clean 3-Column Instagram-Style Aspect Grid) */}
          <div>
            {/* POSTS TAB */}
            {activeTab === 'posts' && (
              <div>
                {userPosts.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                      No posts published yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-4 md:gap-5">
                    {userPosts.map((post) => {
                      const cover = post.media[0]?.url || '';
                      return (
                        <div
                          key={post.id}
                          onClick={() => {
                            onSelectPost(post);
                            onClose();
                          }}
                          className="group relative aspect-square bg-neutral-950 border border-white/10 overflow-hidden cursor-pointer"
                        >
                          {cover ? (
                            <img
                              src={cover}
                              alt={post.title}
                              loading="lazy"
                              className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs font-serif uppercase tracking-tight text-white/60">
                              {post.title}
                            </div>
                          )}

                          {/* Hover Overlay with Real Engagement Counts */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-mono font-medium">
                            <span className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4 fill-white" />
                              <span className="tabular-nums">{post.likesCount || 0}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4 fill-white" />
                              <span className="tabular-nums">{post.commentsCount || 0}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* THREADS TAB */}
            {activeTab === 'threads' && (
              <div>
                {userThreads.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                      No threads published yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 border-y border-white/10">
                    {userThreads.map((thread) => (
                      <div key={thread.id} className="py-4 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                          <span className="uppercase text-white/60">{thread.topic}</span>
                          <span>
                            {new Date(thread.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        <p className="text-sm font-sans font-light text-neutral-200 leading-relaxed whitespace-pre-wrap">
                          {thread.content}
                        </p>

                        {/* Thread Optimized Images */}
                        {thread.mediaUrls && thread.mediaUrls.length > 0 && (
                          <div className="flex gap-2.5 overflow-x-auto py-1">
                            {thread.mediaUrls.map((imgUrl, i) => {
                              const opt = thread.optimizedImages?.[i];
                              const preview = opt?.thumbnailUrl || imgUrl;
                              const full = opt?.url || imgUrl;
                              return (
                                <div
                                  key={i}
                                  onClick={() => setLightboxThreadImage(full)}
                                  className="w-28 sm:w-36 aspect-[3/4] rounded-sm overflow-hidden border border-white/10 bg-neutral-900 shrink-0 cursor-pointer hover:border-white/40 transition-colors"
                                >
                                  <img
                                    src={preview}
                                    alt="Thread asset"
                                    loading="lazy"
                                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-300"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center gap-5 pt-1 text-xs font-mono text-white/40">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            <span>{thread.likesCount || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{thread.repliesCount || 0}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SAVED TAB */}
            {activeTab === 'saved' && (
              <div>
                {userCollections.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-xs font-mono text-white/40 uppercase tracking-widest">
                      No saved posts yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {userCollections.map((col) => (
                      <div
                        key={col.id}
                        className="border border-white/10 p-4 bg-white/[0.02] space-y-2"
                      >
                        <div className="aspect-[4/3] bg-neutral-900 border border-white/10 overflow-hidden relative">
                          {col.coverImage ? (
                            <img
                              src={col.coverImage}
                              alt={col.title}
                              className="w-full h-full object-cover filter grayscale"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono text-xs text-white/30">
                              EMPTY
                            </div>
                          )}
                          {col.isPrivate && (
                            <div className="absolute top-2 right-2 bg-black/80 p-1 border border-white/10">
                              <Lock className="w-3 h-3 text-white/70" />
                            </div>
                          )}
                        </div>

                        <h3 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                          {col.title}
                        </h3>
                        <p className="text-xs text-neutral-400 font-light line-clamp-1 font-sans">
                          {col.description || 'Collection'}
                        </p>
                        <div className="text-[10px] font-mono text-white/40 pt-1 border-t border-white/5">
                          {col.postIds.length} items
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="max-w-2xl space-y-6 text-xs sm:text-sm font-sans text-neutral-300 font-light">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                    Biography
                  </span>
                  <p className="text-neutral-200 leading-relaxed font-sans">
                    {user.bio ? user.bio : 'No biography provided.'}
                  </p>
                </div>

                {user.aiSpecialties && user.aiSpecialties.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-2">
                      Specialties & Tools
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {user.aiSpecialties.map((spec) => (
                        <span
                          key={spec}
                          className="px-2.5 py-1 bg-white/[0.04] border border-white/15 text-xs font-mono text-white"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-white/60">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block mb-0.5">Account Role</span>
                    <span className="text-white uppercase">{user.role || 'CREATOR'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-white/40 uppercase block mb-0.5">Status</span>
                    <span className="text-white uppercase">
                      {user.verified || isAdministrator ? 'Verified Creator' : 'Standard Member'}
                    </span>
                  </div>

                  {user.location && (
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block mb-0.5">Location</span>
                      <span className="text-white">{user.location}</span>
                    </div>
                  )}

                  {user.website && (
                    <div>
                      <span className="text-[10px] text-white/40 uppercase block mb-0.5">Website</span>
                      <a
                        href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:underline truncate block"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isCurrent && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          currentUser={currentUser}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={async (updates) => {
            if (onUpdateProfile) {
              await onUpdateProfile(updates);
            }
          }}
          onOpenChangeUsername={() => setIsChangeUsernameOpen(true)}
        />
      )}

      {/* Change Username Modal (1-week policy) */}
      {isCurrent && (
        <ChangeUsernameModal
          isOpen={isChangeUsernameOpen}
          currentUser={currentUser}
          onClose={() => setIsChangeUsernameOpen(false)}
          onUsernameChanged={(newU, newT) => {
            onUsernameChanged?.(newU, newT);
          }}
        />
      )}

      {/* Lightbox for thread media preview */}
      {lightboxThreadImage && (
        <div
          onClick={() => setLightboxThreadImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setLightboxThreadImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxThreadImage}
            alt="Full Preview"
            className="max-w-full max-h-[90vh] object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
