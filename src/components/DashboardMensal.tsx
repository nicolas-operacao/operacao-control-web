import { useMemo, useState, useRef } from 'react';
import { somClick, somHover } from '../services/hudSounds';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const BRT_MS = 3 * 60 * 60 * 1000;

type Venda = {
  sale_value: number;
  created_at: string;
  payment_method?: string;
  seller_name?: string;
};

interface Props {
  vendas: Venda[]; // aprovadas do mês selecionado (BRT filtrado externamente)
  mes: number;     // 0-indexed
  ano: number;
}

const METODO_ICONE: Record<string, string> = {
  PIX: '⚡',
  'Boleto Parcelado': '📄',
  'Cartão de Crédito (até 12x)': '💳',
  'Crédito à vista': '💳',
  'Débito à vista': '💳',
};

const METODO_COR: Record<string, string> = {
  PIX: 'bg-green-500',
  'Boleto Parcelado': 'bg-orange-500',
  'Cartão de Crédito (até 12x)': 'bg-blue-500',
  'Crédito à vista': 'bg-blue-400',
  'Débito à vista': 'bg-cyan-500',
};

type TooltipInfo = { dia: number; valor: number; count: number; x: number; y: number } | null;

export function DashboardMensal({ vendas, mes, ano }: Props) {
  const [chartMode, setChartMode] = useState<'valor' | 'count'>('valor');
  const [tooltip, setTooltip] = useState<TooltipInfo>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const { porDia, porMetodo, totalGeral, ticketMedio, melhorDia } = useMemo(() => {
    const getBRTDay = (iso: string) => {
      const d = new Date(new Date(iso).getTime() - BRT_MS);
      return d.getUTCDate();
    };

    // Por dia
    const porDia: { dia: number; valor: number; count: number }[] = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const vDia = vendas.filter(v => getBRTDay(v.created_at) === d);
      porDia.push({
        dia: d,
        valor: vDia.reduce((acc, v) => acc + Number(v.sale_value), 0),
        count: vDia.length,
      });
    }

    // Por método
    const metodosMap: Record<string, { count: number; valor: number }> = {};
    vendas.forEach(v => {
      const m = v.payment_method || 'Não informado';
      if (!metodosMap[m]) metodosMap[m] = { count: 0, valor: 0 };
      metodosMap[m].count++;
      metodosMap[m].valor += Number(v.sale_value);
    });
    const porMetodo = Object.entries(metodosMap)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.valor - a.valor);

    const totalGeral = vendas.reduce((acc, v) => acc + Number(v.sale_value), 0);
    const ticketMedio = vendas.length > 0 ? totalGeral / vendas.length : 0;

    // Melhor dia
    const melhorDia = porDia.reduce((best, d) => d.valor > best.valor ? d : best, { dia: 0, valor: 0, count: 0 });

    return { porDia, porMetodo, totalGeral, ticketMedio, melhorDia };
  }, [vendas, diasNoMes]);

  const maxValor = Math.max(...porDia.map(d => d.valor), 1);
  const maxCount = Math.max(...porDia.map(d => d.count), 1);
  const maxMetodoValor = Math.max(...porMetodo.map(m => m.valor), 1);

  if (vendas.length === 0) {
    return (
      <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-12 text-center">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">
          Nenhuma venda aprovada em {MESES[mes]} {ano}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.07)]">
          <div className="absolute top-0 right-0 text-green-500/5 text-8xl font-black leading-none">R$</div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Aprovado</p>
          <p className="text-2xl font-black text-green-400">{fmt(totalGeral)}</p>
          <p className="text-zinc-600 text-[10px] font-bold mt-1 uppercase">{vendas.length} vendas no mês</p>
        </div>
        <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.07)]">
          <div className="absolute top-0 right-0 text-yellow-500/5 text-8xl font-black leading-none">🔥</div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Melhor Dia</p>
          <p className="text-2xl font-black text-yellow-400">
            {melhorDia.valor > 0 ? `Dia ${melhorDia.dia}` : '--'}
          </p>
          <p className="text-zinc-600 text-[10px] font-bold mt-1 uppercase">
            {melhorDia.valor > 0 ? `${fmt(melhorDia.valor)} · ${melhorDia.count} venda${melhorDia.count !== 1 ? 's' : ''}` : 'sem dados'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.07)]">
          <div className="absolute top-0 right-0 text-blue-500/5 text-8xl font-black leading-none">Ø</div>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Médio</p>
          <p className="text-2xl font-black text-blue-400">{fmt(ticketMedio)}</p>
          <p className="text-zinc-600 text-[10px] font-bold mt-1 uppercase">por venda aprovada</p>
        </div>
      </div>

      {/* Gráfico de barras por dia */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            📊 Desempenho Diário — <span className="text-yellow-400">{MESES[mes]} {ano}</span>
          </h3>
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setChartMode('valor'); }}
              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${chartMode === 'valor' ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Valor
            </button>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setChartMode('count'); }}
              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${chartMode === 'count' ? 'bg-yellow-400 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Qtd
            </button>
          </div>
        </div>

        {/* Tooltip renderizado fora do overflow para não ser cortado */}
        {tooltip && (
          <div
            className="absolute bg-zinc-800 border border-zinc-600 rounded px-2.5 py-2 text-[9px] font-black whitespace-nowrap z-30 pointer-events-none shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
          >
            <span className="text-zinc-400 block">Dia {tooltip.dia}</span>
            <span className="text-yellow-400 block">{fmt(tooltip.valor)}</span>
            <span className="text-zinc-400 block">{tooltip.count} venda{tooltip.count !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="overflow-x-auto pb-1" ref={chartRef}>
          <div className="flex items-end gap-[3px] min-w-max" style={{ height: '120px' }}>
            {porDia.map(({ dia, valor, count }) => {
              const metric = chartMode === 'valor' ? valor : count;
              const maxMetric = chartMode === 'valor' ? maxValor : maxCount;
              const CHART_H = 100;
              const barPx = maxMetric > 0 && metric > 0
                ? Math.max(Math.round((metric / maxMetric) * CHART_H), 4)
                : 2;
              const hasData = metric > 0;
              const isBest = chartMode === 'valor'
                ? valor === melhorDia.valor && valor > 0
                : count === maxCount && count > 0;

              return (
                <div
                  key={dia}
                  className="flex flex-col items-center gap-1 w-8 flex-shrink-0 cursor-default"
                  onMouseEnter={hasData ? (e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const chartRect = chartRef.current!.getBoundingClientRect();
                    setTooltip({
                      dia, valor, count,
                      x: rect.left - chartRect.left + rect.width / 2,
                      y: rect.top - chartRect.top - 4,
                    });
                  } : undefined}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <div className="w-full flex items-end" style={{ height: CHART_H }}>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${
                        isBest
                          ? 'bg-yellow-400 shadow-[0_-4px_12px_rgba(250,204,21,0.4)]'
                          : hasData
                            ? 'bg-yellow-400/50 hover:bg-yellow-400'
                            : 'bg-zinc-800/40'
                      }`}
                      style={{ height: barPx }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${isBest ? 'text-yellow-400' : 'text-zinc-600'}`}>
                    {dia}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-zinc-700 text-[10px] font-bold mt-3 uppercase tracking-widest text-right">
          Passe o mouse nas barras para ver detalhes
        </p>
      </div>

      {/* Métodos de pagamento */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
          💳 Métodos de Pagamento
        </h3>
        <div className="space-y-4">
          {porMetodo.map(({ nome, count, valor }) => {
            const pct = (valor / maxMetodoValor) * 100;
            const pctTotal = totalGeral > 0 ? (valor / totalGeral) * 100 : 0;
            const icone = METODO_ICONE[nome] || '💰';
            const cor = METODO_COR[nome] || 'bg-zinc-500';

            return (
              <div key={nome}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{icone}</span>
                    <span className="text-zinc-200 text-xs font-black uppercase tracking-widest">{nome}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-zinc-500 text-[10px] font-bold">{count}x</span>
                    <span className="text-green-400 text-sm font-black">{fmt(valor)}</span>
                    <span className="text-zinc-600 text-[10px] font-bold w-10 text-right">{pctTotal.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${cor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
