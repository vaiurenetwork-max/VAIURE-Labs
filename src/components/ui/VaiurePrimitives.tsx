import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { Z_LAYERS } from '../../constants/zLayers';

export interface ToastNotice {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'error';
}

interface VaiureToastHostProps {
  notices: ToastNotice[];
  onDismiss: (id: string) => void;
}

export const VaiureToastHost: React.FC<VaiureToastHostProps> = ({ notices, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 ${Z_LAYERS.TOAST_CRITICAL} flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md`}
    >
      <AnimatePresence mode="popLayout">
        {notices.map((notice) => {
          const tone = notice.tone || 'info';
          return (
            <motion.div
              key={notice.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/20 text-white shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-xs font-mono tracking-wide"
            >
              {tone === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {tone === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              {tone === 'info' && <Info className="w-3.5 h-3.5 text-white/70 shrink-0" />}
              <span className="text-white/90 leading-snug">{notice.message}</span>
              <button
                type="button"
                onClick={() => onDismiss(notice.id)}
                aria-label="Dismiss notification"
                className="ml-1 p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

interface VaiureEmptyStateProps {
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const VaiureEmptyState: React.FC<VaiureEmptyStateProps> = ({
  icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`border border-white/[0.09] bg-[#0a0a0d] px-6 py-16 sm:py-20 text-center flex flex-col items-center justify-center ${className}`}
    >
      {icon && (
        <div className="w-11 h-11 border border-white/15 bg-white/[0.03] flex items-center justify-center text-white/60 mb-4">
          {icon}
        </div>
      )}
      {eyebrow && (
        <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase mb-2">
          {eyebrow}
        </span>
      )}
      <h3 className="text-lg sm:text-xl font-serif font-light text-white uppercase tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-white/50 font-light max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors text-[11px] font-mono tracking-widest uppercase font-semibold cursor-pointer min-h-[44px]"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2.5 border border-white/20 hover:border-white/50 text-white/75 hover:text-white transition-colors text-[11px] font-mono tracking-widest uppercase cursor-pointer min-h-[44px]"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface VaiureSkeletonProps {
  className?: string;
}

export const VaiureSkeleton: React.FC<VaiureSkeletonProps> = ({ className = '' }) => (
  <div className={`vaiure-shimmer bg-white/[0.03] ${className}`} aria-hidden="true" />
);
