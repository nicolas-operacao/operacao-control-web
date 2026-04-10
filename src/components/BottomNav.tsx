import { useNavigate } from 'react-router-dom';
import { somClick, somHover } from '../services/hudSounds';

interface BottomNavProps {
  activeTab: string;
  onNovaVenda: () => void;
}

export function BottomNav({ activeTab, onNovaVenda }: BottomNavProps) {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { role: 'vendedor' };
  const role = user?.role ?? 'vendedor';

  const isAdmin = role === 'admin';
  const isSuport = role === 'suporte';

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function scrollToRanking() {
    const el = document.querySelector('[data-section="guerra-equipes"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }

  function handlePerfil() {
    navigate('/perfil');
  }

  // Itens para vendedor
  const itensVendedor = [
    {
      id: 'home',
      label: 'Início',
      icon: '🏠',
      onClick: scrollToTop,
    },
    {
      id: 'nova-venda',
      label: 'Nova Venda',
      icon: '➕',
      onClick: onNovaVenda,
      destaque: true,
    },
    {
      id: 'arsenal',
      label: 'Arsenal',
      icon: '⚡',
      onClick: () => navigate('/arsenal'),
    },
    {
      id: 'ranking',
      label: 'Ranking',
      icon: '🏆',
      onClick: scrollToRanking,
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: '👤',
      onClick: handlePerfil,
    },
  ];

  // Itens para admin
  const itensAdmin = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      onClick: scrollToTop,
    },
    {
      id: 'nova-venda',
      label: 'Reg. Venda',
      icon: '➕',
      onClick: onNovaVenda,
      destaque: true,
    },
    {
      id: 'relatorio',
      label: 'Relatório',
      icon: '📊',
      onClick: () => {
        const el = document.querySelector('[data-section="relatorio"]');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      id: 'suporte',
      label: 'Suporte',
      icon: '🛡️',
      onClick: () => navigate('/liberacoes'),
    },
    {
      id: 'arsenal',
      label: 'Arsenal',
      icon: '⚡',
      onClick: () => navigate('/arsenal'),
    },
  ];

  const itens = (isAdmin || isSuport) ? itensAdmin : itensVendedor;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80">
      <div className="flex items-stretch">
        {itens.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { somClick(); item.onClick(); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 select-none
                ${item.destaque
                  ? 'bg-yellow-400 text-black shadow-[0_-6px_24px_rgba(250,204,21,0.35)]'
                  : isActive
                  ? 'text-yellow-400'
                  : 'text-zinc-500'
                }`}
              style={{ minHeight: '56px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider leading-none mt-0.5 ${item.destaque ? 'text-black' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
