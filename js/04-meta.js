            // ==================== 灵魂宝库（局外永久成长） ====================
            const META_UPGRADES = [
                { id: 'hp',    name: '生命之种', desc: (l) => '初始生命 +' + (20 * l) + '（每级+20）', icon: 'heart-pulse', maxLevel: 3, costs: [150, 320, 650] },
                { id: 'dmg',   name: '力量符文', desc: (l) => '初始伤害 +' + (10 * l) + '%（每级+10%）', icon: 'flame', maxLevel: 5, costs: [150, 320, 650, 1200, 2000] },
                { id: 'pickup',name: '磁力石',   desc: (l) => '拾取范围 +' + (20 * l) + '%（每级+20%）', icon: 'magnet', maxLevel: 3, costs: [120, 260, 520] },
                { id: 'xp',    name: '智慧书',   desc: (l) => '经验加成 +' + (15 * l) + '%（每级+15%）', icon: 'book-open', maxLevel: 3, costs: [120, 260, 520] },
                { id: 'revive',name: '凤凰之羽', desc: (l) => '每局死亡时复活一次（50%血量）', icon: 'flame', maxLevel: 1, costs: [900] }
            ];
            // ===== 圣物商店（局外购买，永久生效） =====
            const META_RELICS = [
                { id: 'relic_vamp',  name: '吸血之爪', desc: '造成伤害的 5% 回复生命', icon: 'heart-pulse', cost: 400 },
                { id: 'relic_thorn', name: '荆棘光环', desc: '受到近战伤害时反弹 20% 给攻击者', icon: 'shield-half', cost: 400 },
                { id: 'relic_greed', name: '贪婪之石', desc: '经验球自动飞向玩家（无需靠近）', icon: 'magnet', cost: 300 },
                { id: 'relic_bomb',  name: '定时炸弹', desc: '每 10 秒在玩家位置爆炸（伤害随等级提升）', icon: 'bomb', cost: 450 },
                { id: 'relic_deathmark', name: '死神之指', desc: '解锁死神之指：标记目标并抹杀（手动可标记 Boss）', icon: 'skull', cost: 5999 }
            ];
            // ===== 成就系统（局外碎片奖励） =====
            const ACHIEVEMENTS = [
                { id: 'melee_master', name: '近战大师', desc: '只用飞刃/冰霜击杀一个 Boss（本局未用远程武器）', reward: 60 },
                { id: 'speedster',    name: '闪电侠', desc: '60 秒内击杀 200 只怪物', reward: 50 },
                { id: 'phoenix',      name: '不死鸟', desc: '生命低于 10% 时存活并击杀 Boss', reward: 40 },
                { id: 'collector',    name: '收集狂', desc: '一局内集齐 3 种进化武器', reward: 80 }
            ];
            let achievementsDone = loadAchievements();
            function loadAchievements() {
                try {
                    const raw = localStorage.getItem('rogue_ach');
                    if (raw) return JSON.parse(raw);
                } catch(e) {}
                return {};
            }
            function saveAchievements() {
                try { localStorage.setItem('rogue_ach', JSON.stringify(achievementsDone)); } catch(e) {}
            }
            function awardAchievement(id) {
                if (achievementsDone[id]) return;
                const a = ACHIEVEMENTS.find(x => x.id === id);
                if (!a) return;
                achievementsDone[id] = true;
                saveAchievements();
                metaData.shards = (metaData.shards || 0) + a.reward;
                saveMeta();
                game.warningText = '成就达成！' + a.name + '（+' + a.reward + '碎片）';
                game.warningTimer = 2.5;
                sound.play('levelup');
                spawnParticles(game.player.x, game.player.y, 30, '#ffd700', 100, 0.6, 5);
            }
            function checkAchievements() {
                if (!game.player) return;
                // 闪电侠：60 秒内击杀 200（简化：按时间与击杀比）
                if (!achievementsDone.speedster && game.kills >= 200 && game.time <= 90) awardAchievement('speedster');
                // 收集狂：集齐 3 种进化武器
                if (!achievementsDone.collector) {
                    const evoCount = game.player.weapons.filter(w => w.evolved).length;
                    if (evoCount >= 3) awardAchievement('collector');
                }
                // 不死鸟：血量低于 10% 时击杀 Boss
                if (!achievementsDone.phoenix && game.player.hp < game.player.maxHp * 0.1 && game.bossKilledCount > 0) awardAchievement('phoenix');
                // 近战大师：仅用飞刃/冰霜击杀 Boss
                if (!achievementsDone.melee_master) {
                    const hasRanged = game.player.weapons.some(w => w.type !== 'orbit_blade' && w.type !== 'frost_nova');
                    if (!hasRanged && game.bossKilledCount > 0) awardAchievement('melee_master');
                }
            }
            // ===== 存档签名（防小白改数值：篡改后签名不匹配，数据视为无效并清除） =====
            const META_SALT = 'r0gue.m3ta!sig#v1';
            function metaSign(obj) {
                const raw = JSON.stringify(obj) + META_SALT;
                let a = 0x811c9dc5, b = 0x01000193;
                for (let i = 0; i < raw.length; i++) {
                    const c = raw.charCodeAt(i);
                    a = ((a ^ c) * 16777619) >>> 0;
                    b = ((b + c) * 2654435761) >>> 0;
                }
                return a.toString(16) + b.toString(16);
            }

            function loadMeta() {
                try {
                    const raw = localStorage.getItem('rogue_meta');
                    if (raw) {
                        const d = JSON.parse(raw);
                        const sig = localStorage.getItem('rogue_meta_sig');
                        if (sig) {
                            if (sig === metaSign(d)) {
                                if (!d.relics) d.relics = {};
                                return d;
                            }
                            // 签名不匹配：视为篡改数据，直接清除
                            localStorage.removeItem('rogue_meta');
                            localStorage.removeItem('rogue_meta_sig');
                        } else {
                            // 旧版存档：一次性补签名（此后篡改即失效）
                            if (!d.relics) d.relics = {};
                            localStorage.setItem('rogue_meta_sig', metaSign(d));
                            return d;
                        }
                    }
                } catch(e) {}
                return { shards: 0, upgrades: {}, relics: {} };
            }

            let metaData = loadMeta();
            function hasRelic(id) { return !!(metaData.relics && metaData.relics[id]); }
            function buyRelic(id) {
                const r = META_RELICS.find(x => x.id === id);
                if (!r || hasRelic(id) || metaData.shards < r.cost) return false;
                metaData.shards -= r.cost;
                if (!metaData.relics) metaData.relics = {};
                metaData.relics[id] = true;
                saveMeta();
                return true;
            }
            function saveMeta() {
                try {
                    localStorage.setItem('rogue_meta', JSON.stringify(metaData));
                    localStorage.setItem('rogue_meta_sig', metaSign(metaData));
                } catch(e) {}
            }
            function metaLevel(id) { return metaData.upgrades[id] || 0; }
            function metaUpgradeCost(id) {
                const u = META_UPGRADES.find(x => x.id === id);
                const l = metaLevel(id);
                if (!u || l >= u.maxLevel) return -1;
                return u.costs[l];
            }
            function buyMetaUpgrade(id) {
                const cost = metaUpgradeCost(id);
                if (cost < 0 || metaData.shards < cost) return false;
                metaData.shards -= cost;
                metaData.upgrades[id] = metaLevel(id) + 1;
                saveMeta();
                return true;
            }
            function metaLevelBonus(id) {
                const u = META_UPGRADES.find(x => x.id === id);
                if (!u || !u.bonus) return 0;
                return u.bonus * metaLevel(id);
            }
