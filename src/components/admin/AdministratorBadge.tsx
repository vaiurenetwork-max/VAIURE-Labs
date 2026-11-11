import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdministratorBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const AdministratorBadge: React.FC<AdministratorBadgeProps> = ({
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  const textSize = size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border border-white/20 bg-white/5 text-white/90 font-mono tracking-widest uppercase rounded-none ${textSize} ${className}`}
      title="VAIURE 唯昱尔 Verified Curator / System Administrator"
    >
      <ShieldCheck size={iconSize} className="text-white" />
      {showLabel && <span>CURATOR</span>}
    </span>
  );
};
