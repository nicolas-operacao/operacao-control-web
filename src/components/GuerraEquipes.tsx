import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { ModalGerenciarEquipes } from './ModalGerenciarEquipes';
import { ModalVendedor } from './ModalVendedor';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type VendedorRank = {
  id: string;
  nome: string;
  equipe: string;
  total_vendido: number;
  total_vendas_count: number;
  foto_url?: string;
};

interface GuerraEquipesProps {
  refreshTrigger: number;
  isAdmin?: boolean;
}

// ─── SISTEMA DE NÍVEIS ────────────────────────────────────────────────────────

const VENDAS_POR_NIVEL   = 5;
const VENDAS_POR_PATENTE = 20;
const TIER_INICIO = [0, 20, 40, 60, 80];

const PATENTES = [
  { tier: 1, nome: 'Iniciante', icone: '🪖', cor: '#71717a', glow: 'rgba(113,113,122,0.5)', corTexto: 'text-zinc-400',   corBg: 'bg-zinc-800/80',   corBorda: 'border-zinc-600' },
  { tier: 2, nome: 'Vendedor',  icone: '⚔️',  cor: '#22c55e', glow: 'rgba(34,197,94,0.5)',  corTexto: 'text-green-400',  corBg: 'bg-green-950/80',  corBorda: 'border-green-700' },
  { tier: 3, nome: 'Veterano',  icone: '🛡️',  cor: '#3b82f6', glow: 'rgba(59,130,246,0.5)', corTexto: 'text-blue-400',   corBg: 'bg-blue-950/80',   corBorda: 'border-blue-700' },
  { tier: 4, nome: 'Elite',     icone: '🌟',  cor: '#facc15', glow: 'rgba(250,204,21,0.5)', corTexto: 'text-yellow-400', corBg: 'bg-yellow-950/80', corBorda: 'border-yellow-700' },
  { tier: 5, nome: 'Lendário',  icone: '💎',  cor: '#a855f7', glow: 'rgba(168,85,247,0.5)', corTexto: 'text-purple-400', corBg: 'bg-purple-950/80', corBorda: 'border-purple-600' },
];

type NivelInfo = {
  tierIndex: number;
  patente: typeof PATENTES[0];
  nivel: number;
  xpAtual: number;
  xpMax: number;
};

function calcularNivel(count: number): NivelInfo {
  const c = Math.max(0, count);
  let tierIndex = 0;
  for (let i = TIER_INICIO.length - 1; i >= 0; i--) {
    if (c >= TIER_INICIO[i]) { tierIndex = i; break; }
  }
  const patente = PATENTES[tierIndex];
  const noTier = c - TIER_INICIO[tierIndex];
  const nivel   = Math.floor(noTier / VENDAS_POR_NIVEL) + 1;
  const xpAtual = noTier % VENDAS_POR_NIVEL;
  return { tierIndex, patente, nivel, xpAtual, xpMax: VENDAS_POR_NIVEL };
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className}`} />;
}

function SkeletonWar() {
  return (
    <div className="rounded-2xl border border-zinc-800 overflow-hidden">
      <Sk className="h-40 w-full rounded-none" />
      <div className="p-5 space-y-4">
        <Sk className="h-8 w-full" />
        <div className="flex gap-4">
          <div className="flex-1 space-y-2"><Sk className="h-16" /><Sk className="h-12" /><Sk className="h-12" /><Sk className="h-12" /></div>
          <Sk className="w-20 h-48" />
          <div className="flex-1 space-y-2"><Sk className="h-16" /><Sk className="h-12" /><Sk className="h-12" /><Sk className="h-12" /></div>
        </div>
      </div>
    </div>
  );
}

// ─── BADGE DE PATENTE ─────────────────────────────────────────────────────────

function BadgeNivel({ count }: { count: number }) {
  const n = calcularNivel(count);
  return (
    <span
      title={`${n.patente.nome} Nv.${n.nivel} — ${count} vendas aprovadas`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black border ${n.patente.corBg} ${n.patente.corBorda} ${n.patente.corTexto} whitespace-nowrap`}
      style={{ boxShadow: `0 0 6px ${n.patente.glow}` }}
    >
      {n.patente.icone} {n.patente.nome} {n.nivel}
    </span>
  );
}

