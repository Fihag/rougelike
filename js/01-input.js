            // ==================== 输入管理 ====================
            const keys = {};
            let mousePos = { x: W / 2, y: H / 2 };
            let useTouchControl = false;
            let touchActive = false;
            let touchTarget = { x: 0, y: 0 };

            window.addEventListener('keydown', e => { if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return; keys[e.key.toLowerCase()] = true; e.preventDefault(); });
            window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; e.preventDefault(); });
            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                mousePos.x = e.clientX - rect.left;
                mousePos.y = e.clientY - rect.top;
            });
            canvas.addEventListener('mousedown', e => {
                if (!game.deathMark.enabled || game.deathMark.mode !== 'manual') return;
                if (game.state !== 'playing') return;
                const rect = canvas.getBoundingClientRect();
                const gx = e.clientX - rect.left;
                const gy = e.clientY - rect.top;
                if (dmTrySelectAt(gx, gy)) {
                    sound.play('bossWarn');
                    game.warningText = '已标记目标！抹杀倒计时…';
                    game.warningTimer = 1.2;
                }
            });
            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
                useTouchControl = true;
                touchActive = true;
                const t = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                touchTarget.x = t.clientX - rect.left;
                touchTarget.y = t.clientY - rect.top;
                mousePos.x = touchTarget.x;
                mousePos.y = touchTarget.y;
                if (game.state === 'levelup') handleLevelupTouch(e);
            }, { passive: false });
            canvas.addEventListener('touchmove', e => {
                e.preventDefault();
                if (!touchActive) return;
                const t = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                touchTarget.x = t.clientX - rect.left;
                touchTarget.y = t.clientY - rect.top;
                mousePos.x = touchTarget.x;
                mousePos.y = touchTarget.y;
            }, { passive: false });
            canvas.addEventListener('touchend', e => {
                e.preventDefault();
                touchActive = false;
            }, { passive: false });

            window.addEventListener('keydown', function selectHandler(e) {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
                const key = e.key;
                if (game.state === 'levelup') {
                    if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
                        const idx = parseInt(key) - 1;
                        if (game.currentChoices && game.currentChoices[idx] !== undefined) {
                            game.applyUpgrade(game.currentChoices[idx]);
                        }
                    }
                } else if (game.state === 'bossdrop') {
                    if (key === '1' || key === '2' || key === '3') {
                        const idx = parseInt(key) - 1;
                        if (game.bossDropChoices && game.bossDropChoices[idx] !== undefined) {
                            applyBossDrop(game.bossDropChoices[idx]);
                        }
                    }
                }
            });

            function handleLevelupClick(e) {
                if (game.state !== 'levelup') return;
                const rect = canvas.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                checkCardHit(cx, cy);
            }

            function handleLevelupTouch(e) {
                if (game.state !== 'levelup') return;
                const t = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                const cx = t.clientX - rect.left;
                const cy = t.clientY - rect.top;
                checkCardHit(cx, cy);
            }

            function checkCardHit(cx, cy) {
                const wrapperRect = wrapper.getBoundingClientRect();
                const cardsEl = levelupCards.children;
                for (let i = 0; i < cardsEl.length; i++) {
                    const cardRect = cardsEl[i].getBoundingClientRect();
                    if (cx >= cardRect.left - wrapperRect.left &&
                        cx <= cardRect.right - wrapperRect.left &&
                        cy >= cardRect.top - wrapperRect.top &&
                        cy <= cardRect.bottom - wrapperRect.top) {
                        if (game.currentChoices && game.currentChoices[i] !== undefined) {
                            game.applyUpgrade(game.currentChoices[i]);
                        }
                        return;
                    }
                }
            }
