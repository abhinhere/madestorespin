/**
 * Made Store Spin Wheel - Data Store & Inventory Management
 * 100% offline, persistent via localStorage
 */

const STORAGE_KEYS = {
  PRIZES: 'made_store_prizes_v1',
  HISTORY: 'made_store_history_v1',
  SETTINGS: 'made_store_settings_v1',
};

// Initial default prizes matching the expo brief
// Initial default prizes matching the luxury Made Store aesthetic in light colors
export const DEFAULT_PRIZES = [
  {
    id: 'prize_1',
    name: 'FREE CHOCOLATE',
    icon: '🍫',
    color: '#FBF8F0',
    textColor: '#1A1B14',
    quantity: 50,
    isUnlimited: false,
    probability: 50,
    enabled: true,
    wonCount: 0,
    winMessage: 'Please collect your complimentary chocolate from the Made Store booth.',
    isNoWin: false,
    order: 1,
  },
  {
    id: 'prize_2',
    name: '5% OFF',
    icon: '🏷️',
    color: '#EADDBE',
    textColor: '#1A1B14',
    quantity: 60,
    isUnlimited: false,
    probability: 25,
    enabled: true,
    wonCount: 0,
    winMessage: 'Show this voucher to redeem 5% off on any handcrafted item.',
    isNoWin: false,
    order: 2,
  },
  {
    id: 'prize_3',
    name: 'FREE ACCESSORY',
    icon: '🎁',
    color: '#F2ECE0',
    textColor: '#1A1B14',
    quantity: 3,
    isUnlimited: false,
    probability: 5,
    enabled: true,
    wonCount: 0,
    winMessage: 'Congratulations! Please collect your exclusive Made accessory from our booth.',
    isNoWin: false,
    order: 3,
  },
  {
    id: 'prize_4',
    name: '10% OFF',
    icon: '✨',
    color: '#E5D6AE',
    textColor: '#1A1B14',
    quantity: 25,
    isUnlimited: false,
    probability: 15,
    enabled: true,
    wonCount: 0,
    winMessage: 'Show this voucher to redeem 10% off your purchase at Made Store today!',
    isNoWin: false,
    order: 4,
  },
  {
    id: 'prize_5',
    name: 'BETTER LUCK NEXT TIME',
    icon: '☘️',
    color: '#E8E1CE',
    textColor: '#545142',
    quantity: 0,
    isUnlimited: true,
    probability: 45,
    enabled: true,
    wonCount: 0,
    winMessage: 'Thank you for stopping by! Explore our curated collection at the stall.',
    isNoWin: true,
    order: 5,
  },
];

export const DEFAULT_SETTINGS = {
  adminPin: '1234',
  soundEnabled: true,
  spinDuration: 4.8, // seconds
  stallTitle: 'Made Store College Expo',
  requireStaffPinForReset: false,
};

