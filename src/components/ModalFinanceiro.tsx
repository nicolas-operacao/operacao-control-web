import React, { useState, useMemo } from 'react';

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
  // Pega o mês atual como padrão
  const dataAtual = new Date();
  if (dataAtual.getDate() < 5) dataAtual.setMonth(dataAtual.getMonth() - 1);
  const defaultMonth = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

  const [mesSelecionado, setMesSelecionado] = useState(defaultMonth);

  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🔥 MOTOR DE FECHAMENTO FINANCEIRO (COM REGRAS AUTOMÁTICAS)
  const stats = useMemo(() => {
    // 1. Filtra só as vendas Aprovadas e do Mês selecionado
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

    // 2. Converte para lista e aplica a TAXA BASEADA NA QUANTIDADE DE VENDAS
    const listaSellers = Object.entries(ranking)
      .map(([nome, dados]) => {
        const isCheckout = nome === 'Checkout Automático';
        
        let taxaPercentual = 0;

        if (!isCheckout) {
          // 🔥 A REGRA DE OURO DA TROPA APLICADA AQUI 
          if (dados.qtd >= 1 && dados.qtd <= 60) {
            taxaPercentual = 1; // 1%
          } else if (dados.qtd >= 61 && dados.qtd <= 100) {
            taxaPercentual = 2; // 2%
          } else if (dados.qtd >= 101) {
            taxaPercentual = 2.5; // 2.5%
          }
        }

        const comissao = dados.total * (taxaPercentual / 100);
        
        if (!isCheckout) totalComissoes += comissao;

        return {
          nome,
          total: dados.total,
          qtd: dados.qtd,
          taxa: taxaPercentual,
          comissao,
          isCheckout
        };
      })
      .sort((a, b) => b.total - a.total); // Ordena quem faturou mais pro topo

    return { totalGeral, totalComissoes, listaSellers };
  }, [vendas, mesSelecionado]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-green-500/30 rounded-2xl w-full max-w-5xl shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        
        {/* CABEÇALHO */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-green-900/10">
          <h2 className="text-xl font-black text-green-400 uppercase flex items-center gap-2">
            💰 Quartel General do Financeiro
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>

        {/* PAINEL DE CONTROLE E REGRAS (A caixa de 30% sumiu, agora mostra a regra) */}
        <div className="p-6 bg-zinc-950 border-b border-zinc-800 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="w-full md:w-auto">
            <label className="block text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Selecione o Mês de Fechamento</label>
            <input 
              type="month" 
              value={mesSelecionado} 
              onChange={(e) => setMesSelecionado(e.target.value)} 
              className="w-full md:w-64 bg-zinc-900 border border-zinc-700 text-white rounded-lg p-3 focus:outline-none focus:border-green-500 [color-scheme:dark] font-bold tracking-widest"
            />
          </div>
          
          <div className="w-full md:w-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex gap-4 text-[10px] uppercase font-black tracking-widest text-zinc-500">
            <div className="flex flex-col items-center"><span className="text-white">1 a 60 Vendas</span><span className="text-green-500">1%</span></div>
            <div className="w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center"><span className="text-white">61 a 100 Vendas</span><span className="text-green-500">2%</span></div>
            <div className="w-px bg-zinc-800"></div>
            <div className="flex flex-col items-center"><span className="text-white">101+ Vendas</span><span className="text-green-500">2,5%</span></div>
          </div>
        </div>

        {/* ESTATÍSTICAS GERAIS */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Faturamento Bruto no Mês</p>
              <h3 className="text-3xl font-black text-white mt-1">{formataBRL(stats.totalGeral)}</h3>
            </div>
            <span className="text-4xl">📈</span>
          </div>
          <div className="bg-green-950/20 border border-green-500/20 p-6 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(34,197,94,0.05)]">
            <div>
              <p className="text-green-500 text-[10px] uppercase font-black tracking-widest">Total de Comissões a Pagar</p>
              <h3 className="text-3xl font-black text-green-400 mt-1">{formataBRL(stats.totalComissoes)}</h3>
            </div>
            <span className="text-4xl">💸</span>
          </div>
        </div>

        {/* TABELA DE PAGAMENTOS */}
        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-4">Relatório de Fechamento por Soldado</h3>
          
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-zinc-900 backdrop-blur">
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                  <th className="p-4 font-black">Soldado</th>
                  <th className="p-4 font-black text-center">Vendas Realizadas</th>
                  <th className="p-4 font-black text-right">Faturamento</th>
                  <th className="p-4 font-black text-center">Taxa Aplicada</th>
                  <th className="p-4 font-black text-right bg-green-950/30 text-green-500">Comissão a Pagar</th>
                </tr>
              </thead>
              <tbody className="text-sm bg-zinc-950">
                {stats.listaSellers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-600 font-bold uppercase tracking-widest">Nenhuma venda aprovada neste mês.</td></tr>
                ) : (
                  stats.listaSellers.map((seller, idx) => (
                    <tr key={idx} className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${seller.isCheckout ? 'opacity-50' : ''}`}>
                      <td className="p-4 flex items-center gap-2">
                        {seller.isCheckout ? '🤖' : '🪖'} 
                        <span className={`font-black uppercase text-xs ${seller.isCheckout ? 'text-zinc-500' : 'text-white'}`}>
                          {seller.nome}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-blue-400">{seller.qtd}</td>
                      <td className="p-4 text-right text-zinc-300 font-bold">{formataBRL(seller.total)}</td>
                      <td className="p-4 text-center font-black text-zinc-500">
                        {seller.isCheckout ? '--' : <span className="bg-zinc-800 px-2 py-1 rounded text-[10px]">{seller.taxa}%</span>}
                      </td>
                      <td className="p-4 text-right font-black text-green-400 bg-green-950/10">
                        {seller.isCheckout ? (
                          <span className="text-zinc-600 text-xs tracking-widest">DIRETO PRO CAIXA</span>
                        ) : (
                          formataBRL(seller.comissao)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl uppercase tracking-widest transition-colors text-xs">
            Fechar Financeiro
          </button>
        </div>
      </div>
    </div>
  );
}