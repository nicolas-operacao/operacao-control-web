import { useEffect, useState, useMemo } from 'react';
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
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  useEffect(() => {
    api.get('/sales')
      .then(r => setVendas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function classificarVenda(v: { seller_id?: any; payment_method?: string }): 'trafego' | 'checkout' | 'vendedor' {
    const semVendedor = !v.seller_id || String(v.seller_id) === '' || String(v.seller_id) === 'null';
    if (semVendedor && (v.payment_method || '').toLowerCase().includes('trafego')) return 'trafego';
    if (semVendedor) return 'checkout';
    return 'vendedor';
  }

  const { vendasDoMes, vendasEquipe, vendasCheckout, qtdEquipe, qtdCheckout, qtdTrafego } = useMemo(() => {
    const lista = vendas.filter(v => {
      if (v.status !== 'aprovada') return false;
      const d = toBRT(v.created_at);
      return d.getUTCFullYear() === mesSel.ano && d.getUTCMonth() === mesSel.mes;
    });
    const equipe = lista.filter(v => classificarVenda(v) === 'vendedor');
    const trafego = lista.filter(v => classificarVenda(v) === 'trafego');
    const checkout = lista.filter(v => classificarVenda(v) === 'checkout');
    return {
      vendasDoMes: trafego,
      vendasEquipe: equipe,
      vendasCheckout: checkout,
      qtdEquipe: equipe.length,
      qtdCheckout: checkout.length,
      qtdTrafego: trafego.length,
    };
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

  // Vendas por produto (curso) — apenas vendas de tráfego
  const porProduto = useMemo(() => {
    const map = new Map<string, { total: number }>();
    for (const v of vendasDoMes) {
      const nome = v.product_name || 'Desconhecido';
      const entry = map.get(nome) ?? { total: 0 };
      entry.total++;
      map.set(nome, entry);
    }
    return Array.from(map.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.total - a.total);
  }, [vendasDoMes]);

  // Totais financeiros — apenas vendas de tráfego
  const totaisFinanceiros = useMemo(() => {
    let globalTotal = 0;
    for (const v of vendasDoMes) {
      globalTotal += Number(v.sale_value ?? 0);
    }
    return { globalTotal };
  }, [vendasDoMes]);

  // Valores financeiros por dia — apenas vendas de tráfego
  const financeiroPorDia = useMemo(() => {
    const map = new Map<number, { total: number }>();
    for (const v of vendasDoMes) {
      const dia = toBRT(v.created_at).getUTCDate();
      const val = Number(v.sale_value ?? 0);
      const entry = map.get(dia) ?? { total: 0 };
      entry.total += val;
      map.set(dia, entry);
    }
    return Array.from(map.entries())
      .map(([dia, dados]) => ({ dia, ...dados }))
      .sort((a, b) => a.dia - b.dia);
  }, [vendasDoMes]);

  // Financeiro por dia — Equipe de Vendas
  const financeiroEquipePorDia = useMemo(() => {
    const map = new Map<number, { total: number; qtd: number }>();
    for (const v of vendasEquipe) {
      const dia = toBRT(v.created_at).getUTCDate();
      const val = Number(v.seller_value ?? v.sale_value ?? 0);
      const entry = map.get(dia) ?? { total: 0, qtd: 0 };
      entry.total += val;
      entry.qtd++;
      map.set(dia, entry);
    }
    return Array.from(map.entries())
      .map(([dia, dados]) => ({ dia, ...dados }))
      .sort((a, b) => a.dia - b.dia);
  }, [vendasEquipe]);

  const totalEquipe = useMemo(
    () => vendasEquipe.reduce((acc, v) => acc + Number(v.seller_value ?? v.sale_value ?? 0), 0),
    [vendasEquipe]
  );

  // Financeiro por dia — Checkout Direto
  const financeiroCheckoutPorDia = useMemo(() => {
    const map = new Map<number, { total: number; qtd: number }>();
    for (const v of vendasCheckout) {
      const dia = toBRT(v.created_at).getUTCDate();
      const val = Number(v.sale_value ?? 0);
      const entry = map.get(dia) ?? { total: 0, qtd: 0 };
      entry.total += val;
      entry.qtd++;
      map.set(dia, entry);
    }
    return Array.from(map.entries())
      .map(([dia, dados]) => ({ dia, ...dados }))
      .sort((a, b) => a.dia - b.dia);
  }, [vendasCheckout]);

  const totalCheckout = useMemo(
    () => vendasCheckout.reduce((acc, v) => acc + Number(v.sale_value ?? 0), 0),
    [vendasCheckout]
  );

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
          <div className="bg-zinc-900 border border-orange-800/50 rounded-xl p-4">
            <p className="text-orange-400 text-[10px] uppercase tracking-widest mb-1">Tráfego Pago</p>
            <p className="text-2xl font-black text-orange-300">{qtdTrafego}</p>
            <p className="text-zinc-600 text-[10px]">vendas via tráfego</p>
          </div>
          <div className="bg-zinc-900 border border-green-800/50 rounded-xl p-4">
            <p className="text-green-500 text-[10px] uppercase tracking-widest mb-1">Equipe de Vendas</p>
            <p className="text-2xl font-black text-green-400">{qtdEquipe}</p>
            <p className="text-zinc-600 text-[10px]">vendas c/ vendedor</p>
          </div>
          <div className="bg-zinc-900 border border-purple-800/50 rounded-xl p-4">
            <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-1">Checkout Direto</p>
            <p className="text-2xl font-black text-purple-400">{qtdCheckout}</p>
            <p className="text-zinc-600 text-[10px]">sem vendedor/tráfego</p>
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

          {/* Cards de valor — focados em tráfego pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-orange-950/40 rounded-xl p-4 border border-orange-800/40">
              <p className="text-orange-400 text-[10px] uppercase tracking-widest mb-1">Total Tráfego Pago</p>
              <p className="text-xl font-black text-orange-300">{formataBRL(totaisFinanceiros.globalTotal)}</p>
              <p className="text-zinc-600 text-[10px]">{vendasDoMes.length} venda{vendasDoMes.length !== 1 ? 's' : ''} via tráfego</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/50">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Ticket Médio</p>
              <p className="text-xl font-black text-white">
                {vendasDoMes.length > 0 ? formataBRL(totaisFinanceiros.globalTotal / vendasDoMes.length) : 'R$ 0,00'}
              </p>
              <p className="text-zinc-600 text-[10px]">por conversão</p>
            </div>
          </div>

          {/* Tabela por dia */}
          {financeiroPorDia.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Dia</th>
                    <th className="text-right text-orange-400 uppercase tracking-widest font-bold py-2 pr-4">Total Tráfego</th>
                  </tr>
                </thead>
                <tbody>
                  {financeiroPorDia.map(({ dia, total }) => {
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
                          <span className="text-orange-300 font-black">{formataBRL(total)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td className="py-2.5 pr-4 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Total</td>
                    <td className="py-2.5 pr-4 text-right font-black text-orange-300">{formataBRL(totaisFinanceiros.globalTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Seção Equipe de Vendas */}
        <div className="bg-zinc-900 border border-green-800/50 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-green-400">
            👥 Equipe de Vendas — {MESES[mesSel.mes]} {mesSel.ano}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-green-950/40 rounded-xl p-4 border border-green-800/40">
              <p className="text-green-400 text-[10px] uppercase tracking-widest mb-1">Total Equipe de Vendas</p>
              <p className="text-xl font-black text-green-300">{formataBRL(totalEquipe)}</p>
              <p className="text-zinc-600 text-[10px]">{vendasEquipe.length} venda{vendasEquipe.length !== 1 ? 's' : ''} com vendedor</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/50">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Ticket Médio</p>
              <p className="text-xl font-black text-white">
                {vendasEquipe.length > 0 ? formataBRL(totalEquipe / vendasEquipe.length) : 'R$ 0,00'}
              </p>
              <p className="text-zinc-600 text-[10px]">por venda com vendedor</p>
            </div>
          </div>
          {financeiroEquipePorDia.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Dia</th>
                    <th className="text-right text-green-400 uppercase tracking-widest font-bold py-2 pr-4">Total Equipe</th>
                  </tr>
                </thead>
                <tbody>
                  {financeiroEquipePorDia.map(({ dia, total, qtd }) => (
                    <tr key={dia} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className="font-black text-white">
                          {String(dia).padStart(2,'0')}/{mesSel.mes+1}
                        </span>
                        <span className="text-zinc-600 ml-2 text-[10px]">{qtd} venda{qtd !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-green-300 font-black">{formataBRL(total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td className="py-2.5 pr-4 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Total</td>
                    <td className="py-2.5 pr-4 text-right font-black text-green-300">{formataBRL(totalEquipe)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Seção Checkout Direto */}
        <div className="bg-zinc-900 border border-purple-800/50 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">
            🛒 Checkout Direto — {MESES[mesSel.mes]} {mesSel.ano}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-purple-950/40 rounded-xl p-4 border border-purple-800/40">
              <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-1">Total Checkout Direto</p>
              <p className="text-xl font-black text-purple-300">{formataBRL(totalCheckout)}</p>
              <p className="text-zinc-600 text-[10px]">{vendasCheckout.length} venda{vendasCheckout.length !== 1 ? 's' : ''} sem vendedor/tráfego</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/50">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Ticket Médio</p>
              <p className="text-xl font-black text-white">
                {vendasCheckout.length > 0 ? formataBRL(totalCheckout / vendasCheckout.length) : 'R$ 0,00'}
              </p>
              <p className="text-zinc-600 text-[10px]">por checkout direto</p>
            </div>
          </div>
          {financeiroCheckoutPorDia.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Dia</th>
                    <th className="text-right text-purple-400 uppercase tracking-widest font-bold py-2 pr-4">Total Checkout</th>
                  </tr>
                </thead>
                <tbody>
                  {financeiroCheckoutPorDia.map(({ dia, total, qtd }) => (
                    <tr key={dia} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className="font-black text-white">
                          {String(dia).padStart(2,'0')}/{mesSel.mes+1}
                        </span>
                        <span className="text-zinc-600 ml-2 text-[10px]">{qtd} venda{qtd !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className="text-purple-300 font-black">{formataBRL(total)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700">
                    <td className="py-2.5 pr-4 font-black text-zinc-400 uppercase text-[10px] tracking-widest">Total</td>
                    <td className="py-2.5 pr-4 text-right font-black text-purple-300">{formataBRL(totalCheckout)}</td>
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

        {/* Tabela de cursos vendidos — apenas tráfego */}
        {porProduto.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
              📦 Conversões por Curso (Tráfego) — {MESES[mesSel.mes]} {mesSel.ano}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-zinc-500 uppercase tracking-widest font-bold py-2 pr-4">Curso</th>
                    <th className="text-center text-orange-400 uppercase tracking-widest font-bold py-2">Conversões</th>
                  </tr>
                </thead>
                <tbody>
                  {porProduto.map(p => (
                    <tr key={p.nome} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="text-white font-semibold">{p.nome}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-orange-300 font-black text-sm">{p.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de detalhes do dia */}
        {diaSel !== null && (() => {
          const todasDoDia = porDia.get(diaSel) || [];

          const cursosDia = (() => {
            const map = new Map<string, { total: number }>();
            for (const v of todasDoDia) {
              const nome = v.product_name || 'Desconhecido';
              const e = map.get(nome) ?? { total: 0 };
              e.total++;
              map.set(nome, e);
            }
            return Array.from(map.entries())
              .map(([nome, d]) => ({ nome, ...d }))
              .sort((a, b) => b.total - a.total);
          })();

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={e => { if (e.target === e.currentTarget) setDiaSel(null); }}
            >
              <div className="bg-zinc-900 border border-yellow-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header fixo */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                  <div>
                    <p className="text-yellow-400 font-black text-base uppercase tracking-widest">
                      📅 {String(diaSel).padStart(2,'0')}/{mesSel.mes+1}/{mesSel.ano}
                    </p>
                    <p className="text-zinc-500 text-[11px]">{todasDoDia.length} venda{todasDoDia.length !== 1 ? 's' : ''} aprovadas</p>
                  </div>
                  <button
                    onClick={() => setDiaSel(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Conteúdo com scroll */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                  {/* Contador — apenas tráfego do dia */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-orange-950/50 border border-orange-800/30 rounded-xl p-3 text-center">
                      <p className="text-orange-400 text-[10px] uppercase tracking-widest mb-1">Conversões Tráfego</p>
                      <p className="text-2xl font-black text-orange-300">{todasDoDia.length}</p>
                    </div>
                  </div>

                  {/* Cursos vendidos */}
                  <div className="space-y-2">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Cursos convertidos</p>
                    {cursosDia.map(c => (
                      <div key={c.nome} className="bg-zinc-800/40 rounded-lg px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-xs truncate">{c.nome}</p>
                        </div>
                        <span className="text-orange-300 font-black text-sm">{c.total}</span>
                      </div>
                    ))}
                  </div>

                  {/* Lista de vendas */}
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Lista de vendas</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Produto..."
                          value={filtroProduto}
                          onChange={e => setFiltroProduto(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-yellow-400 placeholder:text-zinc-600 w-28"
                        />
                        <input
                          type="text"
                          placeholder="Vendedor..."
                          value={filtroVendedor}
                          onChange={e => setFiltroVendedor(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-yellow-400 placeholder:text-zinc-600 w-28"
                        />
                      </div>
                    </div>

                    {vendasDiaSel.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-4">Nenhuma venda encontrada.</p>
                    ) : (
                      <div className="space-y-1">
                        {vendasDiaSel.map(v => {
                          const hora = toBRT(v.created_at).getUTCHours();
                          // Todas as vendas nesta página são de tráfego
                          const utmLabel = (v.payment_method || '').match(/trafego-[\w]+/i)?.[0] || 'Tráfego';
                          return (
                            <div key={v.id} className="bg-zinc-800/30 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                              <span className={`font-black shrink-0 w-12 ${classeTurno(hora)}`}>{formatHora(v.created_at)}</span>
                              <span className="text-white font-semibold flex-1 truncate">{v.product_name}</span>
                              <span className="text-zinc-400 truncate hidden sm:block w-28">{v.customer_name}</span>
                              <span className="text-orange-400 font-bold shrink-0">{utmLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer fixo com botão fechar */}
                <div className="px-5 py-3 border-t border-zinc-800 shrink-0">
                  <button
                    onClick={() => setDiaSel(null)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    Fechar
                  </button>
                </div>
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
