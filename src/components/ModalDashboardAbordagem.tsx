import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

interface Missao {
  id: string;
  titulo: string;
  icone: string;
  meta: number;
}

interface RowRanking {
  user_id: string;
  user_name: string;
  abordagens: number;
  vendas: number;
  taxa: number;
  dias: number;
}

interface Props {
  missao: Missao;
  onClose: () => void;
}

export function ModalDashboardAbordagem({ missao, onClose }: Props) {
  const [ranking, setRanking] = useState<RowRanking[]>([]);
  const [dataFiltro, setDataFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<'ranking' | 'detalhes'>('ranking');

  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    carregar();
  }, [dataFiltro]);

  async function carregar() {
    setCarregando(true);
    try {
      const params = dataFiltro ? `?data=${dataFiltro}` : '';
      const res = await api.get(`/missions/${missao.id}/abordagem/dashboard${params}`);
      setRanking(res.data?.ranking ?? []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }

  const totalAbordagens = ranking.reduce((s, r) => s + r.abordagens, 0);
  const totalVendas     = ranking.reduce((s, r) => s + r.vendas, 0);
  const taxaGeral       = totalAbordagens > 0 ? Math.round((totalVendas / totalAbordagens) * 100) : 0;
  const melhorConversao = ranking.length > 0 ? [...ranking].sort((a, b) => b.taxa - a.taxa)[0] : null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{missao.icone}</span>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">📊 {missao.titulo}</h2>
              <p className="text-zinc-500 text-xs">Dashboard de Abordagens · Meta: {missao.meta}/dia</p>
            </div>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-xl font-bold">✕</button>
        </div>

        {/* Filtro de data + abas */}
        <div className="px-5 pt-4 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => { somClick(); setAba('ranking'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wide transition-all ${aba === 'ranking' ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              🏆 Ranking
            </button>
            <button
              onClick={() => { somClick(); setAba('detalhes'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wide transition-all ${aba === 'detalhes' ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              📋 Por Dia
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-zinc-600 text-[10px] uppercase font-black">Filtrar data</label>
            <input
              type="date"
              value={dataFiltro}
              onChange={e => setDataFiltro(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-500/60"
            />
            {dataFiltro && (
              <button onClick={() => setDataFiltro('')} className="text-zinc-500 hover:text-white text-xs">✕ Limpar</button>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-zinc-600 text-[9px] uppercase font-black tracking-widest">Total Abordagens</p>
            <p className="text-white font-black text-2xl">{totalAbordagens.toLocaleString('pt-BR')}</p>
            <p className="text-zinc-600 text-[9px]">{ranking.length} vendedor(es)</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-zinc-600 text-[9px] uppercase font-black tracking-widest">Vendas Fechadas</p>
            <p className="text-green-400 font-black text-2xl">{totalVendas}</p>
            <p className="text-zinc-600 text-[9px]">via abordagem</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${taxaGeral >= 10 ? 'bg-green-950/30' : taxaGeral >= 5 ? 'bg-yellow-950/30' : 'bg-zinc-900'}`}>
            <p className="text-zinc-600 text-[9px] uppercase font-black tracking-widest">Conversão Geral</p>
            <p className={`font-black text-2xl ${taxaGeral >= 10 ? 'text-green-400' : taxaGeral >= 5 ? 'text-yellow-400' : 'text-zinc-400'}`}>{taxaGeral}%</p>
            <p className="text-zinc-600 text-[9px]">abord. → venda</p>
          </div>
        </div>

        {melhorConversao && (
          <div className="px-5 pt-2">
            <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <span>🏅</span>
              <p className="text-yellow-400 text-xs font-black">
                Melhor conversão: <span className="text-white">{melhorConversao.user_name}</span> com {melhorConversao.taxa}%
                ({melhorConversao.vendas} vendas de {melhorConversao.abordagens} abordagens)
              </p>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando ? (
            <div className="text-center text-zinc-500 py-10 animate-pulse text-sm">Carregando dados...</div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-zinc-600 text-sm">Nenhum relatório registrado ainda.</p>
              <p className="text-zinc-700 text-xs mt-1">Os vendedores precisam registrar suas abordagens.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cabeçalho */}
              <div className="grid grid-cols-12 gap-2 px-3 text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Vendedor</div>
                <div className="col-span-2 text-center">Abord.</div>
                <div className="col-span-2 text-center">Vendas</div>
                <div className="col-span-2 text-center">Convers.</div>
                <div className="col-span-1 text-center">Dias</div>
              </div>

              {ranking.map((r, idx) => {
                const atingiu = r.abordagens >= missao.meta * (r.dias || 1);
                return (
                  <div
                    key={r.user_id}
                    className={`grid grid-cols-12 gap-2 items-center rounded-xl px-3 py-3 border transition-all ${
                      idx === 0 ? 'bg-yellow-950/15 border-yellow-800/30' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="col-span-1">
                      <span className="text-sm">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-zinc-600 font-black text-xs">{idx + 1}</span>}
                      </span>
                    </div>
                    <div className="col-span-4 min-w-0">
                      <p className="text-white text-xs font-black truncate">{r.user_name}</p>
                      {atingiu && <p className="text-green-400 text-[9px] font-black">✅ Meta atingida</p>}
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-white font-black text-sm">{r.abordagens.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-green-400 font-black text-sm">{r.vendas}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          r.taxa >= 10 ? 'bg-green-500/20 text-green-400' :
                          r.taxa >= 5  ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {r.taxa}%
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-zinc-500 text-xs">{r.dias}d</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); onClose(); }}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
