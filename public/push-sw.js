/* Push para PWA Motoapp.
 * Se importa desde el service worker de Workbox (vite-plugin-pwa) para no
 * crear un segundo SW en el mismo scope. El payload es data-only y sin PII.
 */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const titulo = typeof data.titulo === 'string' && data.titulo ? data.titulo : 'Motoapp';
  const cuerpo = typeof data.cuerpo === 'string' ? data.cuerpo : 'Tienes una novedad en la app.';
  const ruta = typeof data.ruta === 'string' && data.ruta.startsWith('/') && !data.ruta.startsWith('//')
    ? data.ruta
    : '/notificaciones';

  event.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/icon-192-v2.png',
    badge: '/icon-192-v2.png',
    tag: typeof data.tag === 'string' ? data.tag : 'motoapp',
    renotify: true,
    data: { url: ruta, categoria: data.categoria || 'sistema' },
    vibrate: data.vibrar ? [120, 60, 120] : undefined,
    requireInteraction: data.prioridad === 'critica',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification?.data?.url || '/notificaciones';
  let url;
  try {
    url = new URL(destino, self.location.origin);
  } catch {
    url = new URL('/notificaciones', self.location.origin);
  }
  if (url.origin !== self.location.origin) return;

  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existente = clientes.find((c) => c.url.startsWith(self.location.origin));
    if (existente) {
      await existente.focus();
      if ('navigate' in existente) {
        try { await existente.navigate(url.href); } catch { /* algunos WebViews no permiten navigate */ }
      }
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});

self.addEventListener('notificationclose', () => {
  // Sin efectos: el badge y el estado de leída viven en la app.
});

// Chrome puede rotar la suscripción. Se avisa a las pestañas abiertas para
// que vuelvan a registrar el dispositivo; si no hay pestañas, el próximo
// arranque de la app también refresca el token (si hay permiso).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const cliente of clientes) {
      cliente.postMessage({ type: 'motoapp:pushsubscriptionchange' });
    }
  })());
});
