import { useEffect } from 'react';
import { api } from '../services/api';
import { setSomAtivo } from '../services/hudSounds';

// Roda em background em todas as páginas autenticadas.
// Verifica a cada 15s se o admin mudou a preferência de som do usuário.
export function SomPoller() {
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    if (!user?.id) return;
    // Suporte não tem controle de som — o admin já configura isso
    if (user?.role === 'suporte') return;

    async function checar() {
      try {
        const res = await api.get(`/sellers/${user.id}/stats`);
        const somDb = res.data?.som_desativado ?? false;
        setSomAtivo(!somDb);
      } catch { /* silencioso */ }
    }

    // Aplica imediatamente ao montar
    checar();

    const interval = setInterval(checar, 15000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
