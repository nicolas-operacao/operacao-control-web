import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

type Venda = {
  id: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_id?: string | number | null;
  seller_name?: string;
};

const BRT_MS = 3 * 60 * 60 * 1000;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function brtDate(iso: string) {
  return new Date(new Date(iso).getTime() - BRT_MS);
}
function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate();
}
function isCheckout(v: Venda) {
  return v.seller_id == null || String(v.seller_id) === '' || String(v.seller_id) === 'null';
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-zinc-600 text-[10px]">—</span>;
  const pos = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${pos ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
      {pos ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

type TooltipData = {
  dia: number;
  vA: number; qA: number;
  vB: number; qB: number;
  x: number; y: number;
};

function GraficoPorDia({
  diaAtual, diaAnterior, maxDias, maxDiaValor, maxDiaQtd,
  aba, mesAtualLabel, mesAntLabel, mesCurto, mesAntCurto,
}: {
  diaAtual: Record<number, { valor: number; qtd: number }>;
  diaAnterior: Record<number, { valor: number; qtd: number }>;
  maxDias: number; maxDiaValor: number; maxDiaQtd: number;
  aba: 'valor' | 'qtd';
  mesAtualLabel: string; mesAntLabel: string;
  mesCurto: string; mesAntCurto: string;
}) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleEnter(e: React.MouseEvent, dia: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    setTooltip({
      dia,
      vA: diaAtual[dia]?.valor ?? 0,
      qA: diaAtual[dia]?.qtd ?? 0,
      vB: diaAnterior[dia]?.valor ?? 0,
      qB: diaAnterior[dia]?.qtd ?? 0,
      x: rect.left - container.left + rect.width / 2,
      y: rect.top - container.top,
    });
  }

  const t = tooltip;
  const dV = t && t.vB > 0 ? ((t.vA - t.vB) / t.vB) * 100 : null;
  const dQ = t && t.qB > 0 ? ((t.qA - t.qB) / t.qB) * 100 : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">📊 Por Dia</p>
        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> atual &gt; anterior</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> atual &lt; anterior</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-600 inline-block" /> {mesAntCurto}</span>
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-x-auto">
        <div className="flex gap-1 items-end pb-6" style={{ minWidth: `${maxDias * 28}px` }}>
          {Array.from({ length: maxDias }, (_, i) => {
            const dia = i + 1;
            const vA = aba === 'valor' ? (diaAtual[dia]?.valor ?? 0) : (diaAtual[dia]?.qtd ?? 0);
            const vB = aba === 'valor' ? (diaAnterior[dia]?.valor ?? 0) : (diaAnterior[dia]?.qtd ?? 0);
            const maxV = aba === 'valor' ? maxDiaValor : maxDiaQtd;
            const hA = maxV > 0 ? Math.max((vA / maxV) * 100, vA > 0 ? 4 : 0) : 0;
            const hB = maxV > 0 ? Math.max((vB / maxV) * 100, vB > 0 ? 4 : 0) : 0;
            const isActive = tooltip?.dia === dia;
            return (
              <div
                key={dia}
                className="flex flex-col items-center gap-0.5 cursor-pointer group"
                style={{ width: '24px' }}
                onMouseEnter={e => handleEnter(e, dia)}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className={`flex items-end gap-px w-full transition-opacity ${tooltip && !isActive ? 'opacity-40' : 'opacity-100'}`} style={{ height: '100px' }}>
                  <div className="flex-1 bg-zinc-600 rounded-t transition-all duration-300 group-hover:bg-zinc-400" style={{ height: `${hB}%` }} />
                  <div
                    className={`flex-1 rounded-t transition-all duration-300 ${vA > vB ? 'bg-yellow-400 group-hover:bg-yellow-300' : vA > 0 ? 'bg-orange-400 group-hover:bg-orange-300' : 'bg-zinc-800'}`}
                    style={{ height: `${hA}%` }}
                  />
                </div>
                <span className={`text-[8px] leading-none transition-colors ${isActive ? 'text-yellow-400 font-black' : 'text-zinc-700'}`}>{dia}</span>
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {t && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: Math.min(t.x, (maxDias * 28) - 160),
              top: Math.max(t.y - 180, 0),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-3 w-52 text-xs">
              <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-2">
                <span className="font-black text-white text-sm">Dia {t.dia}</span>
                {dV !== null && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dV >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {dV >= 0 ? '▲' : '▼'} {Math.abs(dV).toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Mês atual */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block flex-shrink-0" />
                  <span className="text-yellow-400 font-black text-[10px] uppercase tracking-wide truncate">{mesAtualLabel}</span>
                </div>
                <div className="pl-3.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Valor</span>
                    <span className="text-white font-black">{t.vA > 0 ? fmt(t.vA) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vendas</span>
                    <span className="text-zinc-300 font-bold">{t.qA > 0 ? `${t.qA} venda${t.qA > 1 ? 's' : ''}` : '—'}</span>
                  </div>
                  {t.qA > 0 && t.vA > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Ticket médio</span>
                      <span className="text-zinc-400">{fmt(t.vA / t.qA)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-zinc-800 my-2" />

              {/* Mês anterior */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-sm bg-zinc-600 inline-block flex-shrink-0" />
                  <span className="text-zinc-400 font-black text-[10px] uppercase tracking-wide truncate">{mesAntLabel}</span>
                </div>
                <div className="pl-3.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Valor</span>
                    <span className="text-zinc-300 font-bold">{t.vB > 0 ? fmt(t.vB) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vendas</span>
                    <span className="text-zinc-400">{t.qB > 0 ? `${t.qB} venda${t.qB > 1 ? 's' : ''}` : '—'}</span>
                  </div>
                  {t.qB > 0 && t.vB > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Ticket médio</span>
                      <span className="text-zinc-500">{fmt(t.vB / t.qB)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Diferença de quantidade */}
              {dQ !== null && (
                <div className="border-t border-zinc-800 pt-2 flex justify-between">
                  <span className="text-zinc-500">Δ Qtd vendas</span>
                  <span className={`font-black text-[10px] ${dQ >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {dQ >= 0 ? '▲' : '▼'} {Math.abs(dQ).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Comparativo() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'valor' | 'qtd'>('valor');

  const [refMes, setRefMes] = useState(() => {
    const n = new Date();
    return { mes: n.getMonth(), ano: n.getFullYear() };
  });

  const navMes = (delta: number) => setRefMes(prev => {
    let m = prev.mes + delta, a = prev.ano;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    return { mes: m, ano: a };
  });

  const isCurrentMonth = refMes.mes === new Date().getMonth() && refMes.ano === new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    api.get('/sales').then(r => setVendas(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const aprovadas = useMemo(() => vendas.filter(v => v.status === 'aprovada' && v.created_at), [vendas]);

  const mesAnt = useMemo(() => {
    let m = refMes.mes - 1, a = refMes.ano;
    if (m < 0) { m = 11; a--; }
    return { mes: m, ano: a };
  }, [refMes]);

  function doMes(ano: number, mes: number) {
    return aprovadas.filter(v => {
      const d = brtDate(v.created_at);
      return d.getUTCFullYear() === ano && d.getUTCMonth() === mes;
    });
  }

  const atual = useMemo(() => doMes(refMes.ano, refMes.mes), [aprovadas, refMes]);
  const anterior = useMemo(() => doMes(mesAnt.ano, mesAnt.mes), [aprovadas, mesAnt]);

  // KPIs globais
  const totalAtual = atual.reduce((s, v) => s + Number(v.sale_value), 0);
  const totalAnterior = anterior.reduce((s, v) => s + Number(v.sale_value), 0);
  const qtdAtual = atual.length;
  const qtdAnterior = anterior.length;
  const diffValor = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : null;
  const diffQtd = qtdAnterior > 0 ? ((qtdAtual - qtdAnterior) / qtdAnterior) * 100 : null;

  // KPIs de equipes (sem checkout)
  const equipeAtual = atual.filter(v => !isCheckout(v));
  const equipeAnterior = anterior.filter(v => !isCheckout(v));
  const totalEquipeAtual = equipeAtual.reduce((s, v) => s + Number(v.sale_value), 0);
  const totalEquipeAnterior = equipeAnterior.reduce((s, v) => s + Number(v.sale_value), 0);
  const diffEquipe = totalEquipeAnterior > 0 ? ((totalEquipeAtual - totalEquipeAnterior) / totalEquipeAnterior) * 100 : null;

  // KPIs de checkout
  const chkAtual = atual.filter(v => isCheckout(v));
  const chkAnterior = anterior.filter(v => isCheckout(v));
  const totalChkAtual = chkAtual.reduce((s, v) => s + Number(v.sale_value), 0);
  const totalChkAnterior = chkAnterior.reduce((s, v) => s + Number(v.sale_value), 0);
  const diffChk = totalChkAnterior > 0 ? ((totalChkAtual - totalChkAnterior) / totalChkAnterior) * 100 : null;

  // Ticket médio
  const ticketAtual = qtdAtual > 0 ? totalAtual / qtdAtual : 0;
  const ticketAnterior = qtdAnterior > 0 ? totalAnterior / qtdAnterior : 0;
  const diffTicket = ticketAnterior > 0 ? ((ticketAtual - ticketAnterior) / ticketAnterior) * 100 : null;

  // Por dia
  function porDia(lista: Venda[], ano: number, mes: number) {
    const total = diasNoMes(ano, mes);
    const map: Record<number, { valor: number; qtd: number }> = {};
    for (let d = 1; d <= total; d++) map[d] = { valor: 0, qtd: 0 };
    lista.forEach(v => {
      const d = brtDate(v.created_at).getUTCDate();
      if (map[d]) { map[d].valor += Number(v.sale_value); map[d].qtd++; }
    });
    return map;
  }

  const diaAtual = useMemo(() => porDia(atual, refMes.ano, refMes.mes), [atual, refMes]);
  const diaAnterior = useMemo(() => porDia(anterior, mesAnt.ano, mesAnt.mes), [anterior, mesAnt]);
  const totalDiasAtual = diasNoMes(refMes.ano, refMes.mes);
  const totalDiasAnterior = diasNoMes(mesAnt.ano, mesAnt.mes);
  const maxDias = Math.max(totalDiasAtual, totalDiasAnterior);

  // Por semana (S1-S5)
  const SEMANAS = [
    { label: 'S1', range: '1–7',   from: 1,  to: 7  },
    { label: 'S2', range: '8–14',  from: 8,  to: 14 },
    { label: 'S3', range: '15–21', from: 15, to: 21 },
    { label: 'S4', range: '22–28', from: 22, to: 28 },
    { label: 'S5', range: '29+',   from: 29, to: 31 },
  ];

  function porSemana(lista: Venda[], ano: number, mes: number) {
    return SEMANAS.map(s => {
      const items = lista.filter(v => {
        const d = brtDate(v.created_at);
        if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes) return false;
        const dia = d.getUTCDate();
        return dia >= s.from && dia <= s.to;
      });
      return { ...s, valor: items.reduce((a, v) => a + Number(v.sale_value), 0), qtd: items.length };
    });
  }

  const semAtual = useMemo(() => porSemana(atual, refMes.ano, refMes.mes), [atual, refMes]);
  const semAnterior = useMemo(() => porSemana(anterior, mesAnt.ano, mesAnt.mes), [anterior, mesAnt]);

  const maxSemValor = Math.max(...semAtual.map(s => s.valor), ...semAnterior.map(s => s.valor), 1);
  const maxSemQtd = Math.max(...semAtual.map(s => s.qtd), ...semAnterior.map(s => s.qtd), 1);
  const maxDiaValor = useMemo(() => {
    let max = 0;
    for (let d = 1; d <= maxDias; d++) {
      max = Math.max(max, diaAtual[d]?.valor ?? 0, diaAnterior[d]?.valor ?? 0);
    }
    return max || 1;
  }, [diaAtual, diaAnterior, maxDias]);
  const maxDiaQtd = useMemo(() => {
    let max = 0;
    for (let d = 1; d <= maxDias; d++) {
      max = Math.max(max, diaAtual[d]?.qtd ?? 0, diaAnterior[d]?.qtd ?? 0);
    }
    return max || 1;
  }, [diaAtual, diaAnterior, maxDias]);

  // Acumulado
  const acAtual = useMemo(() => {
    let acc = 0;
    return Array.from({ length: totalDiasAtual }, (_, i) => { acc += diaAtual[i + 1]?.valor ?? 0; return acc; });
  }, [diaAtual, totalDiasAtual]);

  const acAnterior = useMemo(() => {
    let acc = 0;
    return Array.from({ length: totalDiasAnterior }, (_, i) => { acc += diaAnterior[i + 1]?.valor ?? 0; return acc; });
  }, [diaAnterior, totalDiasAnterior]);

  const maxAc = Math.max(...acAtual, ...acAnterior, 1);

  // Melhor dia do mês atual
  const melhorDia = useMemo(() => {
    let best = 0, bestD = 0;
    for (let d = 1; d <= totalDiasAtual; d++) {
      if ((diaAtual[d]?.valor ?? 0) > best) { best = diaAtual[d].valor; bestD = d; }
    }
    return { dia: bestD, valor: best };
  }, [diaAtual, totalDiasAtual]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onMouseEnter={somHover} onClick={() => { somClick(); navigate('/dashboard'); }}
              className="text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all">
              ← Voltar
            </button>
            <div>
              <h1 className="text-base font-black text-yellow-400 uppercase tracking-wider leading-none">📊 Comparativo Mensal</h1>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-0.5">
                {MESES_FULL[refMes.mes]} {refMes.ano} vs {MESES_FULL[mesAnt.mes]} {mesAnt.ano}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(-1); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-black transition-all">←</button>
            <span className="text-yellow-400 font-black text-sm uppercase tracking-widest min-w-[80px] text-center">
              {MESES[refMes.mes]} {refMes.ano}
            </span>
            <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(1); }} disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-black transition-all disabled:opacity-30">→</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-36 bg-zinc-900 rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* ── LEGENDA ── */}
            <div className="flex items-center gap-5 text-xs font-bold">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />{MESES_FULL[refMes.mes]} {refMes.ano}</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-zinc-600 inline-block" />{MESES_FULL[mesAnt.mes]} {mesAnt.ano}</div>
            </div>

            {/* ── KPIs TOTAIS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '💰 Receita Total', cur: fmt(totalAtual), prev: `${MESES[mesAnt.mes]}: ${fmt(totalAnterior)}`, delta: diffValor },
                { label: '🔢 Nº de Vendas', cur: String(qtdAtual), prev: `${MESES[mesAnt.mes]}: ${qtdAnterior}`, delta: diffQtd },
                { label: '🎫 Ticket Médio', cur: ticketAtual > 0 ? fmt(ticketAtual) : '—', prev: ticketAnterior > 0 ? `${MESES[mesAnt.mes]}: ${fmt(ticketAnterior)}` : '—', delta: diffTicket },
                { label: '🏆 Melhor Dia', cur: melhorDia.dia > 0 ? `Dia ${melhorDia.dia}` : '—', prev: melhorDia.valor > 0 ? fmt(melhorDia.valor) : '', delta: null },
              ].map((k, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">{k.label}</p>
                  <p className="text-xl font-black text-white leading-tight">{k.cur}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <DeltaBadge pct={k.delta} />
                    <p className="text-zinc-600 text-[10px]">{k.prev}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── KPIs EQUIPES vs CHECKOUT ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">👥 Equipes de Venda</p>
                <p className="text-xl font-black text-white">{fmt(totalEquipeAtual)}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">{equipeAtual.length} vendas</p>
                <div className="flex items-center gap-2 mt-1">
                  <DeltaBadge pct={diffEquipe} />
                  <span className="text-zinc-600 text-[10px]">{MESES[mesAnt.mes]}: {fmt(totalEquipeAnterior)}</span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">🛒 Checkout Direto</p>
                <p className="text-xl font-black text-white">{fmt(totalChkAtual)}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">{chkAtual.length} vendas</p>
                <div className="flex items-center gap-2 mt-1">
                  <DeltaBadge pct={diffChk} />
                  <span className="text-zinc-600 text-[10px]">{MESES[mesAnt.mes]}: {fmt(totalChkAnterior)}</span>
                </div>
              </div>
            </div>

            {/* ── CURVA ACUMULADA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">📈 Acumulado Diário — Valor</p>
              <div className="relative h-48">
                <svg viewBox={`0 0 ${maxDias} 100`} preserveAspectRatio="none" className="w-full h-full">
                  {acAnterior.length > 1 && (
                    <polyline
                      points={acAnterior.map((v, i) => `${(i / (acAnterior.length - 1)) * maxDias},${100 - (v / maxAc) * 95}`).join(' ')}
                      fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinejoin="round"
                    />
                  )}
                  {acAtual.length > 1 && (
                    <polyline
                      points={acAtual.map((v, i) => `${(i / (acAtual.length - 1)) * maxDias},${100 - (v / maxAc) * 95}`).join(' ')}
                      fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinejoin="round"
                    />
                  )}
                </svg>
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
                  <span className="text-zinc-700 text-[9px]">{fmt(maxAc)}</span>
                  <span className="text-zinc-700 text-[9px]">R$ 0</span>
                </div>
              </div>
              <div className="flex justify-between text-zinc-700 text-[9px] mt-1">
                <span>Dia 1</span><span>Dia {maxDias}</span>
              </div>
            </div>

            {/* ── COMPARATIVO POR SEMANA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">📅 Por Semana</p>
                <div className="flex gap-1">
                  {(['valor', 'qtd'] as const).map(t => (
                    <button key={t} onMouseEnter={somHover} onClick={() => { somClick(); setAba(t); }}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${aba === t ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                      {t === 'valor' ? '💰 Valor' : '🔢 Qtd'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {semAtual.map((s, i) => {
                  const ant = semAnterior[i];
                  const valA = aba === 'valor' ? s.valor : s.qtd;
                  const valB = aba === 'valor' ? ant.valor : ant.qtd;
                  const maxV = aba === 'valor' ? maxSemValor : maxSemQtd;
                  const pct = valB > 0 ? ((valA - valB) / valB) * 100 : null;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-zinc-400 font-black">{s.label} <span className="text-zinc-600 font-normal">({s.range})</span></span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-600">{MESES[mesAnt.mes]}: <span className="text-zinc-400 font-bold">{aba === 'valor' ? fmt(ant.valor) : ant.qtd}</span></span>
                          <span className="text-white font-black">{aba === 'valor' ? fmt(s.valor) : s.qtd}</span>
                          <DeltaBadge pct={pct} />
                        </div>
                      </div>
                      <div className="flex gap-1.5 h-5">
                        <div className="flex-1 bg-zinc-800 rounded overflow-hidden">
                          <div className="h-full bg-zinc-600 rounded transition-all duration-700" style={{ width: `${maxV > 0 ? (valB / maxV) * 100 : 0}%` }} />
                        </div>
                        <div className="flex-1 bg-zinc-800 rounded overflow-hidden">
                          <div className={`h-full rounded transition-all duration-700 ${valA >= valB ? 'bg-yellow-400' : 'bg-red-500/70'}`} style={{ width: `${maxV > 0 ? (valA / maxV) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COMPARATIVO POR DIA — BARRAS ── */}
            <GraficoPorDia
              diaAtual={diaAtual}
              diaAnterior={diaAnterior}
              maxDias={maxDias}
              maxDiaValor={maxDiaValor}
              maxDiaQtd={maxDiaQtd}
              aba={aba}
              mesAtualLabel={`${MESES_FULL[refMes.mes]} ${refMes.ano}`}
              mesAntLabel={`${MESES_FULL[mesAnt.mes]} ${mesAnt.ano}`}
              mesCurto={MESES[refMes.mes]}
              mesAntCurto={MESES[mesAnt.mes]}
            />

            {/* ── TABELA DIA A DIA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">📋 Tabela Dia a Dia</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-widest bg-zinc-950/50">
                      <th className="p-3 text-left font-black text-zinc-500">Dia</th>
                      <th className="p-3 text-right font-black text-zinc-500">{MESES[mesAnt.mes]} R$</th>
                      <th className="p-3 text-right font-black text-zinc-600">{MESES[mesAnt.mes]} Qtd</th>
                      <th className="p-3 text-right font-black text-yellow-400">{MESES[refMes.mes]} R$</th>
                      <th className="p-3 text-right font-black text-yellow-300">{MESES[refMes.mes]} Qtd</th>
                      <th className="p-3 text-right font-black text-zinc-400">Δ Valor</th>
                      <th className="p-3 text-right font-black text-zinc-400">Δ Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxDias }, (_, i) => {
                      const dia = i + 1;
                      const vA = diaAtual[dia]?.valor ?? 0;
                      const qA = diaAtual[dia]?.qtd ?? 0;
                      const vB = diaAnterior[dia]?.valor ?? 0;
                      const qB = diaAnterior[dia]?.qtd ?? 0;
                      if (vA === 0 && vB === 0) return null;
                      const dV = vB > 0 ? ((vA - vB) / vB) * 100 : null;
                      const dQ = qB > 0 ? ((qA - qB) / qB) * 100 : null;
                      return (
                        <tr key={dia} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 font-black text-zinc-400">Dia {dia}</td>
                          <td className="p-3 text-right text-zinc-500">{vB > 0 ? fmt(vB) : '—'}</td>
                          <td className="p-3 text-right text-zinc-600">{qB > 0 ? qB : '—'}</td>
                          <td className="p-3 text-right text-white font-black">{vA > 0 ? fmt(vA) : '—'}</td>
                          <td className="p-3 text-right text-zinc-300">{qA > 0 ? qA : '—'}</td>
                          <td className="p-3 text-right"><DeltaBadge pct={dV} /></td>
                          <td className="p-3 text-right"><DeltaBadge pct={dQ} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-700 bg-zinc-950/50">
                      <td className="p-3 font-black text-zinc-300 text-[10px] uppercase tracking-widest">Total</td>
                      <td className="p-3 text-right font-black text-zinc-400">{fmt(totalAnterior)}</td>
                      <td className="p-3 text-right font-black text-zinc-500">{qtdAnterior}</td>
                      <td className="p-3 text-right font-black text-yellow-400">{fmt(totalAtual)}</td>
                      <td className="p-3 text-right font-black text-yellow-300">{qtdAtual}</td>
                      <td className="p-3 text-right"><DeltaBadge pct={diffValor} /></td>
                      <td className="p-3 text-right"><DeltaBadge pct={diffQtd} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
