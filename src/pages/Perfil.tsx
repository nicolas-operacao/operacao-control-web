import { useNavigate } from 'react-router-dom';
import { PainelVendedor } from '../components/PainelVendedor';
import { BottomNav } from '../components/BottomNav';
import { ModalRegistrarVenda } from '../components/ModalRegistrarVenda';
import { useState, useEffect } from 'react';
import { somClick, somHover } from '../services/hudSounds';
import { api } from '../services/api';

export function Perfil() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: '', id: '', equipe: '' };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<{ id: number; nome: string; valor: number }[]>([]);

  useEffect(() => {
    api.get('/products').then(r => setProdutos(r.data)).catch(() => {});
  }, []);

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      {/* CABEÇALHO */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button
          onMouseEnter={somHover}
          onClick={() => { somClick(); navigate('/vendas'); }}
          className="text-zinc-400 hover:text-white transition-colors text-sm font-bold flex items-center gap-2"
        >
          ← Voltar
        </button>
        <h1 className="text-sm font-black uppercase tracking-widest text-yellow-400">Meu Perfil</h1>
        <button
          onMouseEnter={somHover}
          onClick={() => { somClick(); handleLogout(); }}
          className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors"
        >
          Sair
        </button>
      </div>

      {/* CONTEÚDO */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <PainelVendedor
          userId={String(user.id)}
          userName={user.name}
          equipe={user.equipe}
        />
      </div>

      {/* BOTTOM NAV */}
      <BottomNav activeTab="perfil" onNovaVenda={() => setIsModalOpen(true)} />

      {/* MODAL NOVA VENDA */}
      <ModalRegistrarVenda
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        produtos={produtos}
        user={{ id: String(user.id), name: user.name }}
        onVendaRegistrada={() => setIsModalOpen(false)}
      />
    </div>
  );
}
