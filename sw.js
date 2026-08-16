// Service worker: gjør appen brukbar uten nett. Bump VERSION ved endringer.
const VERSION = 'v1.23';
const SHELL   = 'gf-shell-' + VERSION;
const RUNTIME = 'gf-runtime-' + VERSION;

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Selve appen: nett først, så en ny versjon slår gjennom med én gang du er
  // på nett. Uten dekning svarer vi fra cache.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const kopi = res.clone();
          caches.open(SHELL).then(c => c.put('./index.html', kopi)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Skrifta ligger hos Google. Første gang hentes den fra nett, deretter
  // fra cache, slik at appen ser lik ut på en bane uten dekning.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then(async c => {
        const treff = await c.match(req);
        if (treff) return treff;
        try {
          const res = await fetch(req);
          c.put(req, res.clone()).catch(() => {});
          return res;
        } catch (err) {
          return treff || Response.error();
        }
      })
    );
    return;
  }

  // Egne filer (ikoner, manifest): cache først, de endrer seg sjelden
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(treff => treff || fetch(req).then(res => {
        if (res.ok) {
          const kopi = res.clone();
          caches.open(SHELL).then(c => c.put(req, kopi)).catch(() => {});
        }
        return res;
      }))
    );
  }
});
