/**
 * Made Store Spin Wheel - Minimal Luxury Canvas Renderer & Physics Engine
 * Inspired by Made Store luxury timepiece & leather goods aesthetic
 */

import { sounds } from './audio.js';

export class SpinWheel {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.prizes = options.prizes || [];
    this.onSpinComplete = options.onSpinComplete || (() => {});
    this.onTick = options.onTick || (() => {});

    // Wheel state
    this.currentAngle = 0; // In radians
    this.isSpinning = false;
    this.targetPrize = null;
    this.needleAngle = 0; // Deflection angle in radians
    this.needleVelocity = 0;

    // Configuration
    this.spinDuration = options.spinDuration || 4800; // ms
    this.lastPegIndex = -1;

    // Handle high-DPI displays
    this.setupDPI();
    window.addEventListener('resize', () => {
      this.setupDPI();
      this.draw();
    });

    this.draw();
  }

  setupDPI() {
    const dpr = window.devicePixelRatio || 1;
    // Available height: window height minus header, hero, controls, footer, and margins
    const availableHeight = Math.max(240, window.innerHeight - 280);
    const availableWidth = Math.max(240, window.innerWidth - 32);
    // Ideal max wheel diameter: 380px on standard screen, scales down on compact viewports
    const size = Math.min(availableWidth, availableHeight, 380);

    this.size = size;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.centerX = this.size / 2;
    this.centerY = this.size / 2;
    this.radius = (this.size / 2) - 18; // Margin for precision needle and rim
  }

  setPrizes(prizes) {
    this.prizes = prizes;
    this.draw();
  }

  /**
   * Deterministic spin targeting a specific prize
   */
  spinTo(targetPrize, customDuration = null) {
    if (this.isSpinning || !this.prizes || this.prizes.length === 0) return false;

    this.isSpinning = true;
    this.targetPrize = targetPrize;
    const duration = customDuration || this.spinDuration;

    const prizeCount = this.prizes.length;
    const sliceAngle = (2 * Math.PI) / prizeCount;

    // Find index of target prize
    const targetIndex = this.prizes.findIndex(p => p.id === targetPrize.id);
    if (targetIndex === -1) {
      this.isSpinning = false;
      return false;
    }

    // Top pointer is at (3 * Math.PI) / 2
    const pointerAngle = (3 * Math.PI) / 2;

    // Center angle of the target segment in local wheel coords
    const segmentCenter = (targetIndex + 0.5) * sliceAngle;

    // Safe random jitter inside segment (within 28% of half-width for safety)
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.45);
    const targetLocalAngle = segmentCenter + jitter;

    // Delta required to align targetLocalAngle with pointerAngle
    let desiredAngleMod = (pointerAngle - targetLocalAngle) % (2 * Math.PI);
    if (desiredAngleMod < 0) desiredAngleMod += 2 * Math.PI;

    const currentAngleMod = this.currentAngle % (2 * Math.PI);
    let delta = desiredAngleMod - currentAngleMod;
    if (delta <= 0) delta += 2 * Math.PI;

    // Full rotations: 5 to 7 full spins for excitement
    const fullSpins = 5 + Math.floor(Math.random() * 2);
    const totalRotation = fullSpins * 2 * Math.PI + delta;

    const startAngle = this.currentAngle;
    const endAngle = startAngle + totalRotation;
    const startTime = performance.now();

    let prevAngle = startAngle;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Quartic ease-out for silky deceleration
      const ease = 1 - Math.pow(1 - progress, 4);
      this.currentAngle = startAngle + (endAngle - startAngle) * ease;

      const deltaAngle = this.currentAngle - prevAngle;
      const angularVelocity = deltaAngle / 16.67;
      prevAngle = this.currentAngle;

      this.updateNeedlePhysics(angularVelocity);
      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentAngle = endAngle;
        this.isSpinning = false;
        this.needleAngle = 0;
        this.draw();

        if (this.onSpinComplete) {
          this.onSpinComplete(this.targetPrize);
        }
      }
    };

    requestAnimationFrame(animate);
    return true;
  }

  updateNeedlePhysics(velocity) {
    if (!this.prizes || this.prizes.length === 0) return;

    const prizeCount = this.prizes.length;
    const sliceAngle = (2 * Math.PI) / prizeCount;

    const currentWheelNormalized = (this.currentAngle) % (2 * Math.PI);
    const relAngle = ((3 * Math.PI / 2) - currentWheelNormalized + 4 * Math.PI) % (2 * Math.PI);
    const currentPeg = Math.floor(relAngle / sliceAngle);

    if (currentPeg !== this.lastPegIndex) {
      this.lastPegIndex = currentPeg;
      // Peg hit! Deflect needle in rotation direction
      this.needleAngle = Math.min(0.20, Math.max(0.06, velocity * 0.35));
      sounds.playTick(Math.min(velocity * 10, 1.2));
      if (this.onTick) this.onTick();
    } else {
      // Spring back with smooth damping
      this.needleAngle *= 0.82;
      if (Math.abs(this.needleAngle) < 0.003) {
        this.needleAngle = 0;
      }
    }
  }

  draw() {
    const { ctx, centerX, centerY, radius, prizes, currentAngle } = this;
    ctx.clearRect(0, 0, this.size, this.size);

    if (!prizes || prizes.length === 0) {
      this.drawEmptyState();
      return;
    }

    const count = prizes.length;
    const sliceAngle = (2 * Math.PI) / count;

    ctx.save();
    ctx.translate(centerX, centerY);

    // 1. Ambient Outer Glow & Drop Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.filter = 'blur(16px)';
    ctx.fill();
    ctx.restore();

    // 2. Minimal High-Precision Outer Bezel
    ctx.save();
    // Bezel base ring
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#16171B';
    ctx.fill();

    // Precision outer hairline ring
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(197, 184, 128, 0.4)';
    ctx.stroke();

    // Precision inner champagne hairline ring
    ctx.beginPath();
    ctx.arc(0, 0, radius + 1, 0, 2 * Math.PI);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#C5B880';
    ctx.stroke();

    // Minimal watch bezel indices / tick marks around perimeter
    const totalTicks = count * 6; // 6 micro-ticks per slice
    for (let t = 0; t < totalTicks; t++) {
      const tickAngle = (t * 2 * Math.PI) / totalTicks;
      const isMajor = t % 6 === 0;
      const innerR = isMajor ? radius + 2 : radius + 4.5;
      const outerR = radius + 7;

      const cos = Math.cos(tickAngle);
      const sin = Math.sin(tickAngle);

      ctx.beginPath();
      ctx.moveTo(cos * innerR, sin * innerR);
      ctx.lineTo(cos * outerR, sin * outerR);
      ctx.lineWidth = isMajor ? 1.2 : 0.6;
      ctx.strokeStyle = isMajor ? '#C5B880' : 'rgba(197, 184, 128, 0.25)';
      ctx.stroke();
    }
    ctx.restore();

    // 3. Rotated Wheel Disc & Segments
    ctx.save();
    ctx.rotate(currentAngle);

    // Default luxury palette fallback if colors match old legacy tones
    const defaultLuxuryColors = ['#15161A', '#1E2026', '#28231B', '#1E2026', '#121316'];

    for (let i = 0; i < count; i++) {
      const prize = prizes[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw slice wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Ensure segment uses minimal luxury tone
      let segColor = prize.color;
      if (!segColor || segColor === '#F4EFE6' || segColor === '#5C5D30') {
        segColor = defaultLuxuryColors[i % defaultLuxuryColors.length];
      }

      ctx.fillStyle = segColor;
      ctx.fill();

      // Fine champagne hairline divider
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(197, 184, 128, 0.22)';
      ctx.stroke();

      // Render prize content
      this.drawSegmentContent(prize, startAngle, endAngle, radius);
    }

    ctx.restore(); // end rotated wheel disc

    // 4. Center Hub / Made Store Timepiece Badge
    this.drawCenterBadge();

    ctx.restore(); // end wheel translate

    // 5. Top Precision Pointer / Indicator
    this.drawPointer();
  }

  /**
   * Render prize text and icon cleanly without overlap
   */
  drawSegmentContent(prize, startAngle, endAngle, radius) {
    const { ctx } = this;
    const midAngle = startAngle + (endAngle - startAngle) / 2;

    // Format prize text into clean lines
    const lines = this.formatPrizeLines(prize.name);

    ctx.save();
    ctx.rotate(midAngle);

    // Position at radial sweet spot
    const contentRadius = radius * 0.65;
    ctx.translate(contentRadius, 0);

    // Tangential alignment along arc: when at 12 o'clock under pointer, text is perfectly level and upright!
    ctx.rotate(Math.PI / 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Color contrast
    const textColor = prize.textColor || '#FAF7EE';

    // Scale typography cleanly relative to wheel size
    const scaleFactor = Math.min(1.15, Math.max(0.75, radius / 180));
    const maxLineLen = Math.max(...lines.map(l => l.length));
    let fontSize = Math.max(8.5, Math.round(11.5 * scaleFactor));
    if (maxLineLen > 10) fontSize = Math.max(8, Math.round(10 * scaleFactor));
    if (maxLineLen > 15) fontSize = Math.max(7.5, Math.round(9 * scaleFactor));

    const lineHeight = fontSize * 1.32;

    // Minimalist luxury accent mark (subtle brand gold diamond)
    const symbolSize = Math.max(7.5, Math.round(9.5 * scaleFactor));
    ctx.fillStyle = '#C5B880';
    ctx.font = `600 ${symbolSize}px "Outfit", sans-serif`;
    ctx.fillText('✦', 0, -(lines.length * lineHeight * 0.5) - (7 * scaleFactor));

    // Draw typography with clean contrast shadow along spoke
    ctx.font = `600 ${fontSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;
    ctx.letterSpacing = '1.2px';

    lines.forEach((line, idx) => {
      const yOffset = (idx - (lines.length - 1) / 2) * lineHeight;

      // Dark shadow for razor-sharp readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillText(line, 0, yOffset + 1);

      // Main text in champagne or crisp ivory
      ctx.fillStyle = textColor;
      ctx.fillText(line, 0, yOffset);
    });

    ctx.restore();
  }

  formatPrizeLines(name) {
    if (!name) return [''];
    const cleaned = name.trim().toUpperCase();

    // Specific well-known prize patterns
    if (cleaned === 'BETTER LUCK NEXT TIME') {
      return ['BETTER LUCK', 'NEXT TIME'];
    }
    if (cleaned === 'FREE CHOCOLATE') {
      return ['FREE', 'CHOCOLATE'];
    }
    if (cleaned === 'FREE ACCESSORY') {
      return ['FREE', 'ACCESSORY'];
    }

    const words = cleaned.split(/\s+/);
    if (words.length <= 1) return [cleaned];
    if (words.length === 2) {
      if (cleaned.length <= 8) return [cleaned];
      return [words[0], words[1]];
    }

    const mid = Math.ceil(words.length / 2);
    return [
      words.slice(0, mid).join(' '),
      words.slice(mid).join(' ')
    ];
  }

  drawCenterBadge() {
    const { ctx } = this;
    const hubRadius = this.radius * 0.20;

    // Hub drop shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.filter = 'blur(8px)';
    ctx.fill();
    ctx.restore();

    // Outer champagne gold rim
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#101114';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#C5B880';
    ctx.stroke();

    // Inner concentric luxury ring
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius - 4.5, 0, 2 * Math.PI);
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = 'rgba(197, 184, 128, 0.4)';
    ctx.stroke();

    // "MADE" luxury typography
    ctx.fillStyle = '#C5B880';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.max(10, hubRadius * 0.42)}px "Outfit", sans-serif`;
    ctx.letterSpacing = '3px';
    ctx.fillText('MADE', 1, -1);

    // Center pivot point
    ctx.beginPath();
    ctx.arc(0, hubRadius * 0.42, 1.8, 0, 2 * Math.PI);
    ctx.fillStyle = '#C5B880';
    ctx.fill();
  }

  drawPointer() {
    const { ctx, centerX, centerY, radius, needleAngle } = this;
    const pointerY = centerY - radius - 2;

    ctx.save();
    ctx.translate(centerX, pointerY);
    ctx.rotate(needleAngle);

    // Pointer shadow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-7, -4);
    ctx.lineTo(7, -4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.filter = 'blur(4px)';
    ctx.fill();
    ctx.restore();

    // Precision needle indicator (champagne gold gradient)
    const pointerGrad = ctx.createLinearGradient(-6, -6, 6, 22);
    pointerGrad.addColorStop(0, '#EDE3C0');
    pointerGrad.addColorStop(0.4, '#C5B880');
    pointerGrad.addColorStop(1, '#8C8150');

    ctx.beginPath();
    ctx.moveTo(0, 22); // Tip pointing down to the wheel rim
    ctx.lineTo(-6, -4);
    ctx.lineTo(6, -4);
    ctx.closePath();
    ctx.fillStyle = pointerGrad;
    ctx.fill();

    // Crisp dark hairline contour
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0E0F12';
    ctx.stroke();

    // Top mounting collar / pivot
    ctx.beginPath();
    ctx.arc(0, -4, 5.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#16171B';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#C5B880';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -4, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#C5B880';
    ctx.fill();

    ctx.restore();
  }

  drawEmptyState() {
    const { ctx, centerX, centerY, radius } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#16171B';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#C5B880';
    ctx.stroke();

    ctx.fillStyle = '#C5B880';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 15px "Outfit", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('NO ACTIVE PRIZES', centerX, centerY - 10);
    ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#8E8B82';
    ctx.fillText('Configure prizes in Staff Admin', centerX, centerY + 14);
    ctx.restore();
  }
}
