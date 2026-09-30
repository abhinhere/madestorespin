/**
 * Made Store Spin Wheel - Admin Dashboard & Management Controller
 */

import { store } from './store.js';
import { sounds } from './audio.js';

export class AdminController {
  constructor(options = {}) {
    this.store = store;
    this.onPrizesUpdated = options.onPrizesUpdated || (() => {});
    this.isAuthenticated = false;
    this.currentTab = 'dashboard';
    this.editingPrizeId = null;

    this.initElements();
    this.attachEvents();
  }

  initElements() {
    // Modals
    this.loginModal = document.getElementById('admin-login-modal');
    this.panelModal = document.getElementById('admin-panel-modal');
    this.prizeFormModal = document.getElementById('prize-form-modal');

    // Login inputs
    this.pinInput = document.getElementById('admin-pin-input');
    this.pinError = document.getElementById('admin-pin-error');
    this.loginBtn = document.getElementById('admin-login-submit');
    this.cancelLoginBtn = document.getElementById('admin-login-cancel');
    this.openAdminBtn = document.getElementById('btn-open-admin');
    this.closeAdminBtn = document.getElementById('btn-close-admin');

    // Tabs
    this.tabBtns = document.querySelectorAll('.admin-nav-item');
    this.tabContents = document.querySelectorAll('.admin-tab-content');

    // Dashboard views
    this.statTotalSpins = document.getElementById('stat-total-spins');
    this.statTodaySpins = document.getElementById('stat-today-spins');
    this.statActivePrizes = document.getElementById('stat-active-prizes');
    this.statMostAwarded = document.getElementById('stat-most-awarded');
    this.distributionList = document.getElementById('prize-distribution-list');
    this.recentSpinsList = document.getElementById('recent-spins-list');

    // Prize view
    this.prizeTableBody = document.getElementById('prize-table-body');
    this.btnAddPrize = document.getElementById('btn-add-prize');

    // History view
    this.historyTableBody = document.getElementById('history-table-body');
    this.historySearch = document.getElementById('history-search');
    this.btnExportCSV = document.getElementById('btn-export-csv');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    this.btnResetToday = document.getElementById('btn-reset-today');

    // Settings view
    this.btnExportConfig = document.getElementById('btn-export-config');
    this.fileImportConfig = document.getElementById('file-import-config');
    this.btnResetDefaults = document.getElementById('btn-reset-defaults');
    this.inputNewPin = document.getElementById('settings-new-pin');
    this.btnSavePin = document.getElementById('btn-save-pin');
    this.spinDurationInput = document.getElementById('settings-spin-duration');
    this.spinDurationVal = document.getElementById('settings-spin-duration-val');

    // Prize Form Modal elements
    this.prizeForm = document.getElementById('prize-form');
    this.prizeFormTitle = document.getElementById('prize-form-title');
    this.inputPrizeName = document.getElementById('prize-name');
    this.inputPrizeIcon = document.getElementById('prize-icon');
    this.inputPrizeColor = document.getElementById('prize-color');
    this.inputPrizeTextColor = document.getElementById('prize-text-color');
    this.inputPrizeQty = document.getElementById('prize-quantity');
    this.inputPrizeUnlimited = document.getElementById('prize-unlimited');
    this.inputPrizeWeight = document.getElementById('prize-weight');
    this.weightPercentPreview = document.getElementById('prize-weight-percent');
    this.inputPrizeNoWin = document.getElementById('prize-nowin');
    this.inputPrizeMessage = document.getElementById('prize-message');
    this.inputPrizeEnabled = document.getElementById('prize-enabled');
    this.btnClosePrizeForm = document.getElementById('btn-close-prize-form');
    this.btnCancelPrizeForm = document.getElementById('btn-cancel-prize-form');
  }

