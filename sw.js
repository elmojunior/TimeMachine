/*
    TimeMachine — Acompanhamento de tempo
    Copyright (C) 2026 elmojunior

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
/* ============================================================
   TimeMachine — Service Worker
   Estratégia: cache-first para o HTML principal;
   network-first com fallback para o restante.
   ============================================================ */

const CACHE_NAME = 'timemachine-v1';
const HTML_URL   = '/TimeMachine/timemachine.html';

// ── Install: pré-cache do arquivo principal ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(HTML_URL))
  );
  // Ativa imediatamente sem esperar aba antiga fechar
  self.skipWaiting();
});

// ── Activate: remove caches antigos ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Assume controle das abas abertas imediatamente
  self.clients.claim();
});

// ── Fetch: network-first para o HTML, pass-through para o resto ─
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só intercepta requisições da mesma origem
  if (url.origin !== self.location.origin) return;

  // Para requisições de navegação (o próprio HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Atualiza o cache com a versão mais recente
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(HTML_URL, clone));
          }
          return response;
        })
        .catch(() =>
          // Offline: serve do cache
          caches.match(HTML_URL)
        )
    );
    return;
  }

  // Para qualquer outra requisição (blobs, data URIs internas, etc.)
  // Tenta a rede e, se falhar, tenta o cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
