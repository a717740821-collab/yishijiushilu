class EpilogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EpilogueScene' });
    }

    init(data) {
        console.log('🎬 EpilogueScene 初始化');
        this.gameData = data.gameData || {};
        this.isSkipping = false;
        this.currentStep = 0;
    }

    create() {
        console.log('🎬 EpilogueScene.create() 开始执行');
        
        this.gameState = 'playing';
        
        this.blackOverlay = this.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            GAME_WIDTH, 
            GAME_HEIGHT, 
            0x000000, 
            1
        ).setDepth(100);
        
        this.createStarlitSky();
        
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        
        this.setupSkipListener();
        
        this.time.delayedCall(1200, () => {
            if (!this.isSkipping) {
                this.startEpilogue();
            }
        });
        
        this.time.delayedCall(30000, () => {
            if (this.gameState !== 'ended' && !this.isSkipping) {
                console.warn('⚠️ EpilogueScene 超时，强制跳转到Ending');
                this.goToEnding();
            }
        });
        
        console.log('✅ EpilogueScene.create() 完成');
    }

    setupSkipListener() {
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.isSkipping && this.gameState === 'playing') {
                this.skipToEnding();
            }
        });
        
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.isSkipping && this.gameState === 'playing') {
                this.skipToEnding();
            }
        });
    }

    skipToEnding() {
        if (this.isSkipping || this.gameState === 'ended') return;
        console.log('⏭️ 用户跳过Epilogue剧情');
        this.isSkipping = true;
        
        this.tweens.killAll();
        
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('EndingScene', { isFinal: true, isTrueEnding: true });
        });
    }

    createStarlitSky() {
        const bgKey = 'StarlitSky';
        if (this.textures.exists(bgKey)) {
            this.skyBackground = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
            this.skyBackground.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
            this.skyBackground.setAlpha(0);
            this.skyBackground.setDepth(0);
        } else {
            this.createGradientSky();
            this.createStarParticles();
        }
    }

    createGradientSky() {
        this.skyGradient = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2,
            GAME_WIDTH, GAME_HEIGHT,
            0x0a0a2e, 1
        ).setDepth(0);
    }

    createStarParticles() {
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * GAME_WIDTH;
            const y = Math.random() * GAME_HEIGHT;
            const size = Math.random() * 2 + 1;
            const brightness = Math.random() * 0.5 + 0.5;
            
            const star = this.add.circle(x, y, size, 0xFFFFFF, brightness).setDepth(1);
            this.stars.push(star);
            
            this.tweens.add({
                targets: star,
                alpha: { from: brightness * 0.5, to: brightness },
                duration: Math.random() * 2000 + 1000,
                yoyo: true,
                repeat: -1
            });
        }
    }

    startEpilogue() {
        if (this.isSkipping) return;
        console.log('✨ 开始终幕剧情...');
        this.step1_WhiteLightToSky();
    }

    step1_WhiteLightToSky() {
        if (this.isSkipping) return;
        console.log('📸 步骤1: 白光转星空');
        
        const whiteLight = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2, 
            GAME_WIDTH * 2, GAME_HEIGHT * 2, 
            0xFFFFFF, 1
        ).setDepth(99);
        
        if (this.skyBackground) {
            this.tweens.add({
                targets: this.skyBackground,
                alpha: 1,
                duration: 2500,
                ease: 'Power2'
            });
        }
        
        this.tweens.add({
            targets: whiteLight,
            alpha: 0,
            duration: 2500,
            ease: 'Power2',
            onComplete: () => {
                if (whiteLight.active) whiteLight.destroy();
                this.time.delayedCall(400, () => {
                    if (!this.isSkipping) this.step2_RuinsAndBuds();
                });
            }
        });
    }

    step2_RuinsAndBuds() {
        if (this.isSkipping) return;
        console.log('📸 步骤2: 废墟与新生');
        
        this.ground = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT - 80,
            GAME_WIDTH, 160,
            0x2a1a0a, 1
        ).setDepth(10);
        
        this.createNewLifeBuds();
        
        this.showNarratorText(
            '废墟之上，新的绿色嫩芽从焦土中钻出。\n远方残破的王都钟声再次响起……',
            3000,
            () => { if (!this.isSkipping) this.step3_GoddessDialogue(); }
        );
    }

    createNewLifeBuds() {
        const budPositions = [
            { x: GAME_WIDTH * 0.2, y: GAME_HEIGHT - 100 },
            { x: GAME_WIDTH * 0.5, y: GAME_HEIGHT - 95 },
            { x: GAME_WIDTH * 0.8, y: GAME_HEIGHT - 105 }
        ];
        
        this.buds = [];
        
        budPositions.forEach((pos, index) => {
            const dirt = this.add.ellipse(pos.x, pos.y + 20, 30, 15, 0x1a0a00, 1).setDepth(11);
            const stem = this.add.rectangle(pos.x, pos.y, 4, 0, 0x22aa22, 1).setDepth(12);
            const leaf1 = this.add.ellipse(pos.x - 5, pos.y - 10, 8, 4, 0x33cc33, 0).setDepth(12);
            const leaf2 = this.add.ellipse(pos.x + 5, pos.y - 8, 8, 4, 0x33cc33, 0).setDepth(12);
            
            this.buds.push({ stem, leaf1, leaf2 });
            
            this.time.delayedCall(index * 300, () => {
                if (this.isSkipping) return;
                this.tweens.add({
                    targets: stem,
                    height: 25,
                    y: pos.y - 12,
                    duration: 1500,
                    ease: 'Power2'
                });
                
                this.tweens.add({
                    targets: [leaf1, leaf2],
                    alpha: 1,
                    duration: 1000,
                    delay: 1200
                });
            });
        });
    }

    step3_GoddessDialogue() {
        if (this.isSkipping) return;
        console.log('📸 步骤3: 女神对话');
        
        let goddessImage = null;
        const goddessKey = 'shengnv';
        if (this.textures.exists(goddessKey)) {
            goddessImage = this.add.image(
                GAME_WIDTH * 0.25,
                GAME_HEIGHT * 0.6,
                goddessKey
            );
            goddessImage.setDisplaySize(160, 220);
            goddessImage.setAlpha(0);
            goddessImage.setDepth(20);
            
            this.tweens.add({
                targets: goddessImage,
                alpha: 1,
                duration: 1500
            });
        }
        
        const dialogues = [
            '艾伦……不，应该叫你"玩家"。',
            '谢谢你陪这个世界，走完了最后一程。',
            '你选择了牺牲自己，却让这个梦继续下去。',
            '这个世界……会永远记住你。'
        ];
        
        let dialogueIndex = 0;
        const showNextDialogue = () => {
            if (this.isSkipping) return;
            if (dialogueIndex >= dialogues.length) {
                this.time.delayedCall(800, () => {
                    if (!this.isSkipping) this.step4_YearsLater();
                });
                return;
            }
            
            this.showDialogueText(
                '女神',
                dialogues[dialogueIndex],
                2800,
                () => {
                    dialogueIndex++;
                    showNextDialogue();
                }
            );
        };
        
        this.time.delayedCall(1200, () => {
            showNextDialogue();
        });
    }

    step4_YearsLater() {
        if (this.isSkipping) return;
        console.log('📸 步骤4: 多年以后');
        
        this.cameras.main.fadeOut(1200, 0, 0, 0);
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.isSkipping) return;
            
            if (this.narratorText && this.narratorText.active) this.narratorText.destroy();
            if (this.dialogueText && this.dialogueText.active) this.dialogueText.destroy();
            if (this.dialogueName && this.dialogueName.active) this.dialogueName.destroy();
            if (this.dialogueBox && this.dialogueBox.active) this.dialogueBox.destroy();
            
            this.createWarmVillageScene();
            
            this.cameras.main.fadeIn(1200, 0, 0, 0);
            
            this.time.delayedCall(1800, () => {
                if (!this.isSkipping) {
                    this.showNarratorText(
                        '多年以后，一个与你转生前长得一模一样的孩子\n在村子里出生，手里握着一枚小小的星辉碎片，\n对着天空轻轻微笑。',
                        4000,
                        () => { if (!this.isSkipping) this.step5_TransitionToEnding(); }
                    );
                }
            });
        });
    }

    createWarmVillageScene() {
        this.villageBg = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT / 2,
            GAME_WIDTH, GAME_HEIGHT,
            0x87CEEB, 1
        ).setDepth(0);
        
        this.sun = this.add.circle(
            GAME_WIDTH * 0.8, GAME_HEIGHT * 0.2,
            50, 0xFFDD44, 1
        ).setDepth(1);
        
        this.sunGlow = this.add.circle(
            GAME_WIDTH * 0.8, GAME_HEIGHT * 0.2,
            100, 0xFFDD44, 0.3
        ).setDepth(0);
        
        this.add.rectangle(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.7, 120, 80, 0x8B4513, 1).setDepth(5);
        this.add.triangle(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.55, 0, 40, 80, -40, -80, 40, 0xA0522D, 1).setDepth(6);
        
        this.add.rectangle(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.72, 100, 70, 0x9B6B3C, 1).setDepth(5);
        this.add.triangle(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.58, 0, 35, 70, -35, -70, 35, 0xB07B4C, 1).setDepth(6);
        
        this.grass = this.add.rectangle(
            GAME_WIDTH / 2, GAME_HEIGHT - 60,
            GAME_WIDTH, 120,
            0x228B22, 1
        ).setDepth(4);
        
        this.createChildCharacter();
    }

    createChildCharacter() {
        const childX = GAME_WIDTH * 0.5;
        const childY = GAME_HEIGHT * 0.75;
        
        const heroKey = 'hero';
        if (this.textures.exists(heroKey)) {
            const child = this.add.image(childX, childY, heroKey);
            child.setDisplaySize(80, 120);
            child.setAlpha(0);
            child.setDepth(10);
            
            this.tweens.add({
                targets: child,
                alpha: 1,
                duration: 1500
            });
        } else {
            const childHead = this.add.circle(childX, childY - 40, 25, 0xF5DEB3, 1).setDepth(10);
            const childBody = this.add.ellipse(childX, childY, 30, 50, 0x87CEEB, 1).setDepth(9);
            
            this.tweens.add({
                targets: [childHead, childBody],
                alpha: { from: 0, to: 1 },
                duration: 1500
            });
        }
        
        const starFragment = this.add.circle(childX + 30, childY - 20, 8, 0xFFD700, 1).setDepth(11);
        this.starFragment = starFragment;
        
        this.tweens.add({
            targets: starFragment,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.5, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }

    step5_TransitionToEnding() {
        if (this.isSkipping) return;
        console.log('📸 步骤5: 跳转ED');
        
        this.transitionText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 120,
            '即将进入结局动画...\n按 Enter 可跳过',
            {
                fontSize: '22px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setAlpha(0).setDepth(100);
        
        this.tweens.add({
            targets: this.transitionText,
            alpha: 1,
            duration: 1000
        });
        
        this.time.delayedCall(3500, () => {
            this.goToEnding();
        });
    }

    goToEnding() {
        if (this.gameState === 'ended' || this.isSkipping) return;
        console.log('🎬 跳转到 EndingScene');
        this.gameState = 'ended';
        this.isSkipping = true;
        
        try {
            window.audioManager.stopAll();
        } catch (e) {}
        
        this.cameras.main.fadeOut(1200, 0, 0, 0);
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('EndingScene', {
                isFinal: true,
                isTrueEnding: true,
                gameData: this.gameData
            });
        });
    }

    showNarratorText(text, duration, callback) {
        if (this.narratorText && this.narratorText.active) {
            this.tweens.killTweensOf(this.narratorText);
            this.narratorText.destroy();
        }
        
        this.narratorText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT * 0.28,
            text,
            {
                fontSize: '22px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                align: 'center',
                lineSpacing: 8,
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setAlpha(0).setDepth(50);
        
        this.tweens.add({
            targets: this.narratorText,
            alpha: 1,
            duration: 800,
            ease: 'Power2'
        });
        
        this.time.delayedCall(duration, () => {
            if (this.isSkipping) return;
            this.tweens.add({
                targets: this.narratorText,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    if (callback) callback();
                }
            });
        });
    }

    showDialogueText(name, text, duration, callback) {
        if (this.dialogueText && this.dialogueText.active) this.dialogueText.destroy();
        if (this.dialogueName && this.dialogueName.active) this.dialogueName.destroy();
        if (this.dialogueBox && this.dialogueBox.active) this.dialogueBox.destroy();
        
        this.dialogueBox = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 100,
            GAME_WIDTH - 80,
            140,
            0x000000,
            0.8
        ).setDepth(40);
        
        this.dialogueName = this.add.text(
            60,
            GAME_HEIGHT - 165,
            name,
            {
                fontSize: '20px',
                fontFamily: 'Courier New',
                color: '#FFD700',
                fontStyle: 'bold'
            }
        ).setAlpha(0).setDepth(41);
        
        this.dialogueText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 100,
            text,
            {
                fontSize: '21px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                align: 'center',
                lineSpacing: 6,
                wordWrap: { width: GAME_WIDTH - 120 }
            }
        ).setOrigin(0.5, 0.5).setAlpha(0).setDepth(42);
        
        this.tweens.add({
            targets: [this.dialogueName, this.dialogueText],
            alpha: 1,
            duration: 500
        });
        
        this.time.delayedCall(duration, () => {
            if (this.isSkipping) return;
            this.tweens.add({
                targets: [this.dialogueName, this.dialogueText, this.dialogueBox],
                alpha: 0,
                duration: 400,
                onComplete: () => {
                    if (callback) callback();
                }
            });
        });
    }

    shutdown() {
        console.log('🧹 EpilogueScene 清理资源');
        try {
            if (this.input && this.input.keyboard) {
                this.input.keyboard.off('keydown-ENTER');
                this.input.keyboard.off('keydown-ESC');
            }
        } catch (e) {}
    }
}

window.EpilogueScene = EpilogueScene;
