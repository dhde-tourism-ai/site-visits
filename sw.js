// DHDE Field Survey — offline cache.
//
// Our own files (index.html, manifest.json, icon.svg) go NETWORK-FIRST: a
// fixed bug or new feature must reach phones the moment it's deployed, not
// whenever a stale precache happens to expire. Falls back to cache only when
// offline. Third-party CDN libraries (TensorFlow.js, coco-ssd, fonts) are
// pinned by exact version in their URL, so those stay CACHE-FIRST — safe to
// reuse indefinitely and worth it for offline use in the field.
var CACHE = "dhde-field-survey-v30";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(SHELL); }).catch(function(){})
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isOwnFile(request){
  if(request.mode === "navigate") return true;
  try{ return new URL(request.url).origin === self.location.origin; }catch(e){ return false; }
}

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;

  if(isOwnFile(event.request)){
    event.respondWith(
      fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); }).catch(function(){});
        }
        return response;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){ return cached || caches.match("./index.html"); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(event.request, copy); }).catch(function(){});
        }
        return response;
      }).catch(function(){
        return cached; // undefined -> browser shows its normal offline error
      });
    })
  );
});
