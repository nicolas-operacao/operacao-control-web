import React, { useEffect, useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { somClick, somHover, somLevelUp, isSomAtivo, setSomAtivo, setSomAtivoParaUsuario } from '../services/hudSounds';
import { NivelUpCelebration } from './NivelUpCelebration';
import { MissaoAnuncio } from './MissaoAnuncio';
import { ModalRegistrarAbordagem } from './ModalRegistrarAbordagem';

// ─── SISTEMA DE NÍVEIS (igual ao GuerraEquipes) ────────────────────────────────
const VENDAS_POR_NIVEL   = 5;
const VENDAS_POR_PATENTE = 20;
const TIER_INICIO = [0, 20, 40, 60, 80];
const PATENTES = [
  { nome: 'Iniciante', icone: '🪖', cor: '#71717a',   glow: 'rgba(113,113,122,0.4)',  corClass: 'text-zinc-400',   bg: 'bg-zinc-800',    borda: 'border-zinc-600' },
  { nome: 'Vendedor',  icone: '⚔️',  cor: '#22c55e',   glow: 'rgba(34,197,94,0.5)',    corClass: 'text-green-400',  bg: 'bg-green-950',   borda: 'border-green-700' },
  { nome: 'Veterano',  icone: '🛡️',  cor: '#3b82f6',   glow: 'rgba(59,130,246,0.5)',   corClass: 'text-blue-400',   bg: 'bg-blue-950',    borda: 'border-blue-700' },
  { nome: 'Elite',     icone: '🌟',  cor: '#facc15',   glow: 'rgba(250,204,21,0.5)',   corClass: 'text-yellow-400', bg: 'bg-yellow-950',  borda: 'border-yellow-700' },
  { nome: 'Lendário',  icone: '💎',  cor: '#a855f7',   glow: 'rgba(168,85,247,0.5)',   corClass: 'text-purple-400', bg: 'bg-purple-950',  borda: 'border-purple-600' },
];

function calcNivel(count: number) {
  const c = Math.max(0, count);
  let ti = 0;
  for (let i = TIER_INICIO.length - 1; i >= 0; i--) { if (c >= TIER_INICIO[i]) { ti = i; break; } }
  const pat = PATENTES[ti];
  const prox = ti < 4 ? PATENTES[ti + 1] : null;
  const noTier = c - TIER_INICIO[ti];
  const nivel  = Math.floor(noTier / VENDAS_POR_NIVEL) + 1;
  const xp     = noTier % VENDAS_POR_NIVEL;
  return { pat, prox, nivel, xp, xpMax: VENDAS_POR_NIVEL, ti };
}

// ─── FRASES MOTIVACIONAIS ──────────────────────────────────────────────────────
function fraseMotivacional(vendasHoje: number, posicao: number, totalVendedores: number): { texto: string; emoji: string; cor: string } {
  if (vendasHoje === 0) return { texto: 'Primeiro passo é o mais importante. Vai pra cima!', emoji: '🎯', cor: 'text-zinc-400' };
  if (vendasHoje === 1) return { texto: 'Boa abertura! Mantém o ritmo.', emoji: '⚡', cor: 'text-yellow-400' };
  if (vendasHoje >= 5) return { texto: 'Monstro! Você está dominando o campo de batalha!', emoji: '🔥', cor: 'text-orange-400' };
  if (posicao === 1)   return { texto: 'Você está no topo! Agora segura o trono.', emoji: '👑', cor: 'text-yellow-400' };
  if (posicao <= 3)    return { texto: `Top ${posicao}! Um passo do pódio mais alto.`, emoji: '🏆', cor: 'text-yellow-300' };
  if (posicao > totalVendedores - 2) return { texto: 'Hora de virar o jogo. Você consegue!', emoji: '💪', cor: 'text-red-400' };
  return { texto: 'Cada venda conta. Não para agora!', emoji: '🚀', cor: 'text-blue-400' };
}

// ─── CONQUISTAS ────────────────────────────────────────────────────────────────
type Conquista = { id: string; nome: string; desc: string; icone: string; desbloqueada: boolean };
function calcConquistas(stats: any, rankPos: number): Conquista[] {
  const mesCount  = stats?.mes?.count   ?? 0;
  const hojeCount = stats?.hoje?.count  ?? 0;
  const semCount  = stats?.semana?.count ?? 0;
  const mesValor  = stats?.mes?.valor   ?? 0;
  return [
    { id: 'first',    nome: 'Primeiro Sangue',  desc: '1ª venda aprovada',              icone: '🩸', desbloqueada: mesCount >= 1 },
    { id: 'hot',      nome: 'Dia de Fogo',       desc: '3+ vendas em um dia',            icone: '🔥', desbloqueada: hojeCount >= 3 },
    { id: 'machine',  nome: 'Máquina de Guerra', desc: '10 vendas no mês',               icone: '⚙️', desbloqueada: mesCount >= 10 },
    { id: 'weekly',   nome: 'Semana Perfeita',   desc: '10+ vendas na semana',           icone: '📅', desbloqueada: semCount >= 10 },
    { id: 'bigshot',  nome: 'Sniper',            desc: '20 vendas no mês',               icone: '🎯', desbloqueada: mesCount >= 20 },
    { id: 'top3',     nome: 'Pódio',             desc: 'Top 3 no ranking',               icone: '🏆', desbloqueada: rankPos > 0 && rankPos <= 3 },
    { id: 'leader',   nome: 'General',           desc: '1º lugar no ranking',            icone: '👑', desbloqueada: rankPos === 1 },
    { id: 'rich',     nome: 'Cofre de Ouro',     desc: 'R$ 10.000+ vendidos no mês',    icone: '💰', desbloqueada: mesValor >= 10000 },
    { id: 'ultra',    nome: 'Lendário',          desc: 'R$ 50.000+ vendidos no mês',    icone: '💎', desbloqueada: mesValor >= 50000 },
  ];
}

// ─── TIPOS ─────────────────────────────────────────────────────────────────────
type Stats = {
  hoje:  { valor: number; count: number };
  semana:{ valor: number; count: number };
  mes:   { valor: number; count: number };
  ultimos7dias: { label: string; valor: number; count: number }[];
  ultimos6meses?: { label: string; valor: number; count: number }[];
  meta_mensal?: number | null;
  foto_url?: string | null;
  som_desativado?: boolean;
};

type Missao = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  tipo: 'hoje' | 'semana' | 'mes' | 'valor' | 'abordagem';
  meta: number;
  recompensa_xp?: number;
  ativa: boolean;
  data_fim: string;
};

