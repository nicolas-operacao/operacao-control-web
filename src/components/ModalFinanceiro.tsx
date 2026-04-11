import React, { useState, useMemo } from 'react';
import { somClick, somHover } from '../services/hudSounds';

interface Venda {
  id: string;
  seller_name?: string;
  sale_value: number;
  created_at: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendas: Venda[];
}

export function ModalFinanceiro({ isOpen, onClose, vendas }: Props) {
  const dataAtual = new Date();
  if (dataAtual.getDate() < 5) dataAtual.setMonth(dataAtual.getMonth() - 1);
  const defaultMonth = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

  const [mesSelecionado, setMesSelecionado] = useState(defaultMonth);

  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const stats = useMemo(() => {
    const aprovadasDoMes = vendas.filter(v => {
      if (v.status !== 'aprovada' || !v.created_at) return false;
      return v.created_at.startsWith(mesSelecionado);
    });

    let totalGeral = 0;
    let totalComissoes = 0;
    const ranking: Record<string, { total: number; qtd: number }> = {};

    aprovadasDoMes.forEach(v => {
      const valor = Number(v.sale_value) || 0;
      totalGeral += valor;
      const seller = v.seller_name || 'Desconhecido';
      if (!ranking[seller]) ranking[seller] = { total: 0, qtd: 0 };
      ranking[seller].total += valor;
      ranking[seller].qtd += 1;
    });

    const listaSellers = Object.entries(ranking)
      .map(([nome, dados]) => {
        const isCheckout = nome === 'Checkout Automático' || nome === 'CHECKOUT';
        let taxaPercentual = 0;
        if (!isCheckout) {
          if (dados.qtd >= 1 && dados.qtd <= 60) taxaPercentual = 1;
          else if (dados.qtd >= 61 && dados.qtd <= 100) taxaPercentual = 2;
          else if (dados.qtd >= 101) taxaPercentual = 2.5;
        }
        const comissao = dados.total * (taxaPercentual / 100);
        if (!isCheckout) totalComissoes += comissao;
        return { nome, total: dados.total, qtd: dados.qtd, taxa: taxaPercentual, comissao, isCheckout };
      })
      .sort((a, b) => b.total - a.total);

    return { totalGeral, totalComissoes, listaSellers };
  }, [vendas, mesSelecionado]);

  function exportarCSV() {
    const linhas = [
      ['Soldado', 'Vendas', 'Faturamento (R$)', 'Taxa (%)', 'Comissão (R$)'],
      ...stats.listaSellers.map(s => [
        s.nome,
        String(s.qtd),
        s.total.toFixed(2).replace('.', ','),
        s.isCheckout ? '--' : String(s.taxa),
        s.isCheckout ? 'DIRETO AO CAIXA' : s.comissao.toFixed(2).replace('.', ','),
      ]),
      [],
      ['', '', 'Faturamento Bruto', '', stats.totalGeral.toFixed(2).replace('.', ',')],
      ['', '', 'Total Comissões', '', stats.totalComissoes.toFixed(2).replace('.', ',')],
      ['', '', 'Sua Comissão (1%)', '', (stats.totalGeral * 0.01).toFixed(2).replace('.', ',')],
    ];
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-${mesSelecionado}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-zinc-900 border border-green-500/30 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh]">

        {/* CABEÇALHO */}
        <div className="px-4 py-3 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-green-900/10 flex-shrink-0">
          <h2 className="text-base sm:text-xl font-black text-green-400 uppercase flex items-center gap-2">
            💰 <span className="hidden sm:inline">Quartel General do </span>Financeiro
          </h2>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        {/* CONTROLE DE MÊS + REGRAS */}
        <div className="px-4 py-3 sm:p-6 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Mês de Fechamento</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="w-full sm:w-52 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 [color-scheme:dark] font-bold text-sm"
              />
            </div>
            <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 sm:p-3">
              <div className="flex flex-col items-center gap-0.5"><span className="text-white text-[10px]">1–60</span><span className="text-green-500">1%</span></div>
              <div className="w-px bg-zinc-800"></div>
              <div className="flex flex-col items-center gap-0.5"><span className="text-white text-[10px]">61–100</span><span className="text-green-500">2%</span></div>
              <div className="w-px bg-zinc-800"></div>
              <div className="flex flex-col items-center gap-0.5"><span className="text-white text-[10px]">101+</span><span className="text-green-500">2,5%</span></div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="px-4 py-3 sm:p-6 grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 flex-shrink-0">
          <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-5 rounded-xl">
            <p className="text-zinc-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Faturamento</p>
            <p className="text-sm sm:text-2xl font-black text-white mt-1 leading-tight">{formataBRL(stats.totalGeral)}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-3 sm:p-5 rounded-xl">
            <p className="text-zinc-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Comissões</p>
            <p className="text-sm sm:text-2xl font-black text-zinc-300 mt-1 leading-tight">{formataBRL(stats.totalComissoes)}</p>
          </div>
          <div className="bg-green-950/20 border border-green-500/30 p-3 sm:p-5 rounded-xl">
            <p className="text-green-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Sua Comissão</p>
            <p className="text-sm sm:text-2xl font-black text-green-400 mt-1 leading-tight">{formataBRL(stats.totalGeral * 0.01)}</p>
          </div>
        </div>

        {/* LISTA — cards no mobile, tabela no desktop */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">Fechamento por Soldado</p>

          {/* MOBILE: cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {stats.listaSellers.length === 0 ? (
              <p className="text-center text-zinc-600 font-bold uppercase tracking-widest text-xs py-8">Nenhuma venda aprovada neste mês.</p>
            ) : stats.listaSellers.map((seller, idx) => (
              <div key={idx} className={`bg-zinc-950 border border-zinc-800 rounded-xl p-3 ${seller.isCheckout ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{seller.isCheckout ? '🤖' : '🪖'}</span>
                    <span className="font-black uppercase text-xs text-white truncate max-w-[150px]">{seller.nome}</span>
                  </div>
                  {!seller.isCheckout && (
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded">{seller.taxa}%</span>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase font-black">{seller.qtd} vendas</p>
                    <p className="text-zinc-300 font-bold text-sm">{formataBRL(seller.total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-500 text-[10px] uppercase font-black">comissão</p>
                    {seller.isCheckout
                      ? <p className="text-zinc-600 text-[10px] font-black uppercase">direto ao caixa</p>
                      : <p className="text-green-400 font-black text-sm">{formataBRL(seller.comissao)}</p>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: tabela */}
          <div className="hidden sm:block overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                  <th className="p-4 font-black">Soldado</th>
                  <th className="p-4 font-black text-center">Vendas</th>
                  <th className="p-4 font-black text-right">Faturamento</th>
                  <th className="p-4 font-black text-center">Taxa</th>
                  <th className="p-4 font-black text-right bg-green-950/30 text-green-500">Comissão</th>
                </tr>
              </thead>
              <tbody className="text-sm bg-zinc-950">
                {stats.listaSellers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-600 font-bold uppercase tracking-widest">Nenhuma venda aprovada neste mês.</td></tr>
                ) : stats.listaSellers.map((seller, idx) => (
                  <tr key={idx} className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${seller.isCheckout ? 'opacity-50' : ''}`}>
                    <td className="p-4 flex items-center gap-2">
                      {seller.isCheckout ? '🤖' : '🪖'}
                      <span className={`font-black uppercase text-xs ${seller.isCheckout ? 'text-zinc-500' : 'text-white'}`}>{seller.nome}</span>
                    </td>
                    <td className="p-4 text-center font-black text-blue-400">{seller.qtd}</td>
                    <td className="p-4 text-right text-zinc-300 font-bold">{formataBRL(seller.total)}</td>
                    <td className="p-4 text-center font-black text-zinc-500">
                      {seller.isCheckout ? '--' : <span className="bg-zinc-800 px-2 py-1 rounded text-[10px]">{seller.taxa}%</span>}
                    </td>
                    <td className="p-4 text-right font-black text-green-400 bg-green-950/10">
                      {seller.isCheckout
                        ? <span className="text-zinc-600 text-xs tracking-widest">DIRETO PRO CAIXA</span>
                        : formataBRL(seller.comissao)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="px-4 py-3 sm:p-6 border-t border-zinc-800 bg-zinc-950 flex-shrink-0 flex gap-2 justify-end">
          <button onMouseEnter={somHover} onClick={() => { somClick(); exportarCSV(); }} className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-5 rounded-xl uppercase tracking-widest transition-colors text-xs flex items-center gap-2">
            📥 Exportar CSV
          </button>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-widest transition-colors text-xs">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
