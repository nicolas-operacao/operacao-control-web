import React, { useState } from 'react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vendasAtuais: { customer_email?: string }[]; 
  onSuccess: () => void;
}

type LinhaPlanilha = {
  cliente: string; email: string; telefone: string; 
  produto: string; valor: number; pagamento: string; data: string;
  statusImportacao: 'NOVA' | 'DUPLICADA';
};

export function ModalImportarPlanilha({ isOpen, onClose, vendasAtuais, onSuccess }: Props) {
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n');
      
      const dadosExtraidos: LinhaPlanilha[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const cols = row.split(';');
        
        if (cols.length >= 6) {
          const emailPlanilha = cols[1]?.trim().toLowerCase() || '';
          
          const isDuplicada = vendasAtuais.some(v => 
            v.customer_email && v.customer_email.toLowerCase() === emailPlanilha
          );

          dadosExtraidos.push({
            cliente: cols[0]?.trim() || 'Sem Nome',
            email: emailPlanilha,
            telefone: cols[2]?.trim() || '',
            produto: cols[3]?.trim() || 'Curso',
            valor: parseFloat(cols[4]?.replace(',', '.') || '0'),
            pagamento: cols[5]?.trim() || 'PIX',
            data: cols[6]?.trim() ? new Date(cols[6].trim().split('/').reverse().join('-')).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
      alert("Nenhuma venda nova para importar!");
      return;
    }

    setIsUploading(true);

    try {
      for (const venda of vendasNovas) {
        await api.post('/sales', {
          seller_id: 99999,
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
      alert(`✅ ${vendasNovas.length} vendas de Checkout importadas com sucesso!`);
      setLinhas([]);
      onSuccess();
    } catch {
      alert('🚨 Erro ao enviar algumas vendas. Verifique a conexão.');
    } finally {
      setIsUploading(false);
    }
  };

  const qtdNovas = linhas.filter(l => l.statusImportacao === 'NOVA').length;
  const qtdDuplicadas = linhas.filter(l => l.statusImportacao === 'DUPLICADA').length;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-blue-900/10">
          <h2 className="text-xl font-black text-blue-400 uppercase flex items-center gap-2">📥 Sincronizador de Plataformas (Cursa Educa / TMB)</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!linhas.length ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center">
              <span className="text-4xl mb-4 block">📊</span>
              <h3 className="text-white font-bold mb-2">Faça o Upload do arquivo CSV</h3>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-6">Padrão esperado: Cliente ; Email ; Telefone ; Produto ; Valor ; Pagamento ; Data</p>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" />
            </div>
          ) : (
            <div>
              <div className="flex gap-4 mb-4">
                <div className="bg-green-950/30 border border-green-500/30 p-4 rounded-lg flex-1 text-center"><p className="text-green-500 font-black text-2xl">{qtdNovas}</p><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Novas (Prontas para o Placar)</p></div>
                <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-lg flex-1 text-center"><p className="text-red-500 font-black text-2xl">{qtdDuplicadas}</p><p className="text-zinc-400 text-[10px] uppercase tracking-widest">Duplicadas (Lançadas pela Tropa)</p></div>
              </div>
              <div className="overflow-x-auto border border-zinc-800 rounded-lg max-h-64">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur"><tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800"><th className="p-3 font-black">Cliente</th><th className="p-3 font-black">Email</th><th className="p-3 font-black">Produto</th><th className="p-3 font-black">Pagamento</th><th className="p-3 font-black">Valor</th><th className="p-3 font-black text-center">Análise</th></tr></thead>
                  <tbody className="text-xs">
                    {linhas.map((linha, i) => (
                      <tr key={i} className={`border-b border-zinc-800/50 ${linha.statusImportacao === 'DUPLICADA' ? 'opacity-50' : 'bg-green-950/10'}`}>
                        <td className="p-3 text-white font-bold">{linha.cliente}</td><td className="p-3 text-zinc-400">{linha.email}</td><td className="p-3 text-zinc-400 uppercase">{linha.produto}</td><td className="p-3 text-yellow-400 font-bold uppercase text-[10px]">{linha.pagamento}</td><td className="p-3 text-green-400 font-bold">R$ {linha.valor.toFixed(2)}</td>
                        <td className="p-3 text-center">{linha.statusImportacao === 'NOVA' ? (<span className="bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">NOVA - CHECKOUT</span>) : (<span className="bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">JÁ REGISTRADA</span>)}</td>
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
          <button onClick={handleSincronizar} disabled={isUploading || linhas.length === 0} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed">{isUploading ? 'SINCRONIZANDO COM A BASE...' : `INJETAR ${qtdNovas} VENDAS NA META ⚡`}</button>
        </div>
      </div>
    </div>
  );
}