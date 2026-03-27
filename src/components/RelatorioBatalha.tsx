import React, { useState } from 'react';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string; 
  payment_method?: string; 
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

type RelatorioPorMetodo = {
  metodo: string;
  vendasCount: number;
  valorTotal: number;
  vendedores: ItemRelatorio[];
  produtos: Record<string, number>;
};

type VisaoGeralSoldado = {
  nome: string;
  totalVendas: number;
  valorTotal: number;
  qtdPix: number;
  qtdCartao: number;
  qtdBoleto: number;
  qtdOutros: number;
};

export function RelatorioBatalha({ vendas, titulo, subtitulo, onClose }: RelatorioBatalhaProps) {
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🔥 ESTADO DAS GUIAS (TABS)
  const [abaAtiva, setAbaAtiva] = useState<string>('VISÃO GERAL');

  // ========================================================
  // 1. MOTOR GERAL (Agrupa tudo por Soldado para a aba Geral)
  // ========================================================
  const mapaGeral = vendas.reduce((acc: Record<string, VisaoGeralSoldado>, venda) => {
    const nome = venda.seller_name || 'Desconhecido';
    if (!acc[nome]) {
      acc[nome] = { nome, totalVendas: 0, valorTotal: 0, qtdPix: 0, qtdCartao: 0, qtdBoleto: 0, qtdOutros: 0 };
    }

    acc[nome].totalVendas += 1;
    acc[nome].valorTotal += Number(venda.sale_value);

    const m = venda.payment_method || '';
    if (m === 'PIX') acc[nome].qtdPix += 1;
    else if (m.includes('Cartão') || m.includes('Crédito') || m.includes('Débito')) acc[nome].qtdCartao += 1;
    else if (m.includes('Boleto')) acc[nome].qtdBoleto += 1;
    else acc[nome].qtdOutros += 1;

    return acc;
  }, {});

  const listaGeralPronta = Object.values(mapaGeral).sort((a, b) => b.valorTotal - a.valorTotal);

  // ========================================================
  // 2. MOTOR ESPECÍFICO (Agrupa por Método para as outras abas)
  // ========================================================
  const agrupamentoPorMetodo = vendas.reduce((acc: Record<string, RelatorioPorMetodo>, venda) => {
    let metodoOriginal = venda.payment_method || 'Não Informado';
    let metodoAgrupado = metodoOriginal;
    
    if (metodoOriginal.includes('Cartão') || metodoOriginal.includes('Crédito') || metodoOriginal.includes('Débito')) {
      metodoAgrupado = '💳 CARTÕES';
    } else if (metodoOriginal === 'PIX') {
      metodoAgrupado = '⚡ PIX';
    } else if (metodoOriginal === 'Boleto Parcelado') {
      metodoAgrupado = '📄 BOLETOS';
    } else {
      metodoAgrupado = `❓ OUTROS`;
    }

    if (!acc[metodoAgrupado]) {
      acc[metodoAgrupado] = { metodo: metodoAgrupado, vendasCount: 0, valorTotal: 0, vendedores: [], produtos: {} };
    }

    acc[metodoAgrupado].vendasCount += 1;
    acc[metodoAgrupado].valorTotal += Number(venda.sale_value);

    const prodNome = venda.product_name;
    acc[metodoAgrupado].produtos[prodNome] = (acc[metodoAgrupado].produtos[prodNome] || 0) + 1;

    const nomeSoldado = venda.seller_name || 'Desconhecido';
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

  const relatoriosMetodos = Object.values(agrupamentoPorMetodo).sort((a, b) => b.valorTotal - a.valorTotal);
  relatoriosMetodos.forEach(r => r.vendedores.sort((a, b) => b.valorTotal - a.valorTotal));

  const valorTotalGeral = vendas.reduce((acc, curr) => acc + Number(curr.sale_value), 0);

  // Lista dinâmica de abas (Visão Geral + Os métodos que tiveram vendas)
  const guias = ['VISÃO GERAL', ...relatoriosMetodos.map(r => r.metodo)];

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
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
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
      {vendas.length === 0 ? (
        <div className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic border border-zinc-800 border-dashed rounded-lg bg-zinc-950/50">
          Nenhuma movimentação neste período.
        </div>
      ) : (
        <>
          {/* 🔥 NAVEGAÇÃO DE GUIAS (TABS) */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-800 pb-px">
            {guias.map(guia => (
              <button
                key={guia}
                onClick={() => setAbaAtiva(guia)}
                className={`px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 ${abaAtiva === guia ? 'border-yellow-400 text-yellow-400 bg-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 bg-zinc-900/30'}`}
              >
                {guia}
              </button>
            ))}
          </div>

          {/* 🔥 CONTEÚDO DA GUIA ATIVA */}
          <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/80 overflow-hidden shadow-inner min-h-[300px]">
            
            {/* ABA 1: VISÃO GERAL */}
            {abaAtiva === 'VISÃO GERAL' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-800/50 text-zinc-600 text-[10px] uppercase tracking-widest bg-zinc-950/80">
                      <th className="p-4 font-black">Soldado</th>
                      <th className="p-4 font-black text-center text-blue-400/70">Cartão</th>
                      <th className="p-4 font-black text-center text-yellow-400/70">PIX</th>
                      <th className="p-4 font-black text-center text-zinc-400/70">Boleto</th>
                      <th className="p-4 font-black text-center bg-zinc-900/50">Total Vendas</th>
                      <th className="p-4 font-black text-right w-40">Valor Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {listaGeralPronta.map((item, index) => (
                      <tr key={index} className="border-b border-zinc-800/30 hover:bg-zinc-900 transition-colors">
                        <td className="p-4 font-bold text-zinc-300 uppercase tracking-wider">{item.nome}</td>
                        <td className="p-4 text-center font-bold text-blue-400/80">{item.qtdCartao > 0 ? `${item.qtdCartao}x` : '-'}</td>
                        <td className="p-4 text-center font-bold text-yellow-400/80">{item.qtdPix > 0 ? `${item.qtdPix}x` : '-'}</td>
                        <td className="p-4 text-center font-bold text-zinc-500">{item.qtdBoleto > 0 ? `${item.qtdBoleto}x` : '-'}</td>
                        <td className="p-4 text-center font-black text-white bg-zinc-900/20">{item.totalVendas}</td>
                        <td className="p-4 text-green-400 font-black text-right whitespace-nowrap">{formataBRL(item.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ABAS ESPECÍFICAS DE PAGAMENTO */}
            {abaAtiva !== 'VISÃO GERAL' && (
              (() => {
                const relatorioAtual = relatoriosMetodos.find(r => r.metodo === abaAtiva);
                if (!relatorioAtual) return null;

                return (
                  <div>
                    {/* Cabeçalho Interno da Aba */}
                    <div className="bg-zinc-800/30 p-4 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex gap-2 justify-center md:justify-start">
                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center px-2">Produtos Vendidos:</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(relatorioAtual.produtos).map(([nomeProduto, qtd]) => (
                            <span key={nomeProduto} className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded flex items-center gap-1.5">
                              <span className="text-yellow-400 font-black text-xs">{qtd}x</span>
                              <span className="text-zinc-400 text-[9px] uppercase font-bold">{nomeProduto}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mr-2 block md:inline">Total em {abaAtiva.split(' ')[1]}:</span>
                        <span className="text-green-400 font-black text-xl">{formataBRL(relatorioAtual.valorTotal)}</span>
                      </div>
                    </div>

                    {/* Tabela de Soldados do Método Específico */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-800/50 text-zinc-600 text-[10px] uppercase tracking-widest bg-zinc-950/50">
                            <th className="p-4 font-black">Soldado</th>
                            <th className="p-4 font-black text-center w-32">Nº Vendas ({abaAtiva.split(' ')[1]})</th>
                            <th className="p-4 font-black">Armamento Usado</th>
                            <th className="p-4 font-black text-right w-40">Valor Gerado</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {relatorioAtual.vendedores.map((item, index) => (
                            <tr key={index} className="border-b border-zinc-800/30 hover:bg-zinc-900 transition-colors">
                              <td className="p-4 font-bold text-zinc-300 uppercase tracking-wider">{item.nome}</td>
                              <td className="p-4 text-center font-bold text-white">
                                <span className="bg-zinc-800 px-2.5 py-1 rounded text-xs">{item.totalVendas}</span>
                              </td>
                              <td className="p-4 text-zinc-400 text-[10px]">
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(item.produtos).map(([nomeProduto, qtd]) => (
                                    <span key={nomeProduto} className="bg-zinc-950 px-2 py-1 rounded uppercase font-bold border border-zinc-800">
                                      <span className="text-blue-400">{String(qtd)}x</span> {nomeProduto}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 text-green-400/80 font-black text-right whitespace-nowrap">{formataBRL(item.valorTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </>
      )}
    </div>
  );
}