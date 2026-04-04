import { ButtonHTMLAttributes } from 'react';
import { somClick, somHover } from '../services/hudSounds';

type Variant = 'primary' | 'success' | 'danger' | 'secondary' | 'info' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:   'bg-yellow-500 hover:bg-yellow-400 text-black border border-yellow-400/50 shadow-[0_0_12px_rgba(234,179,8,0.3)] hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]',
  success:   'bg-green-600 hover:bg-green-500 text-white border border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.2)] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]',
  danger:    'bg-red-600 hover:bg-red-500 text-white border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
  secondary: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border border-zinc-600/50 shadow-[0_0_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_14px_rgba(255,255,255,0.08)]',
  info:      'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
  ghost:     'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

interface BotaoHUDProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function BotaoHUD({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  onMouseEnter,
  onClick,
  disabled,
  ...props
}: BotaoHUDProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={e => {
        if (!disabled) somHover();
        onMouseEnter?.(e);
      }}
      onClick={e => {
        if (!disabled) somClick();
        (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(e);
      }}
      className={`
        font-bold uppercase tracking-widest rounded-lg
        transition-all duration-150 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </button>
  );
}
