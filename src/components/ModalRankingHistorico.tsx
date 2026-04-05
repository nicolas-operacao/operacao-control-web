import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

type Seller = {
  id: string;
  nome: string;
  equipe: string;
  foto_url?: string;
  meta_mensal?: number;
  total_vendido: number;
  total_vendas_count: number;
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalRankingHistorico({ isOpen, onClose }: Props) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()); // 0-indexed
  const [ranking, setRanking] = useState<Seller[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  useEffect(() => {
    if (isOpen) fetchRanking();
  }, [isOpen, ano, mes]);

  async function fetchRanking() {
    setCarregando(true);
    setErro('');
    try {
      const res = await api.get(`/ranking/historico?ano=${ano}&mes=${mes}`);
      setRanking(Array.isArray(res.data) ? res.data : []);
    } catch {
      setErro('Erro ao carregar ranking histórico.');
    } finally {
      setCarregando(false);
    }
  }

  function navMes(delta: number) {
    somClick();
    let m = mes + delta;
    let a = ano;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    // Não permite ir para o futuro
    if (a > hoje.getFullYear() || (a === hoje.getFullYear() && m > hoje.getMonth())) return;
    setMes(m);
    setAno(a);
  }

  const equipeA = ranking.filter(s => (s.equipe || '').toUpperCase() === 'A');
  const equipeB = ranking.filter(s => (s.equipe || '').toUpperCase() === 'B');
  const totalA = equipeA.reduce((acc, s) => acc + s.total_vendido, 0);
  const totalB = equipeB.reduce((acc, s) => acc + s.total_vendido, 0);
  const vencedora = totalA > totalB ? 'A' : totalB > totalA ? 'B' : null;
  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

  if (!isOpen) return null;

  const POSICAO_ICONE = ['🥇', '🥈', '🥉'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">📜 Ranking Histórico</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Desempenho por período</p>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl font-bold transition-colors">✕</button>
        </div>

        {/* Navegador de mês */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-4">
          <button
            onMouseEnter={somHover}
            onClick={() => navMes(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all text-lg font-bold"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-white font-black text-lg uppercase tracking-wider">
              {MESES[mes]} {ano}
            </p>
            {isMesAtual && (
              <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                Mês Atual
              </span>
            )}
          </div>
          <button
            onMouseEnter={somHover}
            onClick={() => navMes(1)}
            disabled={isMesAtual}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-all text-lg font-bold"
          >
            ›
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {erro && (
            <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-lg p-3 text-sm">{erro}</div>
          )}

          {carregando ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse h-14 bg-zinc-800/60 rounded-xl" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">Nenhuma venda registrada neste período.</p>
            </div>
          ) : (
            <>
              {/* Placar geral das equipes */}
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className={`rounded-xl border p-3 text-center ${vencedora === 'A' ? 'bg-blue-950/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-zinc-900 border-zinc-800'}`}>
                  <p className="text-zinc-500 text-[10px] font-black uppercase">Equipe A ⚡</p>
                  <p className={`text-xl font-black mt-1 ${vencedora === 'A' ? 'text-blue-400' : 'text-zinc-300'}`}>{fmt(totalA)}</p>
                  {vencedora === 'A' && <p className="text-[10px] text-blue-400 font-black mt-0.5">🏆 Vencedora</p>}
                </div>
                <div className="flex items-center justify-center">
                  <div className={`text-2xl font-black rounded-full w-10 h-10 flex items-center justify-center border ${
                    vencedora === 'A' ? 'border-blue-500/50 text-blue-400' : vencedora === 'B' ? 'border-red-500/50 text-red-400' : 'border-zinc-700 text-zinc-500'
                  }`}>VS</div>
                </div>
                <div className={`rounded-xl border p-3 text-center ${vencedora === 'B' ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-900 border-zinc-800'}`}>
                  <p className="text-zinc-500 text-[10px] font-black uppercase">Equipe B 🔴</p>
                  <p className={`text-xl font-black mt-1 ${vencedora === 'B' ? 'text-red-400' : 'text-zinc-300'}`}>{fmt(totalB)}</p>
                  {vencedora === 'B' && <p className="text-[10px] text-red-400 font-black mt-0.5">🏆 Vencedora</p>}
                </div>
              </div>

              {/* Ranking individual */}
              <div className="space-y-2">
                {ranking.map((seller, idx) => {
                  const isB = (seller.equipe || '').toUpperCase() === 'B';
                  const iniciais = seller.nome.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
                  const metaAtingida = seller.meta_mensal && seller.total_vendas_count >= seller.meta_mensal;
                  const pctMeta = seller.meta_mensal ? Math.min((seller.total_vendas_count / seller.meta_mensal) * 100, 100) : null;

                  return (
                    <div
                      key={seller.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                        idx === 0
                          ? 'bg-yellow-950/20 border-yellow-400/30 shadow-[0_0_12px_rgba(250,204,21,0.1)]'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      {/* Posição */}
                      <div className="w-8 flex-shrink-0 text-center">
                        {idx < 3 ? (
                          <span className="text-xl">{POSICAO_ICONE[idx]}</span>
                        ) : (
                          <span className="text-zinc-600 font-black text-sm">#{idx + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      {seller.foto_url ? (
                        <img src={seller.foto_url} alt={seller.nome} className={`w-9 h-9 rounded-full object-cover border-2 flex-shrink-0 ${isB ? 'border-red-600' : 'border-blue-600'}`} />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xs font-black ${isB ? 'bg-red-950 border-red-700 text-red-300' : 'bg-blue-950 border-blue-700 text-blue-300'}`}>
                          {iniciais}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate">{seller.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-black ${isB ? 'text-red-400' : 'text-blue-400'}`}>
                            {isB ? '🔴 B' : '⚡ A'}
                          </span>
                          <span className="text-zinc-600 text-[10px]">{seller.total_vendas_count} venda{seller.total_vendas_count !== 1 ? 's' : ''}</span>
                          {metaAtingida && <span className="text-[10px] text-green-400">✅ Meta</span>}
                        </div>
                        {pctMeta !== null && (
                          <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden w-24">
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{ width: `${pctMeta}%`, background: metaAtingida ? '#22c55e' : isB ? '#ef4444' : '#3b82f6' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Valor */}
                      <div className="text-right flex-shrink-0">
                        <p className={`font-black text-sm ${idx === 0 ? 'text-yellow-400' : 'text-zinc-200'}`}>
                          {fmt(seller.total_vendido)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 text-right">
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
