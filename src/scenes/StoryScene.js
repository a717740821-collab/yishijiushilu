class StoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StoryScene' });
    }

    init(data) {
        this.levelIndex = data.levelIndex || 0;
        this.gameData = data.gameData || {
            currentLevel: 1,
            playerHealth: 100,
            playerMaxHealth: 100,
            playerCoins: 0,
            playerLevel: 1,
            playerExperience: 0,
            playerEnergy: 0,
            difficulty: DIFFICULTY.NORMAL
        };
        this.bossOnly = data.bossOnly || false;
        this.dialogueManager = null;
        this.dialogueShown = false;
        this.choicesShown = false;
        this.showEndingFirst = data.showEndingFirst || false;
    }

    resetDialogueFlags() {
        this.dialogueShown = false;
        this.choicesShown = false;
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);

        this.levelData = STORY_DATA.levels[this.levelIndex];
        if (!this.levelData) {
            this.scene.start('MenuScene');
            return;
        }

        this.createBackground();
        this.setupAudio();

        if (this.showEndingFirst && this.levelData.endingDialogue) {
            this.showEndingDialogue(this.levelData.endingDialogue, 'MenuScene');
        } else if (this.levelData.introDialogue && !this.dialogueShown) {
            this.dialogueShown = true;
            this.startIntroDialogue();
        } else if (this.levelData.type === 'final' && this.levelData.trueEndIntroDialogue && !this.choicesShown) {
            this.dialogueShown = true;
            this.startTrueEndIntroDialogue();
        } else {
            this.startGame();
        }
    }

    startTrueEndIntroDialogue() {
        this.dialogueManager = new DialogueManager(this);
        this.dialogueManager.startDialogue(this.levelData.trueEndIntroDialogue, () => {
            this.onTrueEndIntroComplete();
        });
    }

    onTrueEndIntroComplete() {
        this.dialogueManager = null;
        this.showFinalChoice();
    }

    createBackground() {
        const bgKey = this.levelData.introBackground;
        if (this.textures.exists(bgKey)) {
            this.bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
            this.bgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        } else {
            console.warn(`背景纹理不存在: ${bgKey}，使用备用背景`);
            this.bgImage = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
        }
    }

    setupAudio() {
        console.log('🎵 StoryScene.setupAudio() 开始执行');
        
        const settings = SaveSystem.loadSettings();
        this.musicVolume = (settings && settings.musicVolume !== undefined) ? settings.musicVolume : 0.5;

        console.log('🎵 StoryScene: 停止所有音频');
        window.audioManager.stopAll();
        
        console.log('🎵 StoryScene: 准备播放game_bgm');
        
        window.audioManager.play('game_bgm', null, true, this.musicVolume * 0.3);
    }

    getAudioPath(key) {
        // 返回键名而不是路径
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

    startIntroDialogue() {
        console.log('开始对话，对话数据:', this.levelData.introDialogue);
        this.dialogueManager = new DialogueManager(this);
        this.dialogueManager.startDialogue(this.levelData.introDialogue, () => {
            this.onIntroDialogueComplete();
        });
    }

    onIntroDialogueComplete() {
        window.audioManager.setVolume('game_bgm', this.musicVolume);
        this.dialogueManager = null;

        if (this.levelData.autoEnding) {
            console.log('🎬 autoEnding章节，对话完毕后进入EndingScene');
            this.time.delayedCall(1000, () => {
                this.showEndingAnimation();
            });
        } else if (this.levelData.type === 'story') {
            if (this.levelData.gameStart) {
                this.showBattleTransition(() => this.startGame());
            } else if (this.levelData.nextLevel !== undefined) {
                this.goToNextLevel();
            }
        } else if (this.levelData.type === 'final') {
            this.showFinalChoice();
        } else if (this.levelData.type === 'game') {
            this.showBattleTransition(() => this.startGame());
        } else {
            this.createUI();
            this.setupInput();
        }
    }

    showBattleTransition(callback) {
        // "战斗即将开始" 过渡提示
        const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
        overlay.setDepth(200);

        const battleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '—— 战斗即将开始 ——', {
            fontSize: '36px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FF6644',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        // 淡入
        this.tweens.add({
            targets: [overlay, battleText],
            alpha: [0.8, 1],
            duration: 400,
            ease: 'Power2'
        });

        // 闪烁效果
        this.tweens.add({
            targets: battleText,
            alpha: 0.5,
            duration: 200,
            delay: 600,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });

        // 1.5秒后执行回调
        this.time.delayedCall(1500, () => {
            this.tweens.add({
                targets: [overlay, battleText],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    if (overlay.active) overlay.destroy();
                    if (battleText.active) battleText.destroy();
                    if (callback) callback();
                }
            });
        });
    }

    goToNextLevel() {
        const nextIndex = this.levelIndex + 1;
        if (nextIndex < STORY_DATA.levels.length) {
            // 增加过渡效果：轻微屏幕震动 + 更长的淡出
            this.cameras.main.shake(200, 0.005);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('StoryScene', {
                    levelIndex: nextIndex,
                    gameData: this.gameData,
                    showEndingFirst: false
                });
            });
        } else {
            this.scene.start('MenuScene');
        }
    }

    showFinalChoice() {
        this.choicesShown = true;
        this.showChoiceUI();
    }

    showChoiceUI() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        this.add.rectangle(centerX, centerY, 600, 400, 0x000000, 0.9)
            .setStrokeStyle(2, 0xFFD700);

        this.add.text(centerX, centerY - 120, "最终抉择", {
            fontSize: '32px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        }).setOrigin(0.5);

        const choiceStyle = {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        };

        const trueEndBtn = this.add.text(centerX, centerY - 30, "1. 刺出圣剑（真·救世结局）", choiceStyle)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerover', () => trueEndBtn.setColor('#FFD700'))
            .on('pointerout', () => trueEndBtn.setColor('#FFFFFF'))
            .on('pointerdown', () => this.triggerTrueEnding());

        const badEndBtn = this.add.text(centerX, centerY + 30, "2. 屈服于黑暗（黑暗结局）", choiceStyle)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerover', () => badEndBtn.setColor('#FFD700'))
            .on('pointerout', () => badEndBtn.setColor('#FFFFFF'))
            .on('pointerdown', () => this.triggerBadEnding());

        const escapeBtn = this.add.text(centerX, centerY + 90, "3. 放弃抵抗（逃避结局）", choiceStyle)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerover', () => escapeBtn.setColor('#FFD700'))
            .on('pointerout', () => escapeBtn.setColor('#FFFFFF'))
            .on('pointerdown', () => this.triggerEscapeEnding());

        this.add.text(centerX, centerY + 160, "按 1/2/3 选择", {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#888888'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ONE', () => this.triggerTrueEnding());
        this.input.keyboard.on('keydown-TWO', () => this.triggerBadEnding());
        this.input.keyboard.on('keydown-THREE', () => this.triggerEscapeEnding());
    }

    triggerTrueEnding() {
        console.log('🗡️ 触发真·救世结局');
        
        // 先检查是否有endingDialogue需要播放
        if (this.levelData.endingDialogue && this.levelData.endingDialogue.lines) {
            console.log('📜 先播放结局剧情，再进入Ending动画');
            this.playEndingThenShowAnimation(this.levelData.endingDialogue);
        } else {
            // 没有剧情，直接进入Ending
            console.log('⚡ 无结局剧情，直接进入Ending动画');
            this.showEndingDialogue(null, 'MenuScene');
        }
    }

    triggerBadEnding() {
        console.log('🌑 触发黑暗结局');
        if (this.levelData.badEndingDialogue && this.levelData.badEndingDialogue.lines) {
            this.playEndingThenShowAnimation(this.levelData.badEndingDialogue);
        } else {
            this.showEndingDialogue(null, 'MenuScene');
        }
    }

    triggerEscapeEnding() {
        console.log('🏃 触发逃避结局');
        if (this.levelData.escapeEndingDialogue && this.levelData.escapeEndingDialogue.lines) {
            this.playEndingThenShowAnimation(this.levelData.escapeEndingDialogue);
        } else {
            this.showEndingDialogue(null, 'MenuScene');
        }
    }

    /**
     * 先播放结局剧情，播放完毕后进入Ending动画
     */
    playEndingThenShowAnimation(dialogue) {
        // 隐藏选择UI
        this.children.each(child => {
            if (child.type === 'Container' || child.type === 'Text') {
                // 简单处理：清空所有UI元素
            }
        });
        
        // 使用DialogueManager播放结局剧情
        this.dialogueManager = new DialogueManager(this);
        
        console.log('🎬 开始播放结局剧情...', dialogue.lines.length, '行');
        
        this.dialogueManager.startDialogue(dialogue, () => {
            console.log('✅ 结局剧情播放完毕，进入Ending动画');
            this.dialogueManager = null;
            
            // 剧情播放完毕，延迟1秒后进入Ending动画
            this.time.delayedCall(1000, () => {
                this.showEndingAnimation();
            });
        });
    }

    /**
     * 进入Ending动画场景（纯图片+音乐+Credits）
     */
    showEndingAnimation() {
        console.log('🎬 准备进入Ending动画场景...');
        
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            try {
                this.scene.start('EndingScene', {
                    isFinal: true,
                    skipDialogue: true, // 标记：剧情已播放完毕
                    gameData: this.gameData
                });
                
                console.log('🚀 Ending动画场景已启动');
            } catch (error) {
                console.error('❌ 启动Ending失败:', error);
                this.scene.start('MenuScene');
            }
        });
    }

    showEndingDialogue(dialogue, nextScene) {
        console.log('🎬 StoryScene: 准备跳转到EndingScene');
        console.log('   dialogue:', dialogue ? '存在' : '不存在');
        console.log('   nextScene:', nextScene);
        
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log('✅ 淡出完成，正在启动EndingScene...');
            
            try {
                this.scene.start('EndingScene', {
                    dialogue: dialogue,
                    endingText: this.levelData.endingText,
                    nextScene: nextScene,
                    isFinal: true
                });
                
                console.log('🚀 scene.start("EndingScene") 已调用');
            } catch (error) {
                console.error('❌ 启动EndingScene失败:', error);
                // 备用方案：直接回主菜单
                this.scene.start('MenuScene');
            }
        });
    }

    createUI() {
        const levelText = `第 ${this.levelData.id} 关`;
        this.add.text(50, 30, levelText, {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        });

        this.healthBarBg = this.add.rectangle(200, 30, 200, 20, 0x333333);
        this.healthBarBg.setStrokeStyle(2, 0x666666);

        this.healthBar = this.add.rectangle(100, 30, 196, 16, 0xFF0000);
        this.healthBar.setOrigin(0, 0.5);

        this.coinIcon = this.add.circle(1000, 30, 12, 0xFFD700);
        this.coinText = this.add.text(1020, 30, `${this.gameData.playerCoins}`, {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        }).setOrigin(0, 0.5);
    }

    setupInput() {
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.dialogueManager && this.dialogueManager.isActive) {
                return;
            }
            if (this.levelData.type === 'story') {
                if (this.levelData.gameStart) {
                    this.startGame();
                } else if (this.levelData.nextLevel !== undefined) {
                    this.goToNextLevel();
                }
            } else if (this.levelData.type === 'final') {
                if (!this.choicesShown) {
                    return;
                }
            } else {
                this.startGame();
            }
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.dialogueManager && this.dialogueManager.isActive) {
                return;
            }
            if (this.levelData.type === 'story') {
                if (this.levelData.gameStart) {
                    this.startGame();
                } else if (this.levelData.nextLevel !== undefined) {
                    this.goToNextLevel();
                }
            } else if (this.levelData.type === 'final') {
                if (!this.choicesShown) {
                    return;
                }
            } else {
                this.startGame();
            }
        });

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.dialogueManager && this.dialogueManager.isActive) {
                return;
            }
            this.scene.start('MenuScene');
        });
    }

    startGame() {
        // 显示章节标题卡过渡
        this.showChapterTitleCard(() => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('GameScene', {
                    levelIndex: this.levelIndex,
                    gameData: this.gameData,
                    bossOnly: this.bossOnly || false
                });
            });
        });
    }

    showChapterTitleCard(callback) {
        // 章节标题卡背景遮罩
        const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
        overlay.setDepth(200);
        
        // 章节名称
        const chapterName = this.levelData.name || ('第 ' + (this.levelData.id + 1) + ' 章');
        const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, chapterName, {
            fontSize: '42px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        // 章节提示文字（如有）
        let introTextObj = null;
        if (this.levelData.introText) {
            introTextObj = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, this.levelData.introText.split('\n')[0], {
                fontSize: '18px',
                fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
                color: '#AACCFF',
                align: 'center'
            }).setOrigin(0.5).setDepth(201).setAlpha(0);
        }

        // 装饰线
        const lineLeft = this.add.rectangle(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 70, 150, 2, 0xFFD700, 0).setDepth(201);
        const lineRight = this.add.rectangle(GAME_WIDTH / 2 + 200, GAME_HEIGHT / 2 - 70, 150, 2, 0xFFD700, 0).setDepth(201);

        // 动画序列：遮罩淡入 → 标题淡入 → 装饰线展开 → 等待 → 淡出
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 400,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: titleText,
            alpha: 1,
            duration: 600,
            delay: 300,
            ease: 'Power2'
        });

        if (introTextObj) {
            this.tweens.add({
                targets: introTextObj,
                alpha: 0.8,
                duration: 500,
                delay: 600,
                ease: 'Power2'
            });
        }

        // 装饰线从中心展开
        this.tweens.add({
            targets: lineLeft,
            alpha: 0.6,
            x: GAME_WIDTH / 2 - 250,
            width: 200,
            duration: 500,
            delay: 400,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: lineRight,
            alpha: 0.6,
            x: GAME_WIDTH / 2 + 250,
            width: 200,
            duration: 500,
            delay: 400,
            ease: 'Power2'
        });

        // 2.5秒后开始淡出
        this.time.delayedCall(2500, () => {
            this.tweens.add({
                targets: [overlay, titleText, introTextObj, lineLeft, lineRight].filter(Boolean),
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    [overlay, titleText, introTextObj, lineLeft, lineRight].forEach(obj => {
                        if (obj && obj.active) obj.destroy();
                    });
                    if (callback) callback();
                }
            });
        });
    }

    update() {
        if (this.dialogueManager && this.dialogueManager.isActive) {
            this.dialogueManager.update();
        }
    }
}

window.StoryScene = StoryScene;