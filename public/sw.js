// Service Worker — Operação Control
// Gerencia notificações em segundo plano

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Recebe mensagens do app (quando está em foreground)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'VENDA_APROVADA') {
    const { title, body, icon } = event.data;
    self.registration.showNotification(title || '⚡ Venda Aprovada!', {
      body: body || 'Uma venda foi aprovada na Operação Control.',
      icon: icon || '/icon.svg',
      badge: '/icon.svg',
      vibrate: [100, 50, 100, 50, 200],
      tag: 'venda-aprovada',
      renotify: true,
      data: { url: '/' },
    });
  }
});

// Clique na notificação: abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

// Cache básico para funcionar offline
const CACHE = 'opccontrol-v1';
self.addEventListener('fetch', (event) => {
  // Só faz cache de recursos estáticos, não das chamadas de API
  if (event.request.url.includes('/api/') || event.request.url.includes('render.com')) return;
  if (event.request.method !== 'GET') return;
});
