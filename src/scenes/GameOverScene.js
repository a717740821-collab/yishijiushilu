class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.levelIndex = data.levelIndex || 0;
        this.gameData = data.gameData || {
            currentLevel: 1,
            playerHealth: 100,
            playerMaxHealth: 100,
            playerCoins: 0,
            difficulty: DIFFICULTY.NORMAL
        };
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);

        this.createBackground();
        this.createGameOverText();
        this.createButtons();
        this.setupInput();
    }

    getAudioPath(key) {
        // 返回键名而不是路径
        const audioKeys = {
            'game_over_bgm': 'game_over_bgm',
            'button_click': 'button_click'
        };
        return audioKeys[key] || null;
    }

    createBackground() {
        this.bg = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x1a0a0a
        ).setDepth(0);

        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(0, GAME_HEIGHT);
            const smoke = this.add.circle(x, y, Phaser.Math.Between(20, 60), 0x333333, 0.2).setDepth(10);
            this.tweens.add({
                targets: smoke,
                alpha: 0,
                x: smoke.x + Phaser.Math.Between(-50, 50),
                y: smoke.y - 100,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1
            });
        }
    }

    createGameOverText() {
        this.gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, STORY_DATA.menuText.gameOver, {
            fontSize: '72px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FF4444',
            stroke: '#440000',
            strokeThickness: 8,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: this.gameOverText,
            angle: -2,
            duration: 100,
            yoyo: true,
            repeat: -1,
            ease: 'Power2'
        });

        this.statsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, `到达关卡: ${this.gameData.currentLevel}\n金币: ${this.gameData.playerCoins}`, {
            fontSize: '24px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#CCCCCC',
            align: 'center',
            backgroundColor: '#00000044',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(100);
    }

    createButtons() {
        const buttonY = GAME_HEIGHT * 0.7;
        const spacing = 200;

        this.retryBtn = this.createButton(GAME_WIDTH / 2 - spacing / 2, buttonY, STORY_DATA.menuText.replay);
        this.menuBtn = this.createButton(GAME_WIDTH / 2 + spacing / 2, buttonY, STORY_DATA.menuText.mainMenu);

        this.buttons = [this.retryBtn, this.menuBtn];
        this.buttonIndex = 0;
        this.updateButtonSelection();
    }

    createButton(x, y, text) {
        const container = this.add.container(x, y).setDepth(100);

        const bg = this.add.rectangle(0, 0, 180, 55, 0x333333, 0.9);
        bg.setStrokeStyle(2, 0x666666);

        const label = this.add.text(0, 0, text, {
            fontSize: '22px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, label]);
        container.setInteractive(new Phaser.Geom.Rectangle(-90, -27, 180, 55), Phaser.Geom.Rectangle.Contains);

        return container;
    }

    updateButtonSelection() {
        this.buttons.forEach((btn, index) => {
            const isSelected = index === this.buttonIndex;
            const bg = btn.getAt(0);
            const label = btn.getAt(1);

            if (isSelected) {
                bg.setFillStyle(0x555555, 0.9);
                bg.setStrokeStyle(3, 0xFF4444);
                label.setColor('#FF4444');

                this.tweens.add({
                    targets: btn,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            } else {
                bg.setFillStyle(0x333333, 0.9);
                bg.setStrokeStyle(2, 0x666666);
                label.setColor('#FFFFFF');

                this.tweens.add({
                    targets: btn,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            }
        });
    }

    setupInput() {
        this.input.keyboard.on('keydown-LEFT', () => {
            this.playMenuSound();
            this.buttonIndex = Math.max(0, this.buttonIndex - 1);
            this.updateButtonSelection();
        });

        this.input.keyboard.on('keydown-RIGHT', () => {
            this.playMenuSound();
            this.buttonIndex = Math.min(this.buttons.length - 1, this.buttonIndex + 1);
            this.updateButtonSelection();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.selectButton();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.goToMainMenu();
        });

        this.buttons.forEach((btn, index) => {
            btn.on('pointerover', () => {
                this.buttonIndex = index;
                this.updateButtonSelection();
                this.playMenuSound();
            });

            btn.on('pointerdown', () => {
                this.buttonIndex = index;
                this.selectButton();
            });
        });
    }

    playMenuSound() {
        const settings = SaveSystem.loadSettings();
        const sfxVolume = (settings && settings.sfxVolume !== undefined) ? settings.sfxVolume : 0.5;
        window.audioManager.play('button_click', null, false, sfxVolume);
    }

    selectButton() {
        this.playMenuSound();

        if (this.buttonIndex === 0) {
            this.retryGame();
        } else {
            this.goToMainMenu();
        }
    }

    retryGame() {
        // 保存当前进度到存档，以便重新挑战时保留增益效果
        SaveSystem.saveGame(this.gameData);

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // 使用传入的关卡数据和游戏数据，而不是重置
            const targetLevelIndex = Math.max(0, this.levelIndex);
            this.scene.start('StoryScene', {
                levelIndex: targetLevelIndex,
                gameData: this.gameData // 保留所有卡片增益和属性
            });
        });
    }

    goToMainMenu() {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }

    update() {}

    shutdown() {
        window.audioManager.stopAll();
    }
}

window.GameOverScene = GameOverScene;