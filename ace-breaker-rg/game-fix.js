// Keep the arcade playable without third-party consent overlays.
window.didomiConfig = window.didomiConfig || {};
window.didomiConfig.notice = { enable: false };
window.didomiOnReady = window.didomiOnReady || [];
window.didomiEventListeners = window.didomiEventListeners || [];

function pokeballCleanup() {
  document.getElementById('didomi-host')?.remove();
  document.getElementById('didomi-popup')?.remove();
  document.querySelectorAll('[id^="didomi"], .didomi-popup-container').forEach((el) => el.remove());
  document.documentElement.style.pointerEvents = '';
  document.body.style.pointerEvents = '';
}

document.addEventListener('DOMContentLoaded', pokeballCleanup);
window.addEventListener('load', pokeballCleanup);
setInterval(pokeballCleanup, 2000);
