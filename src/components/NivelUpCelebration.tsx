import { useEffect, useState } from 'react';

const FRASES = [
  'IMPARÁVEL! O topo é só o começo.',
  'MAIS UM DEGRAU! Nada te detém.',
  'MISSÃO CUMPRIDA! Próxima batalha.',
  'SUBINDO DE NÍVEL! A vitória é tua.',
  'SEM LIMITES! Continue dominando.',
  'AVANCE SEM PARAR! Você nasceu pra isso.',
  'MODO GUERRA ATIVADO! Siga em frente.',
  'INVENCÍVEL! Cada venda é uma conquista.',
];

interface Props {
  nivel: number;
  patNome: string;
  patCor: string;
  patIcone: string;
  onClose: () => void;
}

export function NivelUpCelebration({ nivel, patNome, patCor, patIcone, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const frase = FRASES[(nivel + patNome.length) % FRASES.length];

  // Entrada com delay para animação CSS funcionar
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => {
      setSaindo(true);
      setTimeout(onClose, 600);
    }, 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const dismiss = () => {
    setSaindo(true);
    setTimeout(onClose, 600);
  };

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[300] flex items-center justify-center cursor-pointer"
      style={{
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        opacity: saindo ? 0 : visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Raios de luz radiais */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${patCor}18 10deg, transparent 20deg, transparent 30deg, ${patCor}10 40deg, transparent 50deg, transparent 120deg, ${patCor}15 130deg, transparent 140deg, transparent 200deg, ${patCor}12 210deg, transparent 220deg, transparent 300deg, ${patCor}18 310deg, transparent 320deg)`,
          animation: 'spin-slow 8s linear infinite',
        }}
      />

      {/* Anel pulsante externo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 480,
          height: 480,
          border: `2px solid ${patCor}40`,
          animation: 'ring-pulse 1.2s ease-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 360,
          height: 360,
          border: `1px solid ${patCor}25`,
          animation: 'ring-pulse 1.2s ease-out infinite 0.4s',
        }}
      />

      {/* Card principal */}
      <div
        className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
          border: `2px solid ${patCor}`,
          boxShadow: `0 0 60px ${patCor}60, 0 0 120px ${patCor}20, inset 0 0 40px ${patCor}08`,
          transform: saindo ? 'scale(0.85)' : visible ? 'scale(1)' : 'scale(0.7)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          minWidth: 320,
          maxWidth: 400,
        }}
      >
        {/* Linha topo animada */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${patCor}, #facc15, ${patCor}, transparent)`,
            animation: 'shimmer-line 2s ease infinite',
          }}
        />

        {/* Label LEVEL UP */}
        <div className="flex items-center gap-2">
          <div className="h-px w-8 opacity-40" style={{ background: patCor }} />
          <p
            className="text-xs font-black uppercase tracking-[0.5em]"
            style={{
              color: patCor,
              textShadow: `0 0 12px ${patCor}`,
              animation: 'flicker 2.5s ease infinite',
            }}
          >
            Level Up
          </p>
          <div className="h-px w-8 opacity-40" style={{ background: patCor }} />
        </div>

        {/* Ícone + número de nível */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-7xl leading-none select-none"
            style={{ animation: 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both, float 3s ease-in-out infinite 0.8s' }}
          >
            {patIcone}
          </span>
          <p
            className="text-6xl font-black tabular-nums leading-none"
            style={{
              color: '#ffffff',
              textShadow: `0 0 30px ${patCor}, 0 0 60px ${patCor}60`,
              animation: 'scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
            }}
          >
            {nivel}
          </p>
          <p
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: patCor, opacity: 0.8 }}
          >
            {patNome}
          </p>
        </div>

        {/* Separador */}
        <div
          className="w-full h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${patCor}60, transparent)` }}
        />

        {/* Frase motivacional */}
        <p
          className="text-center text-white font-bold text-base leading-snug px-2"
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.3)',
            animation: 'fade-up 0.6s ease 0.5s both',
          }}
        >
          {frase}
        </p>

        {/* Dica de fechar */}
        <p className="text-zinc-600 text-xs" style={{ animation: 'fade-up 0.6s ease 1s both' }}>
          toque para continuar
        </p>

        {/* Linha base animada */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px rounded-b-3xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${patCor}60, transparent)`,
          }}
        />
      </div>

      {/* Estilos de animação inline */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ring-pulse {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer-line {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96%            { opacity: 0.4; }
          98%            { opacity: 1; }
          99%            { opacity: 0.6; }
        }
        @keyframes bounce-in {
          from { transform: scale(0) rotate(-20deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes scale-in {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fade-up {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