// ─── CARD DO SOLDADO ──────────────────────────────────────────────────────────

function CardSoldado({
  vendedor, posicao, lado, isMVP, onClick,
}: {
  vendedor: VendedorRank | null;
  posicao: number;
  lado: 'A' | 'B';
  isMVP: boolean;
  onClick: () => void;
}) {
  const posIcons = ['', '🥇', '🥈', '🥉'];
  const temVenda  = vendedor && Number(vendedor.total_vendido) > 0;
  const nivel     = vendedor ? calcularNivel(vendedor.total_vendas_count || 0) : null;
  const iniciais  = vendedor ? vendedor.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
  const corA = '#3b82f6'; const corB = '#ef4444';
  const cor   = lado === 'A' ? corA : corB;
  const fmt   = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!vendedor || !temVenda) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800/50 bg-zinc-950/30">
        <span className="text-zinc-700 text-lg w-6 text-center">{posIcons[posicao] || `${posicao}º`}</span>
        <span className="text-zinc-700 italic text-xs">Aguardando recruta...</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={somHover}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isMVP
          ? 'bg-yellow-950/30 border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.12)]'
          : 'bg-zinc-950/50 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/70'
      }`}
      style={isMVP ? {} : { borderColor: cor + '30' }}
    >
      {/* Posição */}
      <span className="text-lg w-6 text-center flex-shrink-0 leading-none">
        {posIcons[posicao] || <span className="text-zinc-600 text-xs font-black">{posicao}º</span>}
      </span>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {vendedor.foto_url ? (
          <img src={vendedor.foto_url} alt={vendedor.nome}
            className="w-9 h-9 rounded-full object-cover"
            style={{ border: `2px solid ${cor}50` }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: cor + '20', border: `2px solid ${cor}50`, color: cor }}
          >
            {iniciais}
          </div>
        )}
        {isMVP && (
          <span className="absolute -top-2 -right-2 text-base drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">👑</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-black truncate ${isMVP ? 'text-yellow-200' : 'text-zinc-100'}`}>
            {vendedor.nome}
          </span>
          {isMVP && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-500/30 flex-shrink-0">MVP</span>
          )}
        </div>
        {nivel && (
          <div className="flex items-center gap-1.5">
            <BadgeNivel count={vendedor.total_vendas_count || 0} />
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-[40px]">
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{
                  width: `${(nivel.xpAtual / nivel.xpMax) * 100}%`,
                  background: nivel.patente.cor,
                  boxShadow: `0 0 4px ${nivel.patente.glow}`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Valor */}
      <span
        className="font-black text-sm flex-shrink-0 transition-all duration-200"
        style={{ color: isMVP ? '#facc15' : cor }}
      >
        {fmt(Number(vendedor.total_vendido))}
      </span>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function GuerraEquipes({ refreshTrigger, isAdmin = false }: GuerraEquipesProps) {
  const [equipeA, setEquipeA] = useState<VendedorRank[]>([]);
  const [equipeB, setEquipeB] = useState<VendedorRank[]>([]);
  const [totalA,  setTotalA]  = useState(0);
  const [totalB,  setTotalB]  = useState(0);
  const [desafioAtivo, setDesafioAtivo] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState({ d: '00', h: '00', m: '00', s: '00', encerrado: false });
  const [ultimoCount, setUltimoCount] = useState<number | null>(null);
  const [modalEquipes, setModalEquipes] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [vendedorModal, setVendedorModal] = useState<VendedorRank | null>(null);

  const META_OPERACAO = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;
  const fmt = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRankingEDesafio = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get('/challenges');
      const lista = Array.isArray(res.data) ? res.data : [];
      setDesafioAtivo(lista.find((c: any) => c.is_active) || null);
    } catch { /* sem desafio */ }
    try {
      const res = await api.get('/ranking');
      const all: VendedorRank[] = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const norm = (eq: string) => String(eq || '').trim().toUpperCase();
      const a = all.filter(v => ['A','EQUIPE A','EQUIPA A'].includes(norm(v.equipe)));
      const b = all.filter(v => ['B','EQUIPE B','EQUIPA B'].includes(norm(v.equipe)));
      setEquipeA(a); setEquipeB(b);
      setTotalA(a.reduce((s, v) => s + (Number(v.total_vendido) || 0), 0));
      setTotalB(b.reduce((s, v) => s + (Number(v.total_vendido) || 0), 0));
    } catch { /* mantém dados */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { fetchRankingEDesafio(); }, [refreshTrigger, fetchRankingEDesafio]);

  // ─── Poll leve ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const checar = async () => {
      try {
        const res = await api.get('/ranking/ping');
        const novo: number = res.data.count ?? 0;
        setUltimoCount(prev => {
          if (prev !== null && prev !== novo) fetchRankingEDesafio();
          return novo;
        });
      } catch { /* ignora */ }
    };
    const t = setInterval(checar, 15000);
    return () => clearInterval(t);
  }, [fetchRankingEDesafio]);

  // ─── Countdown ──────────────────────────────────────────────────────────────

  useEffect(() => {
    function calcular() {
      const agora = new Date();
      let deadline = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
      if (desafioAtivo?.end_date) {
        const [ano, mes, dia] = desafioAtivo.end_date.split('-');
        deadline = new Date(Number(ano), Number(mes) - 1, Number(dia), 23, 59, 59, 999);
      }
      const diff = deadline.getTime() - agora.getTime();
      if (diff > 0) {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff / 60000) % 60);
        const s = Math.floor((diff / 1000) % 60);
        const p = (n: number) => String(n).padStart(2, '0');
        setTempoRestante({ d: p(d), h: p(h), m: p(m), s: p(s), encerrado: false });
      } else {
        setTempoRestante({ d: '00', h: '00', m: '00', s: '00', encerrado: true });
      }
    }
    calcular();
    const t = setInterval(calcular, 1000);
    return () => clearInterval(t);
  }, [desafioAtivo]);

  // ─── Derivados ──────────────────────────────────────────────────────────────

  const totalGeral   = totalA + totalB;
  const progressoXP  = totalGeral > 0 ? Math.min((totalGeral / META_OPERACAO) * 100, 100) : 0;
  const liderA = totalA >= totalB && totalA > 0;
  const liderB = totalB > totalA && totalB > 0;
  const empate = totalA === totalB;
  const delta  = Math.abs(totalA - totalB);
  const pctA   = totalGeral > 0 ? (totalA / totalGeral) * 100 : 50;
  const pctB   = totalGeral > 0 ? (totalB / totalGeral) * 100 : 50;

  const todosVendedores = [...equipeA, ...equipeB];
  const mvp = todosVendedores.length > 0
    ? todosVendedores.reduce((top, v) => Number(v.total_vendido) > Number(top.total_vendido) ? v : top, todosVendedores[0])
    : null;
  const mvpTemVenda = mvp && Number(mvp.total_vendido) > 0;

  const openModal = (v: VendedorRank) => {
    somClick();
    setVendedorModal(v);
  };

  if (carregando) return <SkeletonWar />;

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-[0_0_60px_rgba(0,0,0,0.8)]">

        {/* ── FUNDO SPLIT CINEMATOGRÁFICO ──────────────────────────────────────── */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div className="flex-1 bg-gradient-to-br from-blue-950/40 via-zinc-950 to-zinc-950" />
          <div className="flex-1 bg-gradient-to-bl from-red-950/40 via-zinc-950 to-zinc-950" />
        </div>
        {/* Brilhos laterais */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-blue-500/60 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-red-500/60 to-transparent pointer-events-none" />
        {/* Grade tática de fundo */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        <div className="relative z-10 p-4 md:p-6 flex flex-col gap-5">

          {/* ── HEADER ───────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                ⚔️ <span className="text-blue-400">GUERRA</span>
                <span className="text-zinc-600 text-lg">×</span>
                <span className="text-red-400">DAS EQUIPES</span>
              </h2>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-0.5">
                {desafioAtivo ? desafioAtivo.name : 'Operação Geral'} · Clique em um soldado para ver o perfil
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); fetchRankingEDesafio(); }}
                title="Atualizar"
                className="w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4v5h5" /><path d="M16 16v-5h-5" />
                  <path d="M4 9a7 7 0 0 1 12.9-2M16 11a7 7 0 0 1-12.9 2" />
                </svg>
              </button>
              {isAdmin && (
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); setModalEquipes(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  👥 <span className="hidden sm:inline">Squads</span>
                </button>
              )}
            </div>
          </div>

          {/* ── PLACAR ÉPICO ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2 items-stretch">

            {/* Equipe A */}
            <div className={`rounded-2xl p-3 md:p-5 flex flex-col items-center justify-center transition-all duration-500 ${
              liderA
                ? 'bg-blue-950/50 border-2 border-blue-400/60 shadow-[0_0_30px_rgba(59,130,246,0.25),inset_0_0_30px_rgba(59,130,246,0.05)]'
                : 'bg-blue-950/10 border border-blue-900/20'
            }`}>
              {liderA && <div className="text-2xl md:text-3xl mb-1 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-bounce">🏆</div>}
              <p className="text-[9px] md:text-xs font-black uppercase tracking-widest text-blue-400 mb-1 text-center">⚡ Equipe A</p>
              <p
                className="font-black leading-none text-center break-all"
                style={{
                  fontSize: 'clamp(0.75rem, 4vw, 1.75rem)',
                  color: liderA ? '#93c5fd' : '#3b82f6',
                  textShadow: liderA ? '0 0 20px rgba(59,130,246,0.8)' : 'none',
                }}
              >
                {fmt(totalA)}
              </p>
              <p className="text-[9px] text-blue-900/60 font-bold mt-1 text-center">
                {equipeA.filter(v => v.total_vendido > 0).length} ativo{equipeA.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* VS central */}
            <div className="flex flex-col items-center justify-center gap-1.5">
              {/* Status */}
              <div className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-1.5 py-1 rounded-full border transition-all duration-500 text-center leading-tight ${
                empate || totalGeral === 0
                  ? 'text-zinc-400 border-zinc-700 bg-zinc-900'
                  : liderA
                    ? 'text-blue-300 border-blue-600/60 bg-blue-950/50'
                    : 'text-red-300 border-red-600/60 bg-red-950/50'
              }`}>
                {totalGeral === 0 ? 'VS' : empate ? '🤝' : liderA ? '⚡ A' : '🔥 B'}
              </div>

              {/* VS badge */}
              <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center border-4 font-black text-base md:text-2xl italic transition-all duration-500 ${
                liderA ? 'border-blue-500/60 bg-blue-950/40 text-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.4)]'
                  : liderB ? 'border-red-500/60 bg-red-950/40 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-500'
              }`}>
                VS
              </div>

              {/* Delta */}
              {delta > 0 && (
                <div className="text-center hidden sm:block">
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">dif.</p>
                  <p className={`text-[10px] font-black ${liderA ? 'text-blue-400' : 'text-red-400'}`}>{fmt(delta)}</p>
                </div>
              )}
            </div>

            {/* Equipe B */}
            <div className={`rounded-2xl p-3 md:p-5 flex flex-col items-center justify-center transition-all duration-500 ${
              liderB
                ? 'bg-red-950/50 border-2 border-red-400/60 shadow-[0_0_30px_rgba(239,68,68,0.25),inset_0_0_30px_rgba(239,68,68,0.05)]'
                : 'bg-red-950/10 border border-red-900/20'
            }`}>
              {liderB && <div className="text-2xl md:text-3xl mb-1 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-bounce">🏆</div>}
              <p className="text-[9px] md:text-xs font-black uppercase tracking-widest text-red-400 mb-1 text-center">Equipe B 🔥</p>
              <p
                className="font-black leading-none text-center break-all"
                style={{
                  fontSize: 'clamp(0.75rem, 4vw, 1.75rem)',
                  color: liderB ? '#fca5a5' : '#ef4444',
                  textShadow: liderB ? '0 0 20px rgba(239,68,68,0.8)' : 'none',
                }}
              >
                {fmt(totalB)}
              </p>
              <p className="text-[9px] text-red-900/60 font-bold mt-1 text-center">
                {equipeB.filter(v => v.total_vendido > 0).length} ativo{equipeB.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Delta visível no mobile abaixo do placar */}
          {delta > 0 && (
            <div className="sm:hidden text-center">
              <p className={`text-xs font-black ${liderA ? 'text-blue-400' : 'text-red-400'}`}>
                Diferença: {fmt(delta)}
              </p>
            </div>
          )}

          {/* ── BARRA DE DOMINÂNCIA ──────────────────────────────────────────── */}
          {totalGeral > 0 && (
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                <span className={liderA ? 'text-blue-300' : 'text-blue-600'}>⚡ {pctA.toFixed(1)}%</span>
                <span className="text-zinc-700">DOMINÂNCIA</span>
                <span className={liderB ? 'text-red-300' : 'text-red-600'}>{pctB.toFixed(1)}% 🔥</span>
              </div>
              <div className="h-4 md:h-5 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex">
                <div
                  className="h-full transition-all duration-1000 relative"
                  style={{
                    width: `${pctA}%`,
                    background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
                    boxShadow: liderA ? '4px 0 15px rgba(59,130,246,0.6)' : 'none',
                  }}
                >
                  {liderA && pctA > 20 && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                </div>
                <div
                  className="h-full transition-all duration-1000 ml-auto relative"
                  style={{
                    width: `${pctB}%`,
                    background: 'linear-gradient(270deg, #b91c1c, #f87171)',
                    boxShadow: liderB ? '-4px 0 15px rgba(239,68,68,0.6)' : 'none',
                  }}
                >
                  {liderB && pctB > 20 && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PROGRESSO DA OPERAÇÃO ────────────────────────────────────────── */}
          <div className="bg-zinc-950/60 rounded-2xl border border-yellow-900/20 p-4">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">🎯 Progresso da Operação</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-white font-black text-lg md:text-xl">{fmt(totalGeral)}</span>
                  <span className="text-zinc-600 text-xs font-bold">/ {fmt(META_OPERACAO)}</span>
                </div>
              </div>
              <span
                className="text-3xl md:text-4xl font-black drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                style={{ color: progressoXP >= 100 ? '#22c55e' : '#facc15' }}
              >
                {progressoXP.toFixed(1)}<span className="text-xl">%</span>
              </span>
            </div>

            {/* Barra segmentada */}
            <div className="h-5 md:h-6 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{
                  width: `${progressoXP}%`,
                  background: progressoXP >= 100
                    ? 'linear-gradient(90deg, #15803d, #22c55e)'
                    : 'linear-gradient(90deg, #713f12, #ca8a04, #facc15)',
                  boxShadow: `0 0 15px ${progressoXP >= 100 ? 'rgba(34,197,94,0.5)' : 'rgba(250,204,21,0.4)'}`,
                }}
              >
                {progressoXP > 8 && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
                )}
              </div>
              {/* Marcadores de 25%/50%/75% */}
              {[25, 50, 75].map(m => (
                <div key={m} className="absolute top-0 bottom-0 w-px bg-zinc-800/80" style={{ left: `${m}%` }} />
              ))}
            </div>
          </div>

          {/* ── PÓDIO DAS EQUIPES ─────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row gap-4">

            {/* Equipe A */}
            <div className="flex-1 rounded-2xl border border-blue-900/30 bg-blue-950/10 overflow-hidden">
              <div className="px-4 py-3 bg-blue-950/30 border-b border-blue-900/30 flex justify-between items-center">
                <span className="text-blue-300 font-black uppercase tracking-widest text-xs flex items-center gap-1.5">
                  ⚡ Equipe A
                </span>
                <span className="text-blue-500/60 text-[10px] font-bold">
                  {equipeA.filter(v => v.total_vendido > 0).length} soldado{equipeA.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {[0, 1, 2].map(i => {
                  const v = equipeA[i] || null;
                  const isMVP = mvpTemVenda && v && String(v.id) === String(mvp!.id);
                  return (
                    <CardSoldado
                      key={i}
                      vendedor={v}
                      posicao={i + 1}
                      lado="A"
                      isMVP={!!isMVP}
                      onClick={() => v && Number(v.total_vendido) > 0 && openModal(v)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Equipe B */}
            <div className="flex-1 rounded-2xl border border-red-900/30 bg-red-950/10 overflow-hidden">
              <div className="px-4 py-3 bg-red-950/30 border-b border-red-900/30 flex justify-between items-center">
                <span className="text-red-300 font-black uppercase tracking-widest text-xs flex items-center gap-1.5">
                  🔥 Equipe B
                </span>
                <span className="text-red-500/60 text-[10px] font-bold">
                  {equipeB.filter(v => v.total_vendido > 0).length} soldado{equipeB.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {[0, 1, 2].map(i => {
                  const v = equipeB[i] || null;
                  const isMVP = mvpTemVenda && v && String(v.id) === String(mvp!.id);
                  return (
                    <CardSoldado
                      key={i}
                      vendedor={v}
                      posicao={i + 1}
                      lado="B"
                      isMVP={!!isMVP}
                      onClick={() => v && Number(v.total_vendido) > 0 && openModal(v)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RODAPÉ: Patentes + Countdown ──────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-zinc-800/60">

            {/* Legenda de patentes */}
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
              {PATENTES.map(p => (
                <span
                  key={p.tier}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black border ${p.corBg} ${p.corBorda} ${p.corTexto}`}
                  style={{ boxShadow: `0 0 5px ${p.glow}` }}
                >
                  {p.icone} {p.nome}
                </span>
              ))}
            </div>

            {/* Countdown digital */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {tempoRestante.encerrado ? (
                <span className="text-red-500 font-black text-sm uppercase tracking-widest">OPERAÇÃO ENCERRADA</span>
              ) : (
                <>
                  {[
                    { v: tempoRestante.d, l: 'd' },
                    { v: tempoRestante.h, l: 'h' },
                    { v: tempoRestante.m, l: 'm' },
                    { v: tempoRestante.s, l: 's' },
                  ].map(({ v, l }, i) => (
                    <div key={l} className="flex items-center gap-1">
                      {i > 0 && <span className="text-zinc-700 font-black text-sm">:</span>}
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-center min-w-[36px]">
                        <p className="text-white font-black text-sm leading-none tabular-nums">{v}</p>
                        <p className="text-zinc-600 text-[8px] font-bold uppercase">{l}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {modalEquipes && (
        <ModalGerenciarEquipes onClose={() => setModalEquipes(false)} onSalvo={fetchRankingEDesafio} />
      )}

      {vendedorModal && (() => {
        const n = calcularNivel(vendedorModal.total_vendas_count || 0);
        return (
          <ModalVendedor
            vendedor={{ ...vendedorModal, patente: n.patente.nome, patenteIcone: n.patente.icone, nivel: n.nivel }}
            onClose={() => setVendedorModal(null)}
          />
        );
      })()}
    </>
  );
}