class Store {
  constructor() {
    this.prizes = this.loadPrizes();
    this.history = this.loadHistory();
    this.settings = this.loadSettings();
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this);
      } catch (err) {
        console.error('Store subscriber error:', err);
      }
    });
  }

  // --- PRIZE METHODS ---
  loadPrizes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRIZES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Auto-migrate legacy dark tones to refined light luxury palette
          const darkToLightMap = {
            '#15161A': { color: '#FBF8F0', textColor: '#1A1B14' },
            '#1E2026': { color: '#EADDBE', textColor: '#1A1B14' },
            '#28231B': { color: '#F2ECE0', textColor: '#1A1B14' },
            '#121316': { color: '#E8E1CE', textColor: '#545142' },
            '#808044': { color: '#FBF8F0', textColor: '#1A1B14' },
            '#5C5D30': { color: '#E5D6AE', textColor: '#1A1B14' },
            '#282B28': { color: '#E8E1CE', textColor: '#545142' },
            '#C5B880': { color: '#EADDBE', textColor: '#1A1B14' },
          };
          const lightPalette = ['#FBF8F0', '#EADDBE', '#F2ECE0', '#E5D6AE', '#E8E1CE'];
          let modified = false;

          parsed.forEach((p, idx) => {
            const hex = p.color?.toUpperCase();
            const mapped = darkToLightMap[hex] || darkToLightMap[p.color];
            if (mapped) {
              p.color = mapped.color;
              p.textColor = mapped.textColor;
              modified = true;
            } else if (p.color && (p.color.startsWith('#1') || p.color.startsWith('#2') || p.color.startsWith('#0') || p.color.startsWith('#3'))) {
              // Any dark tones converted to corresponding light tones
              p.color = lightPalette[idx % lightPalette.length];
              p.textColor = idx === 4 ? '#545142' : '#1A1B14';
              modified = true;
            } else if (!p.textColor || p.textColor === '#FFFFFF' || p.textColor === '#FAF7EE') {
              // Prevent white-on-light invisible text
              p.textColor = '#1A1B14';
              modified = true;
            }
          });

          if (modified) {
            localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse prizes from localStorage:', e);
    }
    // Return cloned defaults
    return JSON.parse(JSON.stringify(DEFAULT_PRIZES));
  }

  savePrizes(prizes = this.prizes) {
    this.prizes = prizes;
    try {
      localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(this.prizes));
    } catch (e) {
      console.error('Failed to save prizes to localStorage:', e);
    }
    this.notify();
  }

  /**
   * Only active prizes that are enabled AND have remaining stock (or are unlimited)
   */
  getActivePrizes() {
    return this.prizes
      .filter(p => p.enabled && (p.isUnlimited || p.quantity > 0))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getAllPrizes() {
    return [...this.prizes].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getPrizeById(id) {
    return this.prizes.find(p => p.id === id) || null;
  }

  addPrize(newPrize) {
    const id = 'prize_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const prize = {
      id,
      name: newPrize.name.trim(),
      icon: newPrize.icon || '🎁',
      color: newPrize.color || '#FBF8F0',
      textColor: newPrize.textColor || '#1A1B14',
      quantity: newPrize.isUnlimited ? 0 : Number(newPrize.quantity) || 0,
      isUnlimited: Boolean(newPrize.isUnlimited),
      probability: Math.max(1, Number(newPrize.probability) || 10),
      enabled: newPrize.enabled !== undefined ? Boolean(newPrize.enabled) : true,
      wonCount: 0,
      winMessage: newPrize.winMessage || 'Please collect your prize from the Made Store stall.',
      isNoWin: Boolean(newPrize.isNoWin),
      order: this.prizes.length + 1,
    };

    this.prizes.push(prize);
    this.savePrizes();
    return prize;
  }

  updatePrize(id, updates) {
    const idx = this.prizes.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.prizes[idx] = {
        ...this.prizes[idx],
        ...updates,
        quantity: updates.isUnlimited ? 0 : (updates.quantity !== undefined ? Math.max(0, Number(updates.quantity)) : this.prizes[idx].quantity),
        probability: updates.probability !== undefined ? Math.max(1, Number(updates.probability)) : this.prizes[idx].probability,
      };
      this.savePrizes();
      return this.prizes[idx];
    }
    return null;
  }

  deletePrize(id) {
    this.prizes = this.prizes.filter(p => p.id !== id);
    this.savePrizes();
  }

  togglePrizeEnabled(id) {
    const prize = this.getPrizeById(id);
    if (prize) {
      prize.enabled = !prize.enabled;
      this.savePrizes();
      return prize.enabled;
    }
    return false;
  }

  // --- SELECTION & WIN LOGIC ---

  /**
   * Deterministic weighted probability selection
   * Returns selected Prize object from active available prizes
   */
  selectWinningPrize() {
    const active = this.getActivePrizes();
    if (!active || active.length === 0) {
      return null;
    }

    const totalWeight = active.reduce((sum, p) => sum + (Number(p.probability) || 0), 0);
    if (totalWeight <= 0) {
      return active[0];
    }

    const randomVal = Math.random() * totalWeight;
    let accumulated = 0;

    for (const prize of active) {
      accumulated += Number(prize.probability) || 0;
      if (randomVal <= accumulated) {
        return prize;
      }
    }

    return active[active.length - 1];
  }

  /**
   * Record a spin result, decrement quantity if limited, update wonCount, log history
   */
  recordSpin(prize) {
    if (!prize) return null;

    // Decrement inventory if limited
    if (!prize.isUnlimited && prize.quantity > 0) {
      prize.quantity -= 1;
    }
    prize.wonCount = (prize.wonCount || 0) + 1;
    this.savePrizes();

    // Create history item
    const now = new Date();
    const spinId = 'MS-' + (1000 + this.history.length + 1);
    const dateFormatted = now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const historyItem = {
      spinId,
      timestamp: now.toISOString(),
      dateFormatted,
      timeFormatted,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeIcon: prize.icon,
      isNoWin: Boolean(prize.isNoWin),
      isUnlimited: Boolean(prize.isUnlimited),
      remainingQuantity: prize.isUnlimited ? 'Unlimited' : prize.quantity,
    };

    this.history.unshift(historyItem);
    this.saveHistory();

    return historyItem;
  }

  // --- HISTORY METHODS ---
  loadHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse spin history:', e);
    }
    return [];
  }

  saveHistory(history = this.history) {
    this.history = history;
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save spin history:', e);
    }
    this.notify();
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  resetTodayHistory() {
    const todayStr = new Date().toLocaleDateString();
    this.history = this.history.filter(h => {
      const itemDate = new Date(h.timestamp).toLocaleDateString();
      return itemDate !== todayStr;
    });
    this.saveHistory();
  }

  // --- SETTINGS METHODS ---
  loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {}
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {}
    this.notify();
  }

  verifyAdminPin(enteredPin) {
    return enteredPin === (this.settings.adminPin || '1234');
  }

  setAdminPin(newPin) {
    if (!newPin || newPin.length < 4) return false;
    this.settings.adminPin = newPin;
    this.saveSettings(this.settings);
    return true;
  }

  // --- STATS COMPUTATION ---
  getStats() {
    const totalSpins = this.history.length;
    const todayStr = new Date().toLocaleDateString();
    const todaySpins = this.history.filter(h => {
      return new Date(h.timestamp).toLocaleDateString() === todayStr;
    }).length;

    // Prize counts breakdown
    const distribution = {};
    this.prizes.forEach(p => {
      distribution[p.id] = {
        name: p.name,
        icon: p.icon,
        count: 0,
        isNoWin: p.isNoWin,
        quantity: p.quantity,
        isUnlimited: p.isUnlimited,
      };
    });

    this.history.forEach(h => {
      if (distribution[h.prizeId]) {
        distribution[h.prizeId].count += 1;
      } else {
        distribution[h.prizeId] = {
          name: h.prizeName,
          icon: h.prizeIcon,
          count: 1,
          isNoWin: h.isNoWin,
          quantity: 0,
          isUnlimited: false,
        };
      }
    });

    // Determine most awarded prize
    let mostAwarded = null;
    let maxWins = -1;
    Object.values(distribution).forEach(item => {
      if (item.count > maxWins) {
        maxWins = item.count;
        mostAwarded = item;
      }
    });

    return {
      totalSpins,
      todaySpins,
      distribution,
      mostAwarded: mostAwarded && mostAwarded.count > 0 ? mostAwarded : null,
      activePrizesCount: this.getActivePrizes().length,
      depletedCount: this.prizes.filter(p => !p.isUnlimited && p.quantity <= 0).length,
    };
  }

  // --- CSV EXPORT & BACKUP ---
  exportHistoryCSV() {
    if (this.history.length === 0) {
      alert('No spin history to export yet.');
      return;
    }

    const headers = ['Spin ID', 'Date', 'Time', 'Prize Name', 'Prize ID', 'Type', 'Remaining Stock'];
    const rows = this.history.map(item => [
      `"${item.spinId}"`,
      `"${item.dateFormatted}"`,
      `"${item.timeFormatted}"`,
      `"${item.prizeName.replace(/"/g, '""')}"`,
      `"${item.prizeId}"`,
      `"${item.isNoWin ? 'No Win' : 'Win'}"`,
      `"${item.remainingQuantity}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `made-store-spins-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportConfigJSON() {
    const payload = {
      brand: 'Made Store',
      exportedAt: new Date().toISOString(),
      prizes: this.prizes,
      settings: this.settings,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `made-store-wheel-config-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  importConfigJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.prizes)) {
        this.prizes = data.prizes;
        this.savePrizes();
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
          this.saveSettings(this.settings);
        }
        return { success: true, count: data.prizes.length };
      }
      return { success: false, error: 'Invalid configuration format: Missing prizes array.' };
    } catch (e) {
      return { success: false, error: 'Failed to parse JSON file: ' + e.message };
    }
  }

  resetToDefaults() {
    this.prizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
    this.savePrizes();
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings(this.settings);
  }
}

export const store = new Store();
