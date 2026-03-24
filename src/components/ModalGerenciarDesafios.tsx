import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

type Challenge = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal_amount: number;
  is_active: boolean;
};

interface ModalGerenciarDesafiosProps {
  isOpen: boolean;
  onClose: () => void;
  onAtualizar: () => void;
}

export function ModalGerenciarDesafios({ isOpen, onClose, onAtualizar }: ModalGerenciarDesafiosProps) {
  const [desafios, setDesafios] = useState<Challenge[]>([]);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchDesafios();
  }, [isOpen]);

  async function fetchDesafios() {
    try {
      const response = await api.get('/challenges');
      setDesafios(response.data);
    } catch (error) {
      console.error('Erro ao buscar desafios:', error);
    }
  }

  async function handleCriarDesafio(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/challenges', {
        name,
        start_date: startDate,
        end_date: endDate,
        goal_amount: Number(goalAmount)
      });
      alert('🎯 Operação criada com sucesso!');
      setName(''); setStartDate(''); setEndDate(''); setGoalAmount('');
      fetchDesafios();
      onAtualizar(); 
    } catch (error: any) {
      // 🔥 AQUI ESTÁ O RAIO-X: Ele vai exibir a mensagem exata de erro do Back-end
      const mensagemReal = error.response?.data?.error || error.message;
      alert(`🚨 ERRO DO SERVIDOR:\n${mensagemReal}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAtivar(id: string) {
    try {
      await api.put(`/challenges/${id}/active`);
      fetchDesafios();
      onAtualizar(); 
      alert('⚔️ Operação ativada! O placar principal foi atualizado.');
    } catch (error: any) {
      const mensagemReal = error.response?.data?.error || error.message;
      alert(`🚨 ERRO AO ATIVAR:\n${mensagemReal}`);
    }
  }

  if (!isOpen) return null;

  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-red-900/50 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(220,38,38,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-2xl font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
            ⚔️ Central de Operações (Desafios)
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          
          <form onSubmit={handleCriarDesafio} className="bg-zinc-950/50 p-6 rounded-xl border border-red-900/30 shadow-inner">
            <h3 className="text-red-400 font-black mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
              ➕ Criar Nova Operação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="lg:col-span-1">
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Nome (Ex: Operação Março)</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-2.5 focus:outline-none focus:border-red-500 transition-colors text-sm" placeholder="Operação Março" />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Início</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-2.5 focus:outline-none focus:border-red-500 transition-colors [color-scheme:dark] text-sm" />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Fim</label>
                <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-2.5 focus:outline-none focus:border-red-500 transition-colors [color-scheme:dark] text-sm" />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Meta (Digite tudo junto)</label>
                <input type="number" step="0.01" required value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-green-400 font-bold rounded p-2.5 focus:outline-none focus:border-red-500 transition-colors text-sm" placeholder="Ex: 400000" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-500 text-white font-black px-8 py-2.5 rounded shadow-[0_0_15px_rgba(220,38,38,0.3)] uppercase text-xs tracking-widest transition-all disabled:opacity-50">
                {isLoading ? 'CRIANDO...' : 'CRIAR E ATIVAR DESAFIO'}
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-zinc-400 font-black mb-4 uppercase tracking-widest text-sm">Histórico de Operações</h3>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest bg-zinc-900/50">
                    <th className="p-4 font-black">Operação</th>
                    <th className="p-4 font-black">Período</th>
                    <th className="p-4 font-black text-right">Meta Global</th>
                    <th className="p-4 font-black text-center">Status</th>
                    <th className="p-4 font-black text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {desafios.map(d => (
                    <tr key={d.id} className={`border-b border-zinc-800/50 transition-colors ${d.is_active ? 'bg-red-950/20' : 'hover:bg-zinc-900'}`}>
                      <td className="p-4 font-black text-white uppercase tracking-wider">{d.name}</td>
                      <td className="p-4 text-zinc-400 text-xs">
                        {new Date(d.start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} até {new Date(d.end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                      </td>
                      <td className="p-4 text-right text-green-400 font-bold">{formataBRL(Number(d.goal_amount))}</td>
                      <td className="p-4 text-center">
                        {d.is_active ? (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest">Em Andamento</span>
                        ) : (
                          <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest">Encerrada</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {!d.is_active && (
                          <button onClick={() => handleAtivar(d.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/30 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                            Ativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {desafios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-600 uppercase font-black tracking-widest italic">Nenhuma operação registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}