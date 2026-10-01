/**
 * Gerenciador de Pontuação e Efeitos para "As Riquezas do Cerrado Mineiro"
 */

class ScoreSystem {
  constructor(options = {}) {
    this.score = options.initialScore || 0;
    
    // Tratamento para evitar erro de acesso ao localStorage (ex: navegação restrita ou anônima)
    try {
      this.highScore = parseInt(localStorage.getItem('cerrado_high_score') || '0', 10);
    } catch (e) {
      this.highScore = 0;
    }

    this.combo = 0;
    this.audioCtx = null;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animating = false;

    // Inicializa o canvas de forma segura
    if (document.body) {
      this.initCanvas();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.initCanvas());
    }
  }

  // Inicializa o contexto de áudio
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Inicializa a camada visual de efeitos (moedas/partículas)
  initCanvas() {
    if (this.canvas) return; // Evita criar duplicados
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  // --- MÉTODOS DE PONTUAÇÃO ---

  addPoints(points = 10) {
    this.combo += 1;
    const bonus = this.combo > 1 ? (this.combo - 1) * 2 : 0;
    const totalGained = points + bonus;

    this.score += totalGained;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('cerrado_high_score', this.highScore.toString());
      } catch (e) {}
    }

    this.playWinSFX();
    this.spawnVictoryParticles();

    return { totalScore: this.score, gained: totalGained, combo: this.combo };
  }

  removePoints(points = 5) {
    this.combo = 0;
    this.score = Math.max(0, this.score - points);

    this.playLoseSFX();
    this.spawnDefeatParticles();

    return { totalScore: this.score, lost: points };
  }

  resetScore() {
    this.score = 0;
    this.combo = 0;
  }

  // --- EFEITOS SONOROS (WEB AUDIO API) ---

  playWinSFX() {
    this.initAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.setValueAtTime(1318.51, now + 0.08);

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(this.audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.3);
  }

  playLoseSFX() {
    this.initAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playFanfare() {
    this.initAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const notes = [
      { f: 523.25, t: 0, d: 0.12 },
      { f: 659.25, t: 0.12, d: 0.12 },
      { f: 783.99, t: 0.24, d: 0.12 },
      { f: 1046.5, t: 0.36, d: 0.4 }
    ];

    notes.forEach(note => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.3, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });

    this.spawnVictoryParticles(60);
  }

  // --- EFEITOS VISUAIS EM CANVAS ---

  spawnVictoryParticles(count = 25) {
    if (!this.ctx) return;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 12,
        gravity: 0.35,
        size: Math.random() * 12 + 10,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        type: Math.random() > 0.3 ? 'coin' : 'star',
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01
      });
    }

    if (!this.animating) {
      this.animating = true;
      requestAnimationFrame(() => this.updateAndDrawParticles());
    }
  }

  spawnDefeatParticles(count = 15) {
    if (!this.ctx) return;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 3;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: startX + (Math.random() - 0.5) * 200,
        y: startY,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        gravity: 0.2,
        size: Math.random() * 10 + 12,
        type: 'cross',
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    if (!this.animating) {
      this.animating = true;
      requestAnimationFrame(() => this.updateAndDrawParticles());
    }
  }

  updateAndDrawParticles() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.rotation !== undefined) p.rotation += p.vRot;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.translate(p.x, p.y);

      if (p.type === 'coin') {
        this.ctx.rotate(p.rotation);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FBBF24';
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#D97706';
        this.ctx.stroke();

        this.ctx.fillStyle = '#78350F';
        this.ctx.font = `bold ${p.size * 1.1}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('$', 0, 1);
      } else if (p.type === 'star') {
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = '#F59E0B';
        this.ctx.font = `${p.size * 1.5}px sans-serif`;
        this.ctx.fillText('⭐', -p.size / 2, p.size / 2);
      } else if (p.type === 'cross') {
        this.ctx.fillStyle = '#EF4444';
        this.ctx.font = `bold ${p.size * 1.4}px sans-serif`;
        this.ctx.fillText('❌', -p.size / 2, p.size / 2);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.updateAndDrawParticles());
    } else {
      this.animating = false;
    }
  }
}

// Instância global protegida
window.scoreSystem = new ScoreSystem();

//  _._     _,-'""`-._
// (,-.`._,'(       |\`-/|
//     `-.-' \ )-`( , o o)
//           `-    \`_`"'-
//                        frx