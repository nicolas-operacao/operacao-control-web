import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

type Venda = {
  id: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string;
};

const BRT_MS = 3 * 60 * 60 * 1000;
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formataBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function brtDate(isoString: string) {
  return new Date(new Date(isoString).getTime() - BRT_MS);
}

export function Comparativo() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  // Mês de referência = mês atual
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

  // Mês anterior
  const mesAnt = useMemo(() => {
    let m = refMes.mes - 1, a = refMes.ano;
    if (m < 0) { m = 11; a--; }
    return { mes: m, ano: a };
  }, [refMes]);

  // Agrupa vendas aprovadas por dia dentro de um mês
  function vendasDoMes(ano: number, mes: number) {
    return aprovadas.filter(v => {
      const d = brtDate(v.created_at);
      return d.getUTCFullYear() === ano && d.getUTCMonth() === mes;
    });
  }

  const vendasAtual = useMemo(() => vendasDoMes(refMes.ano, refMes.mes), [aprovadas, refMes]);
  const vendasAnterior = useMemo(() => vendasDoMes(mesAnt.ano, mesAnt.mes), [aprovadas, mesAnt]);

  // KPIs totais
  const totalAtual = vendasAtual.reduce((s, v) => s + Number(v.sale_value), 0);
  const totalAnterior = vendasAnterior.reduce((s, v) => s + Number(v.sale_value), 0);
  const qtdAtual = vendasAtual.length;
  const qtdAnterior = vendasAnterior.length;
  const diffValor = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : null;
  const diffQtd = qtdAnterior > 0 ? ((qtdAtual - qtdAnterior) / qtdAnterior) * 100 : null;

  // Dias do mês atual para a linha do tempo
  const diasNoMes = (ano: number, mes: number) => new Date(ano, mes + 1, 0).getDate();
  const totalDiasAtual = diasNoMes(refMes.ano, refMes.mes);
  const totalDiasAnterior = diasNoMes(mesAnt.ano, mesAnt.mes);

  // Agrupa por dia: { dia: 1..31 -> { valor, qtd } }
  function porDia(lista: Venda[], ano: number, mes: number) {
    const map: Record<number, { valor: number; qtd: number }> = {};
    const total = diasNoMes(ano, mes);
    for (let d = 1; d <= total; d++) map[d] = { valor: 0, qtd: 0 };
    lista.forEach(v => {
      const d = brtDate(v.created_at).getUTCDate();
      if (map[d]) { map[d].valor += Number(v.sale_value); map[d].qtd++; }
    });
    return map;
  }

  const diaAtual = useMemo(() => porDia(vendasAtual, refMes.ano, refMes.mes), [vendasAtual, refMes]);
  const diaAnterior = useMemo(() => porDia(vendasAnterior, mesAnt.ano, mesAnt.mes), [vendasAnterior, mesAnt]);

  // Semanas: agrupa por semana (1-7, 8-14, 15-21, 22-28, 29+)
  function porSemana(lista: Venda[], ano: number, mes: number) {
    const semanas: { label: string; valor: number; qtd: number }[] = [
      { label: 'S1 (1-7)', valor: 0, qtd: 0 },
      { label: 'S2 (8-14)', valor: 0, qtd: 0 },
      { label: 'S3 (15-21)', valor: 0, qtd: 0 },
      { label: 'S4 (22-28)', valor: 0, qtd: 0 },
      { label: 'S5 (29+)', valor: 0, qtd: 0 },
    ];
    lista.forEach(v => {
      const d = brtDate(v.created_at);
      if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes) return;
      const dia = d.getUTCDate();
      const idx = dia <= 7 ? 0 : dia <= 14 ? 1 : dia <= 21 ? 2 : dia <= 28 ? 3 : 4;
      semanas[idx].valor += Number(v.sale_value);
      semanas[idx].qtd++;
    });
    return semanas;
  }

  const semAtual = useMemo(() => porSemana(vendasAtual, refMes.ano, refMes.mes), [vendasAtual, refMes]);
  const semAnterior = useMemo(() => porSemana(vendasAnterior, mesAnt.ano, mesAnt.mes), [vendasAnterior, mesAnt]);

  // Max para escala dos gráficos de barras
  const maxDiaValor = useMemo(() => {
    let max = 0;
    for (let d = 1; d <= Math.max(totalDiasAtual, totalDiasAnterior); d++) {
      if (diaAtual[d]) max = Math.max(max, diaAtual[d].valor);
      if (diaAnterior[d]) max = Math.max(max, diaAnterior[d].valor);
    }
    return max || 1;
  }, [diaAtual, diaAnterior, totalDiasAtual, totalDiasAnterior]);

  const maxSemValor = useMemo(() => Math.max(...semAtual.map(s => s.valor), ...semAnterior.map(s => s.valor), 1), [semAtual, semAnterior]);

  // Acumulado dia a dia (curva de progresso)
  const acumuladoAtual = useMemo(() => {
    let acc = 0;
    return Array.from({ length: totalDiasAtual }, (_, i) => {
      acc += diaAtual[i + 1]?.valor ?? 0;
      return acc;
    });
  }, [diaAtual, totalDiasAtual]);

  const acumuladoAnterior = useMemo(() => {
    let acc = 0;
    return Array.from({ length: totalDiasAnterior }, (_, i) => {
      acc += diaAnterior[i + 1]?.valor ?? 0;
      return acc;
    });
  }, [diaAnterior, totalDiasAnterior]);

  const maxAcumulado = Math.max(...acumuladoAtual, ...acumuladoAnterior, 1);

  function DeltaBadge({ pct }: { pct: number | null }) {
    if (pct === null) return null;
    const positivo = pct >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${positivo ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
        {positivo ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onMouseEnter={somHover} onClick={() => { somClick(); navigate('/dashboard'); }} className="text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all">
              ← Voltar
            </button>
            <div>
              <h1 className="text-base font-black text-yellow-400 uppercase tracking-wider leading-none">📊 Comparativo Mensal</h1>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-0.5">Progresso vs mês anterior</p>
            </div>
          </div>
          {/* Navegador de mês */}
          <div className="flex items-center gap-2">
            <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(-1); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-black transition-all">←</button>
            <span className="text-yellow-400 font-black text-sm uppercase tracking-widest min-w-[90px] text-center">{MESES[refMes.mes]} {refMes.ano}</span>
            <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(1); }} disabled={isCurrentMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-black transition-all disabled:opacity-30">→</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-zinc-900 rounded-xl animate-pulse" />)}</div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: `💰 Valor — ${MESES[refMes.mes]}`, value: formataBRL(totalAtual), delta: diffValor, sub: `${MESES[mesAnt.mes]}: ${formataBRL(totalAnterior)}` },
                { label: `🔢 Vendas — ${MESES[refMes.mes]}`, value: String(qtdAtual), delta: diffQtd, sub: `${MESES[mesAnt.mes]}: ${qtdAnterior} vendas` },
                { label: `📅 Ticket Médio — ${MESES[refMes.mes]}`, value: qtdAtual > 0 ? formataBRL(totalAtual / qtdAtual) : '—', delta: null, sub: qtdAnterior > 0 ? `${MESES[mesAnt.mes]}: ${formataBRL(totalAnterior / qtdAnterior)}` : '—' },
                { label: '🏆 Melhor Dia', value: (() => { let best = 0, bestDay = 0; for (let d = 1; d <= totalDiasAtual; d++) { if ((diaAtual[d]?.valor ?? 0) > best) { best = diaAtual[d].valor; bestDay = d; } } return best > 0 ? `Dia ${bestDay}` : '—'; })(), delta: null, sub: (() => { let best = 0; for (let d = 1; d <= totalDiasAtual; d++) best = Math.max(best, diaAtual[d]?.valor ?? 0); return best > 0 ? formataBRL(best) : ''; })() },
              ].map((k, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">{k.label}</p>
                  <p className="text-xl font-black text-white leading-tight">{k.value}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {k.delta !== null && <DeltaBadge pct={k.delta} />}
                    <p className="text-zinc-600 text-[10px] truncate">{k.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── LEGENDA ── */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />{MESES_FULL[refMes.mes]} {refMes.ano}</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-zinc-600 inline-block" />{MESES_FULL[mesAnt.mes]} {mesAnt.ano}</div>
            </div>

            {/* ── CURVA ACUMULADA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">📈 Acumulado Diário — Valor</p>
              <div className="relative h-48">
                <svg viewBox={`0 0 ${Math.max(totalDiasAtual, totalDiasAnterior)} 100`} preserveAspectRatio="none" className="w-full h-full">
                  {/* Anterior */}
                  {acumuladoAnterior.length > 1 && (
                    <polyline
                      points={acumuladoAnterior.map((v, i) => `${(i / (acumuladoAnterior.length - 1)) * Math.max(totalDiasAtual, totalDiasAnterior)},${100 - (v / maxAcumulado) * 95}`).join(' ')}
                      fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinejoin="round"
                    />
                  )}
                  {/* Atual */}
                  {acumuladoAtual.length > 1 && (
                    <polyline
                      points={acumuladoAtual.map((v, i) => `${(i / (acumuladoAtual.length - 1)) * Math.max(totalDiasAtual, totalDiasAnterior)},${100 - (v / maxAcumulado) * 95}`).join(' ')}
                      fill="none" stroke="#facc15" strokeWidth="2" strokeLinejoin="round"
                    />
                  )}
                </svg>
                {/* Eixo Y labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
                  <span className="text-zinc-700 text-[9px]">{formataBRL(maxAcumulado)}</span>
                  <span className="text-zinc-700 text-[9px]">R$ 0</span>
                </div>
              </div>
              <div className="flex justify-between text-zinc-700 text-[9px] mt-1 px-1">
                <span>Dia 1</span>
                <span>Dia {Math.max(totalDiasAtual, totalDiasAnterior)}</span>
              </div>
            </div>

            {/* ── COMPARATIVO POR SEMANA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">📅 Comparativo por Semana</p>
              <div className="space-y-3">
                {semAtual.map((s, i) => {
                  const ant = semAnterior[i];
                  const maiorAtual = s.valor >= ant.valor;
                  const pct = ant.valor > 0 ? ((s.valor - ant.valor) / ant.valor) * 100 : null;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-zinc-500 font-black uppercase tracking-widest">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600">{MESES[mesAnt.mes]}: <span className="text-zinc-400">{formataBRL(ant.valor)}</span> ({ant.qtd})</span>
                          <span className="text-white font-black">{formataBRL(s.valor)} ({s.qtd})</span>
                          {pct !== null && <DeltaBadge pct={pct} />}
                        </div>
                      </div>
                      <div className="flex gap-1 h-5">
                        <div className="flex-1 bg-zinc-800 rounded overflow-hidden">
                          <div className="h-full bg-zinc-600 rounded transition-all duration-700" style={{ width: `${maxSemValor > 0 ? (ant.valor / maxSemValor) * 100 : 0}%` }} />
                        </div>
                        <div className="flex-1 bg-zinc-800 rounded overflow-hidden">
                          <div className={`h-full rounded transition-all duration-700 ${maiorAtual ? 'bg-yellow-400' : 'bg-red-500/70'}`} style={{ width: `${maxSemValor > 0 ? (s.valor / maxSemValor) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COMPARATIVO POR DIA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">📊 Vendas por Dia — Comparativo</p>
              <div className="overflow-x-auto">
                <div className="flex gap-1 items-end min-w-max pb-2" style={{ minWidth: `${Math.max(totalDiasAtual, totalDiasAnterior) * 28}px` }}>
                  {Array.from({ length: Math.max(totalDiasAtual, totalDiasAnterior) }, (_, i) => {
                    const dia = i + 1;
                    const vAtual = diaAtual[dia]?.valor ?? 0;
                    const vAnt = diaAnterior[dia]?.valor ?? 0;
                    const hAtual = maxDiaValor > 0 ? Math.max((vAtual / maxDiaValor) * 100, vAtual > 0 ? 4 : 0) : 0;
                    const hAnt = maxDiaValor > 0 ? Math.max((vAnt / maxDiaValor) * 100, vAnt > 0 ? 4 : 0) : 0;
                    return (
                      <div key={dia} className="flex flex-col items-center gap-0.5" style={{ width: '24px' }}>
                        <div className="flex items-end gap-px w-full" style={{ height: '80px' }}>
                          <div className="flex-1 bg-zinc-600 rounded-t transition-all duration-500" style={{ height: `${hAnt}%` }} title={`${MESES[mesAnt.mes]} dia ${dia}: ${formataBRL(vAnt)}`} />
                          <div className={`flex-1 rounded-t transition-all duration-500 ${vAtual > vAnt ? 'bg-yellow-400' : vAtual > 0 ? 'bg-orange-400' : 'bg-zinc-800'}`} style={{ height: `${hAtual}%` }} title={`${MESES[refMes.mes]} dia ${dia}: ${formataBRL(vAtual)}`} />
                        </div>
                        <span className="text-zinc-700 text-[8px] leading-none">{dia}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-zinc-700 text-[9px] mt-2">Passe o mouse sobre as barras para ver os valores. Amarelo = mês atual acima do anterior. Laranja = abaixo.</p>
            </div>

            {/* ── TABELA DIA A DIA ── */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">📋 Tabela Dia a Dia</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-600 text-[10px] uppercase tracking-widest bg-zinc-950/50">
                      <th className="p-3 text-left font-black">Dia</th>
                      <th className="p-3 text-right font-black text-zinc-500">{MESES[mesAnt.mes]} Valor</th>
                      <th className="p-3 text-right font-black text-zinc-500">{MESES[mesAnt.mes]} Qtd</th>
                      <th className="p-3 text-right font-black text-yellow-400">{MESES[refMes.mes]} Valor</th>
                      <th className="p-3 text-right font-black text-yellow-400">{MESES[refMes.mes]} Qtd</th>
                      <th className="p-3 text-right font-black">Δ Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(totalDiasAtual, totalDiasAnterior) }, (_, i) => {
                      const dia = i + 1;
                      const vAtual = diaAtual[dia]?.valor ?? 0;
                      const qAtual = diaAtual[dia]?.qtd ?? 0;
                      const vAnt = diaAnterior[dia]?.valor ?? 0;
                      const qAnt = diaAnterior[dia]?.qtd ?? 0;
                      if (vAtual === 0 && vAnt === 0) return null;
                      const delta = vAnt > 0 ? ((vAtual - vAnt) / vAnt) * 100 : null;
                      return (
                        <tr key={dia} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 font-black text-zinc-400">Dia {dia}</td>
                          <td className="p-3 text-right text-zinc-500">{vAnt > 0 ? formataBRL(vAnt) : '—'}</td>
                          <td className="p-3 text-right text-zinc-600">{qAnt > 0 ? qAnt : '—'}</td>
                          <td className="p-3 text-right text-white font-black">{vAtual > 0 ? formataBRL(vAtual) : '—'}</td>
                          <td className="p-3 text-right text-zinc-300">{qAtual > 0 ? qAtual : '—'}</td>
                          <td className="p-3 text-right">{delta !== null ? <DeltaBadge pct={delta} /> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700 bg-zinc-950/50">
                      <td className="p-3 font-black text-zinc-300 uppercase text-[10px] tracking-widest">Total</td>
                      <td className="p-3 text-right font-black text-zinc-400">{formataBRL(totalAnterior)}</td>
                      <td className="p-3 text-right font-black text-zinc-500">{qtdAnterior}</td>
                      <td className="p-3 text-right font-black text-yellow-400">{formataBRL(totalAtual)}</td>
                      <td className="p-3 text-right font-black text-yellow-300">{qtdAtual}</td>
                      <td className="p-3 text-right">{diffValor !== null ? <DeltaBadge pct={diffValor} /> : '—'}</td>
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
