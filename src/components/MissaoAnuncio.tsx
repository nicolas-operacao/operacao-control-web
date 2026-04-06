import { useEffect, useState } from 'react';

interface Props {
  missao: {
    id: string;
    titulo: string;
    descricao: string;
    icone: string;
    meta: number;
    tipo: string;
    data_fim: string;
  };
  onClose: () => void;
}

export function MissaoAnuncio({ missao, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t1);
  }, []);

  function fechar() {
    setSaindo(true);
    setTimeout(onClose, 500);
  }

  const dataFimFormatada = new Date(missao.data_fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        opacity: saindo ? 0 : visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Partículas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              background: '#facc15',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
              animation: `float-particle ${Math.random() * 4 + 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Raio de luz central */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}
      />

      {/* Card */}
      <div
        className="relative mx-4 flex flex-col items-center text-center gap-5 px-8 py-10 rounded-3xl max-w-md w-full"
        style={{
          background: 'linear-gradient(135deg, #111 0%, #1c1a00 50%, #111 100%)',
          border: '2px solid rgba(250,204,21,0.6)',
          boxShadow: '0 0 80px rgba(250,204,21,0.25), 0 0 160px rgba(250,204,21,0.08), inset 0 0 60px rgba(250,204,21,0.04)',
          transform: saindo ? 'scale(0.9) translateY(20px)' : visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(30px)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Linha topo */}
        <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, #facc15, transparent)' }} />

        {/* Badge NOVA MISSÃO */}
        <div
          className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.4em]"
          style={{
            background: 'rgba(250,204,21,0.15)',
            border: '1px solid rgba(250,204,21,0.4)',
            color: '#facc15',
            animation: 'flicker-badge 3s ease infinite',
          }}
        >
          ⚡ Nova Missão
        </div>

        {/* Ícone */}
        <div
          className="text-7xl leading-none select-none"
          style={{ animation: 'bounce-icon 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both, float-icon 3s ease-in-out infinite 1s' }}
        >
          {missao.icone}
        </div>

        {/* Título */}
        <div>
          <h2
            className="text-3xl font-black text-white uppercase leading-tight"
            style={{
              textShadow: '0 0 30px rgba(250,204,21,0.4)',
              animation: 'slide-up 0.5s ease 0.3s both',
            }}
          >
            {missao.titulo}
          </h2>
          {missao.descricao && (
            <p className="text-zinc-400 text-sm mt-1" style={{ animation: 'slide-up 0.5s ease 0.4s both' }}>
              {missao.descricao}
            </p>
          )}
        </div>

        {/* Separador */}
        <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.3), transparent)' }} />

        {/* Meta */}
        <div className="flex flex-col items-center gap-1" style={{ animation: 'slide-up 0.5s ease 0.5s both' }}>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            {missao.tipo === 'abordagem' ? 'Meta de Abordagens' : 'Meta'}
          </p>
          <p className="text-5xl font-black tabular-nums" style={{ color: '#facc15', textShadow: '0 0 20px rgba(250,204,21,0.5)' }}>
            {missao.meta}
          </p>
          <p className="text-zinc-500 text-xs">
            {missao.tipo === 'abordagem' ? 'abordagens por dia' : missao.tipo === 'valor' ? 'reais em vendas' : `vendas (${missao.tipo})`}
          </p>
        </div>

        {/* Prazo */}
        <p className="text-zinc-600 text-xs" style={{ animation: 'slide-up 0.5s ease 0.6s both' }}>
          📅 Encerra em {dataFimFormatada}
        </p>

        {/* Botão aceitar */}
        <button
          onClick={fechar}
          className="w-full py-3 rounded-xl font-black text-black uppercase tracking-wider text-sm transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ca8a04, #facc15)',
            boxShadow: '0 0 20px rgba(250,204,21,0.4)',
            animation: 'slide-up 0.5s ease 0.7s both',
          }}
        >
          ✅ Aceitar Missão
        </button>

        {/* Linha base */}
        <div className="absolute bottom-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.2), transparent)' }} />
      </div>

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-20px) scale(1.2); }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes flicker-badge {
          0%, 90%, 100% { opacity: 1; }
          92%            { opacity: 0.5; }
          95%            { opacity: 1; }
          97%            { opacity: 0.7; }
        }
        @keyframes bounce-icon {
          from { transform: scale(0) rotate(-15deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes float-icon {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes slide-up {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
