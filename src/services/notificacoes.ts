// =============================================
// SERVIÇO DE NOTIFICAÇÕES — Operação Control
// Registra service worker e envia notificações nativas
// =============================================

let swRegistration: ServiceWorkerRegistration | null = null;

/** Registra o service worker na inicialização do app */
export async function registrarServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[OP Control] Service Worker registrado.');
  } catch (e) {
    console.warn('[OP Control] SW não registrado:', e);
  }
}

/** Pede permissão de notificação ao usuário.
 *  Retorna true se foi concedida. */
export async function pedirPermissaoNotificacao(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Envia notificação de venda aprovada (via SW para funcionar em background) */
export function notificarVendaAprovada(
  nomeCliente: string,
  produto: string,
  valor: number,
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const title = '⚡ VENDA APROVADA!';
  const body = `${nomeCliente} — ${produto}\n${fmt(valor)}`;

  // Via Service Worker (funciona em background/tela bloqueada)
  if (swRegistration) {
    navigator.serviceWorker.controller?.postMessage({
      type: 'VENDA_APROVADA',
      title,
      body,
      icon: '/icon.svg',
    });
    // Fallback: envia direto pelo registration se controller ainda não assumiu
    swRegistration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'venda-aprovada',
      renotify: true,
    } as NotificationOptions).catch(() => {
      // Se SW não tiver permissão para showNotification, usa API direta
      new Notification(title, { body, icon: '/icon.svg' });
    });
  } else {
    // Sem SW: notificação direta (só funciona em foreground)
    new Notification(title, { body, icon: '/icon.svg' });
  }
}
