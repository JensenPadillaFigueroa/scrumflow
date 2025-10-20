self.addEventListener("install", (e) => {
    e.waitUntil(
      caches.open("tekpro-v1").then((cache) => cache.addAll([
        "/", "/index.html", "/manifest.webmanifest"
        // add critical assets (logo, fonts, compiled chunks) if you want offline shell
      ]))
    );
  });
  self.addEventListener("activate", (e) => self.clients.claim());
  self.addEventListener("fetch", (e) => {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request))
    );
  });
  