/**
 * Sereno • Visualizador Imersivo & Calmo
 * Renderiza ondas orgânicas estilo aurora boreal, ondulações de notas e partículas flutuantes.
 */

class SerenoVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.engine = audioEngine;

    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.particles = [];
    this.ripples = [];
    this.activeNoteDisplay = null;
    this.animationFrameId = null;

    // Paletas de cores por preset (inspiradas na Espiral Zen Pastel)
    this.colorPalettes = {
      zen: {
        primary: 'rgba(192, 132, 252, 0.85)',   // Lilás Zen
        secondary: 'rgba(244, 114, 182, 0.75)', // Rosa Pastel
        glow: 'rgba(192, 132, 252, 0.25)',
        waves: ['#c084fc', '#f472b6', '#38bdf8', '#2dd4bf', '#fb923c']
      },
      celestial: {
        primary: 'rgba(56, 189, 248, 0.85)',   // Ciano
        secondary: 'rgba(168, 85, 247, 0.75)', // Violeta
        glow: 'rgba(56, 189, 248, 0.3)',
        waves: ['#38bdf8', '#818cf8', '#c084fc', '#e879f9']
      },
      aurora: {
        primary: 'rgba(74, 222, 128, 0.85)',   // Verde aurora
        secondary: 'rgba(244, 114, 182, 0.75)',// Rosa
        glow: 'rgba(52, 211, 153, 0.25)',
        waves: ['#2dd4bf', '#38bdf8', '#c084fc', '#f472b6']
      },
      ocean: {
        primary: 'rgba(14, 165, 233, 0.85)',   // Azul oceano
        secondary: 'rgba(45, 212, 191, 0.75)', // Turquesa
        glow: 'rgba(6, 182, 212, 0.25)',
        waves: ['#0284c7', '#06b6d4', '#2dd4bf', '#38bdf8']
      },
      crystal: {
        primary: 'rgba(232, 121, 249, 0.85)',  // Magenta claro
        secondary: 'rgba(251, 191, 36, 0.75)', // Dourado
        glow: 'rgba(232, 121, 249, 0.25)',
        waves: ['#e879f9', '#c084fc', '#67e8f9', '#fde047']
      }
    };

    this.init();
  }

  init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Criar partículas flutuantes calmantes
    this.createParticles(45);

    // Conectar ao evento de disparo de notas do motor
    if (this.engine) {
      this.engine.onNoteTriggered = (noteName, freq, velocity) => {
        this.addNoteRipple(noteName, freq, velocity);
      };
    }

    this.startAnimation();
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    this.ctx.scale(this.dpr, this.dpr);
  }

  createParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.2 + Math.random() * 2.8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.2 - Math.random() * 0.45,
        alpha: 0.15 + Math.random() * 0.5,
        baseAlpha: 0.15 + Math.random() * 0.5,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulseAngle: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Adiciona ondulação luminosa quando uma nova nota musical surge
   */
  addNoteRipple(noteName, freq, velocity) {
    const palette = this.colorPalettes[this.engine.activePreset] || this.colorPalettes.zen;

    // Posição X proporcional à oitava/frequência (mais grave = esquerda, mais agudo = direita)
    const normFreq = Math.min(1, Math.max(0, (freq - 130) / 1000));
    const x = this.width * 0.15 + normFreq * (this.width * 0.7) + (Math.random() - 0.5) * 40;
    const y = this.height * 0.5 + (Math.random() - 0.5) * (this.height * 0.4);

    this.ripples.push({
      x,
      y,
      noteName,
      radius: 5,
      maxRadius: 60 + velocity * 90,
      alpha: 0.85,
      color: palette.waves[Math.floor(Math.random() * palette.waves.length)],
      growthRate: 1.6 + velocity * 2.2
    });

    // Limitar ripples simultâneos
    if (this.ripples.length > 20) {
      this.ripples.shift();
    }
  }

  startAnimation() {
    let phase = 0;

    const render = () => {
      this.animationFrameId = requestAnimationFrame(render);
      phase += 0.012;

      // Limpar tela com leve rastro fluido (fade responsivo a claro/escuro)
      const isDark = document.body.classList.contains('theme-dark');
      this.ctx.fillStyle = isDark ? 'rgba(6, 9, 15, 0.28)' : 'rgba(247, 249, 251, 0.35)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      const palette = this.colorPalettes[this.engine ? this.engine.activePreset : 'zen'] || this.colorPalettes.zen;
      const energy = this.engine ? this.engine.smoothedEnergy : 0.05;

      // 1. Renderizar Raios da Espiral Zen Geométrica (Inspirada na Mandala Listerine Zen)
      this.renderZenMandalaRays(phase, energy, isDark);

      // 2. Renderizar Pilares de Luz Ressonante
      this.renderResonantPillars(palette);

      // 3. Renderizar Ondas Orgânicas Fluidas
      this.renderFlowingWaves(phase, energy, palette);

      // 4. Renderizar Ondulações de Notas (Ripples)
      this.renderRipples();

      // 5. Renderizar Partículas Flutuantes de Poeira Estelar
      this.renderParticles(phase);
    };

    render();
  }

  /**
   * Renderiza os raios radiantes da mandala zen inspirados na arte gráfica
   */
  renderZenMandalaRays(phase, energy, isDark) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxR = Math.min(this.width, this.height) * 0.44;
    const rayCount = 42;
    const angleStep = (Math.PI * 2) / rayCount;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(phase * 0.25);

    for (let i = 0; i < rayCount; i++) {
      const angle = i * angleStep;
      const normI = i / rayCount;
      const hue = (normI * 360 + phase * 25) % 360;
      const r = maxR * (0.8 + Math.sin(phase * 2.5 + i * 0.5) * 0.15 + energy * 0.35);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      this.ctx.strokeStyle = `hsla(${hue}, 85%, ${isDark ? '72%' : '60%'}, ${0.07 + energy * 0.16})`;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderResonantPillars(palette) {
    if (!this.engine || !this.engine.resonators || this.engine.resonators.length === 0) return;

    const count = this.engine.resonators.length;
    const spacing = this.width / (count + 1);

    this.ctx.save();
    for (let i = 0; i < count; i++) {
      const res = this.engine.resonators[i];
      const x = spacing * (i + 1);

      // A intensidade do brilho depende da energia e da nota
      const baseAlpha = 0.04 + (this.engine.smoothedEnergy * 0.15);
      const pillarGrad = this.ctx.createLinearGradient(x, 0, x, this.height);
      pillarGrad.addColorStop(0, 'transparent');
      pillarGrad.addColorStop(0.5, palette.glow);
      pillarGrad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = pillarGrad;
      this.ctx.fillRect(x - 12, 0, 24, this.height);
    }
    this.ctx.restore();
  }

  renderFlowingWaves(phase, energy, palette) {
    const waveCount = 3;
    const centerY = this.height * 0.52;

    for (let w = 0; w < waveCount; w++) {
      const color = palette.waves[w % palette.waves.length];
      const wavePhase = phase * (1 + w * 0.3) + w * 1.8;
      const amp = (18 + w * 12) * (1 + energy * 8);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height);

      for (let x = 0; x <= this.width; x += 12) {
        const normX = x / this.width;
        // Combinação de senóides para criar curvas orgânicas de seda líquida
        const yOffset = Math.sin(normX * 4 + wavePhase) * amp +
                        Math.cos(normX * 8 - wavePhase * 0.7) * (amp * 0.4);
        const y = centerY + yOffset;

        if (x === 0) {
          this.ctx.lineTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.lineTo(this.width, this.height);
      this.ctx.closePath();

      // Gradiente suave
      const grad = this.ctx.createLinearGradient(0, centerY - amp, 0, this.height);
      grad.addColorStop(0, this.hexToRgba(color, 0.28 - w * 0.06));
      grad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Linha de contorno da crista
      this.ctx.strokeStyle = this.hexToRgba(color, 0.6 - w * 0.1);
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  renderRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.growthRate;
      r.alpha -= 0.014;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.hexToRgba(r.color, r.alpha * 0.75);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Brilho do centro
      const radGrad = this.ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
      radGrad.addColorStop(0, this.hexToRgba(r.color, r.alpha * 0.35));
      radGrad.addColorStop(1, 'transparent');
      this.ctx.fillStyle = radGrad;
      this.ctx.fill();

      // Texto suave da nota
      if (r.noteName && r.radius < 35) {
        this.ctx.fillStyle = this.hexToRgba('#ffffff', r.alpha * 0.9);
        this.ctx.font = '600 13px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(r.noteName, r.x, r.y - r.radius - 8);
      }

      this.ctx.restore();
    }
  }

  renderParticles(phase) {
    this.ctx.save();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.pulseAngle += p.pulseSpeed;
      p.alpha = p.baseAlpha + Math.sin(p.pulseAngle) * 0.18;

      // Reposicionar se sair da tela
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, Math.min(0.85, p.alpha))})`;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  hexToRgba(hex, alpha) {
    if (!hex) return `rgba(56, 189, 248, ${alpha})`;
    if (hex.startsWith('rgba')) return hex;
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.SerenoVisualizer = SerenoVisualizer;
