import React from 'react';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string; 
};

interface RelatorioBatalhaProps {
  vendas: Venda[];
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
}

type ItemRelatorio = {
  nome: string;
  totalVendas: number;
  valorTotal: number;
  produtos: Record<string, number>;
};

export function RelatorioBatalha({ vendas, titulo, subtitulo, onClose }: RelatorioBatalhaProps) {
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🔥 1. Agrupa as vendas por SOLDADO
  const mapaVendedores = vendas.reduce((acc: Record<string, ItemRelatorio>, venda) => {
    const nome = venda.seller_name || 'Desconhecido';
    if (!acc[nome]) {
      acc[nome] = { nome: nome, totalVendas: 0, valorTotal: 0, produtos: {} };
    }
    acc[nome].totalVendas += 1;
    acc[nome].valorTotal += Number(venda.sale_value);
    
    const prodNome = venda.product_name;
    acc[nome].produtos[prodNome] = (acc[nome].produtos[prodNome] || 0) + 1;
    return acc;
  }, {});

  // 🔥 2. NOVO: Agrupa a quantidade geral por PRODUTO
  const totaisPorProduto = vendas.reduce((acc: Record<string, number>, venda) => {
    const prodNome = venda.product_name;
    acc[prodNome] = (acc[prodNome] || 0) + 1;
    return acc;
  }, {});

  // Ordena os soldados do que vendeu mais R$ para o que vendeu menos
  const relatorioAgrupado = Object.values(mapaVendedores).sort((a, b) => b.valorTotal - a.valorTotal);
  
  // Soma o valor de tudo
  const valorTotalGeral = vendas.reduce((acc, curr) => acc + Number(curr.sale_value), 0);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
        <div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-yellow-400">⚡</span> {titulo}
            </h3>
            {subtitulo && <p className="text-zinc-400 text-xs font-bold uppercase mt-1">{subtitulo}</p>}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-500 font-bold uppercase text-xs transition-colors px-3 py-1 border border-zinc-800 rounded hover:border-red-500">
          FECHAR X
        </button>
      </div>

      {/* 🔥 PAINEL DE RESUMO ATUALIZADO */}
      <div className="bg-yellow-400/10 border border-yellow-400/30 p-4 rounded-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="text-center md:text-left flex-shrink-0">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Quantidade Total</p>
          <p className="text-white text-2xl font-black">{vendas.length} vendas</p>
        </div>

        {/* 🔥 NOVO: RESUMO DO ARSENAL (PRODUTOS VENDIDOS) */}
        <div className="flex-1 w-full md:border-l md:border-r border-yellow-400/20 md:px-6 flex flex-wrap gap-2 justify-center md:justify-start">
          {Object.entries(totaisPorProduto).map(([nomeProduto, qtd]) => (
            <div key={nomeProduto} className="bg-zinc-950/80 border border-yellow-400/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="text-yellow-400 font-black text-sm">{qtd}x</span>
              <span className="text-zinc-300 text-[10px] uppercase font-bold">{nomeProduto}</span>
            </div>
          ))}
          {Object.keys(totaisPorProduto).length === 0 && (
            <span className="text-zinc-500 text-[10px] uppercase font-bold">Nenhum produto</span>
          )}
        </div>

        <div className="text-center md:text-right flex-shrink-0 w-full md:w-auto">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Movimentado</p>
          <p className="text-green-400 text-2xl font-black">{formataBRL(valorTotalGeral)}</p>
        </div>
        
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest">
              <th className="pb-4 font-black">Soldado</th>
              <th className="pb-4 font-black text-center w-32">Qtd Vendas</th>
              <th className="pb-4 font-black">Produtos Vendidos</th>
              <th className="pb-4 font-black text-right w-40">Total Arrecadado</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {relatorioAgrupado.length > 0 ? relatorioAgrupado.map((item, index) => (
              <tr key={index} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
                <td className="py-4 font-black text-blue-400 uppercase tracking-wider">{item.nome}</td>
                <td className="py-4 text-center font-bold text-white">
                  <span className="bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">{item.totalVendas}</span>
                </td>
                <td className="py-4 text-zinc-300 text-xs">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(item.produtos).map(([nomeProduto, qtd]) => (
                      <span key={nomeProduto} className="bg-zinc-800 px-2 py-1 rounded text-[10px] uppercase font-bold border border-zinc-700">
                        <span className="text-yellow-400">{String(qtd)}x</span> {nomeProduto}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 text-green-400 font-black text-right whitespace-nowrap">{formataBRL(item.valorTotal)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic">
                  Nenhuma movimentação neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}