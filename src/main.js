/**
 * Made Store Spin Wheel - Main Coordinator & Application Lifecycle
 */

import { store } from './store.js';
import { sounds } from './audio.js';
import { SpinWheel } from './wheel.js';
import { ConfettiCannon } from './confetti.js';
import { AdminController } from './admin.js';

class App {
  constructor() {
    this.store = store;
    this.sounds = sounds;
    this.confetti = new ConfettiCannon('confetti-canvas');

    // DOM Elements
    this.canvas = document.getElementById('wheel-canvas');
    this.spinBtn = document.getElementById('btn-spin');
    this.staffBar = document.getElementById('staff-control-bar');
    this.btnNewParticipant = document.getElementById('btn-new-participant');
    this.soundToggleBtn = document.getElementById('btn-sound-toggle');
    this.soundIcon = document.getElementById('sound-icon');

    // Result Modal Elements
    this.resultModal = document.getElementById('result-modal');
    this.resultBadge = document.getElementById('result-badge');
    this.resultTitle = document.getElementById('result-title');
    this.resultPrizeName = document.getElementById('result-prize-name');
    this.resultPrizeIcon = document.getElementById('result-prize-icon');
    this.resultMessage = document.getElementById('result-message');
    this.resultInstruction = document.getElementById('result-instruction');
    this.btnResultDone = document.getElementById('btn-result-done');

    // Status message
    this.statusSubtext = document.getElementById('status-subtext');

    // State: 'IDLE' | 'SPINNING' | 'RESULT' | 'STAFF_GATED'
    this.state = 'IDLE';
    this.currentWinningPrize = null;

    this.initWheel();
    this.initAdmin();
    this.attachEvents();
    this.updateUIForState('IDLE');
  }

  initWheel() {
    const activePrizes = this.store.getActivePrizes();
    this.wheel = new SpinWheel(this.canvas, {
      prizes: activePrizes,
      spinDuration: (this.store.settings.spinDuration || 4.8) * 1000,
      onSpinComplete: (prize) => this.handleSpinComplete(prize),
    });
  }

  initAdmin() {
    this.admin = new AdminController({
      onPrizesUpdated: () => {
        const activePrizes = this.store.getActivePrizes();
        this.wheel.setPrizes(activePrizes);
        if (this.state === 'IDLE') {
          this.spinBtn.disabled = activePrizes.length === 0;
        }
      },
    });
  }

