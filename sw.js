/* 斑斓部件 · 离线缓存引擎(service worker) */
const CACHE = 'banlan-bujian-v37';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon-180.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 后端接口(workers.dev)不缓存,直连服务器
  if (/workers\.dev$/i.test(url.hostname)) return;

  // 网页本体:联网优先,断网回退到缓存
  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 其它静态资源(笔顺数据/音频/字体/图标/CDN库):缓存优先,缺了再下载并存
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => cached))
  );
});
