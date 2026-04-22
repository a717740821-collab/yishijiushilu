class DialogueManager {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentDialogue = null;
        this.currentIndex = 0;
        this.dialogueBox = null;
        this.nameText = null;
        this.dialogueText = null;
        this.portraitLeft = null;
        this.portraitRight = null;
        this.cgImage = null;
        this.canAdvance = false;
        this.onComplete = null;
        this.originalMusicVolume = 0.5;
    }

    startDialogue(dialogue, onComplete = null) {
        if (this.isActive) return;

        this.isActive = true;
        this.currentDialogue = dialogue;
        this.currentIndex = 0;
        this.onComplete = onComplete;

        // 记录原始音量并降低背景音乐
        this.fadeOutMusic();

        // 创建CG背景
        if (dialogue.cg) {
            this.showCG(dialogue.cg);
        }

        // 创建立绘
        if (dialogue.portraits) {
            this.showPortraits(dialogue.portraits);
        }

        // 创建对话框
        this.createDialogueBox();

        // 显示第一条对话
        this.showCurrentDialogue();

        // 监听输入
        this.setupInput();
    }

    fadeOutMusic() {
        const settings = SaveSystem.loadSettings();
        this.originalMusicVolume = settings.musicVolume;
        window.audioManager.setVolume('game_bgm', this.originalMusicVolume * 0.3);
        window.audioManager.setVolume('boss_bgm', this.originalMusicVolume * 0.3);
        window.audioManager.setVolume('menu_bgm', this.originalMusicVolume * 0.3);
    }

    restoreMusic() {
        window.audioManager.setVolume('game_bgm', this.originalMusicVolume);
        window.audioManager.setVolume('boss_bgm', this.originalMusicVolume);
        window.audioManager.setVolume('menu_bgm', this.originalMusicVolume);
    }

    showCG(cgPath) {
        if (this.cgImage) {
            this.cgImage.destroy();
        }

        if (this.scene.textures.exists(cgPath)) {
            this.cgImage = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, cgPath);
            this.cgImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
            this.cgImage.setAlpha(0);
            this.scene.tweens.add({
                targets: this.cgImage,
                alpha: 1,
                duration: 500
            });
        } else {
            console.warn(`CG不存在: ${cgPath}，使用备用背景`);
            this.cgImage = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);
        }
    }

    hideCG() {
        if (this.cgImage) {
            this.scene.tweens.add({
                targets: this.cgImage,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.cgImage.destroy();
                    this.cgImage = null;
                }
            });
        }
    }

    showPortraits(portraits) {
        // 清理旧立绘
        if (this.portraitLeft) {
            this.portraitLeft.destroy();
            this.portraitLeft = null;
        }
        if (this.portraitRight) {
            this.portraitRight.destroy();
            this.portraitRight = null;
        }

        // 显示左侧立绘
        if (portraits.left) {
            const key = portraits.left.replace('.png', '');
            if (this.scene.textures.exists(key)) {
                this.portraitLeft = this.scene.add.image(180, GAME_HEIGHT - 280, key);
                const frame = this.scene.textures.get(key).getSourceImage();
                // 增大立绘显示尺寸：宽度最大350，高度最大500
                const scale = Math.min(320 / frame.width, 450 / frame.height);
                this.portraitLeft.setDisplaySize(frame.width * scale, frame.height * scale);
                this.portraitLeft.setAlpha(0);
                this.portraitLeft.setDepth(50); // 确保立绘在对话框下方
                this.scene.tweens.add({
                    targets: this.portraitLeft,
                    alpha: 1,
                    duration: 300
                });
            } else {
                console.warn(`左侧立绘不存在: ${key}`);
                this.portraitLeft = this.createPlaceholderPortrait(200, GAME_HEIGHT - 250, portraits.leftColor || 0x8B4513);
            }
        }

        // 显示右侧立绘
        if (portraits.right) {
            const key = portraits.right.replace('.png', '');
            if (this.scene.textures.exists(key)) {
                this.portraitRight = this.scene.add.image(GAME_WIDTH - 180, GAME_HEIGHT - 280, key);
                const frame = this.scene.textures.get(key).getSourceImage();
                // 增大立绘显示尺寸：宽度最大350，高度最大500
                const scale = Math.min(320 / frame.width, 450 / frame.height);
                this.portraitRight.setDisplaySize(frame.width * scale, frame.height * scale);
                this.portraitRight.setAlpha(0);
                this.portraitRight.setDepth(50); // 确保立绘在对话框下方
                this.scene.tweens.add({
                    targets: this.portraitRight,
                    alpha: 1,
                    duration: 300
                });
            } else {
                console.warn(`右侧立绘不存在: ${key}`);
                this.portraitRight = this.createPlaceholderPortrait(GAME_WIDTH - 200, GAME_HEIGHT - 250, portraits.rightColor || 0x00AA00);
            }
        }
    }

    createPlaceholderPortrait(x, y, color) {
        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, 320, 450);
        graphics.generateTexture('placeholder_portrait_' + x, 320, 450);
        graphics.destroy();
        
        const portrait = this.scene.add.image(x, y, 'placeholder_portrait_' + x);
        portrait.setDisplaySize(320, 450);
        return portrait;
    }

    hidePortraits() {
        if (this.portraitLeft) {
            this.scene.tweens.add({
                targets: this.portraitLeft,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.portraitLeft.destroy();
                    this.portraitLeft = null;
                }
            });
        }
        if (this.portraitRight) {
            this.scene.tweens.add({
                targets: this.portraitRight,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.portraitRight.destroy();
                    this.portraitRight = null;
                }
            });
        }
    }

    createDialogueBox() {
        // 对话框背景 - 毛玻璃效果
        this.dialogueBox = this.scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 100,
            GAME_WIDTH - 40,
            180,
            0x0a0a2e,
            0.88
        );
        this.dialogueBox.setStrokeStyle(2, 0xFFD700, 0.6);
        this.dialogueBox.setDepth(100);

        // 对话框顶部装饰线
        this.dialogueTopLine = this.scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 185,
            GAME_WIDTH - 80,
            2,
            0xFFD700,
            0.4
        ).setDepth(100);

        // 对话框内部渐变遮罩（上深下浅）
        this.dialogueGradient = this.scene.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 140,
            GAME_WIDTH - 44,
            80,
            0x000011,
            0.3
        ).setDepth(100);

        // 名字文本
        this.nameText = this.scene.add.text(60, GAME_HEIGHT - 168, '', {
            fontSize: '20px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FFD700',
            fontStyle: 'bold',
            backgroundColor: '#00000066',
            padding: { x: 8, y: 2 }
        });
        this.nameText.setDepth(101); // 确保名字在对话框之上

        // 对话文本
        this.dialogueText = this.scene.add.text(60, GAME_HEIGHT - 130, '', {
            fontSize: '18px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#F0E6D3',
            wordWrap: {
                width: GAME_WIDTH - 120,
                useAdvancedWrap: true
            }
        });
        this.dialogueText.setDepth(101); // 确保文本在对话框之上

        // 继续提示
        this.continuePrompt = this.scene.add.text(GAME_WIDTH - 180, GAME_HEIGHT - 30, '▶ 点击或按 ENTER 继续', {
            fontSize: '14px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#88AACC'
        });
        this.continuePrompt.setDepth(101); // 确保提示在对话框之上

        this.canAdvance = false;

        // 提示闪烁动画
        this.scene.tweens.add({
            targets: this.continuePrompt,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    showCurrentDialogue() {
        if (this.currentIndex >= this.currentDialogue.lines.length) {
            this.endDialogue();
            return;
        }

        const line = this.currentDialogue.lines[this.currentIndex];

        // 更新名字
        this.nameText.setText(line.name || '');

        // 更新立绘高亮
        this.updatePortraitHighlight(line.speaker);

        // 清空并逐字显示对话
        this.dialogueText.setText('');
        this.canAdvance = false;
        this.continuePrompt.setAlpha(0);

        this.scene.tweens.add({
            targets: this.dialogueText,
            alpha: 1,
            duration: 100
        });

        // 打字机效果
        this.typewriterEffect(line.text, () => {
            this.canAdvance = true;
            this.continuePrompt.setAlpha(1);
        });
    }

    typewriterEffect(text, onComplete) {
        let currentChar = 0;
        const speed = 30; // 每个字符的延迟（毫秒）

        const timer = this.scene.time.addEvent({
            delay: speed,
            callback: () => {
                currentChar++;
                this.dialogueText.setText(text.substring(0, currentChar));

                if (currentChar >= text.length) {
                    timer.remove();
                    if (onComplete) onComplete();
                }
            },
            repeat: text.length - 1
        });

        this.typewriterTimer = timer;
    }

    skipTypewriter() {
        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }
        const line = this.currentDialogue.lines[this.currentIndex];
        if (line) {
            this.dialogueText.setText(line.text);
        }
        this.canAdvance = true;
        this.continuePrompt.setAlpha(1);
    }

    updatePortraitHighlight(speaker) {
        // 根据说话者调整立绘透明度
        if (speaker === 'narration') {
            // 旁白时隐藏所有立绘
            if (this.portraitLeft) {
                this.portraitLeft.setAlpha(0);
                this.portraitLeft.setVisible(false);
            }
            if (this.portraitRight) {
                this.portraitRight.setAlpha(0);
                this.portraitRight.setVisible(false);
            }
        } else if (this.portraitLeft && this.portraitRight) {
            // 显示立绘
            if (this.portraitLeft) {
                this.portraitLeft.setVisible(true);
            }
            if (this.portraitRight) {
                this.portraitRight.setVisible(true);
            }
            if (speaker === 'left' || speaker === '艾伦' || speaker === '莉娅') {
                this.portraitLeft.setAlpha(1);
                this.portraitRight.setAlpha(0.5);
            } else if (speaker === 'right') {
                this.portraitLeft.setAlpha(0.5);
                this.portraitRight.setAlpha(1);
            } else {
                this.portraitLeft.setAlpha(1);
                this.portraitRight.setAlpha(1);
            }
        }
    }

    advanceDialogue() {
        if (!this.canAdvance) {
            this.skipTypewriter();
            return;
        }

        this.currentIndex++;
        this.showCurrentDialogue();
    }

    setupInput() {
        this.scene.input.keyboard.on('keydown-ENTER', () => {
            if (this.isActive) {
                this.advanceDialogue();
            }
        });
        
        // 添加鼠标左键点击支持
        this.pointerDownCallback = (pointer) => {
            if (this.isActive && pointer.button === 0) { // 左键
                this.advanceDialogue();
            }
        };
        this.scene.input.on('pointerdown', this.pointerDownCallback);
    }

    removeInputListeners() {
        this.scene.input.keyboard.off('keydown-ENTER');
        if (this.pointerDownCallback) {
            this.scene.input.off('pointerdown', this.pointerDownCallback);
            this.pointerDownCallback = null;
        }
    }

    endDialogue() {
        this.isActive = false;
        this.removeInputListeners();

        if (this.typewriterTimer) {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }

        const cleanup = () => {
            if (this.dialogueBox) {
                this.dialogueBox.destroy();
                this.dialogueBox = null;
            }
            if (this.nameText) {
                this.nameText.destroy();
                this.nameText = null;
            }
            if (this.dialogueText) {
                this.dialogueText.destroy();
                this.dialogueText = null;
            }
            if (this.continuePrompt) {
                this.continuePrompt.destroy();
                this.continuePrompt = null;
            }
            if (this.dialogueTopLine) {
                this.dialogueTopLine.destroy();
                this.dialogueTopLine = null;
            }
            if (this.dialogueGradient) {
                this.dialogueGradient.destroy();
                this.dialogueGradient = null;
            }

            this.restoreMusic();

            if (this.onComplete) {
                this.onComplete();
            }
        };

        let animationsPending = 0;

        const checkComplete = () => {
            animationsPending--;
            if (animationsPending <= 0) {
                cleanup();
            }
        };

        if (this.cgImage) {
            animationsPending++;
            this.scene.tweens.add({
                targets: this.cgImage,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.cgImage.destroy();
                    this.cgImage = null;
                    checkComplete();
                }
            });
        }

        if (this.portraitLeft) {
            animationsPending++;
            this.scene.tweens.add({
                targets: this.portraitLeft,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.portraitLeft.destroy();
                    this.portraitLeft = null;
                    checkComplete();
                }
            });
        }

        if (this.portraitRight) {
            animationsPending++;
            this.scene.tweens.add({
                targets: this.portraitRight,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.portraitRight.destroy();
                    this.portraitRight = null;
                    checkComplete();
                }
            });
        }

        if (animationsPending === 0) {
            cleanup();
        }
    }

    update() {
        // 对话进行中时可以更新一些动画
    }
}

window.DialogueManager = DialogueManager;