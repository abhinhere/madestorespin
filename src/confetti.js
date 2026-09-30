/**
 * Made Store Confetti Engine
 * High-performance, celebratory canvas confetti with Made Store brand palette
 */

export class ConfettiCannon {
  constructor(canvasId = 'confetti-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Made Store luxury celebration palette: brand gold, ivory, champagne
    this.colors = ['#C5B880', '#EDE3C0', '#FAF7EE', '#B89E62', '#8C8150', '#FAF7EE'];
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  burst(count = 120) {
    this.resize();
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * (Math.random() * 0.8 + 0.1)) + Math.PI; // Launch upwards
      const speed = Math.random() * 14 + 10;
      const x = this.width * (0.3 + Math.random() * 0.4);
      const y = this.height * 0.65;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.9,
        vy: -Math.abs(Math.sin(angle) * speed) - 4,
        size: Math.random() * 8 + 6,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.1 + 0.05,
        opacity: 1,
        life: 1.0,
        decay: Math.random() * 0.008 + 0.005,
      });
    }

    if (!this.animId) {
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.985; // air drag
      p.rotation += p.rSpeed;
      p.wobble += p.wobbleSpeed;
      p.life -= p.decay;

      const scaleX = Math.sin(p.wobble);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.scale(scaleX, 1);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();

      if (p.life <= 0 || p.y > this.height + 50) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  stop() {
    this.particles = [];
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}
