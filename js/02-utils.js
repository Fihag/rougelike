            // ==================== 工具函数 ====================
            function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
            function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
            function rand(min, max) { return Math.random() * (max - min) + min; }
            function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

            // ==================== 音效系统（Web Audio 合成） ====================
            const sound = (function() {
                let ctx = null;
                let masterGain = null;
                let muted = false;
                const lastPlayed = {};

                function ensureCtx() {
                    if (!ctx) {
                        const AC = window.AudioContext || window.webkitAudioContext;
                        if (!AC) return null;
                        ctx = new AC();
                        masterGain = ctx.createGain();
                        masterGain.gain.value = 0.75;
                        masterGain.connect(ctx.destination);
                    }
                    if (ctx.state === 'suspended') ctx.resume();
                    return ctx;
                }

                function tone(freq, dur, type, vol, slideTo, delay = 0) {
                    const c = ensureCtx();
                    if (!c || muted || c.state !== 'running') return;
                    const t0 = c.currentTime + delay;
                    const osc = c.createOscillator();
                    const g = c.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, t0);
                    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
                    g.gain.setValueAtTime(0.0001, t0);
                    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t0); osc.stop(t0 + dur + 0.05);
                }

                function noise(dur, vol, freq) {
                    const c = ensureCtx();
                    if (!c || muted || c.state !== 'running') return;
                    const t0 = c.currentTime;
                    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                    const src = c.createBufferSource();
                    src.buffer = buf;
                    const filter = c.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = freq;
                    const g = c.createGain();
                    g.gain.setValueAtTime(vol, t0);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
                    src.connect(filter); filter.connect(g); g.connect(masterGain);
                    src.start(t0);
                }

                const DEFS = {
                    shoot:      { min: 60,  fn: () => { tone(880, 0.09, 'square', 0.22, 440); tone(1320, 0.06, 'sine', 0.10, 660); } },
                    spirit:     { min: 60,  fn: () => { tone(1100, 0.07, 'sine', 0.12, 700); } },
                    hit:        { min: 70,  fn: () => { noise(0.06, 0.20, 2200); tone(220, 0.06, 'sine', 0.16, 110); } },
                    enemyDie:   { min: 110, fn: () => { noise(0.18, 0.32, 700); tone(330, 0.14, 'triangle', 0.24, 110); } },
                    bossDie:    { min: 0,   fn: () => { noise(0.55, 0.45, 400); tone(120, 0.5, 'sawtooth', 0.32, 40); tone(80, 0.6, 'sine', 0.26, 30); } },
                    playerHit:  { min: 50,  fn: () => { noise(0.14, 0.38, 500); tone(130, 0.16, 'sawtooth', 0.30, 60); } },
                    shield:     { min: 100, fn: () => { tone(700, 0.14, 'sine', 0.22, 1000); } },
                    levelup:    { min: 0,   fn: () => { tone(523, 0.1, 'triangle', 0.28); tone(659, 0.1, 'triangle', 0.28, null, 0.09); tone(784, 0.18, 'triangle', 0.28, null, 0.18); } },
                    bossDrop:   { min: 0,   fn: () => { tone(392, 0.12, 'triangle', 0.28); tone(587, 0.12, 'triangle', 0.28, null, 0.1); tone(784, 0.2, 'triangle', 0.28, null, 0.2); } },
                    explosion:  { min: 140, fn: () => { noise(0.3, 0.38, 400); tone(95, 0.3, 'sine', 0.28, 40); } },
                    lightning:  { min: 60,  fn: () => { noise(0.05, 0.3, 5200); noise(0.1, 0.2, 2600); tone(1900, 0.05, 'square', 0.14, 400); tone(900, 0.08, 'sawtooth', 0.10, 200); } },
                    meteor:     { min: 150, fn: () => { noise(0.5, 0.5, 380); tone(180, 0.4, 'sine', 0.30, 45); tone(60, 0.5, 'triangle', 0.22, 30); noise(0.15, 0.3, 2000); } },
                    frost:      { min: 80,  fn: () => { tone(1200, 0.12, 'sine', 0.14, 1800); tone(800, 0.2, 'triangle', 0.16, 300); noise(0.12, 0.14, 3500); } },
                    bossWarn:   { min: 0,   fn: () => { tone(220, 0.4, 'sawtooth', 0.24, 110); } },
                    summon:     { min: 200, fn: () => { tone(300, 0.1, 'triangle', 0.16, 200); tone(180, 0.12, 'sine', 0.14, 120, 0.08); } },
                    acidSpit:   { min: 250, fn: () => { tone(320, 0.15, 'sawtooth', 0.22, 140); noise(0.1, 0.2, 900); } }
                };

                function play(name) {
                    const def = DEFS[name];
                    if (!def) return;
                    const now = performance.now();
                    if (lastPlayed[name] && now - lastPlayed[name] < def.min) return;
                    lastPlayed[name] = now;
                    def.fn();
                }

                function toggleMute() { muted = !muted; return muted; }

                window.addEventListener('pointerdown', ensureCtx, { once: true });
                window.addEventListener('keydown', ensureCtx, { once: true });
                window.addEventListener('touchstart', ensureCtx, { once: true });

                return { play, toggleMute };
            })();

            // ==================== 粒子系统 ====================
            class Particle {
                constructor(x, y, vx, vy, life, color, size = 3) {
                    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
                    this.life = life; this.maxLife = life; this.color = color; this.size = size;
                    this.alive = true;
                }
                update(dt) {
                    this.x += this.vx * dt; this.y += this.vy * dt;
                    this.life -= dt;
                    if (this.life <= 0) this.alive = false;
                }
                draw(ctx) {
                    const alpha = this.life / this.maxLife;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
            let particles = [];
            const MAX_PARTICLES = 200;
            const MAX_ENEMIES = 160;

            function spawnParticles(x, y, count, color, speed = 80, life = 0.4, size = 3) {
                for (let i = 0; i < count; i++) {
                    const angle = rand(0, Math.PI * 2);
                    const spd = rand(speed * 0.4, speed);
                    particles.push(new Particle(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, rand(life * 0.6, life), color, rand(size * 0.5, size)));
                }
                if (particles.length > MAX_PARTICLES) particles = particles.slice(particles.length - MAX_PARTICLES);
            }

            // ==================== 伤害数字 ====================
            class DamageNumber {
                constructor(x, y, value, color = '#fff') {
                    this.x = x; this.y = y; this.value = Math.round(value); this.color = color;
                    this.life = 0.7; this.maxLife = 0.7; this.vy = -60; this.alive = true;
                }
                update(dt) {
                    this.y += this.vy * dt; this.vy *= 0.96; this.life -= dt;
                    if (this.life <= 0) this.alive = false;
                }
                draw(ctx) {
                    const alpha = clamp(this.life / this.maxLife, 0, 1);
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.font = `bold ${Math.floor(13*(1+(1-alpha)*0.4))}px "PingFang SC","Microsoft YaHei",sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(this.value.toString(), this.x, this.y);
                    ctx.globalAlpha = 1;
                }
            }
            let damageNumbers = [];
            const MAX_DMG_NUMBERS = 80;

            function spawnDamageNumber(x, y, value, color = '#fff') {
                damageNumbers.push(new DamageNumber(x + rand(-8, 8), y + rand(-6, 6), value, color));
                if (damageNumbers.length > MAX_DMG_NUMBERS) damageNumbers = damageNumbers.slice(damageNumbers.length - MAX_DMG_NUMBERS);
            }

            // ==================== 死亡文字特效（DIE 字样） ====================
            class DeathText {
                constructor(x, y, text = 'DIE') {
                    this.x = x; this.y = y; this.text = text;
                    this.life = 1.0; this.maxLife = 1.0; this.vy = -90; this.alive = true;
                    this.rot = rand(-0.15, 0.15);
                }
                update(dt) {
                    this.y += this.vy * dt; this.vy *= 0.96; this.life -= dt;
                    if (this.life <= 0) this.alive = false;
                }
                draw(ctx) {
                    const t = this.life / this.maxLife;
                    const alpha = Math.min(1, t * 2);
                    const scale = 1 + (1 - t) * 0.6;
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rot);
                    ctx.globalAlpha = alpha;
                    ctx.font = `bold ${Math.floor(26 * scale)}px "Impact","Arial Black","PingFang SC",sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 12;
                    ctx.fillStyle = '#ff1111';
                    ctx.fillText(this.text, 0, 0);
                    ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 2;
                    ctx.strokeText(this.text, 0, 0);
                    ctx.shadowBlur = 0;
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }
            }
            let deathTexts = [];
            const MAX_DEATH_TEXTS = 30;
            function spawnDeathText(x, y, text = 'DIE') {
                deathTexts.push(new DeathText(x, y, text));
                if (deathTexts.length > MAX_DEATH_TEXTS) deathTexts.shift();
            }

            // ==================== 通用 Buff 计时（Player/Enemy 共用） ====================
            function updateBuffTimers(self, dt) {
                if (!self.buffTimers) return;
                for (let i = self.buffTimers.length - 1; i >= 0; i--) {
                    self.buffTimers[i].remaining -= dt;
                    if (self.buffTimers[i].remaining <= 0) {
                        self.buffTimers[i].onExpire(self);
                        self.buffTimers.splice(i, 1);
                    }
                }
            }

            // ==================== 屏幕震动 ====================
            let screenShake = { intensity: 0, duration: 0, elapsed: 0 };
            function triggerShake(intensity, duration) {
                screenShake.intensity = Math.max(screenShake.intensity, intensity);
                screenShake.duration = Math.max(screenShake.duration, duration);
                screenShake.elapsed = 0;
            }
            function getShakeOffset() {
                if (screenShake.elapsed >= screenShake.duration) return { x: 0, y: 0 };
                const progress = screenShake.elapsed / screenShake.duration;
                const decay = 1 - progress;
                const intensity = screenShake.intensity * decay;
                return { x: rand(-intensity, intensity), y: rand(-intensity, intensity) };
            }