  attachEvents() {
    // Spin trigger on button or wheel click
    this.spinBtn?.addEventListener('click', () => {
      this.handleSpin();
    });
    this.canvas?.addEventListener('click', () => {
      this.handleSpin();
    });

    // Sound toggle
    this.soundToggleBtn?.addEventListener('click', () => {
      const isEnabled = this.sounds.toggle();
      if (this.soundIcon) {
        this.soundIcon.textContent = isEnabled ? '🔊' : '🔇';
      }
      this.soundToggleBtn.setAttribute('aria-label', isEnabled ? 'Mute sound' : 'Unmute sound');
    });

    // Result modal DONE button
    this.btnResultDone?.addEventListener('click', () => {
      this.sounds.playClick();
      this.closeResultModal();
      this.updateUIForState('STAFF_GATED');
    });

    // Staff NEW PARTICIPANT button
    this.btnNewParticipant?.addEventListener('click', () => {
      this.sounds.playClick();
      this.resetForNewParticipant();
    });

    // Keyboard shortcut: Spacebar to spin (when idle)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state === 'IDLE' && !document.querySelector('.modal.active')) {
        e.preventDefault();
        this.handleSpin();
      }
    });
  }

  handleSpin() {
    if (this.state !== 'IDLE') return;

    // First user gesture initializes web audio context
    this.sounds.init();

    const activePrizes = this.store.getActivePrizes();
    if (activePrizes.length === 0) {
      alert('No active prizes available on the wheel! Please configure prizes in the Admin panel.');
      return;
    }

    // 1. Select winning prize via configured probability weight & stock availability
    const winningPrize = this.store.selectWinningPrize();
    if (!winningPrize) {
      alert('Unable to select a prize. All prizes may be out of stock.');
      return;
    }

    this.currentWinningPrize = winningPrize;
    this.updateUIForState('SPINNING');

    // 2. Deterministically spin wheel to target winning segment
    const duration = (this.store.settings.spinDuration || 4.8) * 1000;
    this.wheel.spinTo(winningPrize, duration);
  }

  handleSpinComplete(prize) {
    // 3. Record win & decrement stock
    this.store.recordSpin(prize);

    // Refresh active wheel prizes in case this prize was limited and just depleted
    const activePrizes = this.store.getActivePrizes();
    this.wheel.prizes = activePrizes;

    // 4. Play celebratory sound & effects
    if (prize.isNoWin) {
      this.sounds.playTryAgain();
    } else {
      this.sounds.playWinFanfare();
      this.confetti.burst(130);
    }

    // 5. Present Result Modal
    this.showResultModal(prize);
    this.updateUIForState('RESULT');
  }

  showResultModal(prize) {
    if (!this.resultModal) return;

    if (prize.isNoWin) {
      this.resultBadge.textContent = '😄';
      this.resultTitle.textContent = 'BETTER LUCK NEXT TIME!';
      this.resultPrizeName.textContent = prize.name;
      this.resultPrizeIcon.textContent = prize.icon || '☘️';
      this.resultMessage.textContent = prize.winMessage || 'Thanks for playing! Explore the Made Store collection today.';
      this.resultInstruction.textContent = 'Thank you for stopping by the Made Store expo stall!';
    } else {
      this.resultBadge.textContent = '🎉';
      this.resultTitle.textContent = 'CONGRATULATIONS!';
      this.resultPrizeName.textContent = prize.name;
      this.resultPrizeIcon.textContent = prize.icon || '🎁';
      this.resultMessage.textContent = prize.winMessage || 'Please collect your prize from the Made Store stall.';
      this.resultInstruction.textContent = '👉 Please show this screen to the Made Store team to claim your prize!';
    }

    this.resultModal.classList.add('active');
  }

  closeResultModal() {
    if (this.resultModal) {
      this.resultModal.classList.remove('active');
    }
  }

  resetForNewParticipant() {
    this.currentWinningPrize = null;
    this.confetti.stop();
    const activePrizes = this.store.getActivePrizes();
    this.wheel.setPrizes(activePrizes);
    this.updateUIForState('IDLE');
  }

  updateUIForState(newState) {
    this.state = newState;

    const activePrizes = this.store.getActivePrizes();

    switch (newState) {
      case 'IDLE':
        this.spinBtn.disabled = activePrizes.length === 0;
        this.spinBtn.classList.remove('btn-spinning');
        this.spinBtn.style.display = 'inline-flex';
        this.staffBar.style.display = 'none';
        if (this.statusSubtext) {
          this.statusSubtext.textContent = 'Step right up and test your luck today!';
        }
        break;

      case 'SPINNING':
        this.spinBtn.disabled = true;
        this.spinBtn.classList.add('btn-spinning');
        this.staffBar.style.display = 'none';
        if (this.statusSubtext) {
          this.statusSubtext.textContent = 'Spinning... Good luck!';
        }
        break;

      case 'RESULT':
        this.spinBtn.disabled = true;
        this.spinBtn.style.display = 'inline-flex';
        this.staffBar.style.display = 'none';
        break;

      case 'STAFF_GATED':
        // Visitor finished spin. Wait for booth staff to allow next participant.
        this.spinBtn.style.display = 'none';
        this.staffBar.style.display = 'flex';
        if (this.statusSubtext) {
          this.statusSubtext.textContent = 'Spin complete! Ready for next participant.';
        }
        break;
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
