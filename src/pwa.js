/**
 * Made Store Spin Wheel - PWA Service Worker & Install Coordinator
 * Manages service worker lifecycle, offline detection, and native app install prompts.
 */

class PWAManager {
  constructor() {
    this.deferredInstallPrompt = null;
    this.btnInstall = document.getElementById('btn-install-app');
    this.toastContainer = null;
    this.swRegistration = null;

    this.init();
  }

  init() {
    this.createToastContainer();
    this.checkStandaloneMode();
    this.registerServiceWorker();
    this.attachInstallListeners();
    this.attachConnectivityListeners();
  }

  createToastContainer() {
    let container = document.getElementById('pwa-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pwa-toast-container';
      container.className = 'pwa-toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    this.toastContainer = container;
  }

  showToast(message, icon = '✦', duration = 4000) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.innerHTML = `
      <span class="pwa-toast-icon">${icon}</span>
      <span class="pwa-toast-msg">${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 350);
    }, duration);
  }

  checkStandaloneMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      document.body.classList.add('pwa-standalone');
      if (this.btnInstall) {
        this.btnInstall.style.display = 'none';
      }
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker not supported in this browser.');
      return;
    }

    window.addEventListener('load', async () => {
      try {
        // Use relative URL so it resolves correctly on localhost and GitHub Pages
        const swUrl = './sw.js';
        const registration = await navigator.serviceWorker.register(swUrl, { scope: './' });
        this.swRegistration = registration;
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates to service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                this.showToast('App update available! Refresh when convenient.', '🔄', 5000);
              }
            });
          }
        });
      } catch (err) {
        console.warn('[PWA] Service worker registration notice:', err);
      }
    });

    // Auto-reload once if controller changes (on skipWaiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        // Optional smooth refresh if desired
      }
    });
  }

  attachInstallListeners() {
    // Intercept native browser beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic banner
      e.preventDefault();
      this.deferredInstallPrompt = e;

      // Show header install button
      if (this.btnInstall) {
        this.btnInstall.style.display = 'inline-flex';
        this.btnInstall.classList.add('pwa-pulse');
      }
    });

    // Handle button click to open prompt
    if (this.btnInstall) {
      this.btnInstall.addEventListener('click', async () => {
        if (!this.deferredInstallPrompt) {
          // If already installed or browser hasn't fired prompt, inform user
          this.showToast('App can be installed via your browser menu (Add to Home screen / Install).', '📲');
          return;
        }

        // Show prompt
        this.deferredInstallPrompt.prompt();

        // Wait for choice
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        console.log('[PWA] User response to install prompt:', outcome);

        if (outcome === 'accepted') {
          this.showToast('Installing Made Store App...', '⏳', 2500);
        }

        this.deferredInstallPrompt = null;
        this.btnInstall.style.display = 'none';
      });
    }

    // App successfully installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App successfully installed.');
      if (this.btnInstall) {
        this.btnInstall.style.display = 'none';
      }
      this.showToast('Made Store App installed to your device!', '🎉', 5000);
    });
  }

  attachConnectivityListeners() {
    window.addEventListener('offline', () => {
      this.showToast('Offline Mode Active • Spin Wheel is 100% ready offline!', '⚡', 5000);
      document.body.classList.add('is-offline');
    });

    window.addEventListener('online', () => {
      this.showToast('Back Online • Network reconnected', '🌐', 3500);
      document.body.classList.remove('is-offline');
    });
  }
}

// Export singleton instance
export const pwa = new PWAManager();
