import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  sale_value?: number | null;
  seller_value?: number | null;
  status: string;
  created_at: string;
  seller_name?: string;
  seller_id?: string | number;
};

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const BRT_MS = 3 * 60 * 60 * 1000;

function toBRT(isoStr: string) {
  return new Date(new Date(isoStr).getTime() - BRT_MS);
}

function formatHora(isoStr: string) {
  const d = toBRT(isoStr);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function formataBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function classeTurno(hora: number) {
  if (hora < 6)  return 'text-indigo-400';
  if (hora < 12) return 'text-yellow-400';
  if (hora < 18) return 'text-orange-400';
  return 'text-blue-400';
}

function nomeTurno(hora: number) {
  if (hora < 6)  return 'Madrugada';
  if (hora < 12) return 'Manhã';
  if (hora < 18) return 'Tarde';
  return 'Noite';
}

export function TrafegoPago() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: '', role: '' };

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSel, setMesSel] = useState(() => {
    const now = new Date();
    return { ano: now.getFullYear(), mes: now.getMonth() };
  });
  const [diaSel, setDiaSel] = useState<number | null>(null);
  const detalheRef = useRef<HTMLDivElement>(null);
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  useEffect(() => {
    if (diaSel !== null) {
      setTimeout(() => detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [diaSel]);

  useEffect(() => {
    api.get('/sales')
      .then(r => setVendas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { vendasDoMes, qtdEquipe, qtdCheckout } = useMemo(() => {
    const lista = vendas.filter(v => {
      if (v.status !== 'aprovada') return false;
      const d = toBRT(v.created_at);
      return d.getUTCFullYear() === mesSel.ano && d.getUTCMonth() === mesSel.mes;
    });
    const equipe = lista.filter(v => v.seller_id && String(v.seller_id) !== '' && v.seller_name !== 'CHECKOUT');
    const checkout = lista.filter(v => !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT');
    return { vendasDoMes: lista, qtdEquipe: equipe.length, qtdCheckout: checkout.length };
  }, [vendas, mesSel]);

  // Agrupa por dia do mês
  const porDia = useMemo(() => {
    const map = new Map<number, Venda[]>();
    for (const v of vendasDoMes) {
      const dia = toBRT(v.created_at).getUTCDate();
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(v);
    }
    return map;
  }, [vendasDoMes]);

  // Vendas por produto (curso)
  const porProduto = useMemo(() => {
    const map = new Map<string, { total: number; equipe: number; checkout: number }>();
    for (const v of vendasDoMes) {
      const nome = v.product_name || 'Desconhecido';
      const isCheckout = !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT';
      const entry = map.get(nome) ?? { total: 0, equipe: 0, checkout: 0 };
      entry.total++;
      if (isCheckout) entry.checkout++; else entry.equipe++;
      map.set(nome, entry);
    }
    return Array.from(map.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total);
  }, [vendasDoMes]);

  // Totais financeiros globais do mês
  const totaisFinanceiros = useMemo(() => {
    let globalTotal = 0, equipeTotal = 0, checkoutTotal = 0;
    for (const v of vendasDoMes) {
      const val = Number(v.sale_value ?? 0);
      const isCheckout = !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT';
      globalTotal += val;
      if (isCheckout) checkoutTotal += val; else equipeTotal += val;
    }
    return { globalTotal, equipeTotal, checkoutTotal };
  }, [vendasDoMes]);

  // Valores financeiros por dia
  const financeiroPorDia = useMemo(() => {
    const map = new Map<number, { equipe: number; checkout: number; total: number }>();
    for (const v of vendasDoMes) {
      const dia = toBRT(v.created_at).getUTCDate();
      const val = Number(v.sale_value ?? 0);
      const isCheckout = !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT';
      const entry = map.get(dia) ?? { equipe: 0, checkout: 0, total: 0 };
      entry.total += val;
      if (isCheckout) entry.checkout += val; else entry.equipe += val;
      map.set(dia, entry);
    }
    return Array.from(map.entries())
      .map(([dia, dados]) => ({ dia, ...dados }))
      .sort((a, b) => a.dia - b.dia);
  }, [vendasDoMes]);

  // Dias do calendário
  const diasDoMes = useMemo(() => {
    const totalDias = new Date(mesSel.ano, mesSel.mes + 1, 0).getDate();
    const primeiroDia = new Date(mesSel.ano, mesSel.mes, 1).getDay();
    return { totalDias, primeiroDia };
  }, [mesSel]);

  // Vendas do dia selecionado, com filtros
  const vendasDiaSel = useMemo(() => {
    if (diaSel === null) return [];
    const lista = porDia.get(diaSel) || [];
    return lista
      .filter(v => !filtroProduto || v.product_name.toLowerCase().includes(filtroProduto.toLowerCase()))
      .filter(v => !filtroVendedor || (v.seller_name || '').toLowerCase().includes(filtroVendedor.toLowerCase()))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [diaSel, porDia, filtroProduto, filtroVendedor]);

  // Cor de intensidade para o calendário
  function corDia(qtd: number) {
    if (qtd === 0) return 'bg-zinc-800/50 text-zinc-600';
    if (qtd <= 2)  return 'bg-blue-900/60 text-blue-300 border-blue-700/50';
    if (qtd <= 5)  return 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50';
    if (qtd <= 10) return 'bg-orange-900/60 text-orange-300 border-orange-700/50';
    return 'bg-green-900/60 text-green-300 border-green-700/50';
  }

  // Distribuição por hora (heatmap)
  const heatmapHoras = useMemo(() => {
    const horas = new Array(24).fill(0);
    for (const v of vendasDoMes) {
      const h = toBRT(v.created_at).getUTCHours();
      horas[h]++;
    }
    return horas;
  }, [vendasDoMes]);
  const maxHora = Math.max(...heatmapHoras, 1);

  function mesAnterior() {
    setMesSel(m => {
      if (m.mes === 0) return { ano: m.ano - 1, mes: 11 };
      return { ano: m.ano, mes: m.mes - 1 };
    });
    setDiaSel(null);
  }
  function mesPosterior() {
    setMesSel(m => {
      if (m.mes === 11) return { ano: m.ano + 1, mes: 0 };
      return { ano: m.ano, mes: m.mes + 1 };
    });
    setDiaSel(null);
  }

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-black text-xs">OC</span>
          </div>
          <div>
            <p className="text-white font-black text-sm uppercase tracking-widest leading-none">Tráfego Pago</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Painel de Conversões</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-xs hidden sm:block">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-5">

        {/* Navegação de mês */}
        <div className="flex items-center justify-between">
          <button onClick={mesAnterior} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800">
            ← Anterior
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest text-yellow-400">
            {MESES[mesSel.mes]} {mesSel.ano}
          </h2>
          <button onClick={mesPosterior} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800">
            Próximo →
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Total do Mês</p>
            <p className="text-2xl font-black text-white">{vendasDoMes.length}</p>
            <p className="text-zinc-600 text-[10px]">vendas aprovadas</p>
          </div>
          <div className="bg-zinc-900 border border-green-800/50 rounded-xl p-4">
            <p className="text-green-500 text-[10px] uppercase tracking-widest mb-1">Equipe de Vendas</p>
            <p className="text-2xl font-black text-green-400">{qtdEquipe}</p>
            <p className="text-zinc-600 text-[10px]">
              {vendasDoMes.length > 0 ? Math.round((qtdEquipe / vendasDoMes.length) * 100) : 0}% do total
            </p>
          </div>
          <div className="bg-zinc-900 border border-purple-800/50 rounded-xl p-4">
            <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-1">Checkout</p>
            <p className="text-2xl font-black text-purple-400">{qtdCheckout}</p>
            <p className="text-zinc-600 text-[10px]">
              {vendasDoMes.length > 0 ? Math.round((qtdCheckout / vendasDoMes.length) * 100) : 0}% do total
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Dias com Vendas</p>
            <p className="text-2xl font-black text-yellow-400">{porDia.size}</p>
            <p className="text-zinc-600 text-[10px]">de {diasDoMes.totalDias} dias</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Média por Dia</p>
            <p className="text-2xl font-black text-blue-400">
              {porDia.size > 0 ? (vendasDoMes.length / porDia.size).toFixed(1) : '0'}
            </p>
            <p className="text-zinc-600 text-[10px]">vendas/dia ativo</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Melhor Dia</p>
            {(() => {
              let melhorDia = 0, melhorQtd = 0;
              porDia.forEach((v, d) => { if (v.length > melhorQtd) { melhorQtd = v.length; melhorDia = d; }});
              return melhorQtd > 0
                ? <><p className="text-2xl font-black text-green-400">{melhorDia}/{mesSel.mes+1}</p><p className="text-zinc-600 text-[10px]">{melhorQtd} vendas</p></>
                : <p className="text-2xl font-black text-zinc-600">—</p>;
            })()}
          </div>
        </div>

        {/* Dashboard Financeiro */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            💰 Financeiro do Mês — {MESES[mesSel.mes]} {mesSel.ano}
          </h3>

          {/* Cards de valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/50">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Valor Global Total</p>
              <p className="text-xl font-black text-white">{formataBRL(totaisFinanceiros.globalTotal)}</p>
              <p className="text-zinc-600 text-[10px]">{vendasDoMes.length} vendas</p>
            </div>
            <div className="bg-green-950/40 rounded-xl p-4 border border-green-800/40">
              <p className="text-green-500 text-[10px] uppercase tracking-widest mb-1">Equipe de Vendas</p>
              <p className="text-xl font-black text-green-400">{formataBRL(totaisFinanceiros.equipeTotal)}</p>
              <p className="text-zinc-600 text-[10px]">
                {totaisFinanceiros.globalTotal > 0 ? Math.round((totaisFinanceiros.equipeTotal / totaisFinanceiros.globalTotal) * 100) : 0}% do total
              </p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-purple-800/40">
              <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-1">Checkout</p>
              <p className="text-xl font-black text-purple-400">{formataBRL(totaisFinanceiros.checkoutTotal)}</p>
              <p className="text-zinc-600 text-[10px]">
                {totaisFinanceiros.globalTotal > 0 ? Math.round((totaisFinanceiros.checkoutTotal / totaisFinanceiros.globalTotal) * 100) : 0}% do total
              </p>
            </div>
          </div>

          {/* Tabela por dia */}
          {financeiroPorDia.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Dia</th>
                    <th className="text-right text-green-500 uppercase tracking-widest font-bold py-2 pr-4">Equipe</th>
                    <th className="text-right text-purple-400 uppercase tracking-widest font-bold py-2 pr-4">Checkout</th>
                    <th className="text-right text-zinc-400 uppercase tracking-widest font-bold py-2 pr-4">Total</th>
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {financeiroPorDia.map(({ dia, equipe, checkout, total }) => {
                    const pctEquipe = total > 0 ? (equipe / total) * 100 : 0;
                    const pctCheckout = 100 - pctEquipe;
                    const qtdDia = porDia.get(dia)?.length || 0;
                    return (
                      <tr
                        key={dia}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        onClick={() => setDiaSel(diaSel === dia ? null : dia)}
                      >
                        <td className="py-2.5 pr-4">
                          <span className={`font-black ${diaSel === dia ? 'text-yellow-400' : 'text-white'}`}>
                            {String(dia).padStart(2,'0')}/{mesSel.mes+1}
                          </span>
                          <span className="text-zinc-600 ml-2 text-[10px]">{qtdDia} venda{qtdDia !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className="text-green-400 font-bold">{formataBRL(equipe)}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className="text-purple-400 font-bold">{formataBRL(checkout)}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className="text-white font-black">{formataBRL(total)}</span>
                        </td>
                        <td className="py-2.5 w-32">
                          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                            {equipe > 0 && <div className="bg-green-500 h-full" style={{ width: `${pctEquipe}%` }} />}
                            {checkout > 0 && <div className="bg-purple-500 h-full" style={{ width: `${pctCheckout}%` }} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td className="py-2.5 pr-4 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Total</td>
                    <td className="py-2.5 pr-4 text-right font-black text-green-400">{formataBRL(totaisFinanceiros.equipeTotal)}</td>
                    <td className="py-2.5 pr-4 text-right font-black text-purple-400">{formataBRL(totaisFinanceiros.checkoutTotal)}</td>
                    <td className="py-2.5 pr-4 text-right font-black text-white">{formataBRL(totaisFinanceiros.globalTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Calendário */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
              📅 Calendário de Conversões — clique num dia para ver detalhes
            </h3>

            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-zinc-600 uppercase py-1">{d}</div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {/* Células vazias antes do primeiro dia */}
              {Array.from({ length: diasDoMes.primeiroDia }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Dias do mês */}
              {Array.from({ length: diasDoMes.totalDias }, (_, i) => {
                const dia = i + 1;
                const qtd = porDia.get(dia)?.length || 0;
                const selecionado = diaSel === dia;
                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSel(selecionado ? null : dia)}
                    className={`
                      relative aspect-square rounded-lg border text-xs font-black flex flex-col items-center justify-center
                      transition-all hover:scale-105 cursor-pointer
                      ${selecionado ? 'ring-2 ring-yellow-400 scale-105' : ''}
                      ${corDia(qtd)}
                      ${qtd === 0 ? 'border-zinc-700/30' : 'border'}
                    `}
                  >
                    <span className="text-[11px] sm:text-sm leading-none">{dia}</span>
                    {qtd > 0 && (
                      <span className="text-[9px] leading-none mt-0.5 opacity-80">{qtd}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <span className="text-zinc-600 text-[10px] uppercase tracking-widest">Legenda:</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500"><span className="w-3 h-3 rounded bg-zinc-800 inline-block"/>0</span>
              <span className="flex items-center gap-1 text-[10px] text-blue-300"><span className="w-3 h-3 rounded bg-blue-900/60 inline-block"/>1-2</span>
              <span className="flex items-center gap-1 text-[10px] text-yellow-300"><span className="w-3 h-3 rounded bg-yellow-900/60 inline-block"/>3-5</span>
              <span className="flex items-center gap-1 text-[10px] text-orange-300"><span className="w-3 h-3 rounded bg-orange-900/60 inline-block"/>6-10</span>
              <span className="flex items-center gap-1 text-[10px] text-green-300"><span className="w-3 h-3 rounded bg-green-900/60 inline-block"/>10+</span>
            </div>
          </div>

          {/* Heatmap de horas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
              🕐 Horários de Pico
            </h3>
            <div className="space-y-1">
              {heatmapHoras.map((qtd, hora) => (
                <div key={hora} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold w-7 text-right ${classeTurno(hora)}`}>
                    {String(hora).padStart(2,'0')}h
                  </span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${hora < 6 ? 'bg-indigo-500' : hora < 12 ? 'bg-yellow-400' : hora < 18 ? 'bg-orange-400' : 'bg-blue-400'}`}
                      style={{ width: `${(qtd / maxHora) * 100}%` }}
                    />
                  </div>
                  {qtd > 0 && <span className="text-[10px] text-zinc-500 w-4 text-right">{qtd}</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(['Madrugada','Manhã','Tarde','Noite'] as const).map((turno, i) => {
                const ranges = [[0,6],[6,12],[12,18],[18,24]];
                const [ini, fim] = ranges[i]!;
                const total = heatmapHoras.slice(ini, fim).reduce((a,b)=>a+b,0);
                const cores = ['text-indigo-400','text-yellow-400','text-orange-400','text-blue-400'];
                return (
                  <div key={turno} className="bg-zinc-800/50 rounded-lg p-2 text-center">
                    <p className={`text-[10px] font-bold uppercase ${cores[i]}`}>{turno}</p>
                    <p className="text-white font-black text-lg">{total}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabela de cursos vendidos */}
        {porProduto.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
              📦 Vendas por Curso — {MESES[mesSel.mes]} {mesSel.ano}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Curso</th>
                    <th className="text-center text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Total</th>
                    <th className="text-center text-green-500 uppercase tracking-widest font-bold py-2 pr-4">Equipe</th>
                    <th className="text-center text-purple-400 uppercase tracking-widest font-bold py-2 pr-4">Checkout</th>
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2">Distribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {porProduto.map(p => {
                    const pctEquipe = p.total > 0 ? Math.round((p.equipe / p.total) * 100) : 0;
                    const pctCheckout = 100 - pctEquipe;
                    return (
                      <tr key={p.nome} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="text-white font-semibold">{p.nome}</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-white font-black text-sm">{p.total}</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-green-400 font-bold">{p.equipe}</span>
                          <span className="text-zinc-600 ml-1">({pctEquipe}%)</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-purple-400 font-bold">{p.checkout}</span>
                          <span className="text-zinc-600 ml-1">({pctCheckout}%)</span>
                        </td>
                        <td className="py-3 w-40">
                          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800 w-full">
                            {p.equipe > 0 && (
                              <div className="bg-green-500 h-full" style={{ width: `${pctEquipe}%` }} />
                            )}
                            {p.checkout > 0 && (
                              <div className="bg-purple-500 h-full" style={{ width: `${pctCheckout}%` }} />
                            )}
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-green-600 text-[9px]">Equipe</span>
                            <span className="text-purple-600 text-[9px]">Checkout</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detalhes do dia selecionado */}
        {diaSel !== null && (() => {
          const todasDoDia = porDia.get(diaSel) || [];
          const equipesDia = todasDoDia.filter(v => v.seller_id && String(v.seller_id) !== '' && v.seller_name !== 'CHECKOUT');
          const checkoutsDia = todasDoDia.filter(v => !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT');

          // Cursos do dia com split equipe/checkout
          const cursosDia = (() => {
            const map = new Map<string, { equipe: number; checkout: number }>();
            for (const v of todasDoDia) {
              const nome = v.product_name || 'Desconhecido';
              const isC = !v.seller_id || String(v.seller_id) === '' || v.seller_name === 'CHECKOUT';
              const e = map.get(nome) ?? { equipe: 0, checkout: 0 };
              if (isC) e.checkout++; else e.equipe++;
              map.set(nome, e);
            }
            return Array.from(map.entries())
              .map(([nome, d]) => ({ nome, total: d.equipe + d.checkout, ...d }))
              .sort((a, b) => b.total - a.total);
          })();

          return (
            <div className="space-y-4" ref={detalheRef}>
              {/* Card resumo do dia */}
              <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-yellow-400">
                    📅 {String(diaSel).padStart(2,'0')}/{mesSel.mes+1}/{mesSel.ano}
                    <span className="ml-2 text-zinc-500 text-xs font-normal">{todasDoDia.length} venda{todasDoDia.length !== 1 ? 's' : ''}</span>
                  </h3>
                  <button
                    onClick={() => setDiaSel(null)}
                    className="text-zinc-500 hover:text-white text-xs transition-colors px-2 py-1 rounded hover:bg-zinc-800"
                  >
                    ✕ Fechar
                  </button>
                </div>

                {/* Contadores equipe vs checkout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl font-black text-white">{todasDoDia.length}</p>
                  </div>
                  <div className="bg-green-950/50 border border-green-800/30 rounded-lg p-3 text-center">
                    <p className="text-green-500 text-[10px] uppercase tracking-widest mb-1">Equipe de Vendas</p>
                    <p className="text-2xl font-black text-green-400">{equipesDia.length}</p>
                    <p className="text-zinc-600 text-[10px]">
                      {todasDoDia.length > 0 ? Math.round((equipesDia.length / todasDoDia.length) * 100) : 0}%
                    </p>
                  </div>
                  <div className="bg-purple-950/50 border border-purple-800/30 rounded-lg p-3 text-center">
                    <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-1">Checkout</p>
                    <p className="text-2xl font-black text-purple-400">{checkoutsDia.length}</p>
                    <p className="text-zinc-600 text-[10px]">
                      {todasDoDia.length > 0 ? Math.round((checkoutsDia.length / todasDoDia.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Cursos vendidos no dia */}
                <div className="space-y-2">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Cursos vendidos</p>
                  {cursosDia.map(c => {
                    const pctEquipe = c.total > 0 ? (c.equipe / c.total) * 100 : 0;
                    return (
                      <div key={c.nome} className="bg-zinc-800/40 rounded-lg px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-xs truncate">{c.nome}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-white font-black text-sm w-6 text-center">{c.total}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-400 text-xs font-bold">{c.equipe} equipe</span>
                            <span className="text-zinc-600 text-xs">·</span>
                            <span className="text-purple-400 text-xs font-bold">{c.checkout} checkout</span>
                          </div>
                          <div className="w-20 h-2 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                            {c.equipe > 0 && <div className="h-full bg-green-500 float-left" style={{ width: `${pctEquipe}%` }} />}
                            {c.checkout > 0 && <div className="h-full bg-purple-500 float-left" style={{ width: `${100 - pctEquipe}%` }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lista detalhada de vendas do dia */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Lista de Vendas</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      placeholder="Filtrar produto..."
                      value={filtroProduto}
                      onChange={e => setFiltroProduto(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-yellow-400 placeholder:text-zinc-600 w-36"
                    />
                    <input
                      type="text"
                      placeholder="Filtrar vendedor..."
                      value={filtroVendedor}
                      onChange={e => setFiltroVendedor(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-yellow-400 placeholder:text-zinc-600 w-36"
                    />
                  </div>
                </div>

                {vendasDiaSel.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">Nenhuma venda encontrada com esses filtros.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Horário</th>
                          <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Produto</th>
                          <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Cliente</th>
                          <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Vendedor</th>
                          <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2">Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendasDiaSel.map(v => {
                          const hora = toBRT(v.created_at).getUTCHours();
                          const isCheckout = !v.seller_id || v.seller_name === 'CHECKOUT';
                          return (
                            <tr key={v.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                              <td className="py-2.5 pr-4">
                                <span className={`font-black ${classeTurno(hora)}`}>{formatHora(v.created_at)}</span>
                                <span className={`ml-1.5 text-[9px] ${classeTurno(hora)} opacity-70`}>{nomeTurno(hora)}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-white font-semibold">{v.product_name}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <p className="text-zinc-300">{v.customer_name}</p>
                                {v.customer_email && <p className="text-zinc-600 text-[10px]">{v.customer_email}</p>}
                              </td>
                              <td className="py-2.5 pr-4">
                                {isCheckout
                                  ? <span className="text-purple-400 font-bold">Checkout</span>
                                  : <span className="text-zinc-300">{v.seller_name || '—'}</span>
                                }
                              </td>
                              <td className="py-2.5">
                                <span className="text-zinc-400 text-[10px]">{v.payment_method || '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
