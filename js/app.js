const CartabaseApp = (() => {
  function switchView(viewId) {
    document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`.tab-btn[data-view="${viewId}"]`).classList.add('active');

    if (viewId === 'capture-view') {
      CaptureView.activate();
    } else {
      CaptureView.deactivate();
    }
  }

  function wireTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.error('[app] service worker registration failed:', err);
        });
      });
    }
  }

  function wireInstallPrompt() {
    let deferredPrompt = null;
    const banner = document.getElementById('install-banner');
    const btn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      banner.style.display = 'flex';
    });

    btn.addEventListener('click', async () => {
      banner.style.display = 'none';
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
      banner.style.display = 'none';
    });
  }

  function init() {
    wireTabs();
    DatabaseView.init();
    CaptureView.init();
    SettingsView.init();
    registerServiceWorker();
    wireInstallPrompt();
  }

  return { init, switchView };
})();

window.CartabaseApp = CartabaseApp;
document.addEventListener('DOMContentLoaded', CartabaseApp.init);
