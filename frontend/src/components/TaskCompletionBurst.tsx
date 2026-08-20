import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  color: string;
  size: number;
  rotation: number;
  tx: number;
  ty: number;
  shape: 'circle' | 'square' | 'triangle';
}

interface TaskCompletionBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#f97316', '#a78bfa', '#34d399'];

const MESSAGES = [
  '🔥 Crushed it!',
  '⚡ Boom! Done!',
  '🎯 Nailed it!',
  '✨ Outstanding!',
  '🚀 On fire!',
  '💪 Beast mode!',
  '🏆 Winner!',
  '🌟 Incredible!',
];

export const TaskCompletionBurst: React.FC<TaskCompletionBurstProps> = ({ trigger, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (!trigger) return;

    setBurstKey(k => k + 1);
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    setShowMessage(true);

    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 7,
      rotation: Math.random() * 360,
      tx: (Math.random() - 0.5) * 180,
      ty: -(Math.random() * 140 + 60),
      shape: (['circle', 'square', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    }));

    setParticles(newParticles);

    const hideTimer = setTimeout(() => {
      setParticles([]);
      setShowMessage(false);
      onComplete?.();
    }, 1000);

    return () => clearTimeout(hideTimer);
  }, [trigger]);

  if (!showMessage && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Celebration message */}
      {showMessage && (
        <div
          key={`msg-${burstKey}`}
          className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
        >
          <div
            className="px-6 py-3 rounded-2xl text-white font-bold text-xl shadow-2xl select-none"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.6), 0 0 80px rgba(236, 72, 153, 0.3)',
            }}
          >
            {message}
          </div>
        </div>
      )}

      {/* Confetti particles emanating from center */}
      {particles.map((p, i) => (
        <div
          key={`${burstKey}-${p.id}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: p.size,
            height: p.shape === 'triangle' ? 0 : p.size,
            backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
            boxShadow: `0 0 8px ${p.color}88`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            animation: `confetti-fall 0.9s ease-out ${i * 0.025}s forwards`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
          } as React.CSSProperties & { '--tx': string; '--ty': string }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 1; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(720deg) scale(0.3); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(0.95); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

interface AnimatedCheckProps {
  isDone: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
}

export const AnimatedCheck: React.FC<AnimatedCheckProps> = ({ isDone, onClick, size = 22 }) => {
  const [animKey, setAnimKey] = useState(0);
  const [justDone, setJustDone] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isDone) {
      setAnimKey(k => k + 1);
      setJustDone(true);
      setTimeout(() => setJustDone(false), 600);
    }
    onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 relative group/check"
      style={{ width: size, height: size }}
    >
      {isDone ? (
        <svg
          key={`done-${animKey}`}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          style={{ animation: justDone ? 'check-pop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : undefined }}
        >
          <defs>
            <radialGradient id="successGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#successGrad)" opacity="0.2" />
          <circle cx="12" cy="12" r="10" stroke="url(#successGrad)" strokeWidth="1.8" />
          <path
            d="M7.5 12l3 3 6-6"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className="transition-all duration-200"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#52525b"
            strokeWidth="1.5"
            className="group-hover/check:stroke-violet-400 transition-colors duration-200"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#8b5cf6"
            strokeWidth="3"
            opacity="0"
            className="group-hover/check:opacity-20 transition-opacity duration-200"
            style={{ filter: 'blur(3px)' }}
          />
        </svg>
      )}
      <style>{`
        @keyframes check-pop {
          0% { transform: scale(0.5) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.25) rotate(5deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </button>
  );
};

// Streak display component
interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, compact = false }) => {
  if (streak === 0) return null;

  if (compact) {
    return (
      <div
        className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold streak-badge"
        title={`${streak} day streak! Keep it up!`}
      >
        <span>🔥</span>
        <span className="text-gradient-streak">{streak}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 rounded-xl streak-badge">
      <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))' }}>🔥</span>
      <div>
        <div className="text-gradient-streak font-bold text-lg leading-none">{streak}</div>
        <div className="text-[10px] text-orange-300/70 font-medium">day streak</div>
      </div>
    </div>
  );
};
