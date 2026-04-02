import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ModalGerenciarEquipes } from './ModalGerenciarEquipes';

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
//
// Faixas de patente (vendas históricas aprovadas):
//  Tier 1 – Vendedor Iniciante  →   0 – 20  vendas
//  Tier 2 – Vendedor            →  21 – 30  vendas
//  Tier 3 – Vendedor Veterano   →  31 – 49  vendas
//  Tier 4 – Vendedor Elite      →  50 – 60  vendas
//  Tier 5 – Vendedor Lendário   →  61+      vendas
//
// Dentro de cada patente, a cada 10 vendas o nível sobe (Nv.1, Nv.2…)
// A barra de XP mostra o progresso dentro do nível atual (0–9 vendas)

// Limite inferior de cada tier (índice 0..4)
const TIER_INICIO = [0, 21, 31, 50, 61];

const PATENTES = [
  { tier: 1, nome: 'Vendedor Iniciante', icone: '🪖', corTexto: 'text-zinc-400',   corBg: 'bg-zinc-800/80',    corBorda: 'border-zinc-600',   glow: '' },
  { tier: 2, nome: 'Vendedor',           icone: '⚔️',  corTexto: 'text-green-400',  corBg: 'bg-green-950/80',   corBorda: 'border-green-700',  glow: 'shadow-[0_0_6px_rgba(34,197,94,0.3)]' },
  { tier: 3, nome: 'Vendedor Veterano',  icone: '🛡️',  corTexto: 'text-blue-400',   corBg: 'bg-blue-950/80',    corBorda: 'border-blue-700',   glow: 'shadow-[0_0_6px_rgba(59,130,246,0.3)]' },
  { tier: 4, nome: 'Vendedor Elite',     icone: '🌟',  corTexto: 'text-yellow-400', corBg: 'bg-yellow-950/80',  corBorda: 'border-yellow-700', glow: 'shadow-[0_0_8px_rgba(250,204,21,0.4)]' },
  { tier: 5, nome: 'Vendedor Lendário',  icone: '💎',  corTexto: 'text-purple-400', corBg: 'bg-purple-950/80',  corBorda: 'border-purple-600', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
];

type NivelInfo = {
  tierIndex: number;
  patente: typeof PATENTES[0];
  nivel: number;
  xpAtual: number;
  xpMax: number;
  proximaPatente: typeof PATENTES[0] | null;
};

function calcularNivel(totalVendasCount: number): NivelInfo {
  const count = Math.max(0, totalVendasCount);

  // Descobre o tier pelo limite inferior (percorre do maior para o menor)
  let tierIndex = 0;
  for (let i = TIER_INICIO.length - 1; i >= 0; i--) {
    if (count >= TIER_INICIO[i]) { tierIndex = i; break; }
  }

  const patente = PATENTES[tierIndex];
  const proximaPatente = tierIndex < 4 ? PATENTES[tierIndex + 1] : null;

  // Nível dentro da patente: a cada 10 vendas desde o início do tier
  const vendasNoTier = count - TIER_INICIO[tierIndex];
  const nivel = Math.floor(vendasNoTier / 10) + 1;
  const xpAtual = vendasNoTier % 10;
  const xpMax = 10;

  return {
    tierIndex,
    patente,
    nivel,
    xpAtual,
    xpMax,
    proximaPatente,
  };
}

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded ${className}`} />;
}

function SkeletonGuerraEquipes() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 flex flex-col gap-5 w-full">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 rounded-lg border border-zinc-800 p-4 flex flex-col gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <div className="flex flex-col items-center justify-center mx-3">
          <Skeleton className="h-16 w-1" />
          <Skeleton className="h-14 w-14 rounded-full my-[-14px]" />
          <Skeleton className="h-16 w-1" />
        </div>
        <div className="flex-1 rounded-lg border border-zinc-800 p-4 flex flex-col gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function GuerraEquipes({ refreshTrigger, isAdmin = false }: GuerraEquipesProps) {
  const [equipeA, setEquipeA] = useState<VendedorRank[]>([]);
  const [equipeB, setEquipeB] = useState<VendedorRank[]>([]);
  const [totalA, setTotalA] = useState(0);
  const [totalB, setTotalB] = useState(0);
  const [desafioAtivo, setDesafioAtivo] = useState<any>(null);
  const [tempoRestante, setTempoRestante] = useState('');
  const [autoRefreshSeg, setAutoRefreshSeg] = useState(30);
  const [modalEquipes, setModalEquipes] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const META_OPERACAO = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;

  // ─── Busca dados ────────────────────────────────────────────────────────────

  const fetchRankingEDesafio = useCallback(async () => {
    setCarregando(true);
    try {
      const resChallenge = await api.get('/challenges');
      const lista = Array.isArray(resChallenge.data) ? resChallenge.data : [];
      setDesafioAtivo(lista.find((c: any) => c.is_active) || null);
    } catch { /* sem desafio ativo */ }

    try {
      const response = await api.get('/ranking');
      const rankingGeral: VendedorRank[] = Array.isArray(response.data)
        ? response.data
        : (response.data.data || []);

      const normaliza = (eq: string) => String(eq || '').trim().toUpperCase();
      const timeA = rankingGeral.filter(v => ['A', 'EQUIPE A', 'EQUIPA A'].includes(normaliza(v.equipe)));
      const timeB = rankingGeral.filter(v => ['B', 'EQUIPE B', 'EQUIPA B'].includes(normaliza(v.equipe)));

      setEquipeA(timeA);
      setEquipeB(timeB);
      setTotalA(timeA.reduce((acc, v) => acc + (Number(v.total_vendido) || 0), 0));
      setTotalB(timeB.reduce((acc, v) => acc + (Number(v.total_vendido) || 0), 0));
    } catch { /* mantém dados anteriores */ }
    finally { setCarregando(false); }
  }, []);

  // ─── Auto-refresh ────────────────────────────────────────────────────────────

  useEffect(() => { fetchRankingEDesafio(); }, [refreshTrigger, fetchRankingEDesafio]);

  useEffect(() => {
    setAutoRefreshSeg(30);
    const tick = setInterval(() => {
      setAutoRefreshSeg(prev => {
        if (prev <= 1) { fetchRankingEDesafio(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchRankingEDesafio]);

  // ─── Relógio ─────────────────────────────────────────────────────────────────

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
        setTempoRestante(
          [d > 0 && `${d}d`, (h > 0 || d > 0) && `${h}h`, `${m}m`, `${s}s`]
            .filter(Boolean).join(' ') + ' restantes'
        );
      } else { setTempoRestante('OPERAÇÃO ENCERRADA'); }
    }
    calcular();
    const t = setInterval(calcular, 1000);
    return () => clearInterval(t);
  }, [desafioAtivo]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const formataBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalGeral = totalA + totalB;
  const progressoXP = isNaN((totalGeral / META_OPERACAO) * 100) ? 0 : Math.min((totalGeral / META_OPERACAO) * 100, 100);
  const liderA = totalA > 0 && totalA >= totalB;
  const liderB = totalB > 0 && totalB > totalA;

  if (carregando) return <SkeletonGuerraEquipes />;

  // ─── Badge de nível inline ────────────────────────────────────────────────────

  function BadgeNivel({ count }: { count: number }) {
    const n = calcularNivel(count);
    return (
      <span
        title={`${n.patente.nome} — Nível ${n.nivel} | ${count} vendas totais`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border ${n.patente.corBg} ${n.patente.corBorda} ${n.patente.corTexto} ${n.patente.glow} whitespace-nowrap`}
      >
        {n.patente.icone} Nv.{n.nivel}
      </span>
    );
  }

  // ─── Card do pódio ────────────────────────────────────────────────────────────

  function renderPodio(equipe: VendedorRank[], corBarra: string) {
    const medalhas = ['🥇', '🥈', '🥉'];

    return (
      <div className="space-y-2 mt-3">
        {[0, 1, 2].map(index => {
          const v = equipe[index];
          const temVenda = v && Number(v.total_vendido) > 0;
          const nivel = v ? calcularNivel(v.total_vendas_count || 0) : null;
          const iniciais = v ? v.nome.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() : '';

          return (
            <div
              key={index}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                index === 0 && temVenda
                  ? 'bg-zinc-900 border-yellow-900/50 shadow-[inset_0_0_20px_rgba(250,204,21,0.04)]'
                  : 'bg-zinc-950/80 border-zinc-800/50 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{medalhas[index]}</span>

                {temVenda ? (
                  <>
                    {v.foto_url ? (
                      <img src={v.foto_url} alt={v.nome} className="w-8 h-8 rounded-full object-cover border-2 border-zinc-700 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700 flex-shrink-0">
                        <span className="text-[10px] font-black text-zinc-400">{iniciais}</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-zinc-100 font-bold text-xs truncate">{v.nome}</span>
                      {nivel && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <BadgeNivel count={v.total_vendas_count || 0} />
                          <div className="w-10 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 flex-shrink-0">
                            <div
                              className={`h-full rounded-full ${corBarra} transition-all duration-700`}
                              style={{ width: `${(nivel.xpAtual / nivel.xpMax) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-zinc-600 italic text-xs">Aguardando recruta...</span>
                )}
              </div>

              <span className={`font-black text-sm flex-shrink-0 ml-2 ${temVenda ? 'text-green-400' : 'text-zinc-700'}`}>
                {temVenda ? formataBRL(Number(v.total_vendido)) : '-'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col w-full relative overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              ⚔️ Guerra de Equipes
            </h2>
            <p className="text-zinc-600 text-xs font-bold mt-0.5 uppercase tracking-wider">
              {desafioAtivo ? desafioAtivo.name : 'Operação Geral'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Contador auto-refresh */}
            <button
              onClick={() => { fetchRankingEDesafio(); setAutoRefreshSeg(30); }}
              title="Atualizar agora"
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all text-xs font-bold"
            >
              <div className="relative w-4 h-4 flex-shrink-0">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#52525b" strokeWidth="2.5" />
                  <circle
                    cx="10" cy="10" r="8" fill="none" stroke="#71717a" strokeWidth="2.5"
                    strokeDasharray={`${(autoRefreshSeg / 30) * 50.3} 50.3`}
                    className="transition-all duration-1000"
                  />
                </svg>
              </div>
              <span className="hidden sm:inline">{autoRefreshSeg}s</span>
            </button>

            {/* Botão gerenciar equipes (só admin) */}
            {isAdmin && (
              <button
                onClick={() => setModalEquipes(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                <span>👥</span>
                <span>Gerenciar Squads</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Barra de progresso da operação ────────────────────────────────── */}
        <div className="mb-6 p-4 bg-zinc-950/60 rounded-xl border border-yellow-900/30">
          <div className="flex justify-between items-end mb-2 gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Progresso da Operação</p>
              <div className="text-white font-black text-lg md:text-xl flex items-baseline gap-1 mt-0.5 flex-wrap">
                {formataBRL(totalGeral)}
                <span className="text-xs text-yellow-400 font-medium">/ {formataBRL(META_OPERACAO)}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-2xl md:text-3xl font-black text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
                {progressoXP.toFixed(1)}<span className="text-lg">%</span>
              </span>
            </div>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-3 md:h-4 border border-zinc-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-600 to-yellow-300 h-full rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progressoXP}%` }}
            >
              {progressoXP > 5 && (
                <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
              )}
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-700 font-medium uppercase tracking-wider mt-1.5">
            Acumulado das Equipes A & B
          </p>
        </div>

        {/* ── Confronto ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0 flex-1 relative mb-5">

          {/* Equipe A */}
          <div className={`w-full md:flex-1 rounded-xl p-4 relative transition-all duration-500 ${
            liderA
              ? 'bg-blue-950/20 border-2 border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.12)]'
              : 'bg-blue-950/5 border border-blue-900/20'
          }`}>
            {liderA && (
              <div className="absolute -top-5 left-2 text-4xl animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.7)] z-20 select-none pointer-events-none">🏆</div>
            )}
            <div className="flex justify-between items-end mb-1">
              <span className={`font-black text-sm md:text-base uppercase tracking-wider ${liderA ? 'text-blue-300' : 'text-blue-500'}`}>
                ⚡ Equipe A
              </span>
              <span className="text-white font-black text-lg md:text-xl">{formataBRL(totalA)}</span>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-1.5 mb-2 border border-zinc-800/50">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                style={{ width: `${Math.min((totalA / META_OPERACAO) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-900/70 font-bold">
              {equipeA.filter(v => v.total_vendido > 0).length} soldado(s) ativo(s)
            </p>
            {renderPodio(equipeA, 'bg-blue-500')}
          </div>

          {/* VS */}
          <div className="hidden md:flex flex-col items-center justify-center mx-4 relative z-10">
            <div className="w-px flex-1 bg-zinc-800" />
            <div className="bg-zinc-950 border-2 border-zinc-700 rounded-full p-3 my-[-14px] shadow-[0_0_20px_rgba(0,0,0,0.9)]">
              <span className="text-3xl font-black text-zinc-500 tracking-tighter italic">VS</span>
            </div>
            <div className="w-px flex-1 bg-zinc-800" />
          </div>
          <div className="md:hidden flex items-center justify-center my-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="mx-4 text-xl font-black text-zinc-600 italic">VS</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Equipe B */}
          <div className={`w-full md:flex-1 rounded-xl p-4 relative transition-all duration-500 ${
            liderB
              ? 'bg-red-950/20 border-2 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.12)]'
              : 'bg-red-950/5 border border-red-900/20'
          }`}>
            {liderB && (
              <div className="absolute -top-5 right-2 text-4xl animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.7)] z-20 select-none pointer-events-none">🏆</div>
            )}
            <div className="flex justify-between items-end mb-1">
              <span className="text-white font-black text-lg md:text-xl">{formataBRL(totalB)}</span>
              <span className={`font-black text-sm md:text-base uppercase tracking-wider ${liderB ? 'text-red-300' : 'text-red-500'}`}>
                Equipe B 🔥
              </span>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-1.5 mb-2 border border-zinc-800/50">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(239,68,68,0.5)] ml-auto"
                style={{ width: `${Math.min((totalB / META_OPERACAO) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-red-900/70 font-bold text-right">
              {equipeB.filter(v => v.total_vendido > 0).length} soldado(s) ativo(s)
            </p>
            {renderPodio(equipeB, 'bg-red-500')}
          </div>
        </div>

        {/* ── Legenda de patentes ─────────────────────────────────────────────── */}
        <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/40 mb-4">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">
            Sistema de Patentes — Iniciante: 0–20 • Vendedor: 21–30 • Veterano: 31–49 • Elite: 50–60 • Lendário: 61+
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PATENTES.map(p => (
              <span
                key={p.tier}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${p.corBg} ${p.corBorda} ${p.corTexto} ${p.glow}`}
              >
                {p.icone} {p.nome}
              </span>
            ))}
          </div>
        </div>

        {/* ── Rodapé timer ─────────────────────────────────────────────────────── */}
        <div className="text-center text-[10px] text-zinc-600 pt-3 border-t border-zinc-800 uppercase tracking-widest font-bold">
          Tempo Tático:{' '}
          <span className={`text-white font-black text-sm ${tempoRestante === 'OPERAÇÃO ENCERRADA' ? 'text-red-400' : ''}`}>
            {tempoRestante}
          </span>
        </div>
      </div>

      {modalEquipes && (
        <ModalGerenciarEquipes
          onClose={() => setModalEquipes(false)}
          onSalvo={fetchRankingEDesafio}
        />
      )}
    </>
  );
}
