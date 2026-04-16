import { useMemo, useState } from 'react';
import { somClick, somHover } from '../services/hudSounds';

type Venda = {
  id: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_id?: string | number;
  customer_name?: string;
  product_name?: string;
  payment_method?: string;
};

interface Props {
  titulo: string;
  periodo: 'hoje' | 'semana' | 'mes';
  vendas: Venda[];
  onClose: () => void;
  onEditVenda?: (venda: Venda) => void;
  onDeleteVenda?: (venda: Venda) => void;
}

const METODO_COR: Record<string, string> = {
  'PIX':              '#22c55e',
  'Cartão de Crédito':'#3b82f6',
  'Cartão de Débito': '#6366f1',
  'Boleto Parcelado': '#f59e0b',
  'Boleto':           '#f59e0b',
  'Transferência':    '#8b5cf6',
};

const METODO_ICONE: Record<string, string> = {
  'PIX':              '⚡',
  'Cartão de Crédito':'💳',
  'Cartão de Débito': '💳',
  'Boleto Parcelado': '📄',
  'Boleto':           '📄',
  'Transferência':    '🏦',
};

function corDoMetodo(m: string) {
  for (const [key, cor] of Object.entries(METODO_COR)) {
    if (m.toLowerCase().includes(key.toLowerCase())) return cor;
  }
  return '#71717a';
}
function iconeDoMetodo(m: string) {
  for (const [key, ic] of Object.entries(METODO_ICONE)) {
    if (m.toLowerCase().includes(key.toLowerCase())) return ic;
  }
  return '💰';
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const BRT_MS = 3 * 60 * 60 * 1000;
const toBRT = (iso: string) => new Date(new Date(iso).getTime() - BRT_MS);

export function ModalEstatisticasPeriodo({ titulo, periodo, vendas, onClose, onEditVenda, onDeleteVenda }: Props) {
  // semanaOffset: 0 = semana atual, -1 = semana passada, etc.
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const aprovadas = useMemo(() => vendas.filter(v => v.status === 'aprovada'), [vendas]);

  // Calcula o range da semana selecionada (domingo a sábado do offset)
  const semanaRange = useMemo(() => {
    if (periodo !== 'semana') return null;
    const now = new Date(Date.now() - BRT_MS);
    // Início da semana atual (domingo)
    const dow = now.getUTCDay(); // 0=dom...6=sáb
    const inicioSemanaAtual = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
    const inicio = new Date(inicioSemanaAtual.getTime() + semanaOffset * 7 * 86400000);
    const fim = new Date(inicio.getTime() + 6 * 86400000);
    return { inicio, fim };
  }, [periodo, semanaOffset]);

  // Aprovadas filtradas pela semana (quando periodo === 'semana')
  const aprovadasPeriodo = useMemo(() => {
    if (periodo !== 'semana' || !semanaRange) return aprovadas;
    return aprovadas.filter(v => {
      const d = toBRT(v.created_at);
      const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      return t >= semanaRange.inicio.getTime() && t <= semanaRange.fim.getTime();
    });
  }, [aprovadas, periodo, semanaRange]);

  const kpis = useMemo(() => {
    const src = periodo === 'semana' ? aprovadasPeriodo : aprovadas;
    const total = src.reduce((a, v) => a + Number(v.sale_value), 0);
    const count = src.length;
    const ticket = count > 0 ? total / count : 0;
    return { total, count, ticket };
  }, [aprovadas, aprovadasPeriodo, periodo]);

  // ── Barras por período ──────────────────────────────────────────────
  const barras = useMemo(() => {
    const nomesDia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const now = new Date(Date.now() - BRT_MS);

    if (periodo === 'hoje') {
      const buckets = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, '0')}h`,
        valor: 0, count: 0, vendas: [] as Venda[],
      }));
      aprovadas.forEach(v => {
        const d = toBRT(v.created_at);
        const h = d.getUTCHours();
        buckets[h].valor += Number(v.sale_value);
        buckets[h].count++;
        buckets[h].vendas.push(v);
      });
      const horaAtual = now.getUTCHours();
      return buckets.slice(6, horaAtual + 1);
    }

    if (periodo === 'semana') {
      if (!semanaRange) return [];
      return Array.from({ length: 7 }, (_, i) => {
        const ref = new Date(semanaRange.inicio.getTime() + i * 86400000);
        const y = ref.getUTCFullYear(), m = ref.getUTCMonth(), d = ref.getUTCDate();
        const lista = aprovadas.filter(v => {
          const b = toBRT(v.created_at);
          return b.getUTCFullYear() === y && b.getUTCMonth() === m && b.getUTCDate() === d;
        });
        return {
          label: `${nomesDia[ref.getUTCDay()]} ${String(d).padStart(2,'0')}`,
          valor: lista.reduce((a, v) => a + Number(v.sale_value), 0),
          count: lista.length,
          vendas: lista,
        };
      });
    }

    // mes → dias do mês atual
    const diasNoMes = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    return Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const lista = aprovadas.filter(v => {
        const b = toBRT(v.created_at);
        return b.getUTCFullYear() === now.getUTCFullYear()
          && b.getUTCMonth() === now.getUTCMonth()
          && b.getUTCDate() === dia;
      });
      return {
        label: String(dia).padStart(2, '0'),
        valor: lista.reduce((a, v) => a + Number(v.sale_value), 0),
        count: lista.length,
        vendas: lista,
      };
    });
  }, [aprovadas, periodo, semanaRange]);

  const maxBarra = Math.max(...barras.map(b => b.valor), 1);
  const CHART_H = 72;

  // ── Métodos de pagamento ────────────────────────────────────────────
  const metodos = useMemo(() => {
    const src = periodo === 'semana' ? aprovadasPeriodo : aprovadas;
    const mapa: Record<string, { valor: number; count: number }> = {};
    src.forEach(v => {
      const m = v.payment_method || 'Outros';
      if (!mapa[m]) mapa[m] = { valor: 0, count: 0 };
      mapa[m].valor += Number(v.sale_value);
      mapa[m].count++;
    });
    const src2 = periodo === 'semana' ? aprovadasPeriodo : aprovadas;
    const total = src2.reduce((a, v) => a + Number(v.sale_value), 0) || 1;
    return Object.entries(mapa)
      .map(([nome, d]) => ({ nome, ...d, pct: (d.valor / total) * 100 }))
      .sort((a, b) => b.valor - a.valor);
  }, [aprovadas, aprovadasPeriodo, periodo]);

  // ── Top vendedores ──────────────────────────────────────────────────
  const topVendedores = useMemo(() => {
    const src = periodo === 'semana' ? aprovadasPeriodo : aprovadas;
    const mapa: Record<string, { valor: number; count: number }> = {};
    src.forEach(v => {
      const nome = v.seller_name || 'Desconhecido';
      if (!mapa[nome]) mapa[nome] = { valor: 0, count: 0 };
      mapa[nome].valor += Number(v.sale_value);
      mapa[nome].count++;
    });
    return Object.entries(mapa)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [aprovadas, aprovadasPeriodo, periodo]);

  // ── Vendas recentes (últimas 5) ─────────────────────────────────────
  const recentes = useMemo(() => {
    const src = periodo === 'semana' ? aprovadasPeriodo : aprovadas;
    return [...src].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5);
  }, [aprovadas, aprovadasPeriodo, periodo]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(250,204,21,0.06)]">

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                {periodo === 'hoje' ? '⚡' : periodo === 'semana' ? '📅' : '🗓️'}
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-sm sm:text-base uppercase tracking-wider leading-tight truncate">{titulo}</h2>
                <p className="text-zinc-600 text-[9px] sm:text-[10px] font-bold uppercase">
                  {kpis.count} venda{kpis.count !== 1 ? 's' : ''} aprovada{kpis.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); onClose(); }}
              className="text-zinc-600 hover:text-white text-xl font-black transition-colors w-8 h-8 flex items-center justify-center flex-shrink-0"
            >✕</button>
          </div>
          {/* Navegação de semanas — abaixo do título no mobile */}
          {periodo === 'semana' && semanaRange && (() => {
            const fmtDia = (d: Date) => `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
            return (
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 mt-2.5 w-fit">
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); setSemanaOffset(o => o - 1); setSelectedBarIndex(null); }}
                  className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded-lg transition-all font-black text-sm"
                >←</button>
                <span className="text-zinc-300 text-[10px] font-black uppercase tracking-wider px-1 whitespace-nowrap">
                  {fmtDia(semanaRange.inicio)} – {fmtDia(semanaRange.fim)}
                </span>
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); setSemanaOffset(o => Math.min(o + 1, 0)); setSelectedBarIndex(null); }}
                  disabled={semanaOffset >= 0}
                  className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded-lg transition-all font-black text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >→</button>
              </div>
            );
          })()}
        </div>

        {/* Body scrollável */}
        <div className="overflow-y-auto flex-1 p-4 md:p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Aprovado', valor: fmt(kpis.total), destaque: true },
              { label: 'Qtd. Vendas',    valor: String(kpis.count), destaque: false },
              { label: 'Ticket Médio',   valor: fmt(kpis.ticket), destaque: false },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border p-2.5 sm:p-3 md:p-4 ${k.destaque ? 'bg-yellow-950/20 border-yellow-400/30' : 'bg-zinc-900 border-zinc-800'}`}>
                <p className="text-zinc-500 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1 leading-tight">{k.label}</p>
                <p className={`font-black text-xs sm:text-base md:text-xl leading-tight truncate ${k.destaque ? 'text-yellow-400' : 'text-white'}`}>{k.valor}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de barras */}
          {barras.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4">
                {periodo === 'hoje' ? '⏱ Por Hora' : periodo === 'semana' ? '📆 Por Dia' : '📆 Por Dia do Mês'}
                {selectedBarIndex !== null && (
                  <button
                    onClick={() => setSelectedBarIndex(null)}
                    className="ml-3 text-yellow-400 hover:text-white transition-colors normal-case"
                  >✕ fechar</button>
                )}
              </p>
              <div className="w-full overflow-x-auto">
              <div className="flex items-end gap-1 pb-1" style={{ minWidth: '100%', paddingTop: 48 }}>
                {barras.map((b, i) => {
                  const barPx = b.valor > 0 ? Math.max(Math.round((b.valor / maxBarra) * CHART_H), 5) : 2;
                  const isBest = b.valor === maxBarra && b.valor > 0;
                  const isSelected = selectedBarIndex === i;
                  const hasVendas = b.count > 0;
                  const isLast = i >= barras.length - 2;
                  const isFirst = i <= 1;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center gap-1 group relative ${hasVendas ? 'cursor-pointer' : ''}`}
                      style={{ minWidth: periodo === 'mes' ? 18 : 28, flex: 1 }}
                      onClick={() => { if (hasVendas) { somClick(); setSelectedBarIndex(isSelected ? null : i); } }}
                    >
                      {/* Tooltip — posição ajustada nas extremidades para não sair da tela */}
                      <div
                        className={`absolute hidden group-hover:flex flex-col items-center z-50 pointer-events-none ${isLast ? 'right-0' : isFirst ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}
                        style={{ bottom: barPx + 6 }}
                      >
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-bold text-white whitespace-nowrap shadow-xl">
                          {fmt(b.valor)}
                          {b.count > 0 && <span className="text-zinc-400 ml-1">({b.count})</span>}
                        </div>
                        <div className={`w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-700 ${isLast ? 'self-end mr-2' : isFirst ? 'self-start ml-2' : ''}`} />
                      </div>

                      <div className="w-full flex items-end justify-center" style={{ height: CHART_H }}>
                        <div
                          className="w-full rounded-t transition-all duration-300"
                          style={{
                            height: barPx,
                            background: isSelected
                              ? 'linear-gradient(180deg, #fff, #a1a1aa)'
                              : isBest
                              ? 'linear-gradient(180deg, #facc15, #ca8a04)'
                              : b.valor > 0 ? '#3f3f46' : '#27272a',
                            boxShadow: isSelected
                              ? '0 0 8px rgba(255,255,255,0.3)'
                              : isBest ? '0 0 8px rgba(250,204,21,0.4)' : undefined,
                            opacity: b.valor === 0 ? 0.3 : 1,
                          }}
                        />
                      </div>
                      <span className={`text-[8px] font-bold truncate w-full text-center ${isSelected ? 'text-white' : 'text-zinc-600'}`}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
              </div>

              {/* Painel drill-down: vendas do dia/hora selecionado */}
              {selectedBarIndex !== null && barras[selectedBarIndex] && (() => {
                const barra = barras[selectedBarIndex];
                const vendasDia = [...barra.vendas].sort((a, b2) =>
                  new Date(b2.created_at).getTime() - new Date(a.created_at).getTime()
                );
                return (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="text-white text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="text-yellow-400">{barra.label}</span>
                      <span className="text-zinc-600">—</span>
                      <span>{vendasDia.length} venda{vendasDia.length !== 1 ? 's' : ''}</span>
                      <span className="text-yellow-400 ml-auto">{fmt(barra.valor)}</span>
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {vendasDia.map(v => {
                        const isCheckout = !v.seller_id || String(v.seller_id) === '' || String(v.seller_id) === 'null';
                        const hora = toBRT(v.created_at);
                        const horaStr = `${String(hora.getUTCHours()).padStart(2,'0')}:${String(hora.getUTCMinutes()).padStart(2,'0')}`;
                        return (
                          <div key={v.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                            {/* Avatar inicial vendedor */}
                            <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-black text-zinc-300">
                                {isCheckout ? '🛒' : (v.seller_name ?? '?').split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Linha 1: vendedor + horário */}
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-zinc-200 text-xs font-black truncate">
                                  {isCheckout ? 'Checkout' : (v.seller_name ?? 'Desconhecido')}
                                </span>
                                <span className="text-zinc-600 text-[10px] font-bold flex-shrink-0">{horaStr}</span>
                              </div>
                              {/* Linha 2: cliente */}
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-zinc-500 text-[10px]">👤</span>
                                <span className="text-zinc-400 text-[10px] truncate">{v.customer_name ?? '—'}</span>
                              </div>
                              {/* Linha 3: produto + método */}
                              <div className="flex items-center gap-1">
                                <span className="text-zinc-600 text-[10px] truncate">{v.product_name}</span>
                                {v.payment_method && (
                                  <>
                                    <span className="text-zinc-700 text-[10px]">·</span>
                                    <span className="text-[10px]" style={{ color: corDoMetodo(v.payment_method) }}>{iconeDoMetodo(v.payment_method)} {v.payment_method}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-green-400 font-black text-xs">{fmt(Number(v.sale_value))}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Métodos de pagamento */}
            {metodos.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">💳 Métodos</p>
                <div className="space-y-2.5">
                  {metodos.map(m => (
                    <div key={m.nome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs font-bold flex items-center gap-1.5">
                          <span>{iconeDoMetodo(m.nome)}</span>
                          <span className="truncate max-w-[110px]">{m.nome}</span>
                        </span>
                        <span className="text-zinc-500 text-[10px] font-bold">{fmt(m.valor)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${m.pct}%`, background: corDoMetodo(m.nome) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top vendedores */}
            {topVendedores.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">🏆 Top Vendedores</p>
                <div className="space-y-2">
                  {topVendedores.map((v, i) => {
                    const iniciais = v.nome.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
                    const ICONES = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                    return (
                      <div key={v.nome} className="flex items-center gap-2">
                        <span className="text-base w-5 flex-shrink-0">{ICONES[i]}</span>
                        <div className="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black text-zinc-300">{iniciais}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 text-xs font-bold truncate">{v.nome}</p>
                          <p className="text-zinc-600 text-[10px]">{v.count} venda{v.count !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-yellow-400 font-black text-xs flex-shrink-0">{fmt(v.valor)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Últimas vendas */}
          {recentes.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">🕒 Últimas Vendas</p>
              <div className="space-y-2">
                {recentes.map(v => {
                  const isCheckout = !v.seller_id || String(v.seller_id) === '' || String(v.seller_id) === 'null';
                  return (
                    <div key={v.id} className="flex items-center gap-3 py-1.5 border-b border-zinc-800 last:border-0 rounded-lg px-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-zinc-200 text-xs font-bold truncate">{v.customer_name}</p>
                          {isCheckout && <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-1 py-0.5 rounded uppercase">sem vendedor</span>}
                        </div>
                        <p className="text-zinc-600 text-[10px] truncate">{v.product_name} · {isCheckout ? 'CHECKOUT' : v.seller_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                        <div>
                          <p className="text-green-400 font-black text-xs">{fmt(Number(v.sale_value))}</p>
                          <p className="text-zinc-700 text-[10px]">{v.payment_method}</p>
                        </div>
                        {onEditVenda && (
                          <button onClick={() => { somClick(); onEditVenda(v); }} className="text-zinc-500 hover:text-blue-400 transition-colors p-1" title="Editar">✏️</button>
                        )}
                        {onDeleteVenda && (
                          <button onClick={() => { somClick(); onDeleteVenda(v); }} className="text-zinc-500 hover:text-red-400 transition-colors p-1" title="Excluir">🗑️</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {kpis.count === 0 && (
            <div className="text-center py-12 text-zinc-600">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-black uppercase tracking-wider">Nenhuma venda neste período</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
