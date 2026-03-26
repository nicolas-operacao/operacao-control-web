import React from 'react';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string; 
  payment_method?: string; // Adicionado para podermos ler o método
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

// Objeto que agrupa o relatório por Método de Pagamento
type RelatorioPorMetodo = {
  metodo: string;
  vendasCount: number;
  valorTotal: number;
  vendedores: ItemRelatorio[];
  produtos: Record<string, number>;
};

export function RelatorioBatalha({ vendas, titulo, subtitulo, onClose }: RelatorioBatalhaProps) {
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🔥 1. Motor Tático: Agrupa tudo separando por Método de Pagamento
  const agrupamentoGeral = vendas.reduce((acc: Record<string, RelatorioPorMetodo>, venda) => {
    // Normaliza o nome do método (Junta todos os cartões em "Cartão")
    let metodoOriginal = venda.payment_method || 'Não Informado';
    let metodoAgrupado = metodoOriginal;
    
    if (metodoOriginal.includes('Cartão') || metodoOriginal.includes('Crédito') || metodoOriginal.includes('Débito')) {
      metodoAgrupado = '💳 Cartões (Crédito/Débito)';
    } else if (metodoOriginal === 'PIX') {
      metodoAgrupado = '⚡ PIX';
    } else if (metodoOriginal === 'Boleto Parcelado') {
      metodoAgrupado = '📄 Boleto Parcelado';
    } else {
      metodoAgrupado = `❓ ${metodoOriginal}`;
    }

    // Cria o esquadrão de pagamento se não existir
    if (!acc[metodoAgrupado]) {
      acc[metodoAgrupado] = { metodo: metodoAgrupado, vendasCount: 0, valorTotal: 0, vendedores: [], produtos: {} };
    }

    acc[metodoAgrupado].vendasCount += 1;
    acc[metodoAgrupado].valorTotal += Number(venda.sale_value);

    // Agrupa os produtos globais desse método
    const prodNome = venda.product_name;
    acc[metodoAgrupado].produtos[prodNome] = (acc[metodoAgrupado].produtos[prodNome] || 0) + 1;

    // Agrupa os soldados dentro desse método
    const nomeSoldado = venda.seller_name || 'Desconhecido';
    
    // Procura se o soldado já está na lista desse método
    let soldadoObj = acc[metodoAgrupado].vendedores.find(v => v.nome === nomeSoldado);
    if (!soldadoObj) {
      soldadoObj = { nome: nomeSoldado, totalVendas: 0, valorTotal: 0, produtos: {} };
      acc[metodoAgrupado].vendedores.push(soldadoObj);
    }
    
    soldadoObj.totalVendas += 1;
    soldadoObj.valorTotal += Number(venda.sale_value);
    soldadoObj.produtos[prodNome] = (soldadoObj.produtos[prodNome] || 0) + 1;

    return acc;
  }, {});

  // Converte o objeto em um Array e ordena os métodos (Maior valor primeiro)
  const relatoriosProntos = Object.values(agrupamentoGeral).sort((a, b) => b.valorTotal - a.valorTotal);
  
  // E ordena os soldados dentro de cada método (Quem vendeu mais primeiro)
  relatoriosProntos.forEach(relatorio => {
    relatorio.vendedores.sort((a, b) => b.valorTotal - a.valorTotal);
  });

  const valorTotalGeral = vendas.reduce((acc, curr) => acc + Number(curr.sale_value), 0);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* CABEÇALHO DO RELATÓRIO */}
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

      {/* PAINEL DE RESUMO GERAL */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left flex-shrink-0">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Volume de Operações</p>
          <p className="text-white text-2xl font-black">{vendas.length} <span className="text-sm font-bold text-zinc-500">vendas no total</span></p>
        </div>
        <div className="text-center md:text-right flex-shrink-0 w-full md:w-auto">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Arrecadação Global no Período</p>
          <p className="text-green-400 text-3xl font-black drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]">
            {formataBRL(valorTotalGeral)}
          </p>
        </div>
      </div>

      {/* VERIFICA SE HÁ VENDAS */}
      {relatoriosProntos.length === 0 ? (
        <div className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic border border-zinc-800 border-dashed rounded-lg bg-zinc-950/50">
          Nenhuma movimentação neste período.
        </div>
      ) : (
        /* 🔥 RENDERIZAÇÃO MÚLTIPLA: UMA TABELA POR MÉTODO DE PAGAMENTO */
        <div className="space-y-12">
          {relatoriosProntos.map((relatorioMetodo, idx) => (
            <div key={idx} className="bg-zinc-950/50 rounded-xl border border-zinc-800/80 overflow-hidden shadow-inner">
              
              {/* CABEÇALHO DO ESQUADRÃO DE PAGAMENTO */}
              <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="text-lg font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  {relatorioMetodo.metodo}
                </h4>
                
                <div className="flex gap-6 items-center">
                  <div className="text-right hidden md:block">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-2">Itens:</span>
                    <span className="text-white font-bold text-sm bg-zinc-950 px-2 py-1 rounded border border-zinc-700">{relatorioMetodo.vendasCount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-2 block md:inline">Total {relatorioMetodo.metodo.split(' ')[1]}:</span>
                    <span className="text-green-400 font-black text-xl">{formataBRL(relatorioMetodo.valorTotal)}</span>
                  </div>
                </div>
              </div>

              {/* LISTA DE PRODUTOS DESTE MÉTODO */}
              <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center px-2">Produtos:</span>
                {Object.entries(relatorioMetodo.produtos).map(([nomeProduto, qtd]) => (
                  <div key={nomeProduto} className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded flex items-center gap-2">
                    <span className="text-yellow-400 font-black text-xs">{qtd}x</span>
                    <span className="text-zinc-400 text-[10px] uppercase font-bold">{nomeProduto}</span>
                  </div>
                ))}
              </div>

              {/* TABELA DE SOLDADOS DESTE MÉTODO */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800/50 text-zinc-600 text-[10px] uppercase tracking-widest bg-zinc-950/80">
                      <th className="p-3 font-black">Soldado</th>
                      <th className="p-3 font-black text-center w-32">Nº Vendas</th>
                      <th className="p-3 font-black">Armamento Usado</th>
                      <th className="p-3 font-black text-right w-40">Valor Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {relatorioMetodo.vendedores.map((item, index) => (
                      <tr key={index} className="border-b border-zinc-800/30 hover:bg-zinc-900 transition-colors">
                        <td className="p-3 font-bold text-zinc-300 uppercase tracking-wider">{item.nome}</td>
                        <td className="p-3 text-center font-bold text-white">
                          <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">{item.totalVendas}</span>
                        </td>
                        <td className="p-3 text-zinc-400 text-[10px]">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(item.produtos).map(([nomeProduto, qtd]) => (
                              <span key={nomeProduto} className="bg-zinc-950 px-2 py-1 rounded uppercase font-bold border border-zinc-800">
                                <span className="text-blue-400">{String(qtd)}x</span> {nomeProduto}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-green-400/80 font-black text-right whitespace-nowrap">{formataBRL(item.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))}
        </div>
      )}
      
    </div>
  );
}