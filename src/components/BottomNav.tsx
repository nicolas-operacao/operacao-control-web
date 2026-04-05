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
      id: 'gestao',
      label: 'Gestão',
      icon: '⚙️',
      onClick: () => {
        const el = document.querySelector('[data-section="gestao"]');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  const itens = (isAdmin || isSuport) ? itensAdmin : itensVendedor;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950 border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {itens.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onMouseEnter={somHover}
              onClick={() => { somClick(); item.onClick(); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-all active:scale-95
                ${item.destaque
                  ? 'bg-yellow-400 text-black shadow-[0_-4px_20px_rgba(250,204,21,0.3)]'
                  : isActive
                  ? 'text-yellow-400'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${item.destaque ? 'text-black' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
