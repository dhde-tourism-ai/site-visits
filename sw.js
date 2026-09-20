// DHDE Field Survey — offline cache.
// Cache-first for everything we fetch (app shell + CDN model files) so the
// app keeps working with no signal once it's been opened once over wifi.
var CACHE = "dhde-field-survey-v1";
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

self.addEventListener("fetch", function(event){
  if(event.request.method !== "GET") return;
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
