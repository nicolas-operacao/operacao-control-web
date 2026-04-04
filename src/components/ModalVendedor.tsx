import { useEffect, useState } from 'react';
import { api } from '../services/api';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type Periodo = { valor: number; count: number };
type BarData  = { label: string; valor: number; count: number };

type Stats = {
  hoje:  Periodo;
  semana: Periodo;
  mes:   Periodo;
  ultimos7dias:   BarData[];
  ultimos6meses:  BarData[];
};

type VendedorInfo = {
  id: string;
  nome: string;
  equipe: string;
  total_vendido: number;
  total_vendas_count: number;
  foto_url?: string;
  patente: string;
  patenteIcone: string;
  nivel: number;
};

interface ModalVendedorProps {
  vendedor: VendedorInfo;
  onClose: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formataBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── MINI GRÁFICO DE BARRAS ───────────────────────────────────────────────────

function BarChart({ dados, corBarra }: { dados: BarData[]; corBarra: string }) {
  const max = Math.max(...dados.map(d => d.valor), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {dados.map((d, i) => {
        const pct = (d.valor / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* tooltip */}
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] font-bold text-white whitespace-nowrap shadow-xl">
                {formataBRL(d.valor)}
                <span className="text-zinc-400 ml-1">({d.count} venda{d.count !== 1 ? 's' : ''})</span>
              </div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-700" />
            </div>

            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t transition-all duration-700 ${corBarra} ${d.valor === 0 ? 'opacity-20' : 'opacity-100'}`}
                style={{ height: `${Math.max(pct, d.valor > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-600 font-bold truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function ModalVendedor({ vendedor, onClose }: ModalVendedorProps) {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba]         = useState<'semana' | 'meses'>('semana');

  const iniciais = vendedor.nome
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isEquipeB = vendedor.equipe?.toUpperCase() === 'B';
  const corBarra  = isEquipeB ? 'bg-red-500'           : 'bg-blue-500';
  const corBorda  = isEquipeB ? 'border-red-700/40'    : 'border-blue-700/40';
  const corGlow   = isEquipeB ? 'shadow-[0_0_30px_rgba(239,68,68,0.12)]' : 'shadow-[0_0_30px_rgba(59,130,246,0.12)]';

  useEffect(() => {
    api.get(`/sellers/${vendedor.id}/stats`)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [vendedor.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-zinc-900 border ${corBorda} rounded-2xl w-full max-w-lg ${corGlow} flex flex-col overflow-hidden max-h-[90vh]`}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              {vendedor.foto_url ? (
                <img
                  src={vendedor.foto_url}
                  alt={vendedor.nome}
                  className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                  <span className="text-sm font-black text-zinc-400">{iniciais}</span>
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 text-base">
                {vendedor.patenteIcone}
              </span>
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight">{vendedor.nome}</p>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                {vendedor.patente} · Nv.{vendedor.nivel} · Equipe {vendedor.equipe?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors text-xl font-black leading-none"
          >
            ✕
          </button>
        </div>

        {/* ── Corpo ──────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">

          {/* Resumo geral */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { titulo: 'HOJE',       dado: stats?.hoje,   icone: '☀️' },
              { titulo: 'ESTA SEMANA',dado: stats?.semana, icone: '📅' },
              { titulo: 'ESTE MÊS',  dado: stats?.mes,    icone: '🗓️' },
            ].map(({ titulo, dado, icone }) => (
              <div key={titulo} className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex flex-col gap-1">
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-wider">{icone} {titulo}</p>
                {loading ? (
                  <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-green-400 font-black text-sm leading-tight">
                      {formataBRL(dado?.valor || 0)}
                    </p>
                    <p className="text-zinc-600 text-[10px] font-bold">
                      {dado?.count || 0} venda{(dado?.count || 0) !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Desempenho</p>
              <div className="flex gap-1">
                {(['semana', 'meses'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setAba(a)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all ${
                      aba === a
                        ? `${corBarra} text-white`
                        : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {a === 'semana' ? '7 dias' : '6 meses'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-24 flex items-end gap-1.5">
                {Array(7).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-zinc-800 rounded-t animate-pulse"
                    style={{ height: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            ) : stats ? (
              <BarChart
                dados={aba === 'semana' ? stats.ultimos7dias : stats.ultimos6meses}
                corBarra={corBarra}
              />
            ) : (
              <p className="text-zinc-600 text-xs text-center py-8">Sem dados disponíveis</p>
            )}
          </div>

          {/* Estatísticas históricas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 font-black uppercase tracking-wider mb-1">💰 Total acumulado (mês)</p>
              <p className="text-white font-black text-base">{formataBRL(vendedor.total_vendido)}</p>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 font-black uppercase tracking-wider mb-1">🏅 Vendas aprovadas (total)</p>
              <p className="text-white font-black text-base">{vendedor.total_vendas_count}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