  attachEvents() {
    // Open admin trigger
    this.openAdminBtn?.addEventListener('click', () => {
      sounds.playClick();
      if (this.isAuthenticated) {
        this.openPanel();
      } else {
        this.openLogin();
      }
    });

    // Login actions
    this.loginBtn?.addEventListener('click', () => this.handleLogin());
    this.pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.cancelLoginBtn?.addEventListener('click', () => this.closeLogin());

    // Panel actions
    this.closeAdminBtn?.addEventListener('click', () => this.closePanel());

    // Tab navigation
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Prize Actions
    this.btnAddPrize?.addEventListener('click', () => {
      sounds.playClick();
      this.openPrizeForm();
    });

    this.btnClosePrizeForm?.addEventListener('click', () => this.closePrizeForm());
    this.btnCancelPrizeForm?.addEventListener('click', () => this.closePrizeForm());

    this.inputPrizeUnlimited?.addEventListener('change', (e) => {
      this.inputPrizeQty.disabled = e.target.checked;
      if (e.target.checked) this.inputPrizeQty.value = 0;
    });

    this.inputPrizeWeight?.addEventListener('input', () => this.updateWeightPreview());

    this.prizeForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePrizeForm();
    });

    // History Actions
    this.btnExportCSV?.addEventListener('click', () => {
      sounds.playClick();
      this.store.exportHistoryCSV();
    });

    this.btnClearHistory?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear ALL spin history? This cannot be undone.')) {
        sounds.playClick();
        this.store.clearHistory();
        this.renderHistory();
        this.renderDashboard();
      }
    });

    this.btnResetToday?.addEventListener('click', () => {
      if (confirm("Reset today's spin statistics?")) {
        sounds.playClick();
        this.store.resetTodayHistory();
        this.renderHistory();
        this.renderDashboard();
      }
    });

    this.historySearch?.addEventListener('input', () => {
      this.renderHistory(this.historySearch.value.trim().toLowerCase());
    });

    // Settings Actions
    this.btnExportConfig?.addEventListener('click', () => {
      sounds.playClick();
      this.store.exportConfigJSON();
    });

    this.fileImportConfig?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const res = this.store.importConfigJSON(evt.target.result);
        if (res.success) {
          alert(`Configuration imported successfully! (${res.count} prizes loaded)`);
          this.renderAll();
          this.onPrizesUpdated();
        } else {
          alert(`Import failed: ${res.error}`);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    this.btnResetDefaults?.addEventListener('click', () => {
      if (confirm('Reset prizes and settings to Made Store factory defaults? Current custom prizes will be replaced.')) {
        sounds.playClick();
        this.store.resetToDefaults();
        this.renderAll();
        this.onPrizesUpdated();
        alert('Restored default Made Store expo prizes.');
      }
    });

    this.btnSavePin?.addEventListener('click', () => {
      const newPin = this.inputNewPin.value.trim();
      if (!newPin || newPin.length < 4) {
        alert('PIN must be at least 4 characters.');
        return;
      }
      this.store.setAdminPin(newPin);
      this.inputNewPin.value = '';
      alert('Admin PIN updated successfully!');
    });

    this.spinDurationInput?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.spinDurationVal.textContent = `${val.toFixed(1)}s`;
      this.store.saveSettings({ spinDuration: val });
    });

    // Preset color buttons
    document.querySelectorAll('.color-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        const textColor = btn.dataset.textColor;
        if (color) this.inputPrizeColor.value = color;
        if (textColor) this.inputPrizeTextColor.value = textColor;
      });
    });
  }

  openLogin() {
    this.pinInput.value = '';
    this.pinError.style.display = 'none';
    this.loginModal.classList.add('active');
    setTimeout(() => this.pinInput.focus(), 100);
  }

  closeLogin() {
    this.loginModal.classList.remove('active');
  }

  handleLogin() {
    const pin = this.pinInput.value.trim();
    if (this.store.verifyAdminPin(pin)) {
      this.isAuthenticated = true;
      this.closeLogin();
      this.openPanel();
    } else {
      this.pinError.textContent = 'Incorrect PIN. Default is 1234.';
      this.pinError.style.display = 'block';
      this.pinInput.select();
    }
  }

  openPanel() {
    this.panelModal.classList.add('active');
    this.renderAll();
  }

  closePanel() {
    this.panelModal.classList.remove('active');
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    if (tabId === 'dashboard') this.renderDashboard();
    if (tabId === 'prizes') this.renderPrizes();
    if (tabId === 'history') this.renderHistory();
    if (tabId === 'settings') this.renderSettings();
  }

  renderAll() {
    this.renderDashboard();
    this.renderPrizes();
    this.renderHistory();
    this.renderSettings();
  }

  // --- RENDER DASHBOARD ---
  renderDashboard() {
    const stats = this.store.getStats();

    if (this.statTotalSpins) this.statTotalSpins.textContent = stats.totalSpins;
    if (this.statTodaySpins) this.statTodaySpins.textContent = stats.todaySpins;
    if (this.statActivePrizes) this.statActivePrizes.textContent = `${stats.activePrizesCount} Active`;
    if (this.statMostAwarded) {
      this.statMostAwarded.textContent = stats.mostAwarded
        ? `${stats.mostAwarded.icon} ${stats.mostAwarded.name} (${stats.mostAwarded.count})`
        : 'None yet';
    }

    // Distribution list
    if (this.distributionList) {
      this.distributionList.innerHTML = '';
      const prizes = this.store.getAllPrizes();
      const totalSpins = stats.totalSpins || 1;

      prizes.forEach(prize => {
        const item = stats.distribution[prize.id] || { count: 0 };
        const percent = Math.round((item.count / totalSpins) * 100);

        const row = document.createElement('div');
        row.className = 'dist-row';

        const stockLabel = prize.isUnlimited
          ? '<span class="badge badge-unlimited">Unlimited</span>'
          : (prize.quantity <= 0
              ? '<span class="badge badge-depleted">OUT OF STOCK</span>'
              : (prize.quantity <= 3
                  ? `<span class="badge badge-warning">${prize.quantity} left</span>`
                  : `<span class="badge badge-stock">${prize.quantity} left</span>`));

        row.innerHTML = `
          <div class="dist-header">
            <span class="dist-name">
              <span class="dist-icon" style="background:${prize.color}; color:${prize.textColor};">${prize.icon}</span>
              <strong>${prize.name}</strong>
              ${stockLabel}
            </span>
            <span class="dist-count"><strong>${item.count}</strong> won (${percent}%)</span>
          </div>
          <div class="dist-progress-bar">
            <div class="dist-progress-fill" style="width: ${percent}%; background-color: ${prize.color};"></div>
          </div>
        `;
        this.distributionList.appendChild(row);
      });
    }

    // Recent 5 spins preview
    if (this.recentSpinsList) {
      this.recentSpinsList.innerHTML = '';
      const recent = this.store.history.slice(0, 5);
      if (recent.length === 0) {
        this.recentSpinsList.innerHTML = '<div class="empty-state">No spins recorded yet.</div>';
      } else {
        recent.forEach(spin => {
          const item = document.createElement('div');
          item.className = 'recent-spin-item';
          item.innerHTML = `
            <span class="recent-icon">${spin.prizeIcon}</span>
            <div class="recent-details">
              <div class="recent-name">${spin.prizeName}</div>
              <div class="recent-time">${spin.timeFormatted} • ID: ${spin.spinId}</div>
            </div>
            <span class="badge ${spin.isNoWin ? 'badge-neutral' : 'badge-win'}">${spin.isNoWin ? 'Try Again' : 'Winner'}</span>
          `;
          this.recentSpinsList.appendChild(item);
        });
      }
    }
  }

  // --- RENDER PRIZES ---
  renderPrizes() {
    if (!this.prizeTableBody) return;
    this.prizeTableBody.innerHTML = '';

    const prizes = this.store.getAllPrizes();
    const activePrizes = this.store.getActivePrizes();
    const totalActiveWeight = activePrizes.reduce((sum, p) => sum + p.probability, 0);

    prizes.forEach(prize => {
      const tr = document.createElement('tr');
      const isDepleted = !prize.isUnlimited && prize.quantity <= 0;
      const isCurrentlyActive = prize.enabled && !isDepleted;

      // Probability percentage among active prizes
      const probPct = isCurrentlyActive && totalActiveWeight > 0
        ? ((prize.probability / totalActiveWeight) * 100).toFixed(1) + '%'
        : '0.0% (inactive)';

      tr.className = isCurrentlyActive ? '' : 'row-disabled';

      tr.innerHTML = `
        <td>
          <div class="prize-cell-info">
            <span class="prize-cell-badge" style="background:${prize.color}; color:${prize.textColor};">
              ${prize.icon}
            </span>
            <div>
              <strong>${prize.name}</strong>
              ${prize.isNoWin ? '<span class="badge badge-neutral">No Win</span>' : ''}
            </div>
          </div>
        </td>
        <td>
          <div class="qty-control">
            ${prize.isUnlimited 
              ? '<span class="badge badge-unlimited">Unlimited</span>' 
              : `
                <button class="btn-qty-adj" data-id="${prize.id}" data-delta="-1" title="Decrease stock">-</button>
                <span class="qty-number ${prize.quantity <= 0 ? 'text-depleted' : (prize.quantity <= 3 ? 'text-warning' : '')}">${prize.quantity}</span>
                <button class="btn-qty-adj" data-id="${prize.id}" data-delta="1" title="Increase stock">+</button>
              `}
          </div>
        </td>
        <td>
          <div class="weight-cell">
            <strong>${prize.probability}</strong>
            <small class="text-muted">(${probPct})</small>
          </div>
        </td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" class="toggle-prize-active" data-id="${prize.id}" ${prize.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon-action btn-edit-prize" data-id="${prize.id}" title="Edit prize">✏️</button>
            <button class="btn-icon-action btn-del-prize" data-id="${prize.id}" title="Delete prize">🗑️</button>
          </div>
        </td>
      `;

      this.prizeTableBody.appendChild(tr);
    });

    // Attach row events
    this.prizeTableBody.querySelectorAll('.toggle-prize-active').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        this.store.togglePrizeEnabled(id);
        this.renderPrizes();
        this.renderDashboard();
        this.onPrizesUpdated();
      });
    });

    this.prizeTableBody.querySelectorAll('.btn-qty-adj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const delta = parseInt(btn.dataset.delta, 10);
        const p = this.store.getPrizeById(id);
        if (p && !p.isUnlimited) {
          const newQty = Math.max(0, (p.quantity || 0) + delta);
          this.store.updatePrize(id, { quantity: newQty });
          this.renderPrizes();
          this.renderDashboard();
          this.onPrizesUpdated();
        }
      });
    });

    this.prizeTableBody.querySelectorAll('.btn-edit-prize').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.openPrizeForm(id);
      });
    });

    this.prizeTableBody.querySelectorAll('.btn-del-prize').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const p = this.store.getPrizeById(id);
        if (p && confirm(`Delete "${p.name}"? This removes it from the wheel.`)) {
          this.store.deletePrize(id);
          this.renderPrizes();
          this.renderDashboard();
          this.onPrizesUpdated();
        }
      });
    });
  }

  // --- PRIZE FORM (ADD / EDIT) ---
  openPrizeForm(prizeId = null) {
    this.editingPrizeId = prizeId;
    if (prizeId) {
      const prize = this.store.getPrizeById(prizeId);
      if (!prize) return;
      this.prizeFormTitle.textContent = 'Edit Wheel Prize';
      this.inputPrizeName.value = prize.name;
      this.inputPrizeIcon.value = prize.icon || '🎁';
      this.inputPrizeColor.value = prize.color || '#FBF8F0';
      this.inputPrizeTextColor.value = prize.textColor || '#1A1B14';
      this.inputPrizeUnlimited.checked = Boolean(prize.isUnlimited);
      this.inputPrizeQty.disabled = Boolean(prize.isUnlimited);
      this.inputPrizeQty.value = prize.isUnlimited ? 0 : prize.quantity;
      this.inputPrizeWeight.value = prize.probability || 10;
      this.inputPrizeNoWin.checked = Boolean(prize.isNoWin);
      this.inputPrizeMessage.value = prize.winMessage || '';
      this.inputPrizeEnabled.checked = prize.enabled !== false;
    } else {
      this.prizeFormTitle.textContent = 'Add New Wheel Prize';
      this.prizeForm.reset();
      this.inputPrizeColor.value = '#FBF8F0';
      this.inputPrizeTextColor.value = '#1A1B14';
      this.inputPrizeIcon.value = '🎁';
      this.inputPrizeWeight.value = 20;
      this.inputPrizeQty.value = 10;
      this.inputPrizeQty.disabled = false;
      this.inputPrizeUnlimited.checked = false;
      this.inputPrizeEnabled.checked = true;
      this.inputPrizeNoWin.checked = false;
      this.inputPrizeMessage.value = 'Please collect your prize from the Made Store stall.';
    }

    this.updateWeightPreview();
    this.prizeFormModal.classList.add('active');
  }

  closePrizeForm() {
    this.prizeFormModal.classList.remove('active');
    this.editingPrizeId = null;
  }

  updateWeightPreview() {
    const activePrizes = this.store.getActivePrizes();
    const currentWeight = parseInt(this.inputPrizeWeight.value, 10) || 0;

    let otherWeights = 0;
    activePrizes.forEach(p => {
      if (p.id !== this.editingPrizeId) {
        otherWeights += p.probability;
      }
    });

    const total = otherWeights + currentWeight;
    const pct = total > 0 ? ((currentWeight / total) * 100).toFixed(1) : '100';
    if (this.weightPercentPreview) {
      this.weightPercentPreview.textContent = `~${pct}% chance on wheel`;
    }
  }

  savePrizeForm() {
    const name = this.inputPrizeName.value.trim();
    if (!name) {
      alert('Prize name is required.');
      return;
    }

    const payload = {
      name,
      icon: this.inputPrizeIcon.value.trim() || '🎁',
      color: this.inputPrizeColor.value,
      textColor: this.inputPrizeTextColor.value,
      isUnlimited: this.inputPrizeUnlimited.checked,
      quantity: this.inputPrizeUnlimited.checked ? 0 : parseInt(this.inputPrizeQty.value, 10) || 0,
      probability: Math.max(1, parseInt(this.inputPrizeWeight.value, 10) || 1),
      isNoWin: this.inputPrizeNoWin.checked,
      winMessage: this.inputPrizeMessage.value.trim(),
      enabled: this.inputPrizeEnabled.checked,
    };

    if (this.editingPrizeId) {
      this.store.updatePrize(this.editingPrizeId, payload);
    } else {
      this.store.addPrize(payload);
    }

    this.closePrizeForm();
    this.renderPrizes();
    this.renderDashboard();
    this.onPrizesUpdated();
  }

  // --- RENDER HISTORY ---
  renderHistory(filterText = '') {
    if (!this.historyTableBody) return;
    this.historyTableBody.innerHTML = '';

    let items = this.store.history;
    if (filterText) {
      items = items.filter(h =>
        h.prizeName.toLowerCase().includes(filterText) ||
        h.spinId.toLowerCase().includes(filterText) ||
        h.dateFormatted.toLowerCase().includes(filterText)
      );
    }

    if (items.length === 0) {
      this.historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">No spin records found.</td></tr>`;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.spinId}</strong></td>
        <td>${item.dateFormatted}</td>
        <td>${item.timeFormatted}</td>
        <td>
          <span style="margin-right: 6px;">${item.prizeIcon}</span>
          ${item.prizeName}
        </td>
        <td>
          <span class="badge ${item.isNoWin ? 'badge-neutral' : 'badge-win'}">
            ${item.isNoWin ? 'Try Again' : 'Prize Won'}
          </span>
        </td>
        <td><small class="text-muted">${item.remainingQuantity}</small></td>
      `;
      this.historyTableBody.appendChild(tr);
    });
  }

  // --- RENDER SETTINGS ---
  renderSettings() {
    const s = this.store.settings;
    if (this.spinDurationInput && this.spinDurationVal) {
      this.spinDurationInput.value = s.spinDuration || 4.8;
      this.spinDurationVal.textContent = `${(s.spinDuration || 4.8).toFixed(1)}s`;
    }
  }
}
