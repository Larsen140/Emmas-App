// Emmas Planner: hält die App offline verfügbar. Immer zuerst das Netz, damit Updates sofort ankommen.
const CACHE = 'emmas-planner-v5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png', './icons/favicon.png', './vendor/zxing-0.21.3.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // GitHub-API und Schriften nie zwischenspeichern
  e.respondWith(
    fetch(new Request(e.request.url, { cache: 'no-store', credentials: 'same-origin' })).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Push-Benachrichtigungen
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Emmas Planner', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const ziel = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ open: ziel }); return c.focus(); } }
    return self.clients.openWindow(ziel);
  }));
});
