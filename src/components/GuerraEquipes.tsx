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
// Regras:
//  - A cada 5 vendas aprovadas (históricas) o vendedor sobe 1 nível
//  - A cada 2 níveis ele sobe de tier (patente)
//
// Resultado:
//  Tier 1 – Vendedor Iniciante  → 0–9  vendas  (nível 1: 0-4, nível 2: 5-9)
//  Tier 2 – Vendedor            → 10–19 vendas
//  Tier 3 – Vendedor Veterano   → 20–29 vendas
//  Tier 4 – Vendedor Elite      → 30–39 vendas
//  Tier 5 – Vendedor Lendário   → 40+   vendas

type NivelInfo = {
  tier: number;
  patente: string;
  nivel: number;
  icone: string;
  corTexto: string;
  corBg: string;
  corBorda: string;
  xpAtual: number;   // vendas feitas dentro do nível atual (0–4)
  xpMax: number;     // sempre 5
  proximaPatente: string | null;
};

const PATENTES = [
  { tier: 1, nome: 'Vendedor Iniciante', icone: '🪖', corTexto: 'text-zinc-400',  corBg: 'bg-zinc-800',   corBorda: 'border-zinc-600' },
  { tier: 2, nome: 'Vendedor',           icone: '⚔️',  corTexto: 'text-green-400', corBg: 'bg-green-950',  corBorda: 'border-green-700' },
  { tier: 3, nome: 'Vendedor Veterano',  icone: '🛡️',  corTexto: 'text-blue-400',  corBg: 'bg-blue-950',   corBorda: 'border-blue-700' },
  { tier: 4, nome: 'Vendedor Elite',     icone: '🌟',  corTexto: 'text-yellow-400',corBg: 'bg-yellow-950', corBorda: 'border-yellow-700' },
  { tier: 5, nome: 'Vendedor Lendário',  icone: '💎',  corTexto: 'text-purple-400',corBg: 'bg-purple-950', corBorda: 'border-purple-700' },
];

