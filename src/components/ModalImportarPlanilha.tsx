import React, { useState } from 'react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendasAtuais: { customer_email?: string; customer_name?: string; customer_phone?: string; created_at?: string; }[]; 
  onSuccess: () => void;
}

type LinhaPlanilha = {
  cliente: string; email: string; telefone: string; 
  produto: string; valor: number; pagamento: string; data: string;
  statusPagamento: string;
  statusImportacao: 'NOVA' | 'DUPLICADA';
};

const unquote = (str: string | undefined) => {
  if (!str) return '';
  let cleanStr = str.trim();
  if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) cleanStr = cleanStr.slice(1, -1).trim();
  else if (cleanStr.startsWith("'") && cleanStr.endsWith("'")) cleanStr = cleanStr.slice(1, -1).trim();
  return cleanStr;
};

const normalizeString = (str: string | undefined) => (str || '').toLowerCase().trim();

export function ModalImportarPlanilha({ isOpen, onClose, vendasAtuais, onSuccess }: Props) {
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

  if (!isOpen) return null;

  const parseCSVLine = (text: string, separator: string) => {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === separator && !inQuotes) { result.push(unquote(current)); current = ''; } 
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

      const separator = rows[0].includes(';') ? ';' : ',';
      const headers = parseCSVLine(rows[0], separator).map(h => h.toLowerCase());
      
      const idxNome = headers.findIndex(h => h.includes('nome do cliente') || h === 'nome');
      const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
      const idxCelular = headers.findIndex(h => h.includes('celular') || h.includes('telefone'));
      const idxValor = headers.findIndex(h => h.includes('bruto') || h.includes('valor') || h.includes('ticket'));
      const idxPagamento = headers.findIndex(h => h.includes('pagamento') || h.includes('forma') || h.includes('meio'));
      const idxProduto = headers.findIndex(h => h.includes('conteúdo') || h.includes('conteudo') || h.includes('produto') || h.includes('curso'));
      const idxOrigem = headers.findIndex(h => h.includes('origem'));
      
      const idxDataEfetivada = headers.findIndex(h => h.includes('efetivado') || h.includes('compra'));
      const idxDataCriacao = headers.findIndex(h => h.includes('criado') || h === 'data');
      const idxData = idxDataEfetivada !== -1 ? idxDataEfetivada : (idxDataCriacao !== -1 ? idxDataCriacao : -1);

      const idxStatusPgto = headers.findIndex(h => h === 'status pedido' || h === 'situação' || h === 'status');

      if (idxNome === -1 || idxEmail === -1 || idxValor === -1) {
        alert("Erro: Não encontramos as colunas necessárias na planilha."); return;
      }

      const dadosExtraidos: LinhaPlanilha[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.trim()) continue;

        const cols = parseCSVLine(row, separator);
        
        const emailPlanilha = normalizeString(cols[idxEmail]);
        const cliente = unquote(cols[idxNome]) || 'Sem Nome';
        const telefonePlanilha = idxCelular !== -1 ? unquote(cols[idxCelular]) : '';
        const pagamento = idxPagamento !== -1 ? unquote(cols[idxPagamento]) || 'N/A' : 'N/A';
        const origem = idxOrigem !== -1 ? unquote(cols[idxOrigem]) || '' : '';
        const produto = idxProduto !== -1 && cols[idxProduto] ? unquote(cols[idxProduto]) : 'Curso/Plataforma';
        const rawDate = idxData !== -1 ? unquote(cols[idxData]) : '';
        const statusPagamento = idxStatusPgto !== -1 ? unquote(cols[idxStatusPgto]) || 'Não Informado' : 'Não Informado';
        
        // 🔥 REGRA 1: Filtra Hubla e Guru
        const pgmtoLower = pagamento.toLowerCase();
        const orgLower = origem.toLowerCase();
        if (pgmtoLower.includes('hubla') || pgmtoLower.includes('guru') || orgLower.includes('hubla') || orgLower.includes('guru')) {
          continue; 
        }

        let valorStr = (cols[idxValor] || '').replace('R$', '').trim();
        if (valorStr.includes(',') && !valorStr.includes('.')) valorStr = valorStr.replace(',', '.');
        else if (valorStr.includes(',') && valorStr.includes('.')) valorStr = valorStr.replace(/\./g, '').replace(',', '.');
        let valorConvertido = parseFloat(valorStr);
        if (isNaN(valorConvertido)) valorConvertido = 0;
        
        // 🔥 REGRA 2: Filtra menores que 70
        if (valorConvertido < 70) {
          continue; 
        }

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
          } catch(e) { }
        }

        // 🔥 REGRA 3: Dupla verificação rigorosa (E-mail OU Nome exato)
        const isDuplicada = vendasAtuais.some(v => {
          const emailMatch = Boolean(v.customer_email && emailPlanilha && normalizeString(v.customer_email) === emailPlanilha);
          const nomeMatch = Boolean(v.customer_name && cliente && normalizeString(v.customer_name) === normalizeString(cliente));
          
          return emailMatch || nomeMatch;
        });

        // Só exibe se tiver nome ou email válido
        if (emailPlanilha || cliente !== 'Sem Nome') {
          dadosExtraidos.push({
            cliente, email: emailPlanilha, telefone: telefonePlanilha || '--',
            produto, valor: valorConvertido, pagamento, data: dataFinal, statusPagamento,
            statusImportacao: isDuplicada ? 'DUPLICADA' : 'NOVA'
          });
        }
      }
      setLinhas(dadosExtraidos);
    };
    reader.readAsText(file);
  };

  const handleSincronizar = async () => {
    const vendasNovas = linhas.filter(l => l.statusImportacao === 'NOVA');
    if (vendasNovas.length === 0) {
      alert("Nenhuma venda nova para importar!"); return;
    }

    setIsUploading(true);

    try {
      for (const venda of vendasNovas) {
        const statusBanco = (venda.statusPagamento.toLowerCase().includes('cancel') || venda.statusPagamento.toLowerCase().includes('negativado') || venda.statusPagamento.toLowerCase().includes('devolvido')) 
          ? 'cancelada' 
          : 'aprovada';

        await api.post('/sales', {
          seller_id: 99999, // ⚠️ Lembre-se: coloque o ID do usuário Checkout!
          seller_name: 'Checkout Automático', 
          product_name: venda.produto, 
          customer_name: venda.cliente,
          customer_email: venda.email, 
          customer_phone: venda.telefone, 
          payment_method: venda.pagamento,
          sale_value: venda.valor, 
          sale_date: venda.data,
          status: statusBanco
        });
      }

      somSucesso();
      alert(`✅ ${vendasNovas.length} vendas de Checkout importadas com sucesso!`);
      setLinhas([]); onSuccess();
    } catch {
      alert('🚨 Erro ao enviar algumas vendas.');
    } finally { setIsUploading(false); }
  };

  const qtdNovas = linhas.filter(l => l.statusImportacao === 'NOVA').length;
  const qtdDuplicadas = linhas.filter(l => l.statusImportacao === 'DUPLICADA').length;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-5xl shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-blue-900/10">
          <h2 className="text-xl font-black text-blue-400 uppercase flex items-center gap-2">
            {/* 🔥 ERRO CORRIGIDO AQUI ABAIXO: envolvi o < com chaves {'<'} */}
            📥 Sincronizador de Plataformas (Ignora Hubla, Guru e {'<'} R$70)
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!linhas.length ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center">
              <span className="text-4xl mb-4 block">📊</span>
              <h3 className="text-white font-bold mb-2">Faça o Upload do arquivo CSV</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-6">Suba a Cursa Educa ou TMB. Filtramos os Fakes e importamos o resto.</p>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
            </div>
          ) : (
            <div>
              <div className="flex gap-4 mb-4">
                <div className="bg-green-950/30 border border-green-500/30 p-4 rounded-lg flex-1 text-center"><p className="text-green-500 font-black text-2xl">{qtdNovas}</p><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Novas (Prontas p/ Injetar)</p></div>
                <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-lg flex-1 text-center"><p className="text-red-500 font-black text-2xl">{qtdDuplicadas}</p><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Duplicadas (Da Tropa)</p></div>
              </div>
              <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-[60vh]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur"><tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800"><th className="p-3 font-black">Data Pgto</th><th className="p-3 font-black">Cliente / Email</th><th className="p-3 font-black">Curso</th><th className="p-3 font-black">Pagamento</th><th className="p-3 font-black">Situação</th><th className="p-3 font-black text-right">Valor</th><th className="p-3 font-black text-center">Ação</th></tr></thead>
                  <tbody className="text-xs">
                    {linhas.map((linha, i) => (
                      <tr key={i} className={`border-b border-zinc-800/50 ${linha.statusImportacao === 'DUPLICADA' ? 'opacity-40 bg-zinc-950' : 'bg-green-950/10'}`}>
                        <td className="p-3 text-zinc-400">{linha.data.split('-').reverse().join('/')}</td>
                        <td className="p-3"><p className="text-white font-bold">{linha.cliente}</p><p className="text-zinc-400 text-[10px]">{linha.email}</p></td>
                        <td className="p-3 text-zinc-300 font-bold uppercase text-[10px]">{linha.produto}</td>
                        <td className="p-3 text-zinc-400 font-bold uppercase text-[10px]">{linha.pagamento}</td>
                        <td className="p-3">
                          <span className={`font-black uppercase text-[9px] px-2 py-1 rounded ${linha.statusPagamento.toLowerCase().includes('cancel') || linha.statusPagamento.toLowerCase().includes('negativado') || linha.statusPagamento.toLowerCase().includes('devolvido') ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>{linha.statusPagamento}</span>
                        </td>
                        <td className="p-3 text-green-400 font-bold text-right">R$ {linha.valor.toFixed(2)}</td>
                        <td className="p-3 text-center">{linha.statusImportacao === 'NOVA' ? (<span className="bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">NOVA</span>) : (<span className="bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">DUPLICADA</span>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex gap-3">
          <button onClick={() => { setLinhas([]); onClose(); }} className="flex-1 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-colors text-xs">Cancelar</button>
          <button onClick={handleSincronizar} disabled={isUploading || linhas.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed">{isUploading ? 'SINCRONIZANDO...' : `INJETAR ${qtdNovas} VENDAS NA META ⚡`}</button>
        </div>
      </div>
    </div>
  );
}