interface Props {
  userId: string;
  userName: string;
  equipe: string;
}

// ─── SKELETON ──────────────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export function PainelVendedor({ userId, userName, equipe }: Props) {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [loading, setLoading] = useState(true);
  const [somAtivo, setSomAtivoState] = useState(() => isSomAtivo());
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [novaFoto, setNovaFoto] = useState('');
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [fotoPreview, setFotoPreview] = useState('');
  const [patenteCelebrada, setPatenteCelebrada] = useState<{ pat: typeof PATENTES[0]; nivel: number } | null>(null);
  const [nivelCelebrado, setNivelCelebrado] = useState<{ pat: typeof PATENTES[0]; nivel: number } | null>(null);
  const jaChecouPatente = useRef(false);
  const [missaoAnuncio, setMissaoAnuncio] = useState<any | null>(null);
  const [abordagemMissao, setAbordagemMissao] = useState<any | null>(null);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isB = (equipe || '').trim().toUpperCase() === 'B';
  const corEquipe = isB ? '#ef4444' : '#3b82f6';
  const corEquipeClass = isB ? 'text-red-400' : 'text-blue-400';
  const corBorderClass = isB ? 'border-red-700/50' : 'border-blue-700/50';
  const corBgClass = isB ? 'bg-red-950/30' : 'bg-blue-950/30';
  const nomeEquipe = isB ? 'Equipe B 🔴' : 'Equipe A ⚡';

  // Polling: verifica som_desativado a cada 30s para aplicar mudanças do admin em tempo real
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/sellers/${userId}/stats`);
        const somDb = res.data?.som_desativado ?? false;
        setSomAtivoParaUsuario(userId, !somDb);
        setSomAtivoState(!somDb);
        setStats(prev => prev ? { ...prev, som_desativado: somDb } : prev);
      } catch { /* silencioso */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Polling: verifica novas missões de abordagem a cada 60s
  useEffect(() => {
    const chaveVistas = `missoes_abordagem_vistas_${userId}`;

    async function verificarMissoes() {
      try {
        const res = await api.get('/missions');
        const todas: any[] = Array.isArray(res.data) ? res.data : [];
        const abordagens = todas.filter((m: any) => m.tipo === 'abordagem' && m.ativa);
        if (abordagens.length === 0) return;

        const vistasStr = localStorage.getItem(chaveVistas);
        const vistas: string[] = vistasStr ? JSON.parse(vistasStr) : [];

        // Missão de abordagem nova (não vista ainda)
        const nova = abordagens.find((m: any) => !vistas.includes(m.id));
        if (nova) {
          setMissaoAnuncio(nova);
          localStorage.setItem(chaveVistas, JSON.stringify([...vistas, nova.id]));
        }
        // Atualiza lista de missões visíveis
        setMissoes(todas);
      } catch { /* silencioso */ }
    }

    // Checa imediatamente ao montar, depois a cada 60s
    verificarMissoes();
    const interval = setInterval(verificarMissoes, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, rankRes, missoesRes] = await Promise.all([
          api.get(`/sellers/${userId}/stats`),
          api.get('/ranking'),
          api.get('/missions'),
        ]);
        const s = statsRes.data;
        setStats(s);
        setRanking(Array.isArray(rankRes.data) ? rankRes.data : (rankRes.data?.data ?? []));
        setMissoes(Array.isArray(missoesRes.data) ? missoesRes.data : []);

        // Aplica preferência de som vinda do banco
        const somDb = s?.som_desativado ?? false;
        setSomAtivoParaUsuario(userId, !somDb);
        setSomAtivoState(!somDb);

        // ── Verificar subida de patente / nível ─────────────────────────────
        if (!jaChecouPatente.current) {
          jaChecouPatente.current = true;
          const chave = `patente_${userId}`;
          const mesCount = s?.mes?.count ?? 0;
          const nivelAtual = calcNivel(mesCount);
          const anterior = localStorage.getItem(chave);
          if (anterior) {
            const [tiAnterior, nivelAnterior] = anterior.split('_').map(Number);
            const subiuPatente = nivelAtual.ti > tiAnterior;
            const subiuNivel   = !subiuPatente && nivelAtual.ti === tiAnterior && nivelAtual.nivel > nivelAnterior;

            if (subiuPatente) {
              // Celebração épica de patente (já existente)
              setPatenteCelebrada({ pat: nivelAtual.pat, nivel: nivelAtual.nivel });
              const cores = [nivelAtual.pat.cor, '#facc15', '#ffffff'];
              setTimeout(() => {
                confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 }, colors: cores });
                setTimeout(() => confetti({ particleCount: 100, spread: 80, angle: 60,  origin: { x: 0, y: 0.5 }, colors: cores }), 400);
                setTimeout(() => confetti({ particleCount: 100, spread: 80, angle: 120, origin: { x: 1, y: 0.5 }, colors: cores }), 400);
              }, 500);
              setTimeout(() => setPatenteCelebrada(null), 8000);
            } else if (subiuNivel) {
              // Celebração cinematográfica de nível
              setNivelCelebrado({ pat: nivelAtual.pat, nivel: nivelAtual.nivel });
              somLevelUp();
              const cores = [nivelAtual.pat.cor, '#facc15', '#ffffff'];
              setTimeout(() => {
                confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: cores, scalar: 1.2 });
              }, 400);
            }
          }
          localStorage.setItem(chave, `${nivelAtual.ti}_${nivelAtual.nivel}`);
        }
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);

  async function salvarFoto() {
    setSalvandoFoto(true);
    try {
      let novaUrl = '';
      if (arquivoFoto) {
        // Envia o arquivo via multipart/form-data
        const form = new FormData();
        form.append('foto', arquivoFoto);
        const res = await api.patch(`/users/${userId}/foto`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        novaUrl = res.data?.foto_url ?? '';
      } else if (novaFoto.trim()) {
        // Envia uma URL direta
        const res = await api.patch(`/users/${userId}/foto`, { foto_url: novaFoto.trim() });
        novaUrl = res.data?.foto_url ?? novaFoto.trim();
      } else return;

      setStats(prev => prev ? { ...prev, foto_url: novaUrl } : prev);
      setEditandoFoto(false);
      setNovaFoto('');
      setFotoPreview('');
      setArquivoFoto(null);
    } catch { /* silencioso */ }
    finally { setSalvandoFoto(false); }
  }

  function handleFotoArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoFoto(file);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setNovaFoto('');
  }

  const { nivelInfo, rankPos, mesmaEquipe, lider, deltaPrimeiro, conquistas, frase, projecao, mediaDiaria, diasRestantes, streak } = useMemo(() => {
    const mesCount = stats?.mes?.count ?? 0;
    const nivelInfo = calcNivel(mesCount);

    // Ranking da equipe do vendedor
    const meusDados = ranking.find(r => String(r.id) === String(userId));
    const meuTotal  = meusDados?.total_vendido ?? 0;

    // Posição geral
    const sortedGeral = [...ranking].sort((a, b) => b.total_vendido - a.total_vendido);
    const rankPos = sortedGeral.findIndex(r => String(r.id) === String(userId)) + 1;

    // Mesma equipe (ranking filtrado)
    const mesmaEquipe = ranking.filter(r => {
      const eq = (r.equipe || '').toUpperCase().replace('EQUIPE ', '');
      const minha = (equipe || '').toUpperCase().replace('EQUIPE ', '');
      return eq === minha;
    }).sort((a, b) => b.total_vendido - a.total_vendido);

    const lider = sortedGeral[0] ?? null;
    const deltaPrimeiro = lider ? Math.max(0, lider.total_vendido - meuTotal) : 0;

    const conquistas = calcConquistas(stats, rankPos);
    const frase = fraseMotivacional(stats?.hoje?.count ?? 0, rankPos, ranking.length);

    // Projeção de fechamento do mês
    const BRT_MS = 3 * 60 * 60 * 1000;
    const nowBRT = new Date(Date.now() - BRT_MS);
    const diaAtual = nowBRT.getUTCDate();
    const diasNoMes = new Date(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth() + 1, 0).getUTCDate();
    const diasRestantes = diasNoMes - diaAtual;
    const mediaDiaria = diaAtual > 0 ? (stats?.mes?.valor ?? 0) / diaAtual : 0;
    const projecao = (stats?.mes?.valor ?? 0) + mediaDiaria * diasRestantes;

    // Streak: dias consecutivos com pelo menos 1 venda (de hoje para trás)
    const dias7 = stats?.ultimos7dias ?? [];
    let streak = 0;
    for (let i = dias7.length - 1; i >= 0; i--) {
      if (dias7[i].count > 0) streak++;
      else break;
    }

    return { nivelInfo, rankPos, mesmaEquipe, lider, deltaPrimeiro, conquistas, frase, projecao, mediaDiaria, diasRestantes, streak };
  }, [stats, ranking, userId, equipe]);

  // ─── BARRA 7 DIAS ──────────────────────────────────────────────────────────
  const dias7 = stats?.ultimos7dias ?? [];
  const maxDia = Math.max(...dias7.map(d => d.valor), 1);

  if (loading) return (
    <div className="space-y-4 mb-8">
      <Sk className="h-32 w-full" />
      <div className="grid grid-cols-3 gap-3"><Sk className="h-20" /><Sk className="h-20" /><Sk className="h-20" /></div>
      <Sk className="h-40 w-full" />
    </div>
  );

  return (
    <div className="space-y-4 mb-8">

      {/* ── CELEBRAÇÃO DE SUBIDA DE NÍVEL ── */}
      {nivelCelebrado && (
        <NivelUpCelebration
          nivel={nivelCelebrado.nivel}
          patNome={nivelCelebrado.pat.nome}
          patCor={nivelCelebrado.pat.cor}
          patIcone={nivelCelebrado.pat.icone}
          onClose={() => setNivelCelebrado(null)}
        />
      )}

      {/* ── ANÚNCIO DE NOVA MISSÃO DE ABORDAGEM ── */}
      {missaoAnuncio && (
        <MissaoAnuncio
          missao={missaoAnuncio}
          onClose={() => setMissaoAnuncio(null)}
        />
      )}

      {/* ── MODAL REGISTRAR ABORDAGENS ── */}
      {abordagemMissao && (
        <ModalRegistrarAbordagem
          missao={abordagemMissao}
          userId={userId}
          userName={(() => { try { return JSON.parse(localStorage.getItem('user') ?? '{}')?.name ?? 'Vendedor'; } catch { return 'Vendedor'; } })()}
          onClose={() => setAbordagemMissao(null)}
        />
      )}

      {/* ── CELEBRAÇÃO DE SUBIDA DE PATENTE ── */}
      {patenteCelebrada && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setPatenteCelebrada(null)}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-96 h-96 rounded-full blur-[140px] animate-pulse" style={{ backgroundColor: patenteCelebrada.pat.cor + '30' }} />
          </div>
          <div className="relative z-10 w-full max-w-sm mx-4 animate-in zoom-in-90 duration-300" onClick={e => e.stopPropagation()}>
            <div className="rounded-3xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: patenteCelebrada.pat.cor, boxShadow: `0 0 60px ${patenteCelebrada.pat.cor}60` }}>
              <div className="h-1.5 animate-pulse" style={{ background: `linear-gradient(to right, ${patenteCelebrada.pat.cor}, #facc15, ${patenteCelebrada.pat.cor})` }} />
              <div className="bg-zinc-950 p-8 text-center space-y-4">
                <div className="text-7xl animate-bounce leading-none select-none">{patenteCelebrada.pat.icone}</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">Promoção de Patente!</p>
                  <p className="text-4xl font-black uppercase" style={{ color: patenteCelebrada.pat.cor }}>{patenteCelebrada.pat.nome}</p>
                  <p className="text-zinc-400 text-sm mt-1">Nível {patenteCelebrada.nivel}</p>
                </div>
                <p className="text-zinc-500 text-sm">Você subiu de patente! Continue avançando!</p>
                <button
                  onClick={() => setPatenteCelebrada(null)}
                  className="w-full font-black py-3 rounded-2xl uppercase tracking-widest text-black transition-all active:scale-95"
                  style={{ backgroundColor: patenteCelebrada.pat.cor }}
                >
                  Continuar ⚡
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO: Patente + Frase ── */}
      <div
        className="relative rounded-2xl overflow-hidden border p-5 md:p-6"
        style={{ borderColor: nivelInfo.pat.cor + '40', boxShadow: `0 0 30px ${nivelInfo.pat.glow}20` }}
      >
        {/* Fundo sutil */}
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(ellipse at top left, ${nivelInfo.pat.cor}, transparent 60%)` }} />

        <div className="relative z-10 flex flex-col gap-4">

          {/* Top row: avatar + patente + ranking */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              {stats?.foto_url ? (
                <img
                  src={stats.foto_url}
                  alt={userName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover"
                  style={{ border: `2px solid ${nivelInfo.pat.cor}50`, boxShadow: `0 0 20px ${nivelInfo.pat.glow}` }}
                />
              ) : (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl"
                  style={{ background: `${nivelInfo.pat.cor}15`, border: `2px solid ${nivelInfo.pat.cor}50`, boxShadow: `0 0 20px ${nivelInfo.pat.glow}` }}
                >
                  {nivelInfo.pat.icone}
                </div>
              )}
              {/* Botão editar foto */}
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); setEditandoFoto(true); setNovaFoto(stats?.foto_url ?? ''); }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 hover:border-yellow-400/60 flex items-center justify-center text-[11px] transition-all hover:bg-zinc-700"
                title="Editar foto"
              >
                ✏️
              </button>
            </div>

            <div className="min-w-0">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Sua Patente</p>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: nivelInfo.pat.cor }}>
                {nivelInfo.pat.nome}
              </h2>
              <p className="text-zinc-400 text-xs font-bold mt-0.5">
                Nível {nivelInfo.nivel} · {stats?.mes?.count ?? 0} vendas este mês
              </p>

              {/* Barra de XP */}
              <div className="mt-2 w-full max-w-[16rem]">
                <div className="flex justify-between text-[10px] font-black uppercase text-zinc-600 mb-1">
                  <span>{nivelInfo.xp}/{nivelInfo.xpMax} para nível {nivelInfo.nivel + 1}</span>
                  {nivelInfo.prox && <span style={{ color: nivelInfo.prox.cor }}>{nivelInfo.prox.icone} {nivelInfo.prox.nome}</span>}
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(nivelInfo.xp / nivelInfo.xpMax) * 100}%`,
                      background: `linear-gradient(90deg, ${nivelInfo.pat.cor}80, ${nivelInfo.pat.cor})`,
                      boxShadow: `0 0 8px ${nivelInfo.pat.glow}`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-700 mt-1">
                  {nivelInfo.xpMax - nivelInfo.xp} venda{nivelInfo.xpMax - nivelInfo.xp !== 1 ? 's' : ''} para o próximo nível
                </p>
              </div>
            </div>
          </div>

          {/* Ranking (alinhado à direita no top row) */}
          <div className="ml-auto flex-shrink-0 flex flex-col items-end gap-1.5">
            <div className={`px-2.5 py-1 rounded-lg border ${corBorderClass} ${corBgClass}`}>
              <p className={`text-[9px] font-black uppercase tracking-wider ${corEquipeClass}`}>{nomeEquipe}</p>
            </div>
            {rankPos > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{rankPos === 1 ? '👑' : rankPos <= 3 ? '🏆' : '🎖️'}</span>
                <div className="text-right">
                  <p className="text-zinc-500 text-[9px] font-black uppercase">Ranking</p>
                  <p className="text-white font-black text-base leading-tight">{rankPos}º</p>
                </div>
              </div>
            )}
            {/* Toggle de som */}
            <button
              onClick={() => {
                const novo = !somAtivo;
                setSomAtivo(novo);
                setSomAtivoState(novo);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 transition-all"
              title={somAtivo ? 'Desativar sons' : 'Ativar sons'}
            >
              <span className="text-base">{somAtivo ? '🔊' : '🔇'}</span>
              <span className="text-[9px] font-black uppercase tracking-wide text-zinc-500">
                {somAtivo ? 'Som on' : 'Som off'}
              </span>
            </button>
          </div>
        </div>

        {/* Frase motivacional — abaixo, largura total */}
        <p className={`text-xs font-bold italic ${frase.cor} flex items-center gap-1.5`}>
          <span>{frase.emoji}</span> {frase.texto}
        </p>
      </div>

      {/* ── KPI Cards: Hoje / Semana / Mês ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hoje', valor: stats?.hoje?.valor ?? 0, count: stats?.hoje?.count ?? 0, cor: 'yellow', emoji: '⚡' },
          { label: 'Semana', valor: stats?.semana?.valor ?? 0, count: stats?.semana?.count ?? 0, cor: 'blue', emoji: '📅' },
          { label: 'Mês', valor: stats?.mes?.valor ?? 0, count: stats?.mes?.count ?? 0, cor: 'green', emoji: '🗓️' },
        ].map(({ label, valor, count, cor, emoji }) => (
          <div key={label} className={`rounded-xl border p-3 md:p-4 relative overflow-hidden ${
            cor === 'yellow' ? 'bg-yellow-950/20 border-yellow-800/40' :
            cor === 'blue'   ? 'bg-blue-950/20 border-blue-800/40' :
                               'bg-green-950/20 border-green-800/40'
          }`}>
            <div className="absolute top-2 right-2 text-2xl opacity-10">{emoji}</div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-base md:text-xl font-black leading-tight ${
              cor === 'yellow' ? 'text-yellow-400' : cor === 'blue' ? 'text-blue-400' : 'text-green-400'
            }`}>{fmt(valor)}</p>
            <p className="text-zinc-600 text-[10px] font-bold mt-1">{count} venda{count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* ── Delta do 1º lugar + posição na equipe ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* vs Líder */}
        {lider && String(lider.id) !== String(userId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-950 border-2 border-yellow-400/50 flex items-center justify-center text-2xl flex-shrink-0">
              👑
            </div>
            <div className="min-w-0">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Distância do Líder</p>
              <p className="text-white font-black truncate">{lider.nome}</p>
              <p className="text-red-400 font-black text-base">{fmt(deltaPrimeiro)} atrás</p>
            </div>
          </div>
        )}

        {lider && String(lider.id) === String(userId) && (
          <div className="bg-yellow-950/20 border border-yellow-400/40 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <span className="text-4xl">👑</span>
            <div>
              <p className="text-yellow-400 font-black uppercase tracking-widest text-sm">Você é o Líder!</p>
              <p className="text-zinc-400 text-xs">Segura o trono, guerreiro.</p>
            </div>
          </div>
        )}

        {/* Posição na equipe */}
        <div className={`rounded-xl border p-4 ${corBgClass} ${corBorderClass}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${corEquipeClass}`}>Sua {nomeEquipe}</p>
          <div className="space-y-1.5">
            {mesmaEquipe.slice(0, 4).map((v, i) => {
              const isMe = String(v.id) === String(userId);
              return (
                <div key={v.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isMe ? 'bg-white/10 ring-1 ring-white/20' : ''}`}>
                  <span className="text-zinc-600 text-[10px] font-black w-4">{i + 1}º</span>
                  <span className={`text-xs font-bold flex-1 truncate ${isMe ? 'text-white' : 'text-zinc-400'}`}>{isMe ? '⚡ ' : ''}{v.nome}</span>
                  <span className={`text-xs font-black ${isMe ? corEquipeClass : 'text-zinc-500'}`}>
                    {fmt(v.total_vendido)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gráfico 7 dias ── */}
      {dias7.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4">📊 Últimos 7 dias</p>
          <div className="flex items-end gap-2 h-24">
            {dias7.map(({ label, valor, count }) => {
              const pct = maxDia > 0 ? (valor / maxDia) * 100 : 0;
              const hasData = valor > 0;
              const isBest = valor === maxDia && valor > 0;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {hasData && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[9px] font-black whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      <span className="text-yellow-400 block">{fmt(valor)}</span>
                      <span className="text-zinc-400">{count}x</span>
                    </div>
                  )}
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-700"
                      style={{
                        height: `${Math.max(hasData ? pct : 2, hasData ? 8 : 2)}%`,
                        background: isBest ? corEquipe : hasData ? corEquipe + '60' : '#27272a',
                        boxShadow: isBest ? `0 -4px 12px ${corEquipe}60` : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600">{label.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Projeção de Fechamento do Mês ── */}
      {(() => {
        const META_PADRAO = 400000;
        const bateAMeta = projecao >= META_PADRAO;
        const diff = META_PADRAO - projecao;
        return (
          <div className={`rounded-xl border p-4 md:p-5 ${bateAMeta ? 'bg-green-950/20 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-yellow-950/10 border-yellow-700/30'}`}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                📈 Projeção do Mês
              </p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${bateAMeta ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                {diasRestantes}d restantes
              </span>
            </div>
            <p className={`text-2xl md:text-3xl font-black leading-none mb-2 ${bateAMeta ? 'text-green-400' : 'text-yellow-400'}`}>
              {fmt(projecao)}
            </p>
            <p className="text-zinc-500 text-[11px] mb-3">
              Baseado na sua média de {fmt(mediaDiaria)}/dia · {diasRestantes} dias restantes
            </p>
            {bateAMeta ? (
              <div className="bg-green-950/40 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <span>🎯</span> Você vai bater a meta!
              </div>
            ) : (
              <div className="bg-yellow-950/40 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <span>⚠️</span> Faltam {fmt(diff)} para bater a meta
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Conquistas ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4">🏅 Conquistas do Mês</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {conquistas.map(c => (
            <div
              key={c.id}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                c.desbloqueada
                  ? 'bg-yellow-950/30 border-yellow-400/40 shadow-[0_0_12px_rgba(250,204,21,0.15)]'
                  : 'bg-zinc-950 border-zinc-800 opacity-40 grayscale'
              }`}
              title={c.desc}
            >
              <span className="text-2xl">{c.icone}</span>
              <span className={`text-[9px] font-black uppercase leading-tight ${c.desbloqueada ? 'text-yellow-400' : 'text-zinc-600'}`}>
                {c.nome}
              </span>
              {c.desbloqueada && <span className="text-[8px] text-zinc-500">{c.desc}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Streak de dias consecutivos ── */}
      {(() => {
        let bgClass = 'bg-zinc-900 border-zinc-800';
        let textClass = 'text-zinc-400';
        let msg = 'Faça uma venda hoje para começar o streak!';
        let icone = '💤';

        if (streak >= 7) {
          bgClass = 'bg-red-950/30 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
          textClass = 'text-red-400';
          msg = `${streak} dias seguidos! IMPARÁVEL!`;
          icone = '💥';
        } else if (streak >= 3) {
          bgClass = 'bg-orange-950/30 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.15)]';
          textClass = 'text-orange-400';
          msg = `${streak} dias consecutivos — você está em chamas!`;
          icone = '🔥🔥';
        } else if (streak === 1) {
          bgClass = 'bg-yellow-950/20 border-yellow-700/30';
          textClass = 'text-yellow-400';
          msg = '1 dia consecutivo — continua!';
          icone = '🔥';
        }

        return (
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${bgClass}`}>
            <span className="text-3xl leading-none flex-shrink-0">{icone}</span>
            <div className="min-w-0">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Streak</p>
              <p className={`text-sm font-black ${textClass}`}>{msg}</p>
            </div>
            {streak > 0 && (
              <div className={`ml-auto flex-shrink-0 text-3xl font-black ${textClass}`}>{streak}</div>
            )}
          </div>
        );
      })()}

      {/* ── Meta Diária gamificada ── */}
      {(() => {
        const vendas = stats?.hoje?.count ?? 0;
        const metas = [3, 5, 10];
        const metaAtual = metas.find(m => vendas < m) ?? metas[metas.length - 1];
        const pct = Math.min((vendas / metaAtual) * 100, 100);
        const atingiu = vendas >= metaAtual;
        return (
          <div className={`rounded-xl border p-4 md:p-5 ${atingiu ? 'bg-green-950/20 border-green-400/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                🎯 Meta do Dia
              </p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${atingiu ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                {vendas} / {metaAtual} vendas
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${pct}%`,
                  background: atingiu
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : `linear-gradient(90deg, ${corEquipe}80, ${corEquipe})`,
                  boxShadow: atingiu ? '0 0 10px rgba(34,197,94,0.5)' : undefined,
                }}
              />
            </div>
            <p className={`text-xs font-bold ${atingiu ? 'text-green-400' : 'text-zinc-500'}`}>
              {atingiu
                ? `🎉 Meta atingida! Você já fez ${vendas} vendas hoje — continua!`
                : `Faltam ${metaAtual - vendas} venda${metaAtual - vendas !== 1 ? 's' : ''} para atingir a meta de ${metaAtual}`}
            </p>
          </div>
        );
      })()}

      {/* ── Meta Individual do Mês ── */}
      {stats?.meta_mensal && stats.meta_mensal > 0 && (() => {
        const count = stats.mes?.count ?? 0;
        const meta = stats.meta_mensal;
        const pct = Math.min((count / meta) * 100, 100);
        const atingiu = count >= meta;
        return (
          <div className={`rounded-xl border p-4 md:p-5 ${atingiu ? 'bg-green-950/20 border-green-400/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                🎖️ Meta Individual do Mês
              </p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${atingiu ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                {count} / {meta} vendas
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${pct}%`,
                  background: atingiu ? 'linear-gradient(90deg, #16a34a, #22c55e)' : `linear-gradient(90deg, ${corEquipe}80, ${corEquipe})`,
                  boxShadow: atingiu ? '0 0 10px rgba(34,197,94,0.5)' : undefined,
                }}
              />
            </div>
            <p className={`text-xs font-bold ${atingiu ? 'text-green-400' : 'text-zinc-500'}`}>
              {atingiu
                ? `🏆 Meta atingida! ${count} de ${meta} vendas — você é uma lenda!`
                : `Faltam ${meta - count} venda${meta - count !== 1 ? 's' : ''} para atingir sua meta de ${meta} este mês`}
            </p>
          </div>
        );
      })()}

      {/* ── Missões Ativas ── */}
      {missoes.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:p-5">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3">⚡ Missões Ativas</p>
          <div className="space-y-2">
            {missoes.map(m => {
              const isAbordagem = m.tipo === 'abordagem';
              const progresso = isAbordagem ? 0
                : m.tipo === 'hoje' ? (stats?.hoje?.count ?? 0)
                : m.tipo === 'semana' ? (stats?.semana?.count ?? 0)
                : m.tipo === 'mes' ? (stats?.mes?.count ?? 0)
                : (stats?.mes?.valor ?? 0);
              const pct = isAbordagem ? 0 : Math.min((progresso / m.meta) * 100, 100);
              const completa = !isAbordagem && progresso >= m.meta;
              const valorLabel = m.tipo === 'valor'
                ? progresso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : progresso;
              const metaLabel = m.tipo === 'valor'
                ? m.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : m.meta;

              return (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 border transition-all ${
                    completa
                      ? 'bg-yellow-950/20 border-yellow-400/30 shadow-[0_0_10px_rgba(250,204,21,0.1)]'
                      : isAbordagem
                      ? 'bg-blue-950/10 border-blue-800/30'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{m.icone}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-black ${completa ? 'text-yellow-400' : isAbordagem ? 'text-blue-300' : 'text-white'}`}>{m.titulo}</p>
                        {!isAbordagem && (
                          <span className={`text-[9px] font-black ${completa ? 'text-yellow-400' : 'text-zinc-500'}`}>
                            {valorLabel} / {metaLabel}
                          </span>
                        )}
                        {isAbordagem && (
                          <span className="text-[9px] font-black text-blue-400">🎯 {m.meta}/dia</span>
                        )}
                      </div>
                      {!isAbordagem && (
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: completa ? 'linear-gradient(90deg, #ca8a04, #facc15)' : `linear-gradient(90deg, ${corEquipe}80, ${corEquipe})`,
                            }}
                          />
                        </div>
                      )}
                      {m.recompensa_xp && !isAbordagem && (
                        <p className={`text-[10px] mt-0.5 ${completa ? 'text-yellow-500' : 'text-zinc-600'}`}>
                          {completa ? '✅ Concluída!' : m.descricao} {m.recompensa_xp > 0 && `· ⚡ ${m.recompensa_xp} XP`}
                        </p>
                      )}
                      {isAbordagem && (
                        <p className="text-zinc-500 text-[10px] mt-0.5">{m.descricao || 'Registre suas abordagens do dia'}</p>
                      )}
                    </div>
                  </div>
                  {isAbordagem && (
                    <button
                      onMouseEnter={somHover}
                      onClick={() => { somClick(); setAbordagemMissao(m); }}
                      className="mt-2 w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider text-black transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                    >
                      📝 Registrar Abordagens de Hoje
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal editar foto de perfil ── */}
      {editandoFoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-white font-black text-lg uppercase tracking-wider">📸 Foto de Perfil</h3>

            {/* Upload de arquivo */}
            <div>
              <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1.5">Enviar arquivo</label>
              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-zinc-700 hover:border-yellow-400/50 rounded-xl p-4 cursor-pointer transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                <span className="text-zinc-400 text-xs font-bold group-hover:text-yellow-400 transition-colors">Escolher imagem do dispositivo</span>
                <input type="file" accept="image/*" onChange={handleFotoArquivo} className="hidden" />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-[10px] font-black uppercase">ou cole uma URL</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <input
              type="url"
              value={fotoPreview ? '' : novaFoto}
              onChange={e => { setNovaFoto(e.target.value); setFotoPreview(''); }}
              placeholder="https://exemplo.com/minha-foto.jpg"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/60 placeholder:text-zinc-600"
            />

            {(fotoPreview || novaFoto) && (
              <div className="flex justify-center">
                <img
                  src={fotoPreview || novaFoto}
                  alt="preview"
                  className="w-24 h-24 rounded-xl object-cover border-2 border-zinc-700 shadow-lg"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); salvarFoto(); }}
                disabled={salvandoFoto || (!novaFoto.trim() && !arquivoFoto)}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-2 rounded-lg text-sm uppercase tracking-wider transition-all active:scale-95"
              >
                {salvandoFoto ? 'Salvando...' : '✓ Salvar'}
              </button>
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); setEditandoFoto(false); setNovaFoto(''); setFotoPreview(''); setArquivoFoto(null); }}
                className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-2 rounded-lg text-sm transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