function calcularNivel(totalVendasCount: number): NivelInfo {
  const count = Math.max(0, totalVendasCount);

  // Nível global (0-based): cada 5 vendas sobe 1 nível
  const nivelGlobal = Math.floor(count / 5);

  // Tier: a cada 2 níveis globais sobe 1 tier (tier 0-based, max 4)
  const tierIndex = Math.min(Math.floor(nivelGlobal / 2), 4);
  const nivelDentroTier = (nivelGlobal % 2) + 1; // 1 ou 2 (no tier lendário pode ir além)

  const patente = PATENTES[tierIndex];
  const proximaPatente = tierIndex < 4 ? PATENTES[tierIndex + 1] : null;

  // XP dentro do nível atual (0–4)
  const xpAtual = count % 5;

  return {
    tier: tierIndex + 1,
    patente: patente.nome,
    nivel: nivelGlobal + 1,
    icone: patente.icone,
    corTexto: patente.corTexto,
    corBg: patente.corBg,
    corBorda: patente.corBorda,
    xpAtual,
    xpMax: 5,
    proximaPatente: proximaPatente ? proximaPatente.nome : null,
  };
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

  const META_OPERACAO = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;

  // ─── Busca dados ────────────────────────────────────────────────────────────

  const fetchRankingEDesafio = useCallback(async () => {
    try {
      const resChallenge = await api.get('/challenges');
      const lista = Array.isArray(resChallenge.data) ? resChallenge.data : [];
      const ativo = lista.find((c: any) => c.is_active);
      setDesafioAtivo(ativo || null);
    } catch {
      // sem desafio ativo — continua sem travar
    }

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
    } catch {
      // mantém dados anteriores
    }
  }, []);

  // ─── Auto-refresh ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchRankingEDesafio();
  }, [refreshTrigger, fetchRankingEDesafio]);

  useEffect(() => {
    setAutoRefreshSeg(30);
    const tick = setInterval(() => {
      setAutoRefreshSeg(prev => {
        if (prev <= 1) {
          fetchRankingEDesafio();
          return 30;
        }
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
        let str = '';
        if (d > 0) str += `${d}d `;
        if (h > 0 || d > 0) str += `${h}h `;
        str += `${m}m ${s}s restantes`;
        setTempoRestante(str);
      } else {
        setTempoRestante('OPERAÇÃO ENCERRADA');
      }
    }
    calcular();
    const t = setInterval(calcular, 1000);
    return () => clearInterval(t);
  }, [desafioAtivo]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const formataBRL = (v: number) =>
    (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalGeral = totalA + totalB;
  const progressoXP = isNaN((totalGeral / META_OPERACAO) * 100)
    ? 0
    : Math.min((totalGeral / META_OPERACAO) * 100, 100);

  const liderA = totalA > 0 && totalA >= totalB;
  const liderB = totalB > 0 && totalB > totalA;

  // ─── Badge de Nível ───────────────────────────────────────────────────────────

  function BadgeNivel({ count }: { count: number }) {
    const n = calcularNivel(count);
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black border ${n.corBg} ${n.corBorda} ${n.corTexto} whitespace-nowrap`}
        title={`${n.patente} — Nível ${n.nivel} | ${count} vendas totais`}
      >
        {n.icone} Nv.{n.nivel}
      </span>
    );
  }

  // ─── Card do vendedor no pódio ────────────────────────────────────────────────

  function renderPodio(equipe: VendedorRank[], corBarra: string) {
    const medalhas = ['🥇', '🥈', '🥉'];
    const alturas = ['h-14', 'h-12', 'h-11'];

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
              className={`flex justify-between items-center bg-zinc-950/80 px-3 rounded-lg border border-zinc-800/50 text-sm ${alturas[index]} shadow-inner transition-all hover:bg-zinc-900/80 hover:border-zinc-700`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl flex-shrink-0 drop-shadow-md">{medalhas[index]}</span>

                {temVenda ? (
                  <>
                    {v.foto_url ? (
                      <img
                        src={v.foto_url}
                        alt={v.nome}
                        className="w-8 h-8 rounded-full object-cover border-2 border-zinc-700 flex-shrink-0 shadow"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700 flex-shrink-0 shadow">
                        <span className="text-[10px] font-black text-zinc-400">{iniciais}</span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-zinc-100 font-bold text-xs truncate leading-tight">{v.nome}</span>
                      {nivel && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <BadgeNivel count={v.total_vendas_count || 0} />
                          {/* Mini barra de XP */}
                          <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${corBarra}`}
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

              <span className={`font-black tracking-wide text-sm flex-shrink-0 ml-2 ${temVenda ? 'text-green-400' : 'text-zinc-700'}`}>
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col w-full h-full relative overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between mb-5 border-b border-zinc-800 pb-3 gap-3">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            ⚔️ Guerra de Equipes
            <span className="text-zinc-600 text-sm font-bold normal-case tracking-normal">
              ({desafioAtivo ? desafioAtivo.name : 'Geral'})
            </span>
          </h2>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Contador auto-refresh */}
            <div
              className="flex items-center gap-1.5 text-zinc-600 text-[11px] cursor-pointer hover:text-zinc-400 transition-colors"
              title="Atualização automática"
              onClick={() => { fetchRankingEDesafio(); setAutoRefreshSeg(30); }}
            >
              <div className="relative w-5 h-5 flex-shrink-0">
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#3f3f46" strokeWidth="2" />
                  <circle
                    cx="10" cy="10" r="8"
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="2"
                    strokeDasharray={`${(autoRefreshSeg / 30) * 50.3} 50.3`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-zinc-500">
                  {autoRefreshSeg}
                </span>
              </div>
              <span className="hidden sm:inline">atualiza em {autoRefreshSeg}s</span>
            </div>

            {/* Botão gerenciar equipes (só admin) */}
            {isAdmin && (
              <button
                onClick={() => setModalEquipes(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-all"
              >
                👥 Gerenciar Squads
              </button>
            )}
          </div>
        </div>

        {/* Barra de progresso da operação */}
        <div className="mb-6 p-4 bg-zinc-950/50 rounded-lg border border-yellow-900/40">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                Progresso da Operação Control
              </span>
              <div className="text-white font-black text-xl flex items-baseline gap-1.5 mt-0.5">
                {formataBRL(totalGeral)}
                <span className="text-xs text-yellow-400 font-medium">/ {formataBRL(META_OPERACAO)}</span>
              </div>
            </div>
            <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]">
              {progressoXP.toFixed(1)}<span className="text-xl">%</span>
            </span>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-4 border-2 border-zinc-800 overflow-hidden relative mb-1">
            <div
              className="bg-gradient-to-r from-yellow-500 to-yellow-300 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(250,204,21,0.5)] relative"
              style={{ width: `${progressoXP}%` }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
            Acumulado das Equipes A & B
          </p>
        </div>

        {/* Área de confronto */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0 flex-1 relative mb-5">

          {/* EQUIPE A */}
          <div className={`w-full md:flex-1 rounded-lg p-4 relative transition-all duration-500 ${
            liderA
              ? 'bg-blue-950/20 border-2 border-blue-600/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
              : 'bg-blue-950/5 border border-blue-900/20'
          }`}>
            {liderA && (
              <div className="absolute -top-5 -left-2 text-4xl animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] z-20 select-none">
                🏆
              </div>
            )}
            <div className="flex justify-between items-end mb-1">
              <span className={`font-black text-base uppercase tracking-wider ${liderA ? 'text-blue-300' : 'text-blue-500'}`}>
                Equipe A
              </span>
              <span className="text-white font-black text-xl">{formataBRL(totalA)}</span>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-1.5 mb-1 border border-zinc-800">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: totalA > 0 ? `${Math.min((totalA / META_OPERACAO) * 100, 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] text-blue-900 font-bold mb-1">
              {equipeA.filter(v => v.total_vendido > 0).length} vendedor{equipeA.filter(v => v.total_vendido > 0).length !== 1 ? 'es' : ''} ativo{equipeA.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
            </p>
            {renderPodio(equipeA, 'bg-blue-500')}
          </div>

          {/* VS central */}
          <div className="flex flex-col items-center justify-center mx-3 my-2 md:my-0 relative z-10">
            <div className="w-px h-16 md:h-full bg-zinc-800" />
            <div className="bg-zinc-950 border-2 border-zinc-700 rounded-full p-3 md:p-4 my-[-16px] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              <span className="text-3xl md:text-4xl font-black text-zinc-500 tracking-tighter italic">VS</span>
            </div>
            <div className="w-px h-16 md:h-full bg-zinc-800" />
          </div>

          {/* EQUIPE B */}
          <div className={`w-full md:flex-1 rounded-lg p-4 relative transition-all duration-500 ${
            liderB
              ? 'bg-red-950/20 border-2 border-red-600/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
              : 'bg-red-950/5 border border-red-900/20'
          }`}>
            {liderB && (
              <div className="absolute -top-5 -right-2 text-4xl animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] z-20 select-none">
                🏆
              </div>
            )}
            <div className="flex justify-between items-end mb-1">
              <span className="text-white font-black text-xl">{formataBRL(totalB)}</span>
              <span className={`font-black text-base uppercase tracking-wider ${liderB ? 'text-red-300' : 'text-red-500'}`}>
                Equipe B
              </span>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-1.5 mb-1 border border-zinc-800">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                style={{ width: totalB > 0 ? `${Math.min((totalB / META_OPERACAO) * 100, 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[10px] text-red-900 font-bold mb-1">
              {equipeB.filter(v => v.total_vendido > 0).length} vendedor{equipeB.filter(v => v.total_vendido > 0).length !== 1 ? 'es' : ''} ativo{equipeB.filter(v => v.total_vendido > 0).length !== 1 ? 's' : ''}
            </p>
            {renderPodio(equipeB, 'bg-red-500')}
          </div>
        </div>

        {/* Legenda de níveis */}
        <div className="mb-4 p-3 bg-zinc-950/40 rounded-lg border border-zinc-800/50">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2">Sistema de Patentes</p>
          <div className="flex flex-wrap gap-1.5">
            {PATENTES.map(p => (
              <span
                key={p.tier}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${p.corBg} ${p.corBorda} ${p.corTexto}`}
              >
                {p.icone} {p.nome}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-zinc-700 mt-1.5">A cada 5 vendas aprovadas sobe 1 nível • A cada 2 níveis avança de patente</p>
        </div>

        {/* Rodapé timer */}
        <div className="text-center text-zinc-600 text-xs pt-3 border-t border-zinc-800 uppercase tracking-widest font-bold">
          Tempo Tático até o Fim da Operação:{' '}
          <span className="text-white text-sm font-black">{tempoRestante}</span>
        </div>
      </div>

      {/* Modal de gerenciar equipes */}
      {modalEquipes && (
        <ModalGerenciarEquipes
          onClose={() => setModalEquipes(false)}
          onSalvo={() => {
            fetchRankingEDesafio();
          }}
        />
      )}
    </>
  );
}
