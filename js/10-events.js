            // ==================== 精英波次 & 宝箱 ====================
            const WAVE_INTERVAL = 100;
            const WAVE_INTERVAL_AFTER = 50;
            const WAVE_ELITE_COUNT = 12;
            const WAVE_NOTICE_TIME = 10;

            function startEliteWave() {
                game.waveState = 'warning';
                game.waveTimer = WAVE_NOTICE_TIME;
                game.waveNoticeTimer = WAVE_NOTICE_TIME;
                sound.play('bossWarn');
                triggerShake(6, 0.4);
            }

            function spawnWaveElites() {
                // 清除场上普通小怪，刷新精英（强化怪）
                for (const e of game.enemies) if (!e.isBoss) e.alive = false;
                game.enemies = game.enemies.filter(e => e.alive);
                game.waveState = 'active';
                game.waveEliteLeft = WAVE_ELITE_COUNT;
                const spawnBatch = () => {
                    if (game.waveState !== 'active' || game.waveEliteLeft <= 0) return;
                    if (game.enemies.length >= MAX_ENEMIES) {
                        // 场上满怪：稍后重试，避免波次卡死
                        setTimeout(spawnBatch, 500);
                        return;
                    }
                    const count = Math.min(4, game.waveEliteLeft);
                    for (let i = 0; i < count; i++) {
                        const side = randInt(0, 3);
                        let x, y; const margin = 40;
                        if (side === 0) { x = rand(margin, W - margin); y = -margin; }
                        else if (side === 1) { x = W + margin; y = rand(margin, H - margin); }
                        else if (side === 2) { x = rand(margin, W - margin); y = H + margin; }
                        else { x = -margin; y = rand(margin, H - margin); }
                        // 精英：较高血量/伤害/速度的变体（随机类型），强化属性 + 自愈
                        const types = ['zombie', 'runner', 'brute', 'wraith', 'pyromancer'];
                        const typeKey = types[randInt(0, types.length - 1)];
                        const e = new Enemy(x, y, typeKey, game.difficultyLevel + 1);
                        e.hp = Math.floor(e.hp * 2.2); e.maxHp = e.hp;
                        e.damage = Math.floor(e.damage * 1.8);
                        // 突袭者（疾行者）限速：精英速度加成从 1.25 降为 1.05
                        e.speed = e.speed * (typeKey === 'runner' ? 1.05 : 1.25);
                        e.size = e.size * 1.3;
                        e.isElite = true;
                        e.eliteRegen = 0.005;
                        game.enemies.push(e);
                        game.waveEliteLeft--;
                    }
                    // 分批生成（0.4s 一批）
                    if (game.waveEliteLeft > 0) setTimeout(spawnBatch, 400);
                };
                spawnBatch();
            }

            function spawnChest() {
                const cx = rand(W * 0.2, W * 0.8), cy = rand(H * 0.2, H * 0.8);
                game.chests.push({ x: cx, y: cy, life: 30, bob: rand(0, Math.PI * 2) });
                game.waveState = 'reward';
                game.warningText = '精英波次已清除！宝箱已空投';
                game.warningTimer = 2.0;
                spawnParticles(cx, cy, 30, '#ffd700', 120, 0.7, 5);
                sound.play('levelup');
            }

            function openChest(chest) {
                const p = game.player;
                const roll = randInt(0, 3);
                if (roll === 0) {
                    p.hp = p.maxHp;
                    game.warningText = '宝箱：生命全满！';
                    spawnParticles(p.x, p.y, 25, '#55ff88', 90, 0.6, 5);
                } else if (roll === 1) {
                    p.oneShotShield = true;
                    game.warningText = '宝箱：获得一次性护盾！';
                    spawnParticles(p.x, p.y, 25, '#88ccff', 90, 0.6, 5);
                } else if (roll === 2) {
                    p.burstTimer = 5;
                    game.warningText = '宝箱：攻速/移速爆发（5秒）！';
                    spawnParticles(p.x, p.y, 25, '#ffaa00', 90, 0.6, 5);
                } else {
                    p.addXp(p.xpToNext * 0.5);
                    game.warningText = '宝箱：经验书！（+半管经验）';
                    spawnParticles(p.x, p.y, 25, '#ffd700', 90, 0.6, 5);
                }
                game.warningTimer = 1.8;
                sound.play('bossDrop');
            }

            // ==================== 祭坛 / 传送门（地图事件） ====================
            function spawnAltar() {
                const types = ['heal', 'risk', 'portal'];
                const type = types[randInt(0, types.length - 1)];
                game.altars.push({
                    type: type,
                    x: rand(W * 0.15, W * 0.85),
                    y: rand(H * 0.15, H * 0.85),
                    life: 20,
                    pulse: rand(0, Math.PI * 2)
                });
                game.warningText = '地图事件降临！触碰祭坛触发效果';
                game.warningTimer = 1.6;
                sound.play('bossWarn');
            }

            function activateAltar(a) {
                const p = game.player;
                if (a.type === 'heal') {
                    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
                    game.warningText = '治疗祭坛：回复 50% 生命！但精英被惊动了…';
                    spawnParticles(p.x, p.y, 30, '#55ff88', 110, 0.6, 5);
                    // 周围刷 3 只精英
                    for (let i = 0; i < 3; i++) {
                        const ang = rand(0, Math.PI * 2);
                        const ex = clamp(p.x + Math.cos(ang) * 140, 30, W - 30);
                        const ey = clamp(p.y + Math.sin(ang) * 140, 30, H - 30);
                        const types = ['zombie', 'runner', 'brute', 'wraith'];
                        const typeKey = types[randInt(0, types.length - 1)];
                        const e = new Enemy(ex, ey, typeKey, game.difficultyLevel + 1);
                        e.hp = Math.floor(e.hp * 1.6); e.maxHp = e.hp;
                        e.damage = Math.floor(e.damage * 1.4);
                        e.isElite = true;
                        game.enemies.push(e);
                    }
                } else if (a.type === 'risk') {
                    p.hp = 1;
                    p.riskBuffTimer = 30;
                    game.warningText = '风险祭坛：生命降至 1！伤害 +50%（30秒）';
                    spawnParticles(p.x, p.y, 30, '#ff2222', 120, 0.6, 5);
                    sound.play('playerHit');
                } else {
                    // 传送门：传送到地图另一侧，留下减速敌人的区域
                    const oldX = p.x, oldY = p.y;
                    p.x = clamp(W - p.x, p.size, W - p.size);
                    p.y = clamp(H - p.y, p.size, H - p.size);
                    game.fireZones.push({ x: oldX, y: oldY, radius: 80, damage: 0, remaining: 5, tickRate: 0.5, tickTimer: 0, isSlowZone: true });
                    game.warningText = '传送门：已传送至另一侧，留下减速区域！';
                    spawnParticles(oldX, oldY, 25, '#88aaff', 130, 0.6, 5);
                    spawnParticles(p.x, p.y, 25, '#88aaff', 130, 0.6, 5);
                    triggerShake(5, 0.25);
                }
                game.warningTimer = 1.8;
            }

            function spawnEnemy() {
                if (game.enemies.length >= MAX_ENEMIES) { game.spawnTimer = 1; return; }
                const side = randInt(0, 3);
                let x, y; const margin = 30;
                if (side === 0) { x = rand(-margin, W + margin); y = -margin; }
                else if (side === 1) { x = W + margin; y = rand(-margin, H + margin); }
                else if (side === 2) { x = rand(-margin, W + margin); y = H + margin; }
                else { x = -margin; y = rand(-margin, H + margin); }
                let typeKey = 'zombie';
                const t = game.time;
                if (t > 20 && Math.random() < 0.25) typeKey = 'runner';
                if (t > 40 && Math.random() < 0.2) typeKey = 'brute';
                if (t > 35 && Math.random() < 0.18) typeKey = 'wraith';
                if (t > 45 && Math.random() < 0.20) typeKey = 'pyromancer';
                if (t > 80 && Math.random() < 0.3) typeKey = 'runner';
                if (t > 100 && Math.random() < 0.15) typeKey = 'brute';
                const diffBonus = game.difficultyLevel - 1;
                game.enemies.push(new Enemy(x, y, typeKey, diffBonus));
            }

            function spawnBoss() {
                if (game.bossOnField) return;
                if (game.enemies.length >= MAX_ENEMIES) { game.bossTimer = 10; return; }
                const side = randInt(0, 3);
                let x, y; const margin = 40;
                if (side === 0) { x = rand(margin, W - margin); y = -margin; }
                else if (side === 1) { x = W + margin; y = rand(margin, H - margin); }
                else if (side === 2) { x = rand(margin, W - margin); y = H + margin; }
                else { x = -margin; y = rand(margin, H - margin); }
                game.bossAppearedCount++;
                const diffBonus = game.difficultyLevel - 1;
                const bossTypes = ['boss', 'broodmother', 'assassin'];
                const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
                const boss = new Enemy(x, y, bossType, diffBonus);
                game.enemies.push(boss);
                game.bossOnField = true;
                game.warningText = ENEMY_TYPES[bossType].name + ' 降临！';
                game.warningTimer = 2.0;
                sound.play('bossWarn');
                triggerShake(8, 0.5);
                spawnParticles(x, y, 30, '#ff0000', 80, 0.8, 5);
                spawnParticles(x, y, 20, '#ffffff', 120, 0.5, 4);
                spawnFx(x, y, 16, '#ff4444', { shape: 'star', glow: true, speed: 150, life: 0.7, size: 6 });
                spawnFx(x, y, 20, '#7a7a7a', { speed: 70, life: 0.9, size: 7, gravity: 140, drag: 1.5 });
                game.flashWhite = 0.28;
                game.rings.push({ x: x, y: y, r: 12, maxR: 300, life: 0.55, maxLife: 0.55, color: '#ff4444', width: 7 });
                game.rings.push({ x: x, y: y, r: 6, maxR: 220, life: 0.4, maxLife: 0.4, color: '#ffffff', width: 3 });
            }

            // ==================== 超级Boss：暗黑镜像 ====================
            function spawnSuperBoss() {
                if (game.superBossSpawned || game.bossOnField) return;
                game.superBossSpawned = true;
                const side = randInt(0, 3);
                let x, y; const margin = 40;
                if (side === 0) { x = rand(margin, W - margin); y = -margin; }
                else if (side === 1) { x = W + margin; y = rand(margin, H - margin); }
                else if (side === 2) { x = rand(margin, W - margin); y = H + margin; }
                else { x = -margin; y = rand(margin, H - margin); }
                const diffBonus = game.difficultyLevel - 1;
                const boss = new Enemy(x, y, 'assassin', diffBonus);
                boss.isSuperBoss = true;
                boss.hp = Math.floor(boss.hp * 2.2); boss.maxHp = boss.hp;
                boss.damage = Math.floor(boss.damage * 1.3);
                boss.speed = boss.speed * 0.9;
                game.enemies.push(boss);
                game.bossOnField = true;
                game.warningText = '暗黑镜像 降临！它将复制你的武器！';
                game.warningTimer = 2.5;
                sound.play('bossWarn');
                triggerShake(12, 0.7);
                spawnParticles(x, y, 40, '#ff00ff', 100, 0.8, 6);
                spawnFx(x, y, 20, '#ff55ff', { shape: 'star', glow: true, speed: 170, life: 0.8, size: 7 });
                spawnFx(x, y, 24, '#5a2a7a', { speed: 80, life: 1.0, size: 8, gravity: 150, drag: 1.4 });
                game.flashWhite = 0.32;
                game.rings.push({ x: x, y: y, r: 14, maxR: 340, life: 0.6, maxLife: 0.6, color: '#ff55ff', width: 8 });
                game.rings.push({ x: x, y: y, r: 8, maxR: 250, life: 0.45, maxLife: 0.45, color: '#ffffff', width: 3 });
            }
