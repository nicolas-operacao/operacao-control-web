import { useEffect, useState } from 'react';
import { api } from '../services/api';

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export function TabelaRecrutasPendentes() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    try {
      const response = await api.get('/admin/pending');
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.patch(`/admin/${id}/approve`);
      alert('Recruta aprovado com sucesso!');
      setPendingUsers(pendingUsers.filter(user => user.id !== id));
    } catch (error) {
      alert('Erro ao aprovar usuário.');
    }
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center p-10 text-center min-h-[200px]">
        <p className="text-zinc-500 text-lg font-medium">Nenhum recruta pendente.</p>
        <p className="text-green-400 mt-2 font-bold">Sua tropa está toda em campo!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
            <th className="p-4 font-bold">Nome do Recruta</th>
            <th className="p-4 font-bold">E-mail</th>
            <th className="p-4 font-bold text-right">Ação Tática</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map(user => (
            <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              <td className="p-4 font-bold text-white">{user.name}</td>
              <td className="p-4 text-zinc-400 font-medium">{user.email}</td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => handleApprove(user.id)} 
                  className="bg-green-500 hover:bg-green-400 text-black font-black py-2 px-6 rounded shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-transform hover:scale-105 uppercase text-sm"
                >
                  Aprovar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}