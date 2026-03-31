import React, { useState } from 'react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendasAtuais: { 
    customer_email?: string; 
    customer_name?: string; 
    customer_phone?: string;
    created_at?: string;
  }[]; 
  onSuccess: () => void;
}

type LinhaPlanilha = {
  cliente: string; email: string; telefone: string; 
  produto: string; valor: number; pagamento: string; data: string;
  statusImportacao: 'BATEU' | 'DIVERGENTE';
};

// 🔥 MOTORES DE LIMPEZA
const unquote = (str: string | undefined) => {
  if (!str) return '';
  let cleanStr = str.trim();
  if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) cleanStr = cleanStr.slice(1, -1).trim();
  else if (cleanStr.startsWith("'") && cleanStr.endsWith("'")) cleanStr = cleanStr.slice(1, -1).trim();
  return cleanStr;
};

const normalizeString = (str: string | undefined) => (str || '').toLowerCase().trim();
const normalizePhone = (str: string | undefined) => (str || '').replace(/\D/g, '');

export function ModalImportarPlanilha({ isOpen, onClose, vendasAtuais, onSuccess }: Props) {
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

  if (!isOpen) return null;

  const parseCSVLine = (text: string) => {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ';' && !inQuotes) { result.push(unquote(current)); current = ''; } 
      else current += char;
    }
    result.push(unquote(current));
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split(/\r?\n/);
      if (rows.length < 2) { alert("O arquivo parece vazio ou inválido."); return; }

      const headers = parseCSVLine(rows[0]).map(h => h.toLowerCase());
      
      const idxNome = headers.findIndex(h => h.includes('nome'));
      const idxEmail = headers.findIndex(h => h.includes('email'));
      const idxCelular = headers.findIndex(h => h.includes('celular') || h.includes('telefone'));
      const idxValor = headers.findIndex(h => h.includes('bruto')); // Pegando especificamente PREÇO BRUTO
      const idxData = headers.findIndex(h => h.includes('data'));
      const idxPagamento = headers.findIndex(h => h.includes('pagamento') || h.includes('meio'));
      const idxProduto = headers.findIndex(h => h.includes('conteúdo') || h.includes('conteudo') || h.includes('produto') || h.includes('curso'));
      const idxOrigem = headers.findIndex(h => h.includes('origem'));
      
      if (idxNome === -1 || idxEmail === -1 || idxValor === -1) {
        alert("Erro: A planilha precisa ter as colunas 'Nome', 'Email' e 'Preço Bruto'."); return;
      }

      const dadosExtraidos: LinhaPlanilha[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.trim()) continue;

        const cols = parseCSVLine(row);
        
        const cliente = unquote(cols[idxNome]) || 'Sem Nome';
        const emailPlanilha = normalizeString(cols[idxEmail]);
        const telefonePlanilha = idxCelular !== -1 ? unquote(cols[idxCelular]) : '';
        const pagamento = idxPagamento !== -1 ? unquote(cols[idxPagamento]) || 'N/A' : 'N/A';
        const origem = idxOrigem !== -1 ? unquote(cols[idxOrigem]) || '' : '';
        const rawDate = idxData !== -1 ? unquote(cols[idxData]) : '';
        const produto = idxProduto !== -1 && cols[idxProduto] ? unquote(cols[idxProduto]) : 'Curso/Plataforma';
        
        // ⚠️ REGRA TÁTICA 1: EXCLUIR HUBLA E GURU
        const pagamentoStr = pagamento.toLowerCase();
        const origemStr = origem.toLowerCase();
        if (pagamentoStr.includes('hubla') || pagamentoStr.includes('guru') || origemStr.includes('hubla') || origemStr.includes('guru')) {
          continue; // Pula essa linha, não entra no sistema
        }
        
        // Trata o Preço Bruto
        let valorStr = (cols[idxValor] || '').replace('R$', '').trim();
        if (valorStr.includes(',') && !valorStr.includes('.')) valorStr = valorStr.replace(',', '.');
        else if (valorStr.includes(',') && valorStr.includes('.')) valorStr = valorStr.replace(/\./g, '').replace(',', '.');
        
        let valorConvertido = parseFloat(valorStr);
        if (isNaN(valorConvertido)) valorConvertido = 0;
        
        // ⚠️ REGRA TÁTICA 2: IGNORAR VALORES MENORES QUE 70 REAIS
        if (valorConvertido < 70) {
          continue; // Pula essa linha
        }

        // Trata a Data Universal
        let dataFinal = new Date().toISOString().split('T')[0];
        if (rawDate) {
          try {
            if (rawDate.includes('/') && rawDate.length <= 10) {
              const parts = rawDate.split('/');
              if (parts.length === 3) {
                const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                if (!isNaN(new Date(isoDate).getTime())) dataFinal = isoDate;
              }
            } else {
              const parsed = new Date(rawDate);
              if (!isNaN(parsed.getTime())) dataFinal = parsed.toISOString().split('T')[0];
            }
          } catch(e) {}
        }

        // 🔥 O SCANNER DE AUDITORIA: A venda da planilha já está no nosso sistema?
        const isDuplicada = vendasAtuais.some(v => {
          const emailMatch = Boolean(v.customer_email && emailPlanilha && normalizeString(v.customer_email) === emailPlanilha);
          const nomeMatch = Boolean(v.customer_name && cliente && normalizeString(v.customer_name) === normalizeString(cliente));
          
          const phoneBanco = normalizePhone(v.customer_phone);
          const phonePlanilha = normalizePhone(telefonePlanilha);
          const telefoneMatch = Boolean(phoneBanco && phonePlanilha && (phoneBanco.includes(phonePlanilha) || phonePlanilha.includes(phoneBanco)));
          
          const dataBanco = v.created_at ? v.created_at.split('T')[0] : '';
          const dataMatch = dataBanco === dataFinal;

          // Confirma se achou pelo Email OU pela Ficha Completa (Nome+Tel+Data)
          return emailMatch || (nomeMatch && telefoneMatch && dataMatch);
        });

        if (emailPlanilha || telefonePlanilha) {
          dadosExtraidos.push({
            cliente, email: emailPlanilha, telefone: telefonePlanilha || '--',
            produto, valor: valorConvertido, pagamento, data: dataFinal,
            // SE EXISTIR NO SISTEMA: Verde (Bateu) / SE NÃO EXISTIR: Vermelho (Divergente)
            statusImportacao: isDuplicada ? 'BATEU' : 'DIVERGENTE'
          });
        }
      }
      setLinhas(dadosExtraidos);
    };
    reader.readAsText(file);
  };

  const handleSincronizar = async () => {
    const vendasFaltantes = linhas.filter(l => l.statusImportacao === 'DIVERGENTE');
    if (vendasFaltantes.length === 0) {
      alert("Nenhuma divergência encontrada. A tropa lançou todas as vendas!"); return;
    }

    setIsUploading(true);

    try {
      for (const venda of vendasFaltantes) {
        await api.post('/sales', {
          seller_id: 99999, // ⚠️ Lembre-se: Deixe o ID do usuário "Checkout Automático" aqui
          seller_name: 'Checkout Automático', 
          product_name: venda.produto, 
          customer_name: venda.cliente,
          customer_email: venda.email, 
          customer_phone: venda.telefone, 
          payment_method: venda.pagamento,
          sale_value: venda.valor, 
          sale_date: venda.data,
          status: 'aprovada'
        });
      }

      somSucesso();
      alert(`✅ Foram injetadas ${vendasFaltantes.length} vendas Faltantes (Checkout) na Meta Geral!`);
      setLinhas([]); onSuccess();
    } catch {
      alert('🚨 Erro ao injetar as vendas.');
    } finally { setIsUploading(false); }
  };

  const qtdBateu = linhas.filter(l => l.statusImportacao === 'BATEU').length;
  const qtdDivergente = linhas.filter(l => l.statusImportacao === 'DIVERGENTE').length;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-5xl shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-blue-900/10">
          <h2 className="text-xl font-black text-blue-400 uppercase flex items-center gap-2">🔎 Auditoria de Planilhas (TMB)</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!linhas.length ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center">
              <span className="text-4xl mb-4 block">⚖️</span>
              <h3 className="text-white font-bold mb-2">Auditoria de Plataforma</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">O sistema irá ignorar automaticamente vendas de <strong>Hubla</strong>, <strong>Guru</strong> e valores <strong>menores que R$ 70</strong>.</p>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-6">Suba a planilha CSV oficial para verificar o que a tropa esqueceu de lançar.</p>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
            </div>
          ) : (
            <div>
              <div className="flex gap-4 mb-4">
                <div className="bg-green-950/30 border border-green-500/30 p-4 rounded-lg flex-1 text-center">
                  <p className="text-green-500 font-black text-2xl">{qtdBateu}</p>
                  <p className="text-zinc-400 text-[10px] uppercase tracking-widest">✅ Bateu (Já Cadastradas)</p>
                </div>
                <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-lg flex-1 text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <p className="text-red-500 font-black text-2xl">{qtdDivergente}</p>
                  <p className="text-zinc-300 font-bold text-[10px] uppercase tracking-widest">⚠️ Faltando no Sistema</p>
                </div>
              </div>
              <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-80">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur"><tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800"><th className="p-3 font-black">Data</th><th className="p-3 font-black">Cliente / Ficha</th><th className="p-3 font-black">Produto</th><th className="p-3 font-black">Pagamento</th><th className="p-3 font-black">Preço Bruto</th><th className="p-3 font-black text-center">Auditoria</th></tr></thead>
                  <tbody className="text-xs">
                    {linhas.map((linha, i) => (
                      <tr key={i} className={`border-b border-zinc-800/50 ${linha.statusImportacao === 'BATEU' ? 'bg-green-950/10 opacity-60' : 'bg-red-950/20 hover:bg-red-950/30'}`}>
                        <td className="p-3 text-zinc-400">{linha.data.split('-').reverse().join('/')}</td>
                        <td className="p-3"><p className="text-white font-bold">{linha.cliente}</p><p className="text-zinc-400 text-[10px]">{linha.email}</p><p className="text-zinc-500 text-[9px]">{linha.telefone}</p></td>
                        <td className="p-3 text-zinc-300 font-bold uppercase text-[10px]">{linha.produto}</td>
                        <td className="p-3 text-yellow-400 font-bold uppercase text-[10px]">{linha.pagamento}</td>
                        <td className="p-3 text-green-400 font-bold">R$ {linha.valor.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          {linha.statusImportacao === 'BATEU' ? (
                            <span className="bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">✅ BATEU</span>
                          ) : (
                            <span className="bg-red-600 text-white border border-red-500 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.3)]">⚠️ VERIFICAR</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex gap-3">
          <button onClick={() => { setLinhas([]); onClose(); }} className="flex-1 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-colors text-xs">Fechar Auditoria</button>
          <button onClick={handleSincronizar} disabled={isUploading || linhas.length === 0} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed">
            {isUploading ? 'INJETANDO...' : `INJETAR AS ${qtdDivergente} VENDAS FALTANTES COMO CHECKOUT`}
          </button>
        </div>
      </div>
    </div>
  );
}