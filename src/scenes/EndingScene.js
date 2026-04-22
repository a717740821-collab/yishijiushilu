/**
 * EndingScene - 电影式游戏结局动画场景
 * 
 * 功能说明：
 * 1. 黑幕过渡进入
 * 2. 播放ending2.ogg背景音乐（4分16秒）
 * 3. 图片淡入淡出展示（8张代表性图片）
 * 4. Credits文字缓慢向上滚动
 * 5. 音乐结束后5秒空白，自动返回主菜单
 * 6. 支持点击/按键跳过
 * 
 * 使用方法：
 * this.scene.start('EndingScene', { isFinal: true/false });
 */

class EndingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndingScene' });
        
        // ==================== 可配置参数 ====================
        // 音乐时长：4分16秒 = 256000毫秒
        this.MUSIC_DURATION = 256000;
        // 空白等待时间：5秒 = 5000毫秒
        this.BLANK_DURATION = 5000;
        // 图片显示时间：每张10秒
        this.IMAGE_DISPLAY_TIME = 10000;
        // 图片淡入/淡出时间：1秒
        this.IMAGE_FADE_TIME = 1000;
        // 文字滚动速度（像素/秒）
        this.SCROLL_SPEED = 40;
        // ==================== 配置结束 ====================
    }

    init(data) {
        console.log('🎬 EndingScene 初始化, 接收数据:', data);
        
        // 兼容多种调用方式
        this.isFinal = data.isFinal || false;
        this.dialogue = data.dialogue || null;           // StoryScene传入的对话数据
        this.endingText = data.endingText || null;     // 结局文本
        this.nextScene = data.nextScene || 'MenuScene'; // 下一场景（默认主菜单）
        
        // 状态变量
        this.currentImageIndex = 0;
        this.imageDisplayTimer = null;
        this.scrollY = GAME_HEIGHT + 50;
        this.isSkipping = false;
        this.musicStarted = false;
        this.endingComplete = false;
        this.initFailed = false; // 标记初始化是否失败
        
        // 安全超时机制：如果10秒后仍未完成初始化，强制继续
        this.initTimeout = this.time.delayedCall(10000, () => {
            if (!this.endingComplete && !this.isSkipping) {
                console.warn('⚠️ Ending初始化超时，强制启动');
                this.forceStartEnding();
            }
        });
        
        // ⭐ 立即标记需要创建loading提示（在create中执行）
        this.needsLoadingText = true;
    }

    create() {
        console.log('🎬 EndingScene.create() 开始执行');
        
        // 创建黑色背景遮罩（用于淡入效果）- 立即创建！
        this.blackOverlay = this.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            GAME_WIDTH, 
            GAME_HEIGHT, 
            0x000000, 
            1
        ).setDepth(100);
        
        // ⭐ 立即创建Loading提示文字，防止黑屏！
        if (this.needsLoadingText) {
            this.loadingText = this.add.text(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                '正在加载结局动画...\n\n请稍候',
                {
                    fontSize: '28px',
                    fontFamily: 'Courier New',
                    color: '#FFFFFF',
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(101);
            
            // Loading动画：闪烁效果
            this.tweens.add({
                targets: this.loadingText,
                alpha: { from: 1, to: 0.3 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
            
            console.log('✅ Loading提示已创建');
        }
        
        // 立即开始淡入（不要等2秒！）
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        
        console.log('✅ 黑色背景已创建，开始淡入');
        
        // 缩短延迟到500ms（给fadeOut一点时间完成）
        this.time.delayedCall(500, () => {
            console.log('⏰ 500ms后，开始初始化Ending内容');
            
            // 移除Loading提示
            if (this.loadingText && this.loadingText.active) {
                this.tweens.killTweensOf(this.loadingText);
                this.loadingText.destroy();
                this.loadingText = null;
            }
            
            this.initializeEnding();
        });
        
        // 设置跳过监听器（立即设置！）
        this.setupSkipListener();
        
        console.log('✅ EndingScene.create() 完成');
    }
    
    initializeEnding() {
        if (this.isSkipping) return;
        
        // 取消超时计时器（已正常初始化）
        if (this.initTimeout) {
            this.initTimeout.remove();
            this.initTimeout = null;
        }
        
        console.log('🚀 开始初始化Ending内容...');
        
        // ⭐ 关键修复：隐藏黑色遮罩，让内容可见！
        if (this.blackOverlay && this.blackOverlay.active) {
            this.tweens.add({
                targets: this.blackOverlay,
                alpha: 0,  // 完全透明
                duration: 1500,
                ease: 'Power2'
            });
            console.log('   ⭐ 黑色遮罩开始淡出...');
        }
        
        try {
            // 1. 创建背景（深色渐变）- 必须成功！
            console.log('   步骤1: 创建背景...');
            this.createBackground();
            console.log('      ✅ 背景创建成功');
            
            // 2. 准备图片列表
            console.log('   步骤2: 准备图片列表...');
            this.prepareImageList();
            console.log('      ✅ 图片列表准备完成, 共', this.imageList.length, '张');
            
            // 3. 创建Credits文字容器 - 必须成功！
            console.log('   步骤3: 创建Credits文字...');
            this.createCreditsText();
            console.log('      ✅ Credits文字创建成功');
            
            // 4. 开始播放音乐（带错误处理）
            console.log('   步骤4: 播放音乐...');
            this.playEndingMusic();
            
            // 5. 开始图片展示循环（带错误处理）
            console.log('   步骤5: 开始图片展示...');
            this.startImageShowcase();
            
            // 6. 开始文字滚动
            console.log('   步骤6: 开始Credits滚动...');
            this.startCreditsScroll();
            
            // 7. 设置 Ending 完成计时器
            console.log('   步骤7: 设置完成计时器...');
            this.scheduleEndingCompletion();
            
            console.log('✅ Ending初始化完成 - 所有系统正常运行');
            
        } catch (error) {
            console.error('❌ Ending初始化失败:', error);
            console.error('   错误堆栈:', error.stack);
            this.initFailed = true;
            // 即使失败也尝试显示基本内容
            this.showFallbackEnding();
        }
    }

    /**
     * 强制启动Ending（超时或失败时调用）
     */
    forceStartEnding() {
        console.log('⚡ 强制启动简化版Ending');
        
        // ⭐ 隐藏黑色遮罩！
        if (this.blackOverlay && this.blackOverlay.active) {
            this.blackOverlay.setAlpha(0);
        }
        
        // 显示黑色背景和基础文字
        this.cameras.main.fadeIn(500, 0, 0, 0);
        
        // 简化的Ending文本
        const fallbackText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            'The End\n\n感谢游玩\n\n按 Enter 返回主菜单',
            {
                fontSize: '32px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(10);
        
        // 按Enter返回
        this.input.keyboard.once('keydown-ENTER', () => {
            this.returnToMainMenu();
        });
        
        // 15秒后自动返回
        this.time.delayedCall(15000, () => {
            this.returnToMainMenu();
        });
    }

    /**
     * 备用方案：当部分功能失败时使用
     */
    showFallbackEnding() {
        console.log('🔄 使用备用Ending方案');
        
        // ⭐ 隐藏黑色遮罩！
        if (this.blackOverlay && this.blackOverlay.active) {
            this.blackOverlay.setAlpha(0);
        }
        
        // 至少确保背景和文字显示
        if (!this.backgroundImage && !this.backgroundColor) {
            this.backgroundColor = this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x000000
            ).setDepth(0);
        }
        
        // 尝试播放音乐（如果还没播放的话）
        if (!this.musicStarted) {
            this.playEndingMusic();
        }
        
        // 如果文字还没创建，创建简化版
        if (!this.creditsText) {
            const simpleText = this.add.text(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                '\n\n\n✦ ✦ ✦\n\n   ROGUE ADVENTURE\n\n   The End\n\n✦ ✦ ✦\n\n\nThank You For Playing\n\n按 Enter 返回主菜单',
                {
                    fontSize: '28px',
                    fontFamily: 'Courier New',
                    color: '#DDDDDD',
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(10);
            
            // 简单滚动动画
            this.tweens.add({
                targets: simpleText,
                alpha: { from: 0, to: 1 },
                duration: 2000
            });
            
            // 按Enter返回
            this.input.keyboard.once('keydown-ENTER', () => {
                this.returnToMainMenu();
            });
        }
        
        // 确保完成计时器运行
        if (!this.endingComplete && !this.isSkipping) {
            this.scheduleEndingCompletion();
        }
    }

    /**
     * 创建深色渐变背景
     */
    createBackground() {
        // 使用星空背景作为基础
        const bgKey = 'StarlitSky';
        if (this.textures.exists(bgKey)) {
            this.backgroundImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
            this.backgroundImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
            this.backgroundImage.setAlpha(0.15); // 非常暗的背景
            this.backgroundImage.setDepth(0);
        } else {
            // 备用：纯黑色背景
            this.backgroundColor = this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x0a0a0a
            ).setDepth(0);
        }
        
        // 添加轻微的暗角效果
        this.vignette = this.add.graphics().setDepth(1);
        this.drawVignette();
    }

    drawVignette() {
        const graphics = this.vignette;
        const gradient = graphics.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        
        // 简单的暗角效果（使用矩形模拟）
        graphics.fillStyle(0x000000, 0);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // 四周暗色边框
        graphics.fillStyle(0x000000, 0.6);
        graphics.fillRect(0, 0, GAME_WIDTH, 80);           // 上
        graphics.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80); // 下
        graphics.fillRect(0, 0, 60, GAME_HEIGHT);          // 左
        graphics.fillRect(GAME_WIDTH - 60, 0, 60, GAME_HEIGHT); // 右
    }

    /**
     * 准备展示图片列表
     * 从项目资源中选取8-10张有代表性的图片
     */
    prepareImageList() {
        // 📸 Ending展示图片列表（按剧情顺序排列）
        this.imageList = [
            {
                key: 'hero',
                path: 'assets/images/characters/hero.png',
                name: '主角',
                description: '第一章 - 冒险的开始'
            },
            {
                key: 'miya',
                path: 'assets/images/characters/miya.png',
                name: '米雅',
                description: '第二章 - 相遇与羁绊'
            },
            {
                key: 'siweier',
                path: 'assets/images/characters/siweier.png',
                name: '斯维尔',
                description: '第三章 - 力量的觉醒'
            },
            {
                key: 'shengnv',
                path: 'assets/images/characters/shengnv.png',
                name: '圣女',
                description: '第四章 - 光明的指引'
            },
            {
                key: 'WorldMap',
                path: 'assets/images/items/WorldMap.png',
                name: '世界地图',
                description: '第五章 - 踏上征途'
            },
            {
                key: 'DemonCastle',
                path: 'assets/images/items/DemonCastle.png',
                name: '恶魔城堡',
                description: '第六章 - 最终决战'
            },
            {
                key: 'DarkGod',
                path: 'assets/images/enemies/黑暗之神.png',
                name: '黑暗之神',
                description: '最终章 - 命运的对决'
            },
            {
                key: 'StarlitSky',
                path: 'assets/images/Parallaxes/StarlitSky.png',
                name: '星空',
                description: '尾声 - 和平降临'
            }
        ];
        
        // 当前显示的图片对象
        this.currentImage = null;
        this.imageLabel = null;
    }

    /**
     * 创建Credits文字内容
     */
    createCreditsText() {
        // Credits容器（用于整体滚动）
        this.creditsContainer = this.add.container(0, 0).setDepth(10);
        
        // 构建完整的Credits文本
        let creditsContent = '';
        
        creditsContent += '\n\n\n\n\n'; // 初始留白
        
        // 游戏名称（最大字体）
        creditsContent += '\n\n';
        creditsContent += '✦ ✦ ✦\n\n';
        creditsContent += '   ROGUE ADVENTURE\n\n';
        creditsContent += '   （冒险之旅）\n\n';
        creditsContent += '✦ ✦ ✦\n\n\n\n';
        
        // The End
        creditsContent += '- - - The End - - -\n\n\n';
        
        // 制作人员
        creditsContent += '【制作人员 / Staff】\n\n';
        creditsContent += '   游戏设计 & 开发：开发团队\n\n';
        creditsContent += '   剧情脚本：原创剧本\n\n';
        creditsContent += '   程序实现：Phaser 3 引擎\n\n';
        creditsContent += '   美术素材：RPG Maker MV 资源包\n\n';
        creditsContent += '   音效素材：RPG Maker MV 音效库\n\n\n';
        
        // 音乐鸣谢
        creditsContent += '【音乐鸣谢 / Music Credits】\n\n';
        creditsContent += '   🎵 结尾曲：ending2.ogg\n\n';
        creditsContent += '   作曲：金杰、王志炫\n\n';
        creditsContent += '   时长：4分16秒\n\n\n';
        
        // 作者寄语
        creditsContent += '【作者寄语 / Message】\n\n';
        creditsContent += '   "制作这个游戏也是紧急被迫赶出来的，\n\n';
        creditsContent += '    感谢大家的支持与理解。"\n\n\n';
        
        // 特别感谢
        creditsContent += '【特别感谢 / Special Thanks】\n\n';
        creditsContent += '   • 所有参与测试的玩家\n\n';
        creditsContent += '   • 提供资源和支持的伙伴们\n\n';
        creditsContent += '   • RPG Maker 社区\n\n';
        creditsContent += '   • Phaser 开源社区\n\n\n';
        
        // Thank You
        creditsContent += '═══════════════════\n\n';
        creditsContent += '   Thank You For Playing\n\n';
        creditsContent += '   感谢您的游玩！\n\n';
        creditsContent += '═══════════════════\n\n\n\n\n';
        
        // 创建文本对象
        this.creditsText = this.add.text(
            GAME_WIDTH / 2, 
            0, 
            creditsContent, {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#DDDDDD',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: GAME_WIDTH - 120 }
        }).setOrigin(0.5, 0);
        
        this.creditsContainer.add(this.creditsText);
        
        // 设置初始位置（在屏幕下方）
        this.creditsContainer.setPosition(0, GAME_HEIGHT + 100);
    }

    /**
     * 播放Ending背景音乐
     */
    playEndingMusic() {
        if (this.musicStarted) return;
        this.musicStarted = true;
        
        // 停止所有当前音效和音乐
        try {
            if (window.audioManager && window.audioManager.stopAll) {
                window.audioManager.stopAll();
            }
        } catch (e) {
            console.warn('⚠️ 停止音频失败:', e);
        }
        
        // 播放Ending音乐（用Phaser缓存的键名）
        try {
            if (window.audioManager && window.audioManager.play) {
                window.audioManager.play('ending_bgm', null, true, 0.7);
                console.log('🎵 开始播放 ending_bgm');
            } else {
                console.warn('⚠️ audioManager不可用，跳过音乐播放');
            }
        } catch (error) {
            console.error('❌ 音乐播放失败:', error);
            // 音乐失败不影响Ending继续
            console.log('📢 Ending将继续运行（无背景音乐）');
        }
    }

    /**
     * 开始图片展示循环
     */
    startImageShowcase() {
        if (this.imageList.length === 0) return;
        
        // 显示第一张图片
        this.showNextImage();
    }

    /**
     * 显示下一张图片
     */
    showNextImage() {
        if (this.isSkipping || this.endingComplete) return;
        
        // 移除上一张图片
        if (this.currentImage) {
            this.tweens.add({
                targets: this.currentImage,
                alpha: 0,
                duration: this.IMAGE_FADE_TIME,
                ease: 'Power2',
                onComplete: () => {
                    if (this.currentImage && this.currentImage.active) {
                        this.currentImage.destroy();
                    }
                }
            });
            
            if (this.imageLabel && this.imageLabel.active) {
                this.tweens.add({
                    targets: this.imageLabel,
                    alpha: 0,
                    duration: this.IMAGE_FADE_TIME,
                    onComplete: () => {
                        if (this.imageLabel && this.imageLabel.active) {
                            this.imageLabel.destroy();
                        }
                    }
                });
            }
        }
        
        // 检查是否还有图片
        if (this.currentImageIndex >= this.imageList.length) {
            // 循环回到第一张
            this.currentImageIndex = 0;
        }
        
        const imageData = this.imageList[this.currentImageIndex];
        
        // 检查纹理是否存在
        if (this.textures.exists(imageData.key)) {
            // 纹理已存在，直接显示
            this.displayImage(imageData);
        } else {
            // 纹理不存在，尝试预加载（带超时保护）
            console.log(`⚠️ 图片不存在: ${imageData.path}，尝试加载...`);
            
            // 设置3秒超时
            const loadTimeout = this.time.delayedCall(3000, () => {
                console.warn(`⚠️ 图片加载超时: ${imageData.key}，跳过`);
                // 跳过这张图片，显示下一张
                this.currentImageIndex++;
                this.time.delayedCall(500, () => {
                    this.showNextImage();
                });
            });
            
            try {
                this.load.image(imageData.key, imageData.path);
                
                this.load.once('complete', () => {
                    // 取消超时
                    if (loadTimeout) {
                        loadTimeout.remove();
                    }
                    
                    // 加载成功，显示图片
                    if (this.textures.exists(imageData.key)) {
                        this.displayImage(imageData);
                    } else {
                        console.warn(`⚠️ 图片加载后仍不可用: ${imageData.key}`);
                        // 跳过这张
                        this.currentImageIndex++;
                        this.showNextImage();
                    }
                });
                
                this.load.start();
            } catch (error) {
                console.error('❌ 图片加载失败:', error, imageData);
                // 取消超时
                if (loadTimeout) {
                    loadTimeout.remove();
                }
                // 跳过这张图片
                this.currentImageIndex++;
                this.time.delayedCall(500, () => {
                    this.showNextImage();
                });
            }
            
            // 更新索引（无论成功与否）
            this.currentImageIndex++;
        }
    }

    /**
     * 显示单张图片
     */
    displayImage(imageData) {
        if (this.isSkipping || !this.textures.exists(imageData.key)) return;

        // 创建图片（居中显示）
        this.currentImage = this.add.image(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            imageData.key
        );

        // 设置图片大小（使用cover模式完全填满游戏界面）
        const frame = this.textures.get(imageData.key).getSourceImage();
        // 使用max确保图片至少在一个方向上完全覆盖屏幕
        const scale = Math.max(GAME_WIDTH / frame.width, GAME_HEIGHT / frame.height);
        this.currentImage.setDisplaySize(frame.width * scale, frame.height * scale);
        this.currentImage.setAlpha(0); // 初始透明
        this.currentImage.setDepth(5);

        // 淡入效果
        this.tweens.add({
            targets: this.currentImage,
            alpha: 1,
            duration: this.IMAGE_FADE_TIME,
            ease: 'Power2'
        });

        // 创建图片标签（显示在图片上方）
        this.imageLabel = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 80,
            `${imageData.name} - ${imageData.description}`, {
            fontSize: '22px',
            fontFamily: 'Courier New',
            color: '#FFFFFF',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#00000088',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setAlpha(0).setDepth(6);

        // 标签淡入
        this.tweens.add({
            targets: this.imageLabel,
            alpha: 0.95,
            duration: this.IMAGE_FADE_TIME,
            delay: 300,
            ease: 'Power2'
        });

        // 设置定时切换到下一张图片
        this.imageDisplayTimer = this.time.delayedCall(this.IMAGE_DISPLAY_TIME, () => {
            this.showNextImage();
        });
    }

    /**
     * 开始Credits文字滚动
     */
    startCreditsScroll() {
        // 计算总滚动距离和时间
        const totalHeight = this.creditsText.height + GAME_HEIGHT * 2;
        const scrollDuration = (totalHeight / this.SCROLL_SPEED) * 1000; // 转换为毫秒
        
        // 使用tween进行平滑滚动
        this.creditsTween = this.tweens.add({
            targets: this.creditsContainer,
            y: -totalHeight, // 滚动到完全离开屏幕上方
            duration: Math.max(scrollDuration, this.MUSIC_DURATION), // 至少播放完整音乐时长
            ease: 'Linear', // 匀速滚动
            repeat: 0
        });
    }

    /**
     * 设置Ending完成后的处理
     */
    scheduleEndingCompletion() {
        // 总时长 = 音乐时长 + 空白时长
        const totalTime = this.MUSIC_DURATION + this.BLANK_DURATION;
        
        console.log(`⏱️ Ending将在 ${totalTime}ms 后完成`);
        console.log(`   音乐时长: ${this.MUSIC_DURATION}ms (${this.MUSIC_DURATION/1000}秒)`);
        console.log(`   空白时长: ${this.BLANK_DURATION}ms (${this.BLANK_DURATION/1000}秒)`);
        
        // 音乐结束后开始淡出
        this.time.delayedCall(this.MUSIC_DURATION, () => {
            console.log('🎵 音乐播放完毕，开始淡出...');
            this.fadeOutToBlack();
        });
        
        // 最终返回主菜单
        this.time.delayedCall(totalTime, () => {
            this.returnToMainMenu();
        });
    }

    /**
     * 淡出到黑色
     */
    fadeOutToBlack() {
        if (this.endingComplete || this.isSkipping) return;
        
        // 停止图片切换
        if (this.imageDisplayTimer) {
            this.imageDisplayTimer.remove();
        }
        
        // 淡出所有元素
        if (this.currentImage) {
            this.tweens.add({
                targets: this.currentImage,
                alpha: 0,
                duration: 2000,
                ease: 'Power2'
            });
        }
        
        if (this.imageLabel) {
            this.tweens.add({
                targets: this.imageLabel,
                alpha: 0,
                duration: 2000
            });
        }
        
        if (this.creditsText) {
            this.tweens.add({
                targets: this.creditsText,
                alpha: 0,
                duration: 2000
            });
        }
        
        // 淡入黑色覆盖层
        this.tweens.add({
            targets: this.blackOverlay,
            alpha: 1,
            duration: 2500,
            ease: 'Power2'
        });
    }

    /**
     * 返回主菜单
     */
    returnToMainMenu() {
        if (this.endingComplete) return;
        this.endingComplete = true;
        
        console.log('🏠 返回主菜单...');
        
        // 停止音乐
        window.audioManager.stop('ending_bgm');
        
        // 场景切换
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }

    /**
     * 设置跳过监听器（点击或按键可跳过）
     */
    setupSkipListener() {
        // ✅ 只按Enter键跳过（不使用点击和任意键）
        this.input.keyboard.on('keydown-ENTER', () => {
            console.log('⏭️ 用户按下Enter键，跳过Ending');
            this.skipEnding();
        });
        
        // ESC键直接返回主菜单
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('🏠 用户按下ESC，返回主菜单');
            this.returnToMainMenu();
        });
    }

    /**
     * 跳过Ending动画
     */
    skipEnding() {
        if (this.isSkipping || this.endingComplete) return;
        
        console.log('⏭️ 用户选择跳过Ending');
        this.isSkipping = true;
        
        // 取消所有定时器
        if (this.imageDisplayTimer) {
            this.imageDisplayTimer.remove();
        }
        if (this.creditsTween) {
            this.creditsTween.stop();
        }
        
        // 快速淡出
        this.fadeOutToBlack();
        
        // 1秒后返回主菜单
        this.time.delayedCall(1000, () => {
            this.returnToMainMenu();
        });
    }

    shutdown() {
        console.log('🧹 EndingScene 清理资源');
        
        // 停止音乐
        try {
            if (window.audioManager && window.audioManager.stop) {
                window.audioManager.stop('ending_bgm');
            }
        } catch (e) {
            // 忽略清理错误
        }
        
        // 取消超时计时器
        if (this.initTimeout) {
            this.initTimeout.remove();
            this.initTimeout = null;
        }
        
        // 取消图片切换定时器
        if (this.imageDisplayTimer) {
            this.imageDisplayTimer.remove();
            this.imageDisplayTimer = null;
        }
        
        // 停止tweens
        if (this.creditsTween) {
            this.creditsTween.stop();
        }
        
        // 移除事件监听
        if (this.input) {
            this.input.off('pointerdown');
            if (this.input.keyboard) {
                this.input.keyboard.off('keydown');
                this.input.keyboard.off('keydown-ESC');
            }
        }
    }
}

// 导出场景类
window.EndingScene = EndingScene;