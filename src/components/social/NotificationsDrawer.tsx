import React, { useState } from 'react';
import { SocialNotification, UserProfile, SocialPost } from '../../types/social';
import {
  X,
  Heart,
  MessageSquare,
  Repeat,
  Bookmark,
  UserPlus,
  Briefcase,
  AtSign,
  CheckCheck,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  notifications: SocialNotification[];
  posts: SocialPost[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onSelectPost: (post: SocialPost) => void;
  onSelectProfile: (username: string) => void;
  onOpenDirectMessage: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  notifications,
  posts,
  onClose,
  onMarkAllRead,
  onSelectPost,
  onSelectProfile,
  onOpenDirectMessage,
}) => {
  const [filter, setFilter] = useState<'all' | 'mentions' | 'collabs'>('all');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'mentions') return n.type === 'mention' || n.type === 'reply';
    if (filter === 'collabs') return n.type === 'collab_request' || n.type === 'message';
    return true;
  });

  const getIcon = (type: SocialNotification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-white" />;
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-3.5 h-3.5 text-white/80" />;
      case 'repost':
        return <Repeat className="w-3.5 h-3.5 text-white/80" />;
      case 'save':
        return <Bookmark className="w-3.5 h-3.5 text-white/80" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-white/80" />;
      case 'collab_request':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-400" />;
      case 'mention':
        return <AtSign className="w-3.5 h-3.5 text-white/90" />;
      default:
        return null;
    }
  };

  const handleNotificationClick = (notif: SocialNotification) => {
    if (notif.type === 'collab_request' || notif.type === 'message') {
      onOpenDirectMessage();
      onClose();
      return;
    }
    if (notif.targetPostId) {
      const match = posts.find((p) => p.id === notif.targetPostId);
      if (match) {
        onSelectPost(match);
        onClose();
        return;
      }
    }
    onSelectProfile(notif.actorUsername);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md select-text">
      <div className="relative w-full max-w-md bg-[#09090b] border-l border-white/15 h-full flex flex-col text-white shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
              NOTIFICATIONS
            </span>
            <h3 className="text-base font-serif uppercase tracking-tight text-white">
              ACTIVITY
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onMarkAllRead}
              className="text-white/40 hover:text-white p-1 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">READ ALL</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close Notifications"
              className="text-white/60 hover:text-white p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-2.5 border-b border-white/5 bg-neutral-950 flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`uppercase py-0.5 transition-colors relative ${
              filter === 'all' ? 'text-white font-semibold' : 'text-white/40 hover:text-white'
            }`}
          >
            ALL
            {filter === 'all' && <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
          </button>
          <button
            onClick={() => setFilter('mentions')}
            className={`uppercase py-0.5 transition-colors relative ${
              filter === 'mentions' ? 'text-white font-semibold' : 'text-white/40 hover:text-white'
            }`}
          >
            MENTIONS
            {filter === 'mentions' && <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
          </button>
          <button
            onClick={() => setFilter('collabs')}
            className={`uppercase py-0.5 transition-colors relative ${
              filter === 'collabs' ? 'text-white font-semibold' : 'text-white/40 hover:text-white'
            }`}
          >
            COLLABORATIONS
            {filter === 'collabs' && <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />}
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {filteredNotifs.length === 0 ? (
            <div className="py-24 text-center text-xs font-mono text-white/40 tracking-widest uppercase">
              NO NOTIFICATIONS YET
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex items-start gap-3.5 cursor-pointer transition-colors ${
                  !n.read ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-[10px] text-white/70">
                    {n.actorAvatar ? (
                      <img
                        src={n.actorAvatar}
                        alt={n.actorName}
                        className="w-full h-full object-cover filter grayscale"
                      />
                    ) : (
                      <span>{n.actorUsername ? n.actorUsername.slice(0, 2).toUpperCase() : 'IV'}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-black p-0.5 rounded-full border border-white/20">
                    {getIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    <strong className="text-white font-medium">{n.actorName}</strong>{' '}
                    <span className="text-white/80">{n.message}</span>
                  </p>

                  {n.targetPostTitle && (
                    <p className="text-[11px] font-serif uppercase tracking-tight text-white/50 truncate mt-0.5">
                      "{n.targetPostTitle}"
                    </p>
                  )}

                  <span className="text-[9px] font-mono text-white/30 block mt-1">
                    {n.createdAt}
                  </span>
                </div>

                {!n.read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
