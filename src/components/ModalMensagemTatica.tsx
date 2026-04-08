import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Payload = {
  mensagem: string;
  equipe: string; // 'A' | 'B' | 'admin'
  role: string;
};

const MUSIC_VIDEO_ID = '7IFvoaH44Is';

export function ModalMensagemTatica() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [tocando, setTocando] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem('mensagem_tatica');
    if (!raw) return;
    try {
      const data: Payload = JSON.parse(raw);
      if (data.mensagem) {
        setPayload(data);
      } else {
        // Mensagem ainda não chegou — tenta de novo em 1s
        const t = setTimeout(() => {
          const raw2 = localStorage.getItem('mensagem_tatica');
          if (!raw2) return;
          try {
            const data2: Payload = JSON.parse(raw2);
            if (data2.mensagem) setPayload(data2);
          } catch { /* ignora */ }
        }, 1000);
        return () => clearTimeout(t);
      }
    } catch { /* ignora */ }
  }, []);

  function tocarMusica() {
    setTocando(true);
  }

  function pararMusica() {
    if (iframeRef.current) {
      iframeRef.current.src = '';
    }
    setTocando(false);
  }

  function fechar() {
    pararMusica();
    localStorage.removeItem('mensagem_tatica');
    setPayload(null);
  }

  if (!payload) return null;

  const equipe = (payload.equipe || '').toUpperCase();
  const isAdmin = payload.role === 'admin';
  const isB = equipe === 'B';

  // Ícone e título por situação
  const icone = isAdmin ? '⚔️' : payload.mensagem.includes('frente') ? '🏆' : '💪';
  const titulo = isAdmin
    ? 'RELATÓRIO TÁTICO'
    : payload.mensagem.includes('frente')
      ? 'SUA EQUIPE DOMINA!'
      : 'BORA GUERREIRO!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">

        {/* Fundo split: admin = metade azul / metade vermelha, vendedor = cor da equipe */}
        {isAdmin ? (
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-gradient-to-br from-blue-900 to-blue-950" />
            <div className="flex-1 bg-gradient-to-bl from-red-900 to-red-950" />
          </div>
        ) : isB ? (
          <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-red-950" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-950" />
        )}

        {/* Borda colorida no topo */}
        {isAdmin ? (
          <div className="absolute top-0 inset-x-0 h-1 flex">
            <div className="flex-1 bg-blue-400" />
            <div className="flex-1 bg-red-400" />
          </div>
        ) : (
          <div className={`absolute top-0 inset-x-0 h-1 ${isB ? 'bg-red-400' : 'bg-blue-400'}`} />
        )}

        {/* Conteúdo */}
        <div className="relative z-10 p-8 flex flex-col items-center text-center gap-4">

          {/* Ícone grande */}
          <div className="text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] select-none">
            {icone}
          </div>

          {/* Título */}
          <h2 className="text-2xl font-black text-white uppercase tracking-widest drop-shadow">
            {titulo}
          </h2>

          {/* Linha divisória */}
          {isAdmin ? (
            <div className="flex w-full items-center gap-0 h-px">
              <div className="flex-1 bg-blue-400/50" />
              <div className="flex-1 bg-red-400/50" />
            </div>
          ) : (
            <div className={`w-full h-px ${isB ? 'bg-red-400/40' : 'bg-blue-400/40'}`} />
          )}

          {/* Mensagem */}
          <p className={`text-base font-bold leading-relaxed ${isAdmin ? 'text-zinc-100' : 'text-white'}`}>
            {payload.mensagem}
          </p>

          {/* Tag da equipe */}
          {!isAdmin && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
              isB
                ? 'text-red-300 border-red-500/50 bg-red-950/50'
                : 'text-blue-300 border-blue-500/50 bg-blue-950/50'
            }`}>
              {isB ? '🔥 Equipe B' : '⚡ Equipe A'}
            </span>
          )}

          {/* Botão música */}
          {!isAdmin && (
            <button
              onClick={tocando ? pararMusica : tocarMusica}
              className={`w-full py-2.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-95 border ${
                tocando
                  ? 'bg-white/10 border-white/30 text-white/70'
                  : isB
                    ? 'bg-red-900/40 border-red-500/40 text-red-300 hover:bg-red-900/60'
                    : 'bg-blue-900/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/60'
              }`}
            >
              {tocando ? '🔇 Silenciar' : '🎵 Tocar Música'}
            </button>
          )}

          {/* Botão fechar */}
          <button
            onClick={fechar}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-lg ${
              isAdmin
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                : isB
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            Entendido — Bora Vender! ⚡
          </button>

          {/* YouTube player oculto */}
          {tocando && (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${MUSIC_VIDEO_ID}?autoplay=1&controls=0&loop=1&playlist=${MUSIC_VIDEO_ID}&modestbranding=1`}
              allow="autoplay"
              className="w-0 h-0 absolute opacity-0 pointer-events-none"
              title="music"
            />
          )}
        </div>
      </div>
    </div>
  );
}
