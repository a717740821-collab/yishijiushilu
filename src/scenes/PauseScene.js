class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    init(data) {
        this.musicRef = data.music;
        this.bossMusicRef = data.bossMusic;
    }

    create() {
        this.createOverlay();
        this.createPauseMenu();
        this.setupInput();
    }

    createOverlay() {
        this.overlay = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x000000,
            0.7
        );

        this.pausedText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, STORY_DATA.menuText.paused, {
            fontSize: '56px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.pausedText,
            scaleX: 1.02,
            scaleY: 1.02,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createPauseMenu() {
        const startY = GAME_HEIGHT * 0.5;
        const spacing = 70;

        this.menuItems = [];
        const options = [
            STORY_DATA.menuText.resume,
            STORY_DATA.menuText.restart,
            STORY_DATA.menuText.mainMenu
        ];

        options.forEach((text, index) => {
            const menuItem = this.createMenuItem(GAME_WIDTH / 2, startY + index * spacing, text, index);
            this.menuItems.push(menuItem);
        });

        this.menuIndex = 0;
        this.updateMenuSelection();
    }

    createMenuItem(x, y, text, index) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 280, 50, 0x333333, 0.9);
        bg.setStrokeStyle(2, 0x666666);

        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        container.add([bg, label]);
        container.setData('index', index);
        container.setData('text', text);
        container.setInteractive(new Phaser.Geom.Rectangle(-140, -25, 280, 50), Phaser.Geom.Rectangle.Contains);

        return container;
    }

    updateMenuSelection() {
        this.menuItems.forEach((item, index) => {
            const isSelected = index === this.menuIndex;
            const bg = item.getAt(0);
            const label = item.getAt(1);

            if (isSelected) {
                bg.setFillStyle(0x555555, 0.9);
                bg.setStrokeStyle(3, 0xFFD700);
                label.setColor('#FFD700');

                this.tweens.add({
                    targets: item,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100
                });
            } else {
                bg.setFillStyle(0x333333, 0.9);
                bg.setStrokeStyle(2, 0x666666);
                label.setColor('#FFFFFF');

                this.tweens.add({
                    targets: item,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            }
        });
    }

    setupInput() {
        this.input.keyboard.on('keydown-UP', () => {
            this.playMenuSound();
            this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length;
            this.updateMenuSelection();
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            this.playMenuSound();
            this.menuIndex = (this.menuIndex + 1) % this.menuItems.length;
            this.updateMenuSelection();
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.selectMenuItem();
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.resumeGame();
        });

        this.menuItems.forEach((item, index) => {
            item.on('pointerover', () => {
                this.menuIndex = index;
                this.updateMenuSelection();
                this.playMenuSound();
            });

            item.on('pointerdown', () => {
                this.menuIndex = index;
                this.selectMenuItem();
            });
        });
    }

    playMenuSound() {
        const settings = SaveSystem.loadSettings();
        const sfxVolume = (settings && settings.sfxVolume !== undefined) ? settings.sfxVolume : 0.5;
        window.audioManager.play('button_click', null, false, sfxVolume);
    }

    selectMenuItem() {
        this.playMenuSound();
        const selectedText = this.menuItems[this.menuIndex].getData('text');

        if (selectedText === STORY_DATA.menuText.resume) {
            this.resumeGame();
        } else if (selectedText === STORY_DATA.menuText.restart) {
            this.restartGame();
        } else if (selectedText === STORY_DATA.menuText.mainMenu) {
            this.goToMainMenu();
        }
    }

    resumeGame() {
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.gameState = 'playing';
        }
        this.scene.stop();
        this.scene.resume('GameScene');
    }

    restartGame() {
        this.scene.stop('GameScene');
        this.scene.start('StoryScene', { levelIndex: 0, gameData: {
            currentLevel: 1,
            playerHealth: STORY_DATA.player.health,
            playerMaxHealth: STORY_DATA.player.health,
            playerCoins: 0,
            difficulty: DIFFICULTY.NORMAL
        }});
    }

    goToMainMenu() {
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
    }

    update() {}
}

window.PauseScene = PauseScene;