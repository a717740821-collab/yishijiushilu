class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.canSelect = false;
        this.menuMusicStarted = false;  // 菜单音乐是否已开始播放
    }

    create() {
        console.log('🎵 MenuScene.create() 开始执行');
        
        // 重置标志，让每次回到菜单都能重新播放音乐
        this.menuMusicStarted = false;
        
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // 先停止所有音频
        console.log('🎵 停止所有音频 (MenuScene.create())');
        window.audioManager.stopAll();

        // 创建所有界面元素
        this.createBackground();
        this.createTitle();
        this.createMenuOptions();
        this.setupInput();
        this.createCheatButton();
        
        // 设置选择标志
        this.time.delayedCall(100, () => {
            this.canSelect = true;
        });
    }

    /**
     * 用户第一次交互时播放菜单音乐（绕过浏览器自动播放限制）
     */
    tryStartMenuMusic() {
        if (this.menuMusicStarted) return;  // 已经开始过就不再重复
        
        this.menuMusicStarted = true;
        console.log('🎵 用户首次交互！现在播放菜单音乐');
        
        const settings = SaveSystem.loadSettings();
        this.musicVolume = (settings && settings.musicVolume !== undefined) ? settings.musicVolume : 0.5;
        
        // 确保先停止可能残留的菜单音乐，然后播放
        window.audioManager.stop('menu_bgm');
        window.audioManager.play('menu_bgm', null, true, this.musicVolume);
    }

    createBackground() {
        if (this.textures.exists('menu_bg')) {
            this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menu_bg');
            this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        } else {
            console.warn('menu_bg纹理不存在，使用备用背景');
            const gradientBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
            const gradient = this.make.graphics({ x: 0, y: 0, add: false });
            gradient.fillGradientStyle(0x1a1a2e, 0x16213e, 0x0f0f23, 0x0f172a, 1);
            gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            gradient.generateTexture('gradient_bg', GAME_WIDTH, GAME_HEIGHT);
            gradient.destroy();
            this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'gradient_bg');
        }

        this.titleOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.4);

        this.stars = [];
        for (let i = 0; i < 80; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, GAME_WIDTH),
                Phaser.Math.Between(0, GAME_HEIGHT),
                Phaser.Math.Between(1, 4),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.2, 0.9)
            );
            this.stars.push(star);
            this.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.1, 0.6),
                duration: Phaser.Math.Between(800, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        const aurora = this.add.rectangle(0, GAME_HEIGHT * 0.2, GAME_WIDTH, GAME_HEIGHT * 0.4, 0x6666FF, 0.08);
        aurora.setOrigin(0);
        this.tweens.add({
            targets: aurora,
            alpha: 0.02,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createTitle() {
        const titleY = GAME_HEIGHT * 0.22;

        this.titleShadow = this.add.text(GAME_WIDTH / 2 + 5, titleY + 5, STORY_DATA.menuText.title, {
            fontSize: '80px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#000000',
            stroke: '#000000',
            strokeThickness: 10
        }).setOrigin(0.5);

        this.title = this.add.text(GAME_WIDTH / 2, titleY, STORY_DATA.menuText.title, {
            fontSize: '80px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#FFD700',
            stroke: '#FF8800',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.subtitle = this.add.text(GAME_WIDTH / 2, titleY + 80, STORY_DATA.menuText.subtitle, {
            fontSize: '32px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#88CCFF'
        }).setOrigin(0.5);

        // 标题光晕呼吸动画
        this.tweens.add({
            targets: this.title,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 标题文字颜色循环（金色→白色→金色）
        this.tweens.add({
            targets: this.title,
            color: '#FFFFFF',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            yoyo: true,
            hold: 500,
            onUpdate: (tween) => {
                const progress = tween.progress;
                const r = Math.floor(255);
                const g = Math.floor(215 + (255 - 215) * Math.sin(progress * Math.PI));
                const b = Math.floor(0 + (200 - 0) * Math.sin(progress * Math.PI));
                this.title.setColor(`rgb(${r},${g},${b})`);
            }
        });

        // 副标题淡入
        this.subtitle.setAlpha(0);
        this.tweens.add({
            targets: this.subtitle,
            alpha: 1,
            duration: 1500,
            delay: 500,
            ease: 'Power2'
        });

        // 光晕效果
        const glow = this.add.rectangle(GAME_WIDTH / 2, titleY + 30, 700, 160, 0xFFD700, 0.03);
        glow.setStrokeStyle(1, 0xFFD700, 0.08);
        this.tweens.add({
            targets: glow,
            alpha: 0.08,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createMenuOptions() {
        const startY = GAME_HEIGHT * 0.46;
        const spacing = 65;

        this.menuItems = [];

        const hasSave = SaveSystem.hasSave();
        let options = hasSave
            ? [STORY_DATA.menuText.startGame, STORY_DATA.menuText.continueGame, "选择关卡", STORY_DATA.menuText.settings, STORY_DATA.menuText.quit]
            : [STORY_DATA.menuText.startGame, "选择关卡", STORY_DATA.menuText.settings, STORY_DATA.menuText.quit];

        options.forEach((text, index) => {
            const menuItem = this.createMenuItem(GAME_WIDTH / 2, startY + index * spacing, text, index);
            this.menuItems.push(menuItem);
            // 菜单项逐个淡入
            menuItem.setAlpha(0);
            this.tweens.add({
                targets: menuItem,
                alpha: 1,
                y: menuItem.y - 10,
                duration: 400,
                delay: 200 + index * 100,
                ease: 'Power2'
            });
        });

        this.menuIndex = 0;
        this.updateMenuSelection();

        // 操作提示
        this.pressStartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.84, '↑↓ 选择  |  ENTER 确认  |  鼠标点击可直接选择', {
            fontSize: '16px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#88AACC',
            backgroundColor: '#00000055',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.pressStartText,
            alpha: 0.4,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });

        // 战斗操作提示（更紧凑）
        this.controlsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.93, 'WASD 移动 | 空格 射击 | E 交互 | ESC 暂停', {
            fontSize: '14px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#667788',
            backgroundColor: '#00000044',
            padding: { x: 12, y: 5 }
        }).setOrigin(0.5);
    }

    createMenuItem(x, y, text, index) {
        const container = this.add.container(x, y);

        // 菜单项背景 - 玻璃拟态风格
        const bg = this.add.rectangle(0, 0, 360, 54, 0x151530, 0.8);
        bg.setStrokeStyle(2, 0x334466);

        // 左侧装饰条
        const accent = this.add.rectangle(-165, 0, 4, 40, 0xFFD700, 0).setOrigin(0.5);

        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#DDDDDD',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, accent, label]);
        container.setData('index', index);
        container.setData('text', text);

        container.setInteractive(new Phaser.Geom.Rectangle(-180, -27, 360, 54), Phaser.Geom.Rectangle.Contains);

        // hover 效果
        container.on('pointerover', () => {
            if (!this.canSelect) return;
            accent.setAlpha(0.8);
        });
        container.on('pointerout', () => {
            if (index !== this.menuIndex) {
                accent.setAlpha(0);
            }
        });

        return container;
    }

    updateMenuSelection() {
        this.menuItems.forEach((item, index) => {
            const isSelected = index === this.menuIndex;
            const bg = item.getAt(0);
            const accent = item.getAt(1);
            const label = item.getAt(2);

            if (isSelected) {
                bg.setFillStyle(0x1a1a4e, 0.9);
                bg.setStrokeStyle(2, 0xFFD700);
                label.setColor('#FFD700');
                accent.setAlpha(0.9);

                if (!this.tweens.isTweening(item)) {
                    this.tweens.add({
                        targets: item,
                        scaleX: 1.08,
                        scaleY: 1.08,
                        duration: 150,
                        ease: 'Power2'
                    });
                }
            } else {
                bg.setFillStyle(0x151530, 0.8);
                bg.setStrokeStyle(2, 0x334466);
                label.setColor('#DDDDDD');
                accent.setAlpha(0);

                this.tweens.add({
                    targets: item,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Power2'
                });
            }
        });
    }

    setupInput() {
        // 键盘事件 - 第一次按键时播放音乐
        this.input.keyboard.on('keydown-UP', () => {
            if (!this.canSelect || this.cheatPanel) return;
            this.tryStartMenuMusic();  // 首次交互播放音乐
            this.playMenuSound();
            this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateMenuSelection();
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            if (!this.canSelect || this.cheatPanel) return;
            this.tryStartMenuMusic();  // 首次交互播放音乐
            this.playMenuSound();
            this.menuIndex = (this.menuIndex + 1) % this.menuItems.length;
            this.updateMenuSelection();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.canSelect || this.cheatPanel) return;
            this.tryStartMenuMusic();  // 首次交互播放音乐
            this.selectMenuItem();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.canSelect || this.cheatPanel) return;
            this.tryStartMenuMusic();  // 首次交互播放音乐
            this.quitGame();
        });

        // 鼠标/触摸事件 - 第一次点击时播放音乐
        this.menuItems.forEach((item, index) => {
            item.on('pointerover', () => {
                if (!this.canSelect || this.cheatPanel) return;
                this.tryStartMenuMusic();  // 首次交互播放音乐
                this.menuIndex = index;
                this.updateMenuSelection();
                this.playMenuSound();
            });

            item.on('pointerdown', () => {
                if (!this.canSelect || this.cheatPanel) return;
                this.tryStartMenuMusic();  // 首次交互播放音乐
                this.selectMenuItem();
            });
        });
    }

    getAudioPath(key) {
        // 现在只返回键名，因为我们用Phaser缓存播放
        const audioKeys = {
            'menu_bgm': 'menu_bgm',
            'game_bgm': 'game_bgm',
            'boss_bgm': 'boss_bgm',
            'victory_bgm': 'victory_bgm',
            'game_over_bgm': 'game_over_bgm',
            'attack': 'attack',
            'enemy_hit': 'enemy_hit',
            'player_hit': 'player_hit',
            'pickup': 'pickup',
            'death': 'death',
            'coin': 'coin',
            'level_up': 'level_up',
            'button_click': 'button_click'
        };
        return audioKeys[key] || null;
    }

    playMenuSound() {
        const settings = SaveSystem.loadSettings();
        const sfxVolume = (settings && settings.sfxVolume !== undefined) ? settings.sfxVolume : 0.5;
        const path = this.getAudioPath('button_click');
        if (path) {
            window.audioManager.play('button_click', path, false, sfxVolume);
        }
    }

    createCheatButton() {
        try {
            this.cheatButton = this.add.text(GAME_WIDTH - 20, 20, '🔧', {
                fontSize: '26px',
                fontFamily: 'Microsoft YaHei, SimHei, Courier New',
                color: '#666666',
                padding: { x: 10, y: 5 }
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(100);
            
            if (!this.cheatButton) {
                console.warn('作弊按钮创建失败');
                return;
            }
            
            const btnBg = this.add.rectangle(GAME_WIDTH - 20, 20, 54, 36, 0x1a1a2e);
            btnBg.setOrigin(1, 0).setDepth(99);
            btnBg.setStrokeStyle(2, 0x333333);
            this.cheatButton.btnBg = btnBg;
            
            this.cheatButton.on('pointerover', () => {
                if (this.cheatButton) {
                    this.cheatButton.setColor('#FFD700');
                    if (this.cheatButton.btnBg) this.cheatButton.btnBg.setFillStyle(0x333366);
                    if (this.cheatButton.btnBg) this.cheatButton.btnBg.setStrokeStyle(2, 0xFFD700);
                }
            });
            
            this.cheatButton.on('pointerout', () => {
                if (this.cheatButton && !this.cheatMode) {
                    this.cheatButton.setColor('#666666');
                    if (this.cheatButton.btnBg) this.cheatButton.btnBg.setFillStyle(0x1a1a2e);
                    if (this.cheatButton.btnBg) this.cheatButton.btnBg.setStrokeStyle(2, 0x333333);
                }
            });
            
            this.cheatButton.on('pointerdown', () => {
                this.tryStartMenuMusic();  // 首次交互播放音乐
                this.openCheatPanel();
            });

            this.cheatMode = false;
            this.cheatInput = '';
            this.cheatPassword = '01150115';
            this.cheatPanel = null;
            this.cheatInputText = null;
            this.cheatStatusText = null;
            
            console.log('✅ 作弊按钮创建成功');
        } catch (e) {
            console.error('❌ 创建作弊按钮失败:', e);
        }
    }

    openCheatPanel() {
        if (this.cheatPanel) {
            this.closeCheatPanel();
            return;
        }

        const panelWidth = 340;
        const panelHeight = 220;
        
        this.cheatPanel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, panelWidth, panelHeight, 0x000000, 0.96);
        this.cheatPanel.setStrokeStyle(4, 0xFFD700);
        this.cheatPanel.setDepth(200);

        this.cheatTitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '🔧 测试模式', {
            fontSize: '28px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            fontWeight: 'bold',
            color: '#FFD700'
        }).setOrigin(0.5).setDepth(201);

        this.cheatHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '输入密码解锁测试功能:', {
            fontSize: '18px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#AAAAAA'
        }).setOrigin(0.5).setDepth(201);

        this.cheatInputBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5, 260, 40, 0x111111);
        this.cheatInputBg.setStrokeStyle(3, 0x555555);
        this.cheatInputBg.setDepth(201);

        this.cheatInputText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5, '', {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#00FF00',
            backgroundColor: 'transparent'
        }).setOrigin(0.5).setDepth(202);

        this.cheatStatusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '', {
            fontSize: '20px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#FF4444'
        }).setOrigin(0.5).setDepth(201);

        this.cheatCloseHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 85, '按 ESC 关闭 | Enter 确认', {
            fontSize: '16px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#888888'
        }).setOrigin(0.5).setDepth(201);

        this.cheatInput = '';
        this.updateCheatInputDisplay();

        this._cheatKeyboardHandler = (event) => {
            if (!this.cheatPanel) return;
            this.handleCheatInput(event.keyCode || event.which);
        };
        
        window.addEventListener('keydown', this._cheatKeyboardHandler);
    }

    handleCheatInput(keyCode) {
        if (!this.cheatPanel) return;

        if (keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
            this.closeCheatPanel();
            return;
        }

        if (keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER) {
            this.verifyCheatPassword();
            return;
        }

        if (keyCode === Phaser.Input.Keyboard.KeyCodes.BACKSPACE || keyCode === Phaser.Input.Keyboard.KeyCodes.DELETE) {
            this.cheatInput = this.cheatInput.slice(0, -1);
            this.updateCheatInputDisplay();
            return;
        }

        if (keyCode >= Phaser.Input.Keyboard.KeyCodes.ZERO && keyCode <= Phaser.Input.Keyboard.KeyCodes.NINE) {
            const num = keyCode - Phaser.Input.Keyboard.KeyCodes.ZERO;
            this.cheatInput += num.toString();
            
            if (this.cheatInput.length > 8) {
                this.cheatInput = this.cheatInput.slice(0, 8);
            }
            
            this.updateCheatInputDisplay();
        }
    }

    updateCheatInputDisplay() {
        if (!this.cheatInputText) return;

        const masked = this.cheatInput.replace(/./g, '●');
        this.cheatInputText.setText(masked || '_');

        let matchCount = 0;
        for (let i = 0; i < this.cheatInput.length; i++) {
            if (this.cheatInput[i] === this.cheatPassword[i]) {
                matchCount++;
            }
        }
        
        if (matchCount > 0 && matchCount === this.cheatInput.length) {
            this.cheatInputText.setColor('#00FF00');
        } else if (matchCount > 0) {
            this.cheatInputText.setColor('#FFFF00');
        } else {
            this.cheatInputText.setColor('#FFFFFF');
        }
    }

    verifyCheatPassword() {
        if (this.cheatInput === this.cheatPassword) {
            this.cheatMode = true;
            this.cheatStatusText.setText('✅ 测试模式已激活！');
            this.cheatStatusText.setColor('#00FF00');
            
            window.gameCheats = {
                enabled: true,
                oneHitKill: false,
                invincible: false,
                timestamp: Date.now()
            };

            this.cheatButton.setText('⚡');
            this.cheatButton.setColor('#00FF00');
            if (this.cheatButton.btnBg) this.cheatButton.btnBg.setFillStyle(0x003300);
            if (this.cheatButton.btnBg) this.cheatButton.btnBg.setStrokeStyle(2, 0x00FF00);

            console.log('🎮 作弊模式已激活！密码正确: 01150115');

            this.time.delayedCall(1500, () => {
                this.closeCheatPanel();
            });
        } else {
            this.cheatStatusText.setText('❌ 密码错误！');
            this.cheatStatusText.setColor('#FF4444');
            
            this.cameras.main.shake(300, 0.01);
            
            this.time.delayedCall(800, () => {
                this.cheatInput = '';
                this.updateCheatInputDisplay();
                this.cheatStatusText.setText('');
            });
        }
    }

    closeCheatPanel() {
        if (this.cheatPanel) {
            this.cheatPanel.destroy();
            this.cheatPanel = null;
        }
        if (this.cheatTitle) {
            this.cheatTitle.destroy();
            this.cheatTitle = null;
        }
        if (this.cheatHint) {
            this.cheatHint.destroy();
            this.cheatHint = null;
        }
        if (this.cheatInputBg) {
            this.cheatInputBg.destroy();
            this.cheatInputBg = null;
        }
        if (this.cheatInputText) {
            this.cheatInputText.destroy();
            this.cheatInputText = null;
        }
        if (this.cheatStatusText) {
            this.cheatStatusText.destroy();
            this.cheatStatusText = null;
        }
        if (this.cheatCloseHint) {
            this.cheatCloseHint.destroy();
            this.cheatCloseHint = null;
        }

        if (this._cheatKeyboardHandler) {
            window.removeEventListener('keydown', this._cheatKeyboardHandler);
            this._cheatKeyboardHandler = null;
        }
    }

    stopMenuMusic() {
        try {
            window.audioManager.stop('menu_bgm');
        } catch (e) {}
    }

    selectMenuItem() {
        this.canSelect = false;
        const selectedText = this.menuItems[this.menuIndex].getData('text');

        this.playMenuSound();

        if (selectedText === STORY_DATA.menuText.startGame) {
            this.stopMenuMusic();
            this.startNewGame();
        } else if (selectedText === STORY_DATA.menuText.continueGame) {
            this.stopMenuMusic();
            this.continueGame();
        } else if (selectedText === "选择关卡") {
            this.openLevelSelect();
        } else if (selectedText === STORY_DATA.menuText.settings) {
            this.openSettings();
        } else if (selectedText === STORY_DATA.menuText.quit) {
            this.quitGame();
        }
    }

    startNewGame() {
        SaveSystem.deleteSave();
        this.gameData = {
            currentLevel: 1,
            playerHealth: STORY_DATA.player.health,
            playerMaxHealth: STORY_DATA.player.health,
            playerCoins: 0,
            playerLevel: 1,
            difficulty: DIFFICULTY.NORMAL
        };

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('StoryScene', { levelIndex: 0, gameData: this.gameData });
        });
    }

    continueGame() {
        const saveData = SaveSystem.loadGame();
        if (saveData) {
            this.gameData = {
                currentLevel: saveData.currentLevel,
                playerHealth: saveData.playerHealth,
                playerMaxHealth: saveData.playerMaxHealth,
                playerCoins: saveData.playerCoins,
                playerLevel: saveData.playerLevel || 1,
                playerExperience: saveData.playerExperience || 0,
                playerEnergy: saveData.playerEnergy || 0,
                difficulty: DIFFICULTY[saveData.difficulty] || DIFFICULTY.NORMAL,
                attackDamage: saveData.attackDamage,
                speed: saveData.speed,
                bulletCount: saveData.bulletCount,
                bulletSpread: saveData.bulletSpread,
                orbitBullets: saveData.orbitBullets || 0,
                hasOrbit: saveData.hasOrbit || false,
                coinMagnet: saveData.coinMagnet || 1,
                pickupRange: saveData.pickupRange || 50,
                regenRate: saveData.regenRate || 0,
                hasRegen: saveData.hasRegen || false,
                critChance: saveData.critChance || 0,
                critDamage: saveData.critDamage || 1.5,
                maxEnergy: saveData.maxEnergy || 100,
                expBoost: saveData.expBoost || 1
            };

            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('StoryScene', { levelIndex: saveData.currentLevel - 1, gameData: this.gameData });
            });
        }
    }

    openSettings() {
        this.showSettingsPanel();
    }

    showSettingsPanel() {
        const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const bg = this.add.rectangle(0, 0, 440, 340, 0x16213e, 0.96);
        bg.setStrokeStyle(4, 0x6688AA);

        const title = this.add.text(0, -130, STORY_DATA.menuText.settings, {
            fontSize: '32px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const settings = SaveSystem.loadSettings();

        const musicLabel = this.add.text(-160, -55, STORY_DATA.menuText.music, {
            fontSize: '22px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#FFFFFF'
        });

        const musicSlider = this.createSlider(-10, -55, 190, settings.musicVolume, (value) => {
            this.musicVolume = value;
            window.audioManager.setVolume('menu_bgm', value);
        });

        const sfxLabel = this.add.text(-160, 35, STORY_DATA.menuText.soundEffects, {
            fontSize: '22px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#FFFFFF'
        });

        const sfxSlider = this.createSlider(-10, 35, 190, settings.sfxVolume, (value) => {
            this.sfxVolume = value;
        });

        const closeBtn = this.add.text(0, 110, '[ 按ESC关闭 ]', {
            fontSize: '20px',
            fontFamily: 'Microsoft YaHei, SimHei, Courier New',
            color: '#88CCFF'
        }).setOrigin(0.5).setInteractive();

        panel.add([bg, title, musicLabel, musicSlider.container, sfxLabel, sfxSlider.container, closeBtn]);

        this.settingsPanel = panel;

        const closeSettings = () => {
            if (this.settingsPanel) {
                SaveSystem.saveSettings({
                    musicVolume: this.musicVolume,
                    sfxVolume: this.sfxVolume,
                    difficulty: 'NORMAL'
                });
                this.tweens.add({
                    targets: this.settingsPanel,
                    alpha: 0,
                    scaleX: 0.8,
                    scaleY: 0.8,
                    duration: 250,
                    onComplete: () => {
                        this.settingsPanel.destroy();
                        this.settingsPanel = null;
                        this.canSelect = true;
                    }
                });
            }
        };

        closeBtn.on('pointerdown', closeSettings);
        this.input.keyboard.once('keydown-ESC', closeSettings);
    }

    createSlider(x, y, width, value, onChange) {
        const container = this.add.container(x, y);

        const track = this.add.rectangle(0, 0, width, 10, 0x333355);
        track.setOrigin(0, 0.5);
        track.setStrokeStyle(2, 0x555577);

        const fill = this.add.rectangle(0, 0, width * value, 10, 0xFFD700);
        fill.setOrigin(0, 0.5);

        const handle = this.add.circle(width * value, 0, 14, 0xFFFFFF);
        handle.setStrokeStyle(4, 0xFFD700);
        handle.setInteractive({ draggable: true });

        handle.on('drag', (pointer, dragX) => {
            const newValue = Math.max(0, Math.min(1, dragX / width));
            handle.x = width * newValue;
            fill.width = width * newValue;
            onChange(newValue);
        });

        container.add([track, fill, handle]);
        return { container, fill, handle };
    }

    openLevelSelect() {
        const font = 'Microsoft YaHei, SimHei, sans-serif';
        const chapters = [
            { name: '序章', fullName: '序章：零之转生', levelId: 0, type: 'story', hasBoss: false, bossName: '', desc: '勇者在异世界转生' },
            { name: '第1章 新手村', fullName: '第1章：新手村的觉醒', levelId: 1, type: 'game', hasBoss: false, bossName: '', desc: '哥布林与狼骑袭击村子' },
            { name: '第2章 森林', fullName: '第2章：森林的试炼', levelId: 2, type: 'game', hasBoss: true, bossName: '污染树妖之王', desc: '净化被污染的森林' },
            { name: '第3章 要塞', fullName: '第3章：边境要塞攻防战', levelId: 3, type: 'game', hasBoss: true, bossName: '兽王', desc: '坚守边境要塞' },
            { name: '第4章 沙漠', fullName: '第4章：沙漠遗迹的秘宝', levelId: 4, type: 'game', hasBoss: true, bossName: '亡灵守卫长', desc: '夺取星辉圣器碎片' },
            { name: '第5章 雪山', fullName: '第5章：雪山圣堂的背叛', levelId: 5, type: 'game', hasBoss: true, bossName: '堕落大主教', desc: '揭露惊天阴谋' },
            { name: '第6章 海洋', fullName: '第6章：海上迷航', levelId: 6, type: 'game', hasBoss: true, bossName: '深海魔物', desc: '击败海妖穿越海域' },
            { name: '第7章 迷宫', fullName: '第7章：地下城迷宫', levelId: 7, type: 'game', hasBoss: true, bossName: '迷宫守护者', desc: '揭开迷宫真相' },
            { name: '第8章 王都', fullName: '第8章：王国决战', levelId: 8, type: 'game', hasBoss: true, bossName: '魔王四天王', desc: '守护王都' },
            { name: '第9章 魔王城', fullName: '第9章：魔王城前哨战', levelId: 9, type: 'game', hasBoss: true, bossName: '三大军团长', desc: '攻入魔王城' },
            { name: '第10章 魔王', fullName: '第10章：魔王对决', levelId: 10, type: 'game', hasBoss: true, bossName: '魔王巴尔泽芬', desc: '最终对决' },
            { name: '最终章', fullName: '最终章：魔神降临', levelId: 11, type: 'final_boss', hasBoss: true, bossName: '虚空魔神', desc: '世界存亡之战' }
        ];

        // 半透明遮罩
        const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(50);

        // 面板
        const pw = 1000, ph = 580;
        const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(60);
        const panelBg = this.add.rectangle(0, 0, pw, ph, 0x0d0d20, 0.98);
        panelBg.setStrokeStyle(2, 0xFFD700, 0.6);
        panel.add(panelBg);

        // 标题
        const title = this.add.text(0, -ph / 2 + 30, '选 择 关 卡', {
            fontSize: '28px', fontFamily: font, color: '#FFD700', fontStyle: 'bold'
        }).setOrigin(0.5);
        panel.add(title);

        // 关闭按钮
        const closeBtn = this.add.text(pw / 2 - 20, -ph / 2 + 15, '✕', {
            fontSize: '24px', fontFamily: font, color: '#FFFFFF',
            backgroundColor: '#442222', padding: { x: 8, y: 4 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        panel.add(closeBtn);

        // 网格布局: 4列 x 3行
        const cols = 4, rows = 3;
        const cardW = 220, cardH = 140, gapX = 15, gapY = 12;
        const gridStartX = -(cols - 1) * (cardW + gapX) / 2;
        const gridStartY = -ph / 2 + 80;

        chapters.forEach((ch, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = gridStartX + col * (cardW + gapX);
            const cy = gridStartY + row * (cardH + gapY);

            // 卡片背景
            const isBoss = ch.hasBoss;
            const isStory = ch.type === 'story';
            const cardColor = isStory ? 0x0d1a3a : (isBoss ? 0x1a0d0d : 0x0d1a2e);
            const borderColor = isStory ? 0x4488CC : (isBoss ? 0xCC4444 : 0x446644);

            const cardBg = this.add.rectangle(cx, cy, cardW, cardH, cardColor, 0.95);
            cardBg.setStrokeStyle(2, borderColor, 0.7);
            panel.add(cardBg);

            // 章节编号
            const numText = this.add.text(cx - cardW / 2 + 12, cy - cardH / 2 + 10, '#' + (i + 1), {
                fontSize: '14px', fontFamily: font, color: '#888888'
            }).setOrigin(0, 0);
            panel.add(numText);

            // 章节名
            const nameText = this.add.text(cx, cy - cardH / 2 + 35, ch.name, {
                fontSize: '18px', fontFamily: font, color: '#FFFFFF', fontStyle: 'bold'
            }).setOrigin(0.5);
            panel.add(nameText);

            // 描述
            const descText = this.add.text(cx, cy - cardH / 2 + 60, ch.desc, {
                fontSize: '12px', fontFamily: font, color: '#AAAAAA',
                wordWrap: { width: cardW - 24 }
            }).setOrigin(0.5, 0);
            panel.add(descText);

            // Boss 名
            if (isBoss && ch.bossName) {
                const bossText = this.add.text(cx, cy - cardH / 2 + 85, 'BOSS: ' + ch.bossName, {
                    fontSize: '13px', fontFamily: font, color: '#FF6666', fontStyle: 'bold'
                }).setOrigin(0.5, 0);
                panel.add(bossText);
            }

            // 类型标签
            if (isStory) {
                const tag = this.add.text(cx + cardW / 2 - 12, cy - cardH / 2 + 10, '剧情', {
                    fontSize: '11px', fontFamily: font, color: '#88CCFF',
                    backgroundColor: '#001133', padding: { x: 4, y: 2 }
                }).setOrigin(1, 0);
                panel.add(tag);
            } else if (isBoss) {
                const tag = this.add.text(cx + cardW / 2 - 12, cy - cardH / 2 + 10, 'BOSS', {
                    fontSize: '11px', fontFamily: font, color: '#FF4444',
                    backgroundColor: '#330000', padding: { x: 4, y: 2 }
                }).setOrigin(1, 0);
                panel.add(tag);
            }

            // 按钮（卡片底部）
            const btnY = cy + cardH / 2 - 25;
            if (isStory) {
                // 剧情：一个按钮
                const btn = this.add.text(cx, btnY, '观看剧情', {
                    fontSize: '14px', fontFamily: font, color: '#FFFFFF',
                    backgroundColor: '#224466', padding: { x: 16, y: 5 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                panel.add(btn);
                btn.on('pointerover', () => { btn.setStyle({ backgroundColor: '#336688', color: '#FFD700' }); });
                btn.on('pointerout', () => { btn.setStyle({ backgroundColor: '#224466', color: '#FFFFFF' }); });
                btn.on('pointerdown', () => { this.playMenuSound(); this.selectLevel(ch.levelId + 1, 'normal'); });
            } else if (ch.type === 'final_boss') {
                // 最终Boss
                const btn = this.add.text(cx, btnY, '挑战最终Boss', {
                    fontSize: '14px', fontFamily: font, color: '#FFD700',
                    backgroundColor: '#662222', padding: { x: 16, y: 5 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                panel.add(btn);
                btn.on('pointerover', () => { btn.setStyle({ backgroundColor: '#883333', color: '#FFFFFF' }); });
                btn.on('pointerout', () => { btn.setStyle({ backgroundColor: '#662222', color: '#FFD700' }); });
                btn.on('pointerdown', () => { this.playMenuSound(); this.selectLevel(ch.levelId + 1, 'boss'); });
            } else if (isBoss) {
                // 有Boss：两个按钮
                const btn1 = this.add.text(cx - 55, btnY, '小怪战', {
                    fontSize: '13px', fontFamily: font, color: '#FFFFFF',
                    backgroundColor: '#224422', padding: { x: 10, y: 4 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                panel.add(btn1);
                btn1.on('pointerover', () => { btn1.setStyle({ backgroundColor: '#336633', color: '#FFD700' }); });
                btn1.on('pointerout', () => { btn1.setStyle({ backgroundColor: '#224422', color: '#FFFFFF' }); });
                btn1.on('pointerdown', () => { this.playMenuSound(); this.selectLevel(ch.levelId + 1, 'normal'); });

                const btn2 = this.add.text(cx + 55, btnY, 'Boss战', {
                    fontSize: '13px', fontFamily: font, color: '#FF6666',
                    backgroundColor: '#442222', padding: { x: 10, y: 4 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                panel.add(btn2);
                btn2.on('pointerover', () => { btn2.setStyle({ backgroundColor: '#663333', color: '#FFD700' }); });
                btn2.on('pointerout', () => { btn2.setStyle({ backgroundColor: '#442222', color: '#FF6666' }); });
                btn2.on('pointerdown', () => { this.playMenuSound(); this.selectLevel(ch.levelId + 1, 'boss'); });
            } else {
                // 无Boss
                const btn = this.add.text(cx, btnY, '进入战斗', {
                    fontSize: '14px', fontFamily: font, color: '#FFFFFF',
                    backgroundColor: '#224422', padding: { x: 16, y: 5 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                panel.add(btn);
                btn.on('pointerover', () => { btn.setStyle({ backgroundColor: '#336633', color: '#FFD700' }); });
                btn.on('pointerout', () => { btn.setStyle({ backgroundColor: '#224422', color: '#FFFFFF' }); });
                btn.on('pointerdown', () => { this.playMenuSound(); this.selectLevel(ch.levelId + 1, 'normal'); });
            }

            // 卡片 hover 效果
            cardBg.setInteractive();
            cardBg.on('pointerover', () => { cardBg.setStrokeStyle(2, 0xFFD700, 1); });
            cardBg.on('pointerout', () => { cardBg.setStrokeStyle(2, borderColor, 0.7); });
        });

        // 底部提示
        const hint = this.add.text(0, ph / 2 - 18, '点击按钮进入对应关卡 | 绿色=小怪战  红色=Boss战  蓝色=剧情', {
            fontSize: '13px', fontFamily: font, color: '#666688'
        }).setOrigin(0.5);
        panel.add(hint);

        this.levelSelectPanel = panel;

        // 关闭
        const closePanel = () => {
            if (this.levelSelectPanel) {
                this.tweens.add({
                    targets: [this.levelSelectPanel, overlay],
                    alpha: 0,
                    duration: 200,
                    onComplete: () => {
                        this.levelSelectPanel.destroy();
                        overlay.destroy();
                        this.levelSelectPanel = null;
                        this.canSelect = true;
                    }
                });
            }
        };
        closeBtn.on('pointerdown', closePanel);
        this.input.keyboard.once('keydown-ESC', closePanel);
    }

    selectLevel(levelIndex, mode = 'normal') {
        const saveData = SaveSystem.loadGame();
        
        if (saveData && saveData.currentLevel >= levelIndex) {
            this.gameData = {
                currentLevel: levelIndex,
                playerHealth: saveData.playerHealth || STORY_DATA.player.health,
                playerMaxHealth: saveData.playerMaxHealth || STORY_DATA.player.health,
                playerCoins: saveData.playerCoins || 0,
                playerLevel: saveData.playerLevel || 1,
                playerExperience: saveData.playerExperience || 0,
                playerEnergy: saveData.playerEnergy || 100,
                difficulty: DIFFICULTY[saveData.difficulty] || DIFFICULTY.NORMAL,
                attackDamage: saveData.attackDamage,
                speed: saveData.speed,
                bulletCount: saveData.bulletCount,
                bulletSpread: saveData.bulletSpread,
                orbitBullets: saveData.orbitBullets || 0,
                hasOrbit: saveData.hasOrbit || false,
                coinMagnet: saveData.coinMagnet || 1,
                pickupRange: saveData.pickupRange || 50,
                regenRate: saveData.regenRate || 0,
                hasRegen: saveData.hasRegen || false,
                critChance: saveData.critChance || 0,
                critDamage: saveData.critDamage || 1.5,
                maxEnergy: saveData.maxEnergy || 100,
                expBoost: saveData.expBoost || 1
            };
        } else {
            this.gameData = {
                currentLevel: levelIndex,
                playerHealth: STORY_DATA.player.health,
                playerMaxHealth: STORY_DATA.player.health,
                playerCoins: 0,
                playerLevel: 1,
                playerExperience: 0,
                playerEnergy: 100,
                difficulty: DIFFICULTY.NORMAL,
                attackDamage: undefined,
                speed: undefined,
                bulletCount: undefined,
                bulletSpread: undefined,
                orbitBullets: 0,
                hasOrbit: false,
                coinMagnet: 1,
                pickupRange: 50,
                regenRate: 0,
                hasRegen: false,
                critChance: 0,
                critDamage: 1.5,
                maxEnergy: 100,
                expBoost: 1
            };
        }

        this.stopMenuMusic();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            const targetLevelIndex = Math.max(0, Math.min(levelIndex - 1, STORY_DATA.levels.length - 1));
            console.log(`🎮 选择关卡 ${levelIndex} → StoryScene levelIndex=${targetLevelIndex}, mode=${mode}`);
            this.scene.start('StoryScene', { 
                levelIndex: targetLevelIndex, 
                gameData: this.gameData,
                bossOnly: mode === 'boss'
            });
        });
    }

    quitGame() {
        this.canSelect = false;
        this.tweens.add({
            targets: [this.title, this.subtitle, ...this.menuItems, this.pressStartText],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
            }
        });

        this.time.delayedCall(800, () => {
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '感谢游玩！', {
                fontSize: '40px',
                fontFamily: 'Microsoft YaHei, SimHei, Courier New',
                color: '#FFFFFF'
            }).setOrigin(0.5);
        });
    }

    update() {
        if (this.stars) {
            this.stars.forEach((star, i) => {
                star.y += 0.15 + (i % 3) * 0.1;
                if (star.y > GAME_HEIGHT) {
                    star.y = 0;
                    star.x = Phaser.Math.Between(0, GAME_WIDTH);
                }
            });
        }
    }

    shutdown() {
        try {
            window.audioManager.stop('menu_bgm');
        } catch (e) {}
    }
}

window.MenuScene = MenuScene;
