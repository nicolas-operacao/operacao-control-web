import { useEffect, useState } from 'react';
import { somClick, somHover } from '../services/hudSounds';
import { pedirPermissaoNotificacao } from '../services/notificacoes';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function BannerPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_banner_dismissed') === '1');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Verifica status de notificação atual
    if ('Notification' in window) {
      setNotifStatus(Notification.permission);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    somClick();
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }

  async function handlePermitirNotif() {
    somClick();
    const granted = await pedirPermissaoNotificacao();
    setNotifStatus(granted ? 'granted' : 'denied');
  }

  function handleDismiss() {
    somClick();
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', '1');
  }

  // Não mostra se: já instalado como standalone, já dispensou, ou não tem nada para mostrar
  const temInstall = !!installPrompt && !installed;
  const temNotif = notifStatus === 'default'; // só mostra se ainda não decidiu
  if (dismissed || (!temInstall && !temNotif)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-zinc-950/95 border-t border-yellow-400/30 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto flex flex-col gap-3">

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <p className="text-white font-black text-sm uppercase tracking-widest">Operação Control</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">
                {temInstall
                  ? 'Instale no seu celular para acesso rápido'
                  : 'Ative notificações para saber quando sua venda for aprovada'}
              </p>
            </div>
          </div>
          <button
            onMouseEnter={somHover}
            onClick={handleDismiss}
            className="text-zinc-600 hover:text-zinc-400 text-xl flex-shrink-0 transition-colors leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2">
          {temNotif && (
            <button
              onMouseEnter={somHover}
              onClick={handlePermitirNotif}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
            >
              🔔 Ativar Notificações
            </button>
          )}
          {temInstall && (
            <button
              onMouseEnter={somHover}
              onClick={handleInstall}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest border border-zinc-700 transition-all active:scale-95"
            >
              📲 Instalar App
            </button>
          )}
        </div>

        {notifStatus === 'granted' && (
          <p className="text-green-400 text-[11px] font-bold text-center">
            ✅ Notificações ativadas! Você vai receber alertas de vendas aprovadas.
          </p>
        )}
        {notifStatus === 'denied' && (
          <p className="text-zinc-500 text-[11px] text-center">
            Notificações bloqueadas. Para ativar, vá nas configurações do seu browser.
          </p>
        )}
      </div>
    </div>
  );
}
