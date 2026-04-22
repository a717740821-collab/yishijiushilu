class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.canSelect = false;
    }

    init(data) {
        this.levelIndex = data.levelIndex || 0;
        this.gameData = data.gameData || {
            currentLevel: 1,
            playerHealth: 200,       // 提高基础血量（原100）
            playerMaxHealth: 200,    // 提高最大血量
            playerCoins: 0,
            difficulty: DIFFICULTY.NORMAL
        };
        this.bossOnly = data.bossOnly || false;
    }

    create() {
        this.cameras.main.fadeIn(300, 0, 0, 0);

        this.levelData = STORY_DATA.levels[this.levelIndex];
        if (!this.levelData) {
            this.scene.start('MenuScene');
            return;
        }

        // 检测是否为最终Boss关卡（第11章）
        // 只检查story.js中的type === 'final_boss'，不检查索引
        this.isFinalBossLevel = (this.levelData.type === 'final_boss');
        
        this.setupAudio();
        this.createBackground();
        this.createPlayer();
        this.createUI();
        this.createGroups();
        
        this.gameState = 'playing';
        this.bossSpawned = false;
        this.enemiesDefeated = 0;
        this.totalEnemies = 0;
        
        // 最终Boss特殊初始化
        if (this.isFinalBossLevel) {
            this.finalBossPhase = 1; // 当前阶段（1-5）
            this.finalBossPhaseTriggered = [false, false, false, false, false]; // 各阶段事件是否已触发
            this.companionSacrificed = { sylvie: false, lia: false, miya: false }; // 同伴牺牲状态
            this.playerBuffs = { holyLight: false, seaEcho: false, forestShield: false }; // 玩家BUFF状态
            this.bossPhaseText = null; // 阶段文字显示
            
            // 直接进入战前过场动画，不生成小怪
            this.startFinalBossCutscene();
        } else if (this.bossOnly && this.levelData.boss) {
            // Boss直达模式：跳过小怪阶段，直接生成Boss
            console.log('⚔️ Boss直达模式：跳过小怪，直接挑战Boss');
            this.spawnItems();
            this.time.delayedCall(1000, () => {
                if (this.gameState === 'playing') {
                    this.spawnBoss();
                }
            });
        } else {
            this.spawnEnemies();
            this.spawnItems();
        }
        
        // 性能优化：限制最大子弹数量和更新频率
        this.maxBullets = 200;
        this.bulletCounter = 0;
        this.updateCounter = 0;
        
        // 音效节流：防止同一音效短时间内重复播放
        this.soundCooldowns = {};
        this.soundThrottleTime = 100; // 同一音效最小间隔100ms
        
        // 性能优化：对象池和渲染设置
        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.physics.world.warpMode = true;
        
        // 性能优化：批处理设置
        this.renderer.useLegacy = false;
        
        this.setupInput();
        this.setupCollisions();
        this.setupCamera();
        
        // 初始化作弊系统（如果已激活）
        this.initCheatSystem();
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
            'button_click': 'button_click',
            'boss_defeat': 'death'
        };
        return audioKeys[key] || null;
    }

    getBossBGMPath() {
        const chapterId = this.levelData.id;
        const bossBGMMap = {
            2: 'boss_bgm_ch2',
            3: 'boss_bgm_ch3',
            4: 'boss_bgm_ch4',
            5: 'boss_bgm_ch5',
            6: 'boss_bgm_ch6',
            7: 'boss_bgm_ch7',
            8: 'boss_bgm_ch8',
            9: 'boss_bgm_ch9',
            10: 'boss_bgm_ch10',
            11: 'boss_bgm_ch11'
        };
        return bossBGMMap[chapterId] || 'boss_bgm';
    }

    setupAudio() {
        const settings = SaveSystem.loadSettings();
        this.musicVolume = (settings && settings.musicVolume !== undefined) ? settings.musicVolume : 0.5;
        this.sfxVolume = (settings && settings.sfxVolume !== undefined) ? settings.sfxVolume : 0.5;

        window.audioManager.stopAll();
        
        const path = this.getAudioPath('game_bgm');
        if (path) {
            window.audioManager.play('game_bgm', path, true, this.musicVolume * 0.6);
        }
    }

    createBackground() {
        const bgKey = this.levelData.backgrounds[0];
        if (this.textures.exists(bgKey)) {
            this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
            this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        } else {
            console.warn(`背景纹理不存在: ${bgKey}，使用备用背景`);
            this.bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a2a3e);
        }

        this.bgTiles = [];
        if (this.levelData.backgrounds.length > 1) {
            this.time.addEvent({
                delay: 5000,
                callback: this.updateBackground,
                callbackScope: this,
                loop: true
            });
        }
    }

    updateBackground() {
        if (this.gameState !== 'playing') return;

        const index = Phaser.Math.Between(0, this.levelData.backgrounds.length - 1);
        const newBgKey = this.levelData.backgrounds[index];

        this.tweens.add({
            targets: this.bg,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (this.textures.exists(newBgKey)) {
                    this.bg.setTexture(newBgKey);
                    this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT); // 确保新背景也填满窗口
                }
                this.tweens.add({
                    targets: this.bg,
                    alpha: 1,
                    duration: 500,
                    ease: 'Power2'
                });
            }
        });
    }

    createPlayer() {
        const playerKey = 'player_custom'; // 使用自定义key避免冲突
        
        // 始终创建自定义玩家纹理（确保使用我们的方向性立绘）
        if (this.textures.exists(playerKey)) {
            this.textures.remove(playerKey); // 移除旧纹理
        }
        this.createPlayerTexture(playerKey);
        
        this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, playerKey);
        this.player.setAlpha(0.95);

        // 创建中心判定点（保留原有判定系统）
        this.player.hitbox = this.add.circle(this.player.x, this.player.y, 4, 0xFFFFFF, 1);
        this.player.hitbox.setDepth(10);

        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0);
        this.player.setDisplaySize(44, 44); // 稍小一点，更精致
        this.player.body.setSize(8, 8, true);

        // 追踪最后移动方向（用于子弹发射方向）
        this.player.lastMoveDirection = 0; // 默认向右（弧度）
        this.player.isMoving = false;

        this.player.health = this.gameData.playerHealth;
        this.player.maxHealth = this.gameData.playerMaxHealth;
        this.player.coins = this.gameData.playerCoins;
        this.player.speed = STORY_DATA.player.speed;
        this.player.attackDamage = STORY_DATA.player.attackDamage;
        this.player.attackRange = STORY_DATA.player.attackRange;
        this.player.attackCooldown = STORY_DATA.player.attackCooldown;
        this.player.lastAttack = 0;
        this.player.isAttacking = false;
        this.player.isInvincible = true;
        this.player.shield = 0;
        this.player.activeEffects = {};

        this.player.level = this.gameData.playerLevel || 1;
        this.player.experience = this.gameData.playerExperience || 0;
        this.player.expToNextLevel = this.calculateExpToNextLevel(this.player.level);

        // 加载保存的卡片增益效果
        // 先设置默认值
        this.player.bulletCount = this.calculateBulletCount(this.player.level);
        this.player.bulletSpread = this.calculateBulletSpread(this.player.level);
        
        // 然后用存档数据覆盖（如果有）
        if (this.gameData.attackDamage) {
            this.player.attackDamage = this.gameData.attackDamage;
        }
        if (this.gameData.speed) {
            this.player.speed = this.gameData.speed;
        }
        if (this.gameData.bulletCount) {
            this.player.bulletCount = this.gameData.bulletCount;
        }
        if (this.gameData.bulletSpread) {
            this.player.bulletSpread = this.gameData.bulletSpread;
        }
        if (this.gameData.orbitBullets > 0 && this.gameData.hasOrbit) {
            this.player.orbitBullets = this.gameData.orbitBullets;
            this.player.hasOrbit = true;
            // 延迟创建环绕子弹（需要等物理引擎初始化完成）
            this.time.delayedCall(100, () => {
                this.createOrbitBullets();
            });
        }
        if (this.gameData.coinMagnet > 1) {
            this.player.coinMagnet = this.gameData.coinMagnet;
        }
        if (this.gameData.pickupRange > 50) {
            this.player.pickupRange = this.gameData.pickupRange;
        }
        if (this.gameData.regenRate > 0 && this.gameData.hasRegen) {
            this.player.regenRate = this.gameData.regenRate;
            this.player.hasRegen = true;
            this.startRegen();
        }
        if (this.gameData.critChance > 0) {
            this.player.critChance = this.gameData.critChance;
        }
        if (this.gameData.critDamage > 1.5) {
            this.player.critDamage = this.gameData.critDamage;
        }
        if (this.gameData.maxEnergy > 100) {
            this.player.maxEnergy = this.gameData.maxEnergy;
        } else {
            this.player.maxEnergy = 100; // 默认值
        }
        if (this.gameData.expBoost > 1) {
            this.player.expBoost = this.gameData.expBoost;
        }

        this.player.energy = this.gameData.playerEnergy || 0;
        this.player.ultCooldown = 0;

        this.tweens.add({
            targets: this.player,
            alpha: 0.5,
            duration: 200,
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                this.player.setAlpha(1);
                this.player.isInvincible = false;
            }
        });
    }

    createGroups() {
        this.enemies = this.physics.add.group();
        this.items = this.physics.add.group();
        this.attacks = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
    }

    // ==================== 最终Boss战前过场动画（第11章专用）====================
    startFinalBossCutscene() {
        console.log('🎬 开始最终Boss战前过场动画...');
        
        this.gameState = 'cutscene'; // 切换到过场动画状态
        this.player.setVelocity(0, 0);
        
        // 创建黑色遮罩
        this.cutsceneOverlay = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1);
        this.cutsceneOverlay.setDepth(300);
        
        // 屏幕震动效果
        this.cameras.main.shake(2000, 0.02);
        
        // 淡入显示
        this.tweens.add({
            targets: this.cutsceneOverlay,
            alpha: { from: 1, to: 0 },
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.showFinalBossIntroDialogue();
            }
        });
    }

    showFinalBossIntroDialogue() {
        if (!this.levelData.introDialogue) {
            this.spawnFinalBossDirectly();
            return;
        }

        this.dialogueManager = new DialogueManager(this);
        this.dialogueManager.startDialogue(this.levelData.introDialogue, () => {
            this.onFinalBossIntroComplete();
        });
    }

    onFinalBossIntroComplete() {
        // 显示Stage提示
        const stageText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 50, '⚔ Stage 11 - Final Boss ⚔', {
            fontSize: '36px',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            color: '#FF0044',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(301);

        const bossNameText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 10, 'Void God · Azathoth', {
            fontSize: '28px',
            fontFamily: 'Courier New',
            color: '#FF44FF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(301);

        const infoText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 50, `剩余残机: ${this.player.health/50 | 0}   BOMB: 3`, {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(301);

        // 显示3秒后消失并开始战斗
        this.tweens.add({
            targets: [stageText, bossNameText, infoText],
            alpha: 0,
            duration: 500,
            delay: 3000,
            onComplete: () => {
                stageText.destroy();
                bossNameText.destroy();
                infoText.destroy();
                this.spawnFinalBossDirectly();
            }
        });
    }

    spawnFinalBossDirectly() {
        console.log('⚔️ 生成最终Boss：Void God · Azathoth');
        
        // 停止游戏BGM，准备播放Boss BGM
        window.audioManager.stop('game_bgm');
        
        // 直接生成Boss（跳过小怪阶段）
        this.bossSpawned = true;
        this.totalEnemies = 1; // 只有Boss
        
        const bossType = this.levelData.boss;
        if (!bossType) {
            console.error('❌ 最终章缺少Boss数据！');
            return;
        }

        const bossData = STORY_DATA.enemyTypes[bossType.type];
        if (!bossData) {
            console.error(`❌ Boss类型不存在: ${bossType.type}`);
            return;
        }

        // 创建Boss纹理
        const spriteKey = bossData.sprite;
        if (!this.textures.exists(spriteKey)) {
            this.createFallbackTexture(spriteKey, 0xFF0044, 'boss'); // 紫红色Boss
        }

        // 生成Boss实体（位置在屏幕上方中央）
        this.boss = this.enemies.create(GAME_WIDTH / 2, 120, spriteKey);
        this.boss.setCollideWorldBounds(true);
        this.boss.setDisplaySize(180, 180); // 超大尺寸
        this.boss.setBounce(0);
        this.boss.setAlpha(0);
        
        // Boss属性设置（最终Boss特殊数值）
        const difficulty = typeof this.gameData.difficulty === 'string' ? DIFFICULTY[this.gameData.difficulty] || DIFFICULTY.NORMAL : this.gameData.difficulty;
        
        this.boss.enemyType = bossType.type;
        this.boss.isBoss = true;
        this.boss.isFinalBoss = true; // 标记为最终Boss
        this.boss.name = bossType.name;
        this.boss.lastAttack = 0;
        this.boss.canShoot = true;
        this.boss.attackPhase = 0;
        this.boss.currentPhase = 1; // 当前阶段（1-5）
        
        // 最终Boss超高性能属性
        this.boss.maxHealth = Math.floor(bossData.health * 8); // 8倍血量！
        this.boss.health = this.boss.maxHealth;
        this.boss.speed = bossData.speed * 0.6; // 移动较慢但弹幕密集
        this.boss.damage = Math.floor(bossData.damage * 0.35); // 降低单发伤害
        this.boss.attackCooldown = 400; // 极快攻击频率

        console.log(`💀 最终Boss [${this.boss.name}] 属性:`);
        console.log(`   ❤️ HP: ${this.boss.health}`);
        console.log(`   ⚔️ ATK: ${this.boss.damage}`);
        console.log(`   📊 阶段数: 5`);

        // 进入Boss对话状态
        this.gameState = 'dialogue';
        this.player.setVelocity(0, 0);
        this.stopCombatSoundsOnly();

        // 如果有Boss对话则显示
        if (this.levelData.bossDialogue) {
            this.dialogueManager = new DialogueManager(this);
            this.dialogueManager.startDialogue(this.levelData.bossDialogue, () => {
                this.onFinalBossDialogueComplete();
            });
        } else {
            this.onFinalBossDialogueComplete();
        }
    }

    onFinalBossDialogueComplete() {
        // 播放Boss BGM
        window.audioManager.stopAll();
        
        this.time.delayedCall(150, () => {
            const bossKey = this.getBossBGMPath();
            console.log('🎵 第', this.levelData.id, '章最终Boss战音乐键名:', bossKey);
            if (bossKey) {
                console.log('🎵 开始播放最终Boss音乐:', bossKey);
                window.audioManager.play(bossKey, null, true, this.musicVolume * 0.7);
            } else {
                console.log('🎵 使用默认最终Boss音乐: boss_bgm');
                window.audioManager.play('boss_bgm', null, true, this.musicVolume * 0.7);
            }
        });

        // Boss现身动画
        if (this.boss) {
            this.boss.setAlpha(1);
            
            // 创建固定位置的Boss血条
            const bossHealthBarWidth = 450; // 更宽
            const bossHealthBarHeight = 24; // 更高
            const bossHealthBarX = GAME_WIDTH / 2;
            const bossHealthBarY = GAME_HEIGHT - 110;
            
            // 血条背景
            this.boss.healthBarBg = this.add.rectangle(bossHealthBarX, bossHealthBarY, bossHealthBarWidth + 6, bossHealthBarHeight + 6, 0x000000);
            this.boss.healthBarBg.setOrigin(0.5, 0.5);
            this.boss.healthBarBg.setDepth(160);
            this.boss.healthBarBg.setScrollFactor(0);
            
            // 血条前景（渐变色）
            this.boss.healthBar = this.add.rectangle(bossHealthBarX - bossHealthBarWidth/2, bossHealthBarY, bossHealthBarWidth, bossHealthBarHeight, 0xFF0044);
            this.boss.healthBar.setOrigin(0, 0.5);
            this.boss.healthBar.setDepth(161);
            this.boss.healthBar.setScrollFactor(0);
            
            // Boss名称（带特效）
            this.boss.nameText = this.add.text(bossHealthBarX, bossHealthBarY - 28, `☠ ${this.boss.name} ☠`, {
                fontSize: '26px',
                fontFamily: 'Courier New',
                fontWeight: 'bold',
                color: '#FF0044',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            this.boss.nameText.setDepth(162);
            this.boss.nameText.setScrollFactor(0);
            
            // 血量数字
            this.boss.hpText = this.add.text(bossHealthBarX, bossHealthBarY + 2, `${Math.floor(this.boss.health)}/${this.boss.maxHealth}`, {
                fontSize: '16px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            this.boss.hpText.setDepth(162);
            this.boss.hpText.setScrollFactor(0);
            
            // 阶段指示器
            this.bossPhaseIndicator = this.add.text(bossHealthBarX, bossHealthBarY + 28, `Phase 1/5 - 触手风暴`, {
                fontSize: '16px',
                fontFamily: 'Courier New',
                color: '#FFAA00',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            this.bossPhaseIndicator.setDepth(162);
            this.bossPhaseIndicator.setScrollFactor(0);
        }

        // 强烈震屏效果
        this.cameras.main.shake(800, 0.03);
        
        this.dialogueManager = null;
        this.gameState = 'playing';
    }

    countTotalEnemies() {
        let total = 0;
        this.levelData.enemies.forEach(enemy => {
            total += Phaser.Math.Between(enemy.minCount, enemy.maxCount);
        });
        return total;
    }

    spawnEnemies() {
        let actualEnemyCount = 0;

        // 动态难度系统：基于关卡等级的指数级增长
        // 前期（1-3关）：温和增长，让新手适应
        // 中期（4-7关）：快速提升，挑战玩家
        // 后期（8-10关）：极限挑战，高强度战斗
        const level = this.levelIndex;
        let levelMultiplier;

        if (level <= 2) {
            levelMultiplier = 1.2 + (level * 0.1);
        } else if (level <= 5) {
            levelMultiplier = 1.4 + ((level - 2) * 0.2);
        } else if (level <= 8) {
            levelMultiplier = 1.8 + ((level - 5) * 0.25);
        } else {
            levelMultiplier = 2.3 + ((level - 8) * 0.3);
        }

        // 确保至少有合理的敌人数量
        levelMultiplier = Math.max(levelMultiplier, 1.5);

        this.enemiesSpawned = 0;
        this.totalEnemiesToSpawn = 0;

        // 设置每关最大敌人数量限制（防止后期过于臃肿）
        const maxEnemiesPerLevel = [
            25,   // 关卡1
            35,   // 关卡2
            50,   // 关卡3
            65,   // 关卡4
            80,   // 关卡5
            95,   // 关卡6
            110,  // 关卡7
            125,  // 关卡8
            140,  // 关卡9
            150   // 关卡10+
        ];
        const maxLimit = maxEnemiesPerLevel[Math.min(level, maxEnemiesPerLevel.length - 1)];

        this.levelData.enemies.forEach(enemyConfig => {
            // 安全检查：确保敌人类型存在
            if (!STORY_DATA.enemyTypes[enemyConfig.type]) {
                console.warn(`❌ 敌人类型未定义: ${enemyConfig.type}，跳过生成`);
                return;
            }
            
            const baseMultiplier = levelMultiplier;
            const extraBonus = 1 + (level * 0.02);

            let minCount = Math.floor(enemyConfig.minCount * baseMultiplier * extraBonus);
            let maxCount = Math.floor(enemyConfig.maxCount * baseMultiplier * extraBonus);

            // 应用上限限制
            minCount = Math.min(minCount, maxLimit);
            maxCount = Math.min(maxCount, maxLimit);

            const count = Phaser.Math.Between(minCount, maxCount);
            
            // 累计检查是否超过上限
            if (actualEnemyCount + count > maxLimit) {
                actualEnemyCount = maxLimit; // 达到上限
                return; // 跳过后续类型
            }
            
            actualEnemyCount += count;
            this.totalEnemiesToSpawn += count;

            for (let i = 0; i < count; i++) {
                const spawnDelay = count > 30 ? 80 : (count > 15 ? 120 : 150);

                this.time.delayedCall(i * spawnDelay, () => {
                    if (this.gameState === 'playing') {
                        const enemy = this.spawnEnemy(enemyConfig.type);
                        if (enemy) {
                            this.enemiesSpawned++;
                            // 动态更新UI显示实际进度
                            this.updateUI();
                        }
                    }
                });
            }
        });

        // 如果敌人数量太少（<10），补充一波普通敌人
        if (actualEnemyCount < 10) {
            const supplementCount = Math.min(15 - actualEnemyCount, maxLimit - actualEnemyCount);
            for (let i = 0; i < supplementCount; i++) {
                this.time.delayedCall(2000 + i * 100, () => {
                    if (this.gameState === 'playing' && !this.bossSpawned) {
                        const firstEnemyType = this.levelData.enemies[0]?.type;
                        if (firstEnemyType) {
                            const enemy = this.spawnEnemy(firstEnemyType);
                            if (enemy) {
                                this.enemiesSpawned++;
                                this.updateUI();
                            }
                        }
                    }
                });
            }
            this.totalEnemiesToSpawn += supplementCount;
            actualEnemyCount += supplementCount;
        }

        // 使用实际计划数量作为totalEnemies（但会在生成过程中动态调整）
        this.totalEnemies = this.totalEnemiesToSpawn;
        this.enemiesDefeated = 0;
        this.bossSpawned = false;
        this.bossPending = this.levelData.boss ? true : false;
        this.updateUI();

        console.log(`📊 关卡 ${this.levelIndex + 1} 敌人配置: 计划=${this.totalEnemiesToSpawn}, 上限=${maxLimit}, 倍率=${levelMultiplier.toFixed(2)}x`);

        // 如果有关卡有boss但没有小怪，直接生成boss
        if (this.levelData.boss && actualEnemyCount === 0) {
            this.time.delayedCall(1000, () => {
                if (this.gameState === 'playing') {
                    this.spawnBoss();
                }
            });
        }

        // 安全检查：如果长时间没有触发Boss，强制检查一次
        this.time.delayedCall(Math.max(10000, 20000 - level * 1000), () => {
            if (this.gameState === 'playing' && !this.bossSpawned && this.levelData.boss) {
                console.log('⏰ 安全检查：强制检查是否应该生成Boss');
                console.log(`   已击败: ${this.enemiesDefeated}/${this.totalEnemies}, 已生成: ${this.enemiesSpawned}`);

                const aliveEnemies = this.enemies.getChildren().filter(e => e.active && !e.isDead).length;
                if (aliveEnemies === 0) {
                    console.log('✅ 场上无存活敌人，立即生成Boss');
                    this.spawnBoss();
                } else {
                    console.log(`⚠️ 仍有 ${aliveEnemies} 个敌人存活，等待清理`);
                }
            }
        });
    }

    createFallbackTexture(key, color, shape, styleVariant = 0) {
        if (this.textures.exists(key)) return;

        const graphics = this.add.graphics();

        try {
            if (shape === 'enemy') {
                const size = 36;
                const cx = size / 2;
                const cy = size / 2;
                
                graphics.fillStyle(color, 1);

                if (styleVariant === 0) {
                    graphics.fillCircle(cx, cy + 2, 15);
                    graphics.fillStyle(0xFFFFFF, 0.25);
                    graphics.fillCircle(cx, cy - 4, 9);
                    graphics.fillStyle(0xFF0000, 1);
                    graphics.fillCircle(cx - 6, cy - 2, 4);
                    graphics.fillCircle(cx + 6, cy - 2, 4);
                    graphics.fillStyle(0x000000, 1);
                    graphics.fillCircle(cx - 5, cy - 1, 2);
                    graphics.fillCircle(cx + 7, cy - 1, 2);
                    graphics.lineStyle(2, 0x8B0000, 1);
                    graphics.beginPath();
                    graphics.moveTo(cx - 5, cy + 8);
                    graphics.lineTo(cx, cy + 12);
                    graphics.lineTo(cx + 5, cy + 8);
                    graphics.strokePath();
                    
                } 
                else if (styleVariant === 1) {
                    graphics.fillCircle(cx, cy + 2, 15);
                    graphics.fillStyle(0xFFFFFF, 1);
                    graphics.fillCircle(cx - 7, cy - 1, 7);
                    graphics.fillCircle(cx + 7, cy - 1, 7);
                    graphics.fillStyle(0x000000, 1);
                    graphics.fillCircle(cx - 6, cy, 4);
                    graphics.fillCircle(cx + 8, cy, 4);
                    graphics.fillStyle(0xFFFFFF, 0.9);
                    graphics.fillCircle(cx - 7, cy - 3, 2);
                    graphics.fillCircle(cx + 7, cy - 3, 2);
                    graphics.lineStyle(2, 0x8B0000, 1);
                    graphics.strokeCircle(cx, cy + 10, 3);
                }
                else if (styleVariant === 2) {
                    graphics.beginPath();
                    graphics.moveTo(cx, cy - 10);
                    graphics.lineTo(cx + 16, cy + 5);
                    graphics.lineTo(cx + 10, cy + 17);
                    graphics.lineTo(cx - 10, cy + 17);
                    graphics.lineTo(cx - 16, cy + 5);
                    graphics.closePath();
                    graphics.fillPath();
                    
                    const darkenedColor = (color & 0xFEFEFE) >> 1;
                    graphics.fillStyle(darkenedColor, 1);
                    graphics.fillTriangle(cx - 10, cy - 8, cx - 14, cy - 18, cx - 5, cy - 10);
                    graphics.fillTriangle(cx + 10, cy - 8, cx + 14, cy - 18, cx + 5, cy - 10);
                    
                    graphics.fillStyle(0xFFFF00, 1);
                    graphics.fillCircle(cx - 7, cy - 2, 4);
                    graphics.fillCircle(cx + 7, cy - 2, 4);
                    graphics.fillStyle(0x8B0000, 1);
                    graphics.fillRect(cx - 8, cy - 4, 2, 6);
                    graphics.fillRect(cx + 6, cy - 4, 2, 6);
                    graphics.lineStyle(2, 0xFFFFFF, 0.8);
                    graphics.beginPath();
                    graphics.moveTo(cx - 8, cy + 10);
                    for(let i = 0; i <= 5; i++) {
                        graphics.lineTo(cx - 8 + i * 3.2, cy + 10 + (i % 2 === 0 ? 0 : 4));
                    }
                    graphics.strokePath();
                }

                graphics.generateTexture(key, size, size);

            } else if (shape === 'boss') {
            const size = 80;
            graphics.fillStyle(color, 1);

            graphics.fillCircle(size/2, size/2 + 6, 34);

            graphics.fillStyle(0x8B0000, 1);
            graphics.fillTriangle(size/2 - 20, size/2 - 10, size/2 - 28, size/2 - 28, size/2 - 12, size/2 - 15);
            graphics.fillTriangle(size/2 + 20, size/2 - 10, size/2 + 28, size/2 - 28, size/2 + 12, size/2 - 15);

            graphics.fillStyle(0xFFFF00, 1);
            graphics.fillCircle(size/2 - 12, size/2, 8);
            graphics.fillCircle(size/2 + 12, size/2, 8);

            graphics.fillStyle(0x000000, 1);
            graphics.fillRect(size/2 - 13, size/2 - 6, 2, 12);
            graphics.fillRect(size/2 + 11, size/2 - 6, 2, 12);

            graphics.lineStyle(3, 0x8B0000, 1);
            graphics.beginPath();
            graphics.moveTo(size/2 - 18, size/2 + 18);
            for(let i = 0; i <= 6; i++) {
                graphics.lineTo(size/2 - 18 + i * 6, size/2 + 18 + (i % 2 === 0 ? 0 : 6));
            }
            graphics.strokePath();

            graphics.lineStyle(2, 0x400000, 0.6);
            graphics.beginPath();
            graphics.moveTo(size/2, size/2 + 25);
            graphics.lineTo(size/2 - 20, size/2 + 35);
            graphics.moveTo(size/2, size/2 + 25);
            graphics.lineTo(size/2 + 20, size/2 + 35);
            graphics.strokePath();

            graphics.generateTexture(key, size, size);
        } else if (shape === 'circle') {
            graphics.fillStyle(color, 1);
            graphics.fillCircle(16, 16, 14);
            graphics.generateTexture(key, 32, 32);
        } else if (shape === 'rect') {
            graphics.fillRect(0, 0, 32, 32);
            graphics.generateTexture(key, 32, 32);
        } else if (shape === 'triangle') {
            graphics.fillTriangle(16, 4, 4, 28, 28, 28);
            graphics.generateTexture(key, 32, 32);
        }

        graphics.destroy();
        } catch (error) {
            console.error(`创建纹理失败 [${key}]:`, error);
            if (graphics) graphics.destroy();
        }
    }

    createPlayerTexture(playerKey) {
        try {
            // 使用更兼容的方式创建 Graphics 对象
            const graphics = this.add.graphics();
            const size = 44;

            const cx = size / 2;
            const cy = size / 2;

            // ===== 方向性飞船/机甲立绘（默认朝上）=====
            
            // 外层光晕（能量场效果）
            graphics.fillStyle(0x4169E1, 0.15);
            graphics.fillCircle(cx, cy, 20);
            
            // 主体：流线型三角形/箭头形状
            graphics.fillStyle(0x4169E1, 1);

            // 机身（三角形 - 尖端朝上）
            graphics.beginPath();
            graphics.moveTo(cx, 3);
            graphics.lineTo(cx + 16, cy + 10);
            graphics.lineTo(cx + 8, cy + 8);
            graphics.lineTo(cx + 6, cy + 18);
            graphics.lineTo(cx, cy + 15);
            graphics.lineTo(cx - 6, cy + 18);
            graphics.lineTo(cx - 8, cy + 8);
            graphics.lineTo(cx - 16, cy + 10);
            graphics.closePath();
            graphics.fillPath();

            // 机身高光（左侧亮面）
            graphics.fillStyle(0x6495ED, 0.5);
            graphics.beginPath();
            graphics.moveTo(cx, 4);
            graphics.lineTo(cx - 14, cy + 9);
            graphics.lineTo(cx - 7, cy + 9);
            graphics.lineTo(cx - 5, cy + 17);
            graphics.lineTo(cx, cy + 14);
            graphics.closePath();
            graphics.fillPath();

            // 驾驶舱（椭圆形玻璃）
            graphics.fillStyle(0x87CEEB, 0.95);
            graphics.fillCircle(cx, cy - 1, 6);
            
            graphics.fillStyle(0xFFFFFF, 0.4);
            graphics.fillCircle(cx - 2, cy - 4, 3);

            graphics.fillStyle(0x00BFFF, 0.9);
            graphics.fillCircle(cx, cy + 18, 3);
            
            // 引擎火焰
            graphics.fillStyle(0x00FFFF, 0.8);
            graphics.fillTriangle(cx - 5, cy + 19, cx + 5, cy + 19, cx, cy + 27);
            
            // 火焰核心
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillTriangle(cx - 2, cy + 20, cx + 2, cy + 20, cx, cy + 25);

            // 机翼装饰线条
            graphics.lineStyle(1.5, 0x1E90FF, 0.8);
            graphics.beginPath();
            graphics.moveTo(cx + 10, cy + 6);
            graphics.lineTo(cx + 17, cy + 9);
            graphics.moveTo(cx - 10, cy + 6);
            graphics.lineTo(cx - 17, cy + 9);
            graphics.strokePath();

            // 武器指示器（前方红色瞄准点）
            graphics.fillStyle(0xFF4444, 1);
            graphics.fillCircle(cx, 7, 2.5);
            
            // 瞄准点高光
            graphics.fillStyle(0xFFFFFF, 0.8);
            graphics.fillCircle(cx, 6, 1);

            // 生成纹理（使用更安全的API）
            if (graphics.generateTexture) {
                graphics.generateTexture(playerKey, size, size + 12);
            } else {
                // 备用方案：直接从 graphics 创建纹理
                const textureKey = playerKey;
                if (this.textures && this.textures.createTexture) {
                    this.textures.createTexture(textureKey, size, size + 12);
                    const texture = this.textures.get(textureKey);
                    if (texture && texture.draw) {
                        texture.draw(0, 0, graphics);
                    }
                }
            }
            
            graphics.destroy();
        } catch (error) {
            console.error('创建玩家纹理失败，使用备用方案:', error);
            
            // 备用方案：创建简单的三角形玩家
            const fallbackGraphics = this.add.graphics();
            const size = 32;
            const cx = size / 2;
            const cy = size / 2;
            
            fallbackGraphics.fillStyle(0x4169E1, 1);
            fallbackGraphics.fillTriangle(cx, 2, cx - 14, cy + 14, cx + 14, cy + 14);
            fallbackGraphics.fillStyle(0x87CEEB, 0.9);
            fallbackGraphics.fillCircle(cx, cy, 6);
            fallbackGraphics.fillStyle(0xFF4444, 1);
            fallbackGraphics.fillCircle(cx, 6, 2);
            
            if (fallbackGraphics.generateTexture) {
                fallbackGraphics.generateTexture(playerKey, size, size);
            }
            fallbackGraphics.destroy();
        }
    }

    createBulletTexture(bulletKey) {
        try {
            const graphics = this.add.graphics(); // 使用更兼容的创建方式
            const size = 24;

            // 能量球/火焰弹外观
            const centerX = size / 2;
            const centerY = size / 2;

            // 外层光晕（橙色渐变效果）
            graphics.fillStyle(0xFF6600, 0.4);
            graphics.fillCircle(centerX, centerY, 11);

            // 中层（亮橙色）
            graphics.fillStyle(0xFFAA00, 0.9);
            graphics.fillCircle(centerX, centerY, 8);

            // 内核（黄色高光）
            graphics.fillStyle(0xFFEE44, 1);
            graphics.fillCircle(centerX, centerY, 5);

            // 核心亮点（白色）
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.fillCircle(centerX - 2, centerY - 2, 2);

            // 添加能量纹路
            graphics.lineStyle(1.5, 0xFFFFFF, 0.6);
            graphics.beginPath();
            graphics.arc(centerX, centerY, 6, 0, Math.PI * 1.5);
            graphics.strokePath();

            // 尾部拖尾效果（小三角）
            graphics.fillStyle(0xFF6600, 0.7);
            graphics.fillTriangle(centerX - 2, centerY + 8, centerX + 2, centerY + 8, centerX, centerY + 14);

            if (graphics.generateTexture) {
                graphics.generateTexture(bulletKey, size, size + 14);
            }
            graphics.destroy();
        } catch (error) {
            console.error('创建子弹纹理失败:', error);
        }
    }

    spawnEnemy(type) {
        const enemyType = STORY_DATA.enemyTypes[type];
        if (!enemyType) {
            console.warn(`敌人类型不存在: ${type}`);
            return null;
        }

        const spriteKey = enemyType.sprite;
        
        // 多彩怪物系统：每只敌人独立随机颜色
        const enemyColors = [
            0x00AA00,  // 绿色（自然）
            0xFF4444,  // 红色（火焰）
            0x4444FF,  // 蓝色（冰霜）
            0xFFAA00,  // 橙色（岩石）
            0xAA44FF,  // 紫色（暗影）
            0xFFFF44,  // 黄色（雷电）
            0xFF44AA,  // 粉色（毒素）
            0x44FFFF   // 青色（风元素）
        ];
        
        // 每只敌人使用独立的随机颜色（基于全局计数器+随机偏移），确保同一关内颜色多样
        const uniqueId = (this.enemiesSpawned || 0) * 17 + Math.floor(Math.random() * 8);
        const colorIndex = uniqueId % enemyColors.length;
        const enemyColor = enemyColors[colorIndex];
        
        // 样式变体：随机选择不同的外观细节
        const styleVariant = Math.floor(Math.random() * 3); // 0=标准, 1=大眼, 2=尖角
        
        if (!this.textures.exists(spriteKey)) {
            console.warn(`敌人纹理不存在: ${spriteKey}，创建多彩怪物外观`);
            this.createFallbackTexture(spriteKey, enemyColor, 'enemy', styleVariant);
        } else if (!this.textures.exists(`${spriteKey}_${colorIndex}`)) {
            // 为每种颜色创建独立的纹理变体
            this.createFallbackTexture(`${spriteKey}_${colorIndex}`, enemyColor, 'enemy', styleVariant);
        }

        const pos = this.getRandomSpawnPosition();
        // 使用带颜色后缀的纹理key，确保每只敌人颜色不同
        const actualSpriteKey = this.textures.exists(`${spriteKey}_${colorIndex}`) ? `${spriteKey}_${colorIndex}` : spriteKey;
        const enemy = this.enemies.create(pos.x, pos.y, actualSpriteKey);
        if (!enemy) {
            console.warn(`无法创建敌人: ${type}`);
            return null;
        }
        enemy.setCollideWorldBounds(true);
        enemy.setDisplaySize(36, 36);
        enemy.setBounce(0);
        enemy.setAlpha(1);

        const difficulty = typeof this.gameData.difficulty === 'string' ? DIFFICULTY[this.gameData.difficulty] || DIFFICULTY.NORMAL : this.gameData.difficulty;

        // 基于关卡等级的额外难度加成
        const levelDifficultyBonus = 1 + (this.levelIndex * 0.1);

        enemy.enemyType = type;
        enemy.health = enemyType.health * difficulty.enemyHealth * levelDifficultyBonus;
        enemy.maxHealth = enemy.health;
        enemy.speed = enemyType.speed * difficulty.enemySpeed * (1 + this.levelIndex * 0.05);
        enemy.damage = enemyType.damage * (1 + this.levelIndex * 0.08);
        enemy.dropCoins = enemyType.dropCoins;
        enemy.isBoss = false;
        enemy.lastAttack = 0;
        
        // 根据关卡等级动态调整攻击冷却（后期敌人攻击更频繁）
        const baseCooldown = Math.max(800, 2000 - (this.levelIndex * 100));
        enemy.attackCooldown = baseCooldown + Phaser.Math.Between(-200, 200);
        
        // 射击能力系统：部分小怪可以射击
        // 基础概率10%，每关增加3%，射击型敌人必定有
        const shootChance = 0.1 + (this.levelIndex * 0.03);
        enemy.canShoot = enemyType.canShoot || (Math.random() < shootChance);
        
        // 如果能射击，调整属性（射击型敌人稍弱但更危险）
        if (enemy.canShoot && !enemyType.canShoot) {
            enemy.health *= 0.8;  // 血量减少20%
            enemy.speed *= 0.85;  // 速度降低15%
            enemy.attackCooldown = Math.max(1200, enemy.attackCooldown); // 攻击间隔更长
        }
        
        enemy.canDash = enemyType.canDash || false;
        enemy.dashCooldown = Math.max(1500, (enemyType.dashCooldown || 3000) - (this.levelIndex * 100));
        enemy.lastDash = 0;
        enemy.isDead = false;

        // 增加行为多样性：随机分配移动模式
        const behaviorPatterns = ['chase', 'orbit', 'zigzag', 'rush', 'retreat'];
        enemy.behaviorPattern = behaviorPatterns[Phaser.Math.Between(0, behaviorPatterns.length - 1)];
        
        // 特殊属性：部分敌人具有特殊能力
        enemy.hasSpecialAbility = Math.random() < (0.1 + this.levelIndex * 0.03);
        enemy.specialAbilityType = Phaser.Math.Between(0, 2);
        enemy.abilityCooldown = 5000;
        enemy.lastAbilityUse = 0;
        
        // 护盾系统（特殊敌人）
        enemy.shield = enemy.hasSpecialAbility && enemy.specialAbilityType === 2 ? 
                       Math.floor(enemy.health * 0.3) : 0;
        enemy.maxShield = enemy.shield;
        
        // 存储颜色信息用于特效
        enemy.color = enemyColor;

        // 小怪不显示血条
        enemy.healthBar = null;
        enemy.healthBarBg = null;
    }

    spawnBoss() {
        console.log(`👹 生成Boss: level=${this.levelIndex}, type=${JSON.stringify(this.levelData.boss)}`);
        this.bossSpawned = true;

        window.audioManager.stop('game_bgm');

        const bossType = this.levelData.boss;
        if (!bossType) {
            console.warn('❌ Boss类型未定义');
            return;
        }

        const bossData = STORY_DATA.enemyTypes[bossType.type];
        if (!bossData) {
            console.warn(`❌ Boss数据未找到: ${bossType.type}`);
            return;
        }
        console.log(`✅ Boss数据加载成功: ${bossType.type}, sprite=${bossData.sprite}`);

        const bossBgKey = this.levelData.bossBackground;
        if (this.textures.exists(bossBgKey)) {
            this.bg.setTexture(bossBgKey);
        }

        const spriteKey = bossData.sprite;
        if (!this.textures.exists(spriteKey)) {
            console.warn(`Boss纹理不存在: ${spriteKey}，创建Boss怪物外观`);
            this.createFallbackTexture(spriteKey, 0xFF0000, 'boss');
        }

        this.boss = this.enemies.create(GAME_WIDTH / 2, 150, spriteKey);
        if (!this.boss) {
            console.error('❌ Boss创建失败: enemies.create返回null');
            return;
        }
        this.boss.setCollideWorldBounds(true);
        this.boss.setDisplaySize(100, 100); // Boss体型稍大
        this.boss.setBounce(0);
        this.boss.setAlpha(0);
        console.log(`✅ Boss对象创建成功: ${spriteKey}, id=${this.boss.name || '未命名'}`);

        const difficulty = typeof this.gameData.difficulty === 'string' ? DIFFICULTY[this.gameData.difficulty] || DIFFICULTY.NORMAL : this.gameData.difficulty;
        
        // 动态Boss难度系统：基于关卡等级的指数级增强
        const level = this.levelIndex;
        
        let healthMultiplier;
        let damageMultiplier;

        if (level <= 7) {
            // 前7关：提高血量，伤害温和
            healthMultiplier = 6 + (level * 2.8); // 每关+280%
            damageMultiplier = 0.5 + (level * 0.08); // 基础50%，每关+8%
        } else if (level === 10) {
            // 第10关：特别降低伤害
            healthMultiplier = 5 + (level * 2.5); // 保持原有血量
            damageMultiplier = 0.4 + (level * 0.08); // 基础40%，每关+8%
        } else {
            // 8-9关：标准
            healthMultiplier = 5 + (level * 2.5);
            damageMultiplier = 0.6 + (level * 0.1); // 比之前更低
        }
        
        // 速度：略微提升（保持可玩性）
        const speedMultiplier = 1 + (level * 0.08);

        this.boss.enemyType = bossType.type;
        this.boss.health = Math.floor(bossData.health * difficulty.enemyHealth * healthMultiplier);
        this.boss.maxHealth = this.boss.health;
        this.boss.speed = bossData.speed * difficulty.enemySpeed * speedMultiplier;
        this.boss.damage = Math.floor(bossData.damage * damageMultiplier);
        this.boss.dropCoins = [bossData.dropCoins * (1 + level * 0.5), bossData.dropCoins * (1 + level * 0.5)];
        this.boss.isBoss = true;
        this.boss.name = bossType.name;
        this.boss.lastAttack = 0;
        
        // 攻击速度：后期Boss攻击更频繁（但保持最低限制）
        const baseCooldown = Math.max(600, 1500 - (level * 80));
        this.boss.attackCooldown = baseCooldown;
        this.boss.canShoot = true;
        this.boss.attackPhase = 0;

        console.log(`👹 Boss [${this.boss.name}] 属性:`);
        console.log(`   ❤️ HP: ${this.boss.health} (${healthMultiplier.toFixed(1)}x)`);
        console.log(`   ⚔️ ATK: ${this.boss.damage} (${damageMultiplier.toFixed(2)}x)`);
        console.log(`   💨 SPD: ${this.boss.speed.toFixed(1)} (${speedMultiplier.toFixed(2)}x)`);
        console.log(`   ⏱️ CD: ${this.boss.attackCooldown}ms`);

        // 进入对话状态时立即停止玩家移动和战斗音效
        this.player.setVelocity(0, 0);
        this.gameState = 'dialogue';
        
        // 停止所有战斗音效，防止音效重叠
        this.stopCombatSounds();

        if (this.levelData.bossDialogue) {
            console.log(`💬 启动Boss对话: 类型=${this.levelData.bossDialogue?.cg ? '有CG' : '无CG'}`);
            this.dialogueManager = new DialogueManager(this);
            this.dialogueManager.startDialogue(this.levelData.bossDialogue, () => {
                console.log('✅ Boss对话完成');
                this.onBossDialogueComplete();
            });
        } else {
            console.log('⚠️ 无Boss对话，直接开始Boss战');
            this.onBossDialogueComplete();
        }
        console.log('✅ spawnBoss函数完成');
    }

    onBossDialogueComplete() {
        // 确保停止游戏背景音乐
        window.audioManager.stopAll();
        
        // 短暂延迟后播放Boss音乐，确保音频系统准备好
        this.time.delayedCall(150, () => {
            const bossKey = this.getBossBGMPath();
            console.log('🎵 第', this.levelData.id, '章Boss战音乐键名:', bossKey);
            if (bossKey) {
                console.log('🎵 开始播放Boss音乐:', bossKey);
                window.audioManager.play(bossKey, null, true, this.musicVolume * 0.7);
            } else {
                console.log('🎵 使用默认Boss音乐: boss_bgm');
                window.audioManager.play('boss_bgm', null, true, this.musicVolume * 0.7);
            }
        });

        const boss = this.boss;
        if (boss) {
            boss.setAlpha(1);

            // Boss血条参数 - 固定在界面下方
            const bossHealthBarWidth = 400; // 加宽
            const bossHealthBarHeight = 20; // 加高
            const bossHealthBarX = GAME_WIDTH / 2;
            const bossHealthBarY = GAME_HEIGHT - 120; // 固定在下方
            
            // 血条背景（黑色底框）
            boss.healthBarBg = this.add.rectangle(bossHealthBarX, bossHealthBarY, bossHealthBarWidth + 4, bossHealthBarHeight + 4, 0x000000);
            boss.healthBarBg.setOrigin(0.5, 0.5);
            boss.healthBarBg.setDepth(150); // 确保在最上层
            boss.healthBarBg.setScrollFactor(0); // 不跟随相机
            
            // 血条（红色前景）
            boss.healthBar = this.add.rectangle(bossHealthBarX - bossHealthBarWidth/2, bossHealthBarY, bossHealthBarWidth, bossHealthBarHeight, 0xFF2222);
            boss.healthBar.setOrigin(0, 0.5); // 左对齐，方便缩放
            boss.healthBar.setDepth(151);
            boss.healthBar.setScrollFactor(0);

            // Boss名称文字
            boss.nameText = this.add.text(bossHealthBarX, bossHealthBarY - 25, `⚔ ${boss.name} ⚔`, {
                fontSize: '22px',
                fontFamily: 'Courier New',
                fontWeight: 'bold',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            boss.nameText.setDepth(152);
            boss.nameText.setScrollFactor(0);

            // Boss血量数字显示
            boss.hpText = this.add.text(bossHealthBarX, bossHealthBarY + 2, `${Math.floor(boss.health)}/${boss.maxHealth}`, {
                fontSize: '14px',
                fontFamily: 'Courier New',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            boss.hpText.setDepth(152);
            boss.hpText.setScrollFactor(0);
        }

        this.cameras.main.shake(500, 0.01);
        this.dialogueManager = null;
        this.gameState = 'playing';
    }

    getRandomSpawnPosition() {
        const side = Phaser.Math.Between(0, 3);
        let x, y;

        switch (side) {
            case 0: x = Phaser.Math.Between(50, GAME_WIDTH - 50); y = 50; break;
            case 1: x = GAME_WIDTH - 50; y = Phaser.Math.Between(50, GAME_HEIGHT - 50); break;
            case 2: x = Phaser.Math.Between(50, GAME_WIDTH - 50); y = GAME_HEIGHT - 50; break;
            case 3: x = 50; y = Phaser.Math.Between(50, GAME_HEIGHT - 50); break;
        }

        const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (distToPlayer < 150) {
            return this.getRandomSpawnPosition();
        }

        return { x, y };
    }

    spawnItems() {
        this.levelData.items.forEach(itemConfig => {
            const itemType = STORY_DATA.itemTypes[itemConfig.type];
            if (!itemType) return;

            const weight = itemConfig.weight;
            if (Math.random() * 100 > weight) return;

            const count = itemType.effect === 'coin' ? Phaser.Math.Between(3, 8) : 1;

            for (let i = 0; i < count; i++) {
                this.time.delayedCall(2000 + Math.random() * 10000, () => {
                    if (this.gameState !== 'playing') return;
                    this.spawnItem(itemConfig.type);
                });
            }
        });

        // 定时生成随机道具（缩短间隔，增加频率）
        this.itemSpawnTimer = this.time.addEvent({
            delay: 4000, // 从8秒改为4秒，更频繁生成
            callback: this.spawnRandomItem,
            callbackScope: this,
            loop: true
        });
        
        // 额外的经验道具生成器（专门用于补充经验）
        this.expItemSpawnTimer = this.time.addEvent({
            delay: 6000, // 每6秒生成一个经验道具
            callback: this.spawnExpItem,
            callbackScope: this,
            loop: true
        });
    }

    spawnRandomItem() {
        if (this.gameState !== 'playing') return;
        if (this.items.getChildren().length >= 15) return; // 增加上限到15个

        const rand = Math.random();
        let itemType;
        let itemTypeKey;

        // 调整概率：经验30%，回血35%，金币35%
        if (rand < 0.30) {
            itemTypeKey = 'experience'; // 这个不直接用STORY_DATA
            itemType = { effect: 'experience', sprite: 'item_exp', name: '经验宝石', value: 15 };
        } else if (rand < 0.65) {
            itemTypeKey = 'health_potion';
            itemType = STORY_DATA.itemTypes['health_potion'];
        } else {
            itemTypeKey = 'coin';
            itemType = STORY_DATA.itemTypes['coin'];
        }

        const spriteKey = itemType.sprite;
        if (!this.textures.exists(spriteKey)) {
            let color;
            if (itemType.effect === 'health') color = 0x00FF00;
            else if (itemType.effect === 'experience') color = 0xAA00FF; // 紫色经验道具
            else color = 0x00AAFF; // 金币蓝色
            
            this.createFallbackTexture(spriteKey, color, 'circle');
        }

        const pos = this.getRandomSpawnPosition();
        const item = this.items.create(pos.x, pos.y, spriteKey);
        item.itemType = itemTypeKey; // 使用正确的键
        item.value = itemType.value;
        item.setDisplaySize(22, 22); // 稍微大一点，更容易看到
        item.setAlpha(0.9);

        // 不同类型使用不同的动画效果
        if (itemType.effect === 'experience') {
            // 经验道具：旋转发光效果
            this.tweens.add({
                targets: item,
                alpha: { from: 0.6, to: 1 },
                scale: { from: 1, to: 1.2 },
                duration: 800,
                yoyo: true,
                repeat: -1
            });
            
            // 添加持续旋转
            this.tweens.add({
                targets: item,
                angle: 360,
                duration: 3000,
                repeat: -1
            });
        } else if (itemType.effect === 'health') {
            // 回血道具：脉冲呼吸效果
            this.tweens.add({
                targets: item,
                alpha: { from: 0.5, to: 1 },
                scale: { from: 0.9, to: 1.15 },
                duration: 600,
                yoyo: true,
                repeat: -1
            });
        } else {
            // 金币：上下浮动
            this.tweens.add({
                targets: item,
                y: item.y - 10,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    spawnExpItem() {
        // 专门生成经验道具的方法（高优先级）
        if (this.gameState !== 'playing') return;
        if (this.items.getChildren().length >= 18) return;

        const expValue = Phaser.Math.Between(10, 25); // 随机经验值
        const spriteKey = 'item_exp';
        
        if (!this.textures.exists(spriteKey)) {
            this.createFallbackTexture(spriteKey, 0xAA00FF, 'star'); // 星形经验道具
        }

        // 在玩家附近随机位置生成（更容易拾取）
        const angle = Math.random() * Math.PI * 2;
        const distance = Phaser.Math.Between(100, 250);
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        
        // 确保在屏幕范围内
        const clampedX = Phaser.Math.Clamp(x, 50, GAME_WIDTH - 50);
        const clampedY = Phaser.Math.Clamp(y, 50, GAME_HEIGHT - 50);
        
        const item = this.items.create(clampedX, clampedY, spriteKey);
        item.itemType = 'experience';
        item.value = expValue;
        item.setDisplaySize(24, 24); // 稍大一点
        item.setAlpha(1);

        // 华丽的经验道具特效
        this.tweens.add({
            targets: item,
            alpha: { from: 0.7, to: 1 },
            scale: { from: 0.8, to: 1.3 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        // 快速旋转
        this.tweens.add({
            targets: item,
            angle: 360,
            duration: 2000,
            repeat: -1
        });
    }

    spawnEnemyDropItem(x, y) {
        // 敌人死亡掉落道具生成方法
        if (this.items.getChildren().length >= 20) return; // 上限20个

        const rand = Math.random();
        let itemType;
        let itemTypeKey;

        // 掉落概率：经验50%，回血30%，金币20%
        if (rand < 0.5) {
            itemTypeKey = 'experience';
            itemType = { effect: 'experience', sprite: 'item_exp', name: '经验宝石', value: Phaser.Math.Between(8, 15) };
        } else if (rand < 0.8) {
            itemTypeKey = 'health_potion';
            itemType = STORY_DATA.itemTypes['health_potion'];
            itemType.value = Phaser.Math.Between(10, 20); // 覆盖值使掉落随机
        } else {
            itemTypeKey = 'coin';
            itemType = STORY_DATA.itemTypes['coin'];
            itemType.value = Phaser.Math.Between(3, 8);
        }

        const spriteKey = itemType.sprite;
        if (!this.textures.exists(spriteKey)) {
            let color;
            if (itemType.effect === 'health') color = 0x00FF00;
            else if (itemType.effect === 'experience') color = 0xAA00FF;
            else color = 0x00AAFF;
            
            this.createFallbackTexture(spriteKey, color, 'circle');
        }

        // 在敌人死亡位置附近随机偏移
        const offsetX = Phaser.Math.Between(-30, 30);
        const offsetY = Phaser.Math.Between(-30, 30);
        
        const item = this.items.create(x + offsetX, y + offsetY, spriteKey);
        item.itemType = itemTypeKey; // 使用正确的键
        item.value = itemType.value;
        item.setDisplaySize(18, 18); // 稍微小一点
        item.setAlpha(1);

        // 掉落动画：先弹起再落下
        item.y -= 40; // 初始位置在上方
        
        this.tweens.add({
            targets: item,
            y: y + offsetY, // 落到目标位置
            duration: 400,
            ease: 'Bounce.easeOut'
        });

        // 根据类型添加不同效果
        if (itemType.effect === 'experience') {
            this.tweens.add({
                targets: item,
                alpha: { from: 0.6, to: 1 },
                scale: { from: 0.8, to: 1.2 },
                duration: 600,
                yoyo: true,
                repeat: -1
            });
            
            this.tweens.add({
                targets: item,
                angle: 360,
                duration: 2500,
                repeat: -1
            });
        } else if (itemType.effect === 'health') {
            this.tweens.add({
                targets: item,
                alpha: { from: 0.4, to: 1 },
                scale: { from: 0.9, to: 1.1 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    spawnItem(type) {
        const itemType = STORY_DATA.itemTypes[type];
        if (!itemType) return;

        const spriteKey = itemType.sprite;
        if (!this.textures.exists(spriteKey)) {
            console.warn(`物品纹理不存在: ${spriteKey}，创建备用纹理`);
            this.createFallbackTexture(spriteKey, 0xFFD700, 'circle');
        }

        const pos = this.getRandomSpawnPosition();
        const item = this.items.create(pos.x, pos.y, spriteKey);
        item.setDisplaySize(28, 28);
        item.itemType = type;
        item.effect = itemType.effect;
        item.value = itemType.value;
        item.name = itemType.name;

        this.tweens.add({
            targets: item,
            y: item.y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createUI() {
        this.healthBarBg = this.add.rectangle(150, 30, 204, 24, 0x333333);
        this.healthBarBg.setOrigin(0, 0.5);
        this.healthBarBg.setStrokeStyle(2, 0x666666);

        this.healthBar = this.add.rectangle(152, 30, 200, 20, 0x00AA00);
        this.healthBar.setOrigin(0, 0.5);

        this.healthText = this.add.text(250, 30, `${Math.max(0, this.player.health)}/${this.player.maxHealth}`, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0, 0.5);

        if (this.textures.exists('item_coin')) {
            this.coinIcon = this.add.image(1000, 30, 'item_coin').setDisplaySize(24, 24);
        }
        this.coinText = this.add.text(1020, 30, `${this.player.coins}`, {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        }).setOrigin(0, 0.5);

        const levelText = `第 ${this.levelData.id} 关 - ${this.levelData.name}`;
        this.add.text(GAME_WIDTH / 2, 30, levelText, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#AAAAAA'
        }).setOrigin(0.5, 0.5);

        this.enemiesText = this.add.text(GAME_WIDTH / 2, 60, `敌人: ${this.enemiesDefeated}/${this.totalEnemies}`, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#888888'
        }).setOrigin(0.5, 0.5);

        if (this.bossSpawned) {
            this.bossText = this.add.text(GAME_WIDTH / 2, 90, 'BOSS来袭!', {
                fontSize: '24px',
                fontFamily: 'Courier New',
                color: '#FF4444',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5, 0.5);

            this.tweens.add({
                targets: this.bossText,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        }

        this.controlsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'WASD/方向键: 移动   空格: 射击   Q: 大招   ESC: 暂停', {
            fontSize: '14px',
            fontFamily: 'Courier New',
            color: '#888888'
        }).setOrigin(0.5);

        this.expBarBg = this.add.rectangle(200, 60, 150, 10, 0x333333);
        this.expBar = this.add.rectangle(200, 60, 150, 10, 0x00AAFF);
        this.expBar.setOrigin(0, 0.5);
        this.expBar.setDisplaySize(150, 10);
        this.levelText = this.add.text(60, 60, `Lv.${this.player.level}`, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: '#FFD700'
        }).setOrigin(0, 0.5);

        // 能量条
        this.energyBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 300, 20, 0x333333);
        this.energyBarBg.setStrokeStyle(2, 0x666666);
        this.energyBar = this.add.rectangle(GAME_WIDTH / 2 - 145, GAME_HEIGHT - 40, 290, 16, 0xFF00FF);
        this.energyBar.setOrigin(0, 0.5);
        this.energyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'ULT', {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // 大招按钮
        this.ultButton = this.add.rectangle(GAME_WIDTH - 100, GAME_HEIGHT - 40, 60, 60, 0x333333);
        this.ultButton.setStrokeStyle(2, 0x666666);
        this.ultButton.setInteractive();
        this.ultButtonText = this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 40, 'ULT', {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.ultButton.on('pointerdown', () => {
            this.useUltimate();
        });
    }

    calculateExpToNextLevel(level) {
        return Math.floor(50 * Math.pow(1.5, level - 1));
    }

    calculateBulletCount(level) {
        if (level < 2) return 1;
        if (level < 3) return 2;
        if (level < 4) return 3;
        if (level < 5) return 4;
        if (level < 7) return 5;
        if (level < 10) return 6;
        return 8;
    }

    calculateBulletSpread(level) {
        const baseSpread = 15;
        const maxSpread = 60;
        const spread = baseSpread + (level - 1) * 3;
        return Math.min(spread, maxSpread);
    }

    addExperience(amount) {
        this.player.experience += amount;
        this.playSound('coin');

        while (this.player.experience >= this.player.expToNextLevel) {
            this.player.experience -= this.player.expToNextLevel;
            this.levelUp();
        }

        this.updateExpUI();
    }

    levelUp() {
        this.player.level++;
        this.player.expToNextLevel = this.calculateExpToNextLevel(this.player.level);
        this.player.bulletCount = this.calculateBulletCount(this.player.level);
        this.player.bulletSpread = this.calculateBulletSpread(this.player.level);
        this.player.maxHealth += 10;
        this.player.health = Math.min(this.player.health + 20, this.player.maxHealth);
        this.player.attackDamage += 5;

        this.playSound('level_up');
        
        // 检查是否达到5的倍数，触发卡片选择
        if (this.player.level % 5 === 0) {
            this.showCardSelection();
        } else {
            this.showLevelUpEffect();
        }
        
        this.updateUI();
    }

    showCardSelection() {
        // 暂停游戏（但保留背景音乐）
        const previousState = this.gameState;
        this.gameState = 'cardSelection';
        this.player.setVelocity(0, 0);
        
        // 创建半透明背景遮罩
        this.cardOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(200);
        
        // 标题文字
        this.cardTitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.15, `🎴 选择你的增益 - Lv.${this.player.level} 🎴`, {
            fontSize: '36px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(201);
        
        // 随机生成3张不同的增益卡片
        const cards = this.generateRandomCards(3);
        this.currentCards = cards;
        
        // 显示卡片
        const cardWidth = 220;
        const cardHeight = 320;
        const startX = (GAME_WIDTH - (cardWidth * 3 + 60)) / 2 + cardWidth / 2;
        const cardY = GAME_HEIGHT * 0.5;
        
        this.cardContainers = [];
        
        for (let i = 0; i < 3; i++) {
            const x = startX + i * (cardWidth + 30);
            const cardContainer = this.createCard(x, cardY, cardWidth, cardHeight, cards[i], i);
            this.cardContainers.push(cardContainer);
        }
        
        // 提示文字
        this.cardHintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.85, '点击卡片选择增益', {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(201);
    }

    generateRandomCards(count) {
        const allCards = [
            {
                id: 'attack_up',
                name: '⚔️ 攻击强化',
                description: '攻击力 +20%',
                effect: () => { this.player.attackDamage *= 1.2; },
                color: 0xFF4444,
                icon: '⚔️'
            },
            {
                id: 'speed_up',
                name: '💨 速度提升',
                description: '移动速度 +25%',
                effect: () => { this.player.speed *= 1.25; },
                color: 0x44FF44,
                icon: '💨'
            },
            {
                id: 'health_up',
                name: '❤️ 生命增强',
                description: '最大生命值 +50\n当前生命值完全恢复',
                effect: () => { 
                    this.player.maxHealth += 50; 
                    this.player.health = this.player.maxHealth; 
                },
                color: 0xFF44AA,
                icon: '❤️'
            },
            {
                id: 'bullet_count',
                name: '🔫 弹幕增强',
                description: '子弹数量 +2',
                effect: () => { this.player.bulletCount += 2; },
                color: 0xFFAA00,
                icon: '🔫'
            },
            {
                id: 'bullet_orbit',
                name: '🌀 环绕弹幕',
                description: '获得2颗环绕子弹\n自动攻击周围敌人',
                effect: () => { 
                    if (!this.player.orbitBullets) this.player.orbitBullets = 0;
                    this.player.orbitBullets += 2;
                    if (!this.player.hasOrbit) {
                        this.player.hasOrbit = true;
                        this.createOrbitBullets();
                    } else {
                        this.updateOrbitBullets();
                    }
                },
                color: 0xAA44FF,
                icon: '🌀'
            },
            {
                id: 'coin_magnet',
                name: '💰 金币磁铁',
                description: '拾取范围增加100%\n金币获取量 +50%',
                effect: () => { 
                    this.player.coinMagnet = (this.player.coinMagnet || 1) * 1.5; 
                    this.player.pickupRange = (this.player.pickupRange || 50) * 2;
                },
                color: 0xFFFF00,
                icon: '💰'
            },
            {
                id: 'regen',
                name: '💚 再生能力',
                description: '每秒恢复3点生命值',
                effect: () => { 
                    this.player.regenRate = (this.player.regenRate || 0) + 3;
                    if (!this.player.hasRegen) {
                        this.player.hasRegen = true;
                        this.startRegen();
                    }
                },
                color: 0x00FF88,
                icon: '💚'
            },
            {
                id: 'crit_chance',
                name: '💥 暴击提升',
                description: '暴击率 +15%\n暴击伤害 +50%',
                effect: () => { 
                    this.player.critChance = (this.player.critChance || 0) + 0.15;
                    this.player.critDamage = (this.player.critDamage || 1.5) + 0.5;
                },
                color: 0xFF8800,
                icon: '💥'
            },
            {
                id: 'energy_boost',
                name: '⚡ 能量充盈',
                description: '能量上限 +50\n大招冷却时间 -25%',
                effect: () => { 
                    this.player.maxEnergy += 50;
                    this.player.energy = Math.min(this.player.energy + 30, this.player.maxEnergy);
                },
                color: 0x00FFFF,
                icon: '⚡'
            },
            {
                id: 'exp_boost',
                name: '📚 经验加成',
                description: '经验值获取 +40%',
                effect: () => { this.player.expBoost = (this.player.expBoost || 1) + 0.4; },
                color: 0x88FFFF,
                icon: '📚'
            }
        ];
        
        // 随机选择count张不重复的卡片
        const shuffled = allCards.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    createCard(x, y, width, height, cardData, index) {
        const container = this.add.container(x, y).setDepth(201);

        // 卡片背景（增加内边距，使点击区域更大）
        const bg = this.add.rectangle(0, 0, width, height, cardData.color, 0.9);
        bg.setStrokeStyle(3, 0xFFFFFF);

        // 卡片图标（大号）
        const icon = this.add.text(0, -height * 0.3, cardData.icon, {
            fontSize: '64px'
        }).setOrigin(0.5);

        // 卡片名称
        const name = this.add.text(0, height * 0.05, cardData.name, {
            fontSize: '22px',
            fontFamily: 'Courier New',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        // 卡片描述
        const desc = this.add.text(0, height * 0.28, cardData.description, {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#EEEEEE',
            align: 'center',
            wordWrap: { width: width - 20 },
            lineSpacing: 6
        }).setOrigin(0.5);

        container.add([bg, icon, name, desc]);

        // 让整个容器可交互，扩大点击范围（增加20px边距）
        container.setSize(width + 20, height + 20);
        container.setInteractive(new Phaser.Geom.Rectangle(-(width + 20) / 2, -(height + 20) / 2, width + 20, height + 20), Phaser.Geom.Rectangle.Contains);

        // 悬停效果
        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 150,
                ease: 'Power2'
            });
        });

        container.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Power2'
            });
        });

        // 点击效果
        container.on('pointerdown', () => {
            this.selectCard(index, cardData);
        });

        return container;
    }

    selectCard(index, cardData) {
        // 应用卡片效果
        cardData.effect();
        
        // 显示选中效果
        const selectedContainer = this.cardContainers[index];
        selectedContainer.list[0].setFillStyle(0xFFFFFF); // 高亮背景
        
        // 延迟关闭卡片界面
        this.time.delayedCall(500, () => {
            this.closeCardSelection();
        });
    }

    closeCardSelection() {
        // 清理所有卡片元素
        if (this.cardOverlay) this.cardOverlay.destroy();
        if (this.cardTitle) this.cardTitle.destroy();
        if (this.cardHintText) this.cardHintText.destroy();
        
        if (this.cardContainers) {
            this.cardContainers.forEach(container => {
                container.destroy();
            });
        }
        
        // 重置冻结标志，让敌人恢复正常移动
        this.isCardFreezeApplied = false;
        
        // 恢复所有敌人的物理体
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active && !enemy.isDead && enemy.body) {
                    enemy.body.enable = true;
                }
            });
        }
        
        // 恢复游戏状态
        this.gameState = 'playing';
        this.updateUI();
    }

    createOrbitBullets() {
        if (!this.player.orbitBulletsGroup) {
            this.player.orbitBulletsGroup = this.physics.add.group();
            
            // 添加碰撞检测
            this.physics.add.overlap(
                this.player.orbitBulletsGroup, 
                this.enemies, 
                this.onOrbitEnemyCollision, 
                null, 
                this
            );
        }
        
        this.updateOrbitBullets();
    }

    updateOrbitBullets() {
        if (!this.player.orbitBulletsGroup) return;
        
        // 清除旧的环绕子弹
        this.player.orbitBulletsGroup.clear(true, true);
        
        const bulletKey = 'item_attack';
        if (!this.textures.exists(bulletKey)) {
            this.createBulletTexture(bulletKey);
        }

        const orbitRadius = 80;
        const bulletCount = this.player.orbitBullets || 2;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            const bullet = this.player.orbitBulletsGroup.create(
                this.player.x + Math.cos(angle) * orbitRadius,
                this.player.y + Math.sin(angle) * orbitRadius,
                bulletKey
            );
            bullet.setDisplaySize(16, 16);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.9);
            bullet.setOrigin(0.5);
            bullet.angleOffset = angle;
            bullet.damage = this.player.attackDamage * 0.6;
        }
    }

    onOrbitEnemyCollision(bullet, enemy) {
        if (enemy.isDead) return;
        
        enemy.health -= bullet.damage;
        this.playSound('enemy_hit');
        
        this.tweens.add({
            targets: enemy,
            tint: 0xFFFFFF,
            duration: 50,
            yoyo: true
        });
        
        if (enemy.health <= 0) {
            this.killEnemy(enemy);
        }
    }

    startRegen() {
        if (this.regenTimer) return;
        
        this.regenTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (this.gameState === 'playing' && this.player && this.player.active) {
                    const regenAmount = this.player.regenRate || 0;
                    if (regenAmount > 0 && this.player.health < this.player.maxHealth) {
                        this.player.health = Math.min(this.player.health + regenAmount, this.player.maxHealth);
                        this.updateUI();
                        
                        // 显示再生特效
                        if (Math.random() < 0.3) {
                            const healParticle = this.add.circle(
                                this.player.x + Phaser.Math.Between(-15, 15),
                                this.player.y + Phaser.Math.Between(-15, 15),
                                4,
                                0x00FF88,
                                0.7
                            ).setDepth(10);
                            
                            this.tweens.add({
                                targets: healParticle,
                                alpha: 0,
                                y: healParticle.y - 30,
                                scale: 0.5,
                                duration: 800,
                                onComplete: () => healParticle.destroy()
                            });
                        }
                    }
                }
            },
            loop: true
        });
    }

    updateOrbitBulletsPosition() {
        if (!this.player.orbitBulletsGroup || !this.player.hasOrbit) return;

        const orbitRadius = 80;
        const rotationSpeed = 0.008; // 降低旋转速度（原0.02，现在0.008）
        const time = this.time.now * rotationSpeed;
        
        this.player.orbitBulletsGroup.getChildren().forEach((bullet, index) => {
            const baseAngle = (Math.PI * 2 / this.player.orbitBullets) * index;
            const angle = baseAngle + time;
            
            bullet.setPosition(
                this.player.x + Math.cos(angle) * orbitRadius,
                this.player.y + Math.sin(angle) * orbitRadius
            );
        });
    }

    showLevelUpEffect() {
        const levelUpText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `等级提升! Lv.${this.player.level}`, {
            fontSize: '32px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: levelUpText,
            alpha: 0,
            y: GAME_HEIGHT / 2 - 100,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                levelUpText.destroy();
            }
        });
    }

    killEnemy(enemy) {
        if (!enemy || enemy.isDead) return;
        
        enemy.isDead = true;
        enemy.setVelocity(0, 0);
        
        // 如果是 Boss
        if (enemy.isBoss) {
            console.log(`💀 Boss ${enemy.name} 被击败！`);
            
            // 销毁 Boss 相关 UI
            if (enemy.healthBarBg) enemy.healthBarBg.destroy();
            if (enemy.healthBar) enemy.healthBar.destroy();
            if (enemy.hpText) enemy.hpText.destroy();
            if (enemy.nameText) enemy.nameText.destroy();
            if (this.bossPhaseIndicator) this.bossPhaseIndicator.destroy();
            
            // 清理所有敌人子弹
            if (this.enemyBullets) {
                this.enemyBullets.getChildren().forEach(b => {
                    if (b && b.active) b.destroy();
                });
            }
            
            // 最终Boss处理：走正常胜利流程
            if (enemy.isFinalBoss) {
                console.log('🎬 最终Boss被击败(killEnemy2)！进入第12章终幕剧情...');
                enemy.destroy();
                this.time.delayedCall(500, () => {
                    this.triggerVictory();
                });
                return;
            }
            
            // 普通Boss处理 - 显示胜利界面
            this.time.delayedCall(300, () => {
                this.triggerVictory();
            });
            
            // Boss 爆炸特效
            for (let i = 0; i < 20; i++) {
                const particle = this.add.circle(
                    enemy.x + Phaser.Math.Between(-30, 30),
                    enemy.y + Phaser.Math.Between(-30, 30),
                    Phaser.Math.Between(5, 15),
                    Phaser.Math.Between(0xFF0000, 0xFFAA00),
                    0.9
                ).setDepth(200);
                
                const angle = Math.random() * Math.PI * 2;
                const speed = Phaser.Math.Between(100, 250);
                
                this.tweens.add({
                    targets: particle,
                    x: particle.x + Math.cos(angle) * speed,
                    y: particle.y + Math.sin(angle) * speed,
                    alpha: 0,
                    scale: 0.3,
                    duration: 800,
                    onComplete: () => particle.destroy()
                });
            }
            
            enemy.destroy();
            return;
        }
        
        // 普通敌人处理
        this.enemiesDefeated++;
        this.updateUI();
        
        // 爆炸粒子特效
        for (let i = 0; i < 8; i++) {
            const particle = this.add.circle(
                enemy.x + Phaser.Math.Between(-15, 15),
                enemy.y + Phaser.Math.Between(-15, 15),
                Phaser.Math.Between(3, 8),
                Phaser.Math.Between(0x888888, 0xFFFFFF),
                0.8
            ).setDepth(100);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(60, 150);
            
            this.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * speed,
                y: particle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: 500,
                onComplete: () => particle.destroy()
            });
        }
        
        // 掉落物品（金币/经验/血瓶）
        if (this.levelData && this.levelData.items) {
            const dropRoll = Math.random();
            if (dropRoll < 0.35) {
                // 70% 掉金币，30% 掉血瓶/经验
                const isHealth = Math.random() < 0.3;
                const isExp = Math.random() < 0.5;
                const spriteKey = isHealth ? 'item_health' : (isExp ? 'item_exp' : 'item_coin');
                if (!this.textures.exists(spriteKey)) {
                    this.createFallbackTexture(spriteKey, isHealth ? 0x00FF00 : (isExp ? 0xAA00FF : 0xFFDD00), isHealth ? 'circle' : (isExp ? 'star' : 'circle'));
                }
                const item = this.items.create(enemy.x, enemy.y, spriteKey);
                item.itemType = isHealth ? 'health_potion' : (isExp ? 'experience' : 'coin');
                item.value = isHealth ? 50 : (isExp ? 25 : 10 + this.levelData.id * 5);
                item.setDisplaySize(isExp ? 18 : 14, isExp ? 18 : 14);
                item.setDepth(100);
                item.setAlpha(0.9);
            }
        }
        
        enemy.destroy();
        
        // 检查胜利条件
        this.checkWinCondition();
    }

    updateExpUI() {
        const expPercent = Math.min(this.player.experience / this.player.expToNextLevel, 1);
        this.expBar.setDisplaySize(150 * expPercent, 10);
        this.levelText.setText(`Lv.${this.player.level}`);
    }

    updateEnergyUI() {
        const energyPercent = Math.min(this.player.energy / this.player.maxEnergy, 1);
        this.energyBar.setDisplaySize(300 * energyPercent, 20);
        
        if (this.player.energy >= this.player.maxEnergy) {
            this.energyBar.setFillStyle(0xFFFF00);
            this.ultButton.setFillStyle(0xFFFF00);
            this.ultButtonText.setColor('#000000');
        } else {
            this.energyBar.setFillStyle(0xFF00FF);
            this.ultButton.setFillStyle(0x333333);
            this.ultButtonText.setColor('#FFFFFF');
        }
    }

    addEnergy(amount) {
        this.player.energy = Math.min(this.player.energy + amount, this.player.maxEnergy);
        this.updateEnergyUI();
    }

    useUltimate() {
        const now = this.time.now;
        if (this.player.energy < this.player.maxEnergy || now - this.player.ultCooldown < 5000) {
            return;
        }

        this.player.energy = 0;
        this.player.ultCooldown = now;
        this.playSound('attack');

        // 大招效果：连续发射高密度子弹
        this.ultTimer = this.time.addEvent({
            delay: 50,
            callback: this.fireUltBullet,
            callbackScope: this,
            repeat: 20
        });

        this.updateEnergyUI();
    }

    fireUltBullet() {
        const bulletKey = 'item_attack';
        if (!this.textures.exists(bulletKey)) {
            this.createBulletTexture(bulletKey);
        }

        const angleStep = 360 / 8;
        for (let i = 0; i < 8; i++) {
            const angle = (angleStep * i) * Math.PI / 180;
            const bullet = this.bullets.create(this.player.x, this.player.y, bulletKey);
            bullet.setDisplaySize(16, 16);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.8);
            bullet.setOrigin(0.5);

            const speed = 250;
            bullet.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            bullet.lifespan = 1500;
        }
    }

    updateUI() {
        const healthPercent = Math.max(0, this.player.health) / this.player.maxHealth;
        this.healthBar.scaleX = healthPercent;
        this.healthText.setText(`${Math.max(0, Math.floor(this.player.health))}/${this.player.maxHealth}`);

        if (healthPercent < 0.3) {
            this.healthBar.setFillStyle(0xFF0000);
        } else if (healthPercent < 0.6) {
            this.healthBar.setFillStyle(0xFFAA00);
        } else {
            this.healthBar.setFillStyle(0x00AA00);
        }

        this.coinText.setText(`${this.player.coins}`);
        
        // 敌人数量显示优化：确保格式清晰
        if (this.boss && this.boss.active) {
            // Boss战期间：显示已击败数/Boss战标记
            this.enemiesText.setText(`敌人: ${this.enemiesDefeated}/BOSS`);
        } else if (this.totalEnemiesToSpawn > 0) {
            // 正常关卡：使用安全的数值显示
            const displayDefeated = Math.min(this.enemiesDefeated, this.totalEnemiesToSpawn);
            const displayTotal = Math.max(this.totalEnemiesToSpawn, displayDefeated);
            this.enemiesText.setText(`敌人: ${displayDefeated}/${displayTotal}`);
        } else {
            // 无敌人或数据未初始化
            this.enemiesText.setText(`敌人: 0/0`);
        }
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
            interact: Phaser.Input.Keyboard.KeyCodes.E,
            pause: Phaser.Input.Keyboard.KeyCodes.ESC,
            speed: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER
        });

        this.input.keyboard.on('keydown-PAUSE', () => this.togglePause());
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    }

    setupCollisions() {
        // 性能优化：使用碰撞回调，减少每帧的碰撞检测计算
        this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemyCollision, null, this);
        this.physics.add.overlap(this.bullets, this.enemies, this.onBulletEnemyCollision, null, this);
        this.physics.add.overlap(this.player, this.items, this.onPlayerItemCollision, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.onPlayerEnemyBulletCollision, null, this);
        
        // 性能优化：设置物理引擎参数
        this.physics.world.setBoundsCollision(false, false, false, false);
        this.physics.world.gravity.y = 0;
    }

    setupCamera() {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // ==================== 作弊系统（测试模式）====================
    initCheatSystem() {
        try {
            // 检测是否从菜单激活了作弊模式
            this.cheatEnabled = (window.gameCheats && window.gameCheats.enabled) || false;
            this.cheatOneHitKill = false;
            this.cheatInvincible = false;
            this.cheatUI = null;

            if (this.cheatEnabled) {
                console.log('🎮 检测到作弊模式已激活！');
                this.createCheatUI();
                this.setupCheatHotkeys();
            }
        } catch (e) {
            console.error('❌ 初始化作弊系统失败:', e);
            this.cheatEnabled = false;
        }
    }

    createCheatUI() {
        try {
            // 创建作弊控制面板（右上角小按钮）- 简化版本
            const cheatBtn = this.add.text(GAME_WIDTH - 10, 10, '⚡CHEAT', {
                fontSize: '14px',
                fontFamily: 'Courier New',
                fontWeight: 'bold',
                color: '#00FF00',
                padding: { x: 6, y: 3 }
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(200).setScrollFactor(0);
            
            // 添加背景
            const btnBg = this.add.rectangle(GAME_WIDTH - 10, 10, 80, 22, 0x001100);
            btnBg.setOrigin(1, 0).setDepth(199).setScrollFactor(0);
            btnBg.setStrokeStyle(1, 0x00FF00);
            cheatBtn.btnBg = btnBg;

            // 点击切换面板显示/隐藏
            let panelVisible = false;
            
            cheatBtn.on('pointerdown', () => {
                panelVisible = !panelVisible;
                if (panelVisible) {
                    this.showCheatPanel();
                } else {
                    this.hideCheatPanel();
                }
            });

            // 快捷键提示
            const hint = this.add.text(GAME_WIDTH - 10, 30, '[F1]一击必杀 [F2]无敌', {
                fontSize: '11px',
                fontFamily: 'Courier New',
                color: '#888800'
            }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

            this.cheatUI = { button: cheatBtn, hint: hint, panel: null };
        } catch (e) {
            console.error('❌ 创建作弊UI失败:', e);
            this.cheatUI = null;
        }
    }

    showCheatPanel() {
        if (this.cheatUI && this.cheatUI.panel) return; // 已显示

        const panel = this.add.container(GAME_WIDTH / 2, 120).setDepth(201).setScrollFactor(0);

        // 面板背景
        const bg = this.add.rectangle(0, 0, 280, 90, 0x000000, 0.9);
        bg.setStrokeStyle(2, 0x00FF00);
        panel.add(bg);

        // 标题
        const title = this.add.text(0, -30, '🎮 测试模式控制台', {
            fontSize: '18px',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            color: '#00FF00'
        }).setOrigin(0.5);
        panel.add(title);

        // 一击必杀按钮
        const btn1 = this.add.text(-60, 5, `[F1] ${this.cheatOneHitKill ? '✅' : '⬜'} 一击必杀`, {
            fontSize: '15px',
            fontFamily: 'Courier New',
            color: this.cheatOneHitKill ? '#00FF00' : '#AAAAAA'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        btn1.on('pointerdown', () => {
            this.toggleCheatOneHitKill();
            btn1.setText(`[F1] ${this.cheatOneHitKill ? '✅' : '⬜'} 一击必杀`);
            btn1.setColor(this.cheatOneHitKill ? '#00FF00' : '#AAAAAA');
        });
        panel.add(btn1);

        // 无敌模式按钮
        const btn2 = this.add.text(60, 5, `[F2] ${this.cheatInvincible ? '✅' : '⬜'} 无敌模式`, {
            fontSize: '15px',
            fontFamily: 'Courier New',
            color: this.cheatInvincible ? '#00FF00' : '#AAAAAA'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn2.on('pointerdown', () => {
            this.toggleCheatInvincible();
            btn2.setText(`[F2] ${this.cheatInvincible ? '✅' : '⬜'} 无敌模式`);
            btn2.setColor(this.cheatInvincible ? '#00FF00' : '#AAAAAA');
            
            // 更新玩家状态
            if (this.player && this.player.active) {
                this.player.isInvincible = this.cheatInvincible;
                
                // 视觉反馈：无敌时玩家闪烁金光
                if (this.cheatInvincible) {
                    this.player.setTint(0xFFD700);
                    this.tweens.add({
                        targets: this.player,
                        alpha: { from: 1, to: 0.6 },
                        duration: 300,
                        repeat: -1,
                        yoyo: true
                    });
                } else {
                    this.player.clearTint();
                    this.tweens.killTweensOf(this.player);
                    this.player.setAlpha(1);
                }
            }
        });
        panel.add(btn2);

        // 关闭提示
        const closeHint = this.add.text(0, 35, '点击按钮或按 ESC 关闭', {
            fontSize: '12px',
            fontFamily: 'Courier New',
            color: '#666666'
        }).setOrigin(0.5);
        panel.add(closeHint);

        this.cheatUI.panel = panel;
    }

    hideCheatPanel() {
        if (this.cheatUI && this.cheatUI.panel) {
            this.cheatUI.panel.destroy();
            this.cheatUI.panel = null;
        }
    }

    setupCheatHotkeys() {
        // F1: 切换一击必杀
        this.input.keyboard.on('keydown-F1', () => {
            if (!this.cheatEnabled) return;
            this.toggleCheatOneHitKill();
            console.log(`${this.cheatOneHitKill ? '✅' : '❌'} 一击必杀: ${this.cheatOneHitKill ? '开启' : '关闭'}`);
        });

        // F2: 切换无敌模式
        this.input.keyboard.on('keydown-F2', () => {
            if (!this.cheatEnabled) return;
            this.toggleCheatInvincible();
            console.log(`${this.cheatInvincible ? '✅' : '❌'} 无敌模式: ${this.cheatInvincible ? '开启' : '关闭'}`);
            
            // 立即应用无敌状态
            if (this.player && this.player.active) {
                this.player.isInvincible = this.cheatInvincible;
                if (this.cheatInvincible) {
                    this.player.setTint(0xFFD700);
                } else {
                    this.player.clearTint();
                    this.player.setAlpha(1);
                }
            }
        });

        // F3: 立即击败Boss（仅最终Boss有效）
        this.input.keyboard.on('keydown-F3', () => {
            if (!this.cheatEnabled || !this.boss || !this.boss.active) return;
            console.log('💀 作弊：立即击败Boss');
            this.boss.health = 0;
            this.onEnemyDeath(this.boss);
        });

        // ESC: 关闭作弊面板
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.cheatUI && this.cheatUI.panel) {
                this.hideCheatPanel();
            }
        });
    }

    toggleCheatOneHitKill() {
        this.cheatOneHitKill = !this.cheatOneHitKill;
        
        // 视觉提示
        if (this.cheatUI && this.cheatUI.button) {
            this.cheatUI.button.setText(this.cheatOneHitKill ? '⚡CHEAT+' : '⚡CHEAT');
        }
    }

    toggleCheatInvincible() {
        this.cheatInvincible = !this.cheatInvincible;
        
        // 应用到玩家
        if (this.player && this.player.active) {
            this.player.isInvincible = this.cheatInvincible;
        }
    }

    applyCheatDamage(enemy, baseDamage) {
        // 如果启用了一击必杀，返回巨额伤害
        if (this.cheatEnabled && this.cheatOneHitKill) {
            return enemy.health + 9999; // 保证一击必杀
        }
        return baseDamage;
    }

    isPlayerCheatInvincible() {
        return (this.cheatEnabled && this.cheatInvincible) || (this.player && this.player.isInvincible);
    }

    togglePause() {
        if (this.gameState === 'transitioning' || this.gameState === 'dialogue') return;

        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    pauseGame() {
        this.gameState = 'paused';
        this.scene.pause();
        this.scene.launch('PauseScene', { music: null, bossMusic: null });
    }

    resumeGame() {
        this.gameState = 'playing';
        this.scene.resume();
    }

    onPlayerEnemyCollision(player, enemy) {
        if (enemy.isDead || this.player.isInvincible || this.isPlayerCheatInvincible()) return;

        this.damagePlayer(enemy.damage);
        this.playSound('player_hit');

        const knockbackDir = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y).normalize();
        player.x += knockbackDir.x * 30;
        player.y += knockbackDir.y * 30;

        // 如果不是作弊无敌，则应用正常无敌帧
        if (!this.isPlayerCheatInvincible()) {
            this.player.isInvincible = true;
            this.tweens.add({
                targets: player,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 5,
                onComplete: () => {
                    player.setAlpha(1);
                    this.player.isInvincible = false;
                }
            });
        }
    }

    onPlayerEnemyBulletCollision(player, bullet) {
        if (this.player.isInvincible || this.isPlayerCheatInvincible()) return;

        this.damagePlayer(bullet.damage);
        this.playSound('player_hit');

        // 如果不是作弊无敌，则应用正常无敌帧
        if (!this.isPlayerCheatInvincible()) {
            this.player.isInvincible = true;
            this.tweens.add({
                targets: player,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 5,
                onComplete: () => {
                    player.setAlpha(1);
                    this.player.isInvincible = false;
                }
            });
        }

        if (bullet && bullet.active) {
            bullet.destroy();
        }
    }

    onAttackEnemyCollision(attack, enemy) {
        if (enemy.isDead) return;

        enemy.health -= this.player.attackDamage;
        this.playSound('enemy_hit');

        this.tweens.add({
            targets: enemy,
            tint: 0xFFFFFF,
            duration: 50,
            yoyo: true
        });

        if (enemy.healthBar && enemy.isBoss) {
            const healthPercent = Math.max(0, enemy.health) / enemy.maxHealth;
            const maxWidth = enemy.isFinalBoss ? 450 : 400; // 最终Boss更宽
            const barHeight = enemy.isFinalBoss ? 24 : 20;
            const newWidth = maxWidth * healthPercent;

            // 更新血条宽度（左对齐，固定位置）
            enemy.healthBar.setSize(newWidth, barHeight);
            
            // 更新血量数字
            if (enemy.hpText) {
                enemy.hpText.setText(`${Math.floor(enemy.health)}/${enemy.maxHealth}`);
                // 根据血量改变颜色
                if (healthPercent < 0.3) {
                    enemy.hpText.setColor('#FF4444');
                } else if (healthPercent < 0.6) {
                    enemy.hpText.setColor('#FFAA00');
                } else {
                    enemy.hpText.setColor('#FFFFFF');
                }
            }
        }

        if (enemy.health <= 0) {
            this.killEnemy(enemy);
        }

        attack.destroy();
    }

    onBulletEnemyCollision(bullet, enemy) {
        if (enemy.isDead) return;

        // 应用一击必杀作弊（如果启用）
        const damage = this.applyCheatDamage(enemy, this.player.attackDamage);
        enemy.health -= damage;
        
        this.playSound('enemy_hit');

        this.tweens.add({
            targets: enemy,
            tint: 0xFFFFFF,
            duration: 50,
            yoyo: true
        });

        // 只有Boss才显示血条更新
        if (enemy.healthBar && enemy.isBoss) {
            const healthPercent = Math.max(0, enemy.health) / enemy.maxHealth;
            const maxWidth = enemy.isFinalBoss ? 450 : 400; // 最终Boss更宽
            const barHeight = enemy.isFinalBoss ? 24 : 20;
            const newWidth = maxWidth * healthPercent;
            
            // 更新血条宽度（左对齐，固定位置）
            enemy.healthBar.setSize(newWidth, barHeight);
            
            // 更新血量数字
            if (enemy.hpText) {
                enemy.hpText.setText(`${Math.floor(enemy.health)}/${enemy.maxHealth}`);
                if (healthPercent < 0.3) {
                    enemy.hpText.setColor('#FF4444');
                } else if (healthPercent < 0.6) {
                    enemy.hpText.setColor('#FFAA00');
                } else {
                    enemy.hpText.setColor('#FFFFFF');
                }
            }
        }

        if (enemy.health <= 0) {
            this.killEnemy(enemy);
        }

        bullet.destroy();
    }

    enemyShoot(enemy) {
        if (enemy.isBoss) {
            this.bossShoot(enemy);
        } else {
            // 性能优化：检查当前子弹数量，超过限制则不发射新子弹
            if (this.enemyBullets && this.enemyBullets.getChildren().length >= this.maxBullets) {
                return;
            }

            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const bulletKey = 'enemy_bullet';
            
            if (!this.textures.exists(bulletKey)) {
                this.createFallbackTexture(bulletKey, 0xFF0000, 'circle');
            }

            const bullet = this.enemyBullets.create(enemy.x, enemy.y, bulletKey);
            bullet.setDisplaySize(12, 12);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.8);
            bullet.setOrigin(0.5);

            const speed = 150;
            bullet.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            bullet.lifespan = 4000;
            bullet.damage = enemy.damage * 0.5;
        }
    }

    bossShoot(boss) {
        // 性能优化：检查当前子弹数量，超过限制则不发射新子弹
        if (this.enemyBullets && this.enemyBullets.getChildren().length >= this.maxBullets) {
            return;
        }

        const bulletKey = 'enemy_bullet';

        if (!this.textures.exists(bulletKey)) {
            this.createFallbackTexture(bulletKey, 0xFF0000, 'circle');
        }

        const levelId = this.levelData.id;
        const attackPhase = boss.attackPhase || 0;
        
        // 性能优化：根据当前子弹数量动态调整弹幕密度
        const currentBullets = this.enemyBullets ? this.enemyBullets.getChildren().length : 0;
        const bulletRatio = currentBullets / this.maxBullets;
        const densityMultiplier = Math.max(0.5, 1 - bulletRatio * 0.8);
        
        // ==================== 最终Boss（第11章）5阶段弹幕系统 ====================
        // 只检查boss.isFinalBoss属性（只在最终Boss关卡时设置）
        if (boss.isFinalBoss) {
            this.finalBossPhaseAttack(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
            boss.attackPhase = attackPhase + 1;
            return;
        }
        
        // ==================== 1-10关Boss独特弹幕风格 ====================
        switch (levelId) {
            case 2: // 第2关：污染树妖之王 - 森林主题，绿色植物弹幕
                this.bossLevel2(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 750;
                break;
                
            case 3: // 第3关：兽王 - 兽王主题，冲击+跳跃弹幕
                this.bossLevel3(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 700;
                break;
                
            case 4: // 第4关：亡灵守卫长 - 古老诅咒主题，追踪+环形弹幕
                this.bossLevel4(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 680;
                break;
                
            case 5: // 第5关：堕落大主教 - 神圣堕落主题，弹幕审判
                this.bossLevel5(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 650;
                break;
                
            case 6: // 第6关：深海魔物 - 深海旋涡+水母主题
                this.bossLevel6(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 620;
                break;
                
            case 7: // 第7关：迷宫守护者 - 时间迷宫弹幕
                this.bossLevel7(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 580;
                break;
                
            case 8: // 第8关：魔王四天王之一 - 黑暗主题
                this.bossLevel8(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 550;
                break;
                
            case 9: // 第9关：三大军团长 - 终极弹幕
                this.bossLevel9(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 520;
                break;
                
            case 10: // 第10关：魔王 - 末日弹幕
                this.bossLevel10(boss, bulletKey, attackPhase, densityMultiplier, bulletRatio);
                boss.attackCooldown = 480;
                break;
                
            default: // 默认/1关无Boss，保持原样
                boss.attackCooldown = 800;
        }
        
        boss.attackPhase = attackPhase + 1;
    }

    // ==================== 最终Boss（魔神·阿撒托斯）5阶段弹幕系统 ====================
    finalBossPhaseAttack(boss, bulletKey, phase, density, ratio) {
        // 只有最终Boss关卡才执行此逻辑
        if (!this.isFinalBossLevel) return;
        
        // 检查并更新当前阶段
        this.checkAndUpdateFinalBossPhase(boss);
        
        const currentPhase = boss.currentPhase || 1;
        
        try {
            switch (currentPhase) {
                case 1: // 阶段1：触手风暴（100% → 75%）
                    this.finalBossPhase1(boss, bulletKey, phase, density, ratio);
                    boss.attackCooldown = 350;
                    break;
                    
                case 2: // 阶段2：血眼狂潮（75% → 50%）
                    this.finalBossPhase2(boss, bulletKey, phase, density, ratio);
                    boss.attackCooldown = 320;
                    break;
                    
                case 3: // 阶段3：混沌星辰崩坏（50% → 25%）
                    this.finalBossPhase3(boss, bulletKey, phase, density, ratio);
                    boss.attackCooldown = 280;
                    break;
                    
                case 4: // 阶段4：梦境崩解（25% → 10%）
                    this.finalBossPhase4(boss, bulletKey, phase, density, ratio);
                    boss.attackCooldown = 250;
                    break;
                    
                case 5: // 阶段5：最终核心（10% → 0%）
                    this.finalBossPhase5(boss, bulletKey, phase, density, ratio);
                    boss.attackCooldown = 200; // 极快攻击
                    break;
            }
        } catch (error) {
            console.error(`[Final Boss Phase ${currentPhase} Error]:`, error);
            console.error(error.stack);
        }
    }
    
    checkAndUpdateFinalBossPhase(boss) {
        // 只有最终Boss关卡才执行此逻辑
        if (!this.isFinalBossLevel || !boss.maxHealth || !boss.health) return;
        
        const hpPercent = (boss.health / boss.maxHealth) * 100;
        let newPhase = 1;
        
        if (hpPercent <= 10) newPhase = 5;
        else if (hpPercent <= 25) newPhase = 4;
        else if (hpPercent <= 50) newPhase = 3;
        else if (hpPercent <= 75) newPhase = 2;
        else newPhase = 1;
        
        // 阶段转换处理
        if (newPhase !== boss.currentPhase && newPhase > (boss.currentPhase || 1)) {
            console.log(`🌀 最终Boss进入阶段 ${newPhase}！血量: ${Math.floor(hpPercent)}%`);
            
            // 更新阶段显示
            if (this.bossPhaseIndicator) {
                const phaseNames = ['', '触手风暴', '血眼狂潮', '星辰崩坏', '梦境崩解', '最终核心'];
                this.bossPhaseIndicator.setText(`Phase ${newPhase}/5 - ${phaseNames[newPhase]}`);
                
                // 阶段颜色变化
                const colors = ['', '#FF8800', '#FF0044', '#FFAA00', '#FF44FF', '#FFFF00'];
                this.bossPhaseIndicator.setColor(colors[newPhase]);
            }
            
            // 强烈震屏效果表示阶段转换
            this.cameras.main.shake(500, 0.04);
            
            // Boss短暂无敌并闪白光
            this.tweens.add({
                targets: boss,
                alpha: { from: 0.3, to: 1 },
                duration: 300,
                repeat: 3
            });
            
            // 延迟触发同伴牺牲，确保先播放阶段转换动画
            this.time.delayedCall(600, () => {
                this.triggerCompanionSacrifice(newPhase);
            });
        }
        
        boss.currentPhase = newPhase;
    }
    
    triggerCompanionSacrifice(phase) {
        // 只有最终Boss关卡才执行此逻辑
        if (!this.isFinalBossLevel) return;
        
        // 阶段1→2：丝薇尔牺牲
        if (phase === 2 && !this.companionSacrificed.sylvie) {
            this.companionSacrificed.sylvie = true;
            this.showCompanionSacrificeEvent('sylvie');
        }
        // 阶段2→3：莉娅牺牲
        else if (phase === 3 && !this.companionSacrificed.lia) {
            this.companionSacrificed.lia = true;
            this.showCompanionSacrificeEvent('lia');
        }
        // 阶段3→4：米娅牺牲
        else if (phase === 4 && !this.companionSacrificed.miya) {
            this.companionSacrificed.miya = true;
            this.showCompanionSacrificeEvent('miya');
        }
    }
    
    showCompanionSacrificeEvent(companion) {
        // 只有最终Boss关卡才执行此逻辑
        if (!this.isFinalBossLevel) return;
        
        // 临时暂停Boss攻击一段时间
        if (this.boss && this.boss.active) {
            const originalAttackCooldown = this.boss.attackCooldown;
            this.boss.attackCooldown = 5000; // 5秒内Boss不攻击
            this.time.delayedCall(4000, () => {
                if (this.boss && this.boss.active) {
                    this.boss.attackCooldown = originalAttackCooldown;
                }
            });
        }
        
        // 创建同伴立绘和牺牲动画
        const companionData = {
            sylvie: { name: '丝薇尔', color: '#44FF88', buff: 'forestShield', text: '艾伦……去吧……森林会永远保护你……' },
            lia: { name: '莉娅', color: '#FFFFFF', buff: 'holyLight', text: '我的圣光……最后一次为你燃烧！' },
            miya: { name: '米娅', color: '#44AAFF', buff: 'seaEcho', text: '艾伦……海会记住你……永远……' }
        };
        
        const data = companionData[companion];
        if (!data) return;
        
        // 显示同伴名字
        const nameText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 80, `💔 ${data.name} 💔`, {
            fontSize: '32px',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            color: data.color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(250).setScrollFactor(0);
        
        // 显示台词
        const dialogueText = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 30, data.text, {
            fontSize: '22px',
            fontFamily: 'Courier New',
            color: data.color,
            stroke: '#000000',
            strokeThickness: 3,
            wordWrap: { width: GAME_WIDTH - 100 },
            align: 'center'
        }).setOrigin(0.5).setDepth(250).setScrollFactor(0);
        
        // 粒子特效
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 150 + 50;
            const particle = this.add.circle(
                GAME_WIDTH/2 + Math.cos(angle) * dist,
                GAME_HEIGHT/2 + Math.sin(angle) * dist,
                Phaser.Math.Between(5, 12),
                parseInt(data.color.replace('#', '0x')),
                0.9
            ).setDepth(249).setScrollFactor(0);
            
            this.tweens.add({
                targets: particle,
                x: GAME_WIDTH/2 + Math.cos(angle) * (dist + 200),
                y: GAME_HEIGHT/2 + Math.sin(angle) * (dist + 200),
                alpha: 0,
                scale: 2,
                duration: Phaser.Math.Between(800, 1500),
                onComplete: () => particle.destroy()
            });
        }
        
        // 应用BUFF
        this.playerBuffs[data.buff] = true;
        this.applyCompanionBuff(data.buff);
        
        // 淡出文字
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: [nameText, dialogueText],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    nameText.destroy();
                    dialogueText.destroy();
                }
            });
        });
    }
    
    applyCompanionBuff(buffType) {
        switch (buffType) {
            case 'forestShield':
                // 丝薇尔的保护屏障：临时无敌+分数加成
                this.player.isInvincible = true;
                this.time.delayedCall(2000, () => {
                    this.player.isInvincible = false;
                    console.log('🌿 丝薇尔的保护屏障消失');
                });
                break;
            case 'holyLight':
                // 莉娅的圣光加持：子弹速度+30%，持续20秒
                this.player.holyLightBuff = true;
                this.time.delayedCall(20000, () => {
                    this.player.holyLightBuff = false;
                    console.log('✨ 莉娅的圣光加持消失');
                });
                break;
            case 'seaEcho':
                // 米娅的海之回响：自动回复生命值
                this.player.seaEchoBuff = true;
                this.time.delayedCall(20000, () => {
                    this.player.seaEchoBuff = false;
                    console.log('🌊 米娅的海之回响消失');
                });
                break;
        }
    }

    // ========== 阶段1：触手风暴（100% → 75%）==========
    finalBossPhase1(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: // 密集触手直线弹
                this.tentacleLinePattern(boss, bulletKey, Math.floor(20*density), 280, 0x220044); 
                break;
            case 1: // 触手波浪扫射
                this.tentacleWavePattern(boss, bulletKey, Math.floor(15*density), 240);
                break;
            case 2: // 紫色孢子散弹
                this.sporeSpreadPattern(boss, bulletKey, Math.floor(18*density), 200, 0x8822AA);
                break;
            case 3: // 追踪触手弹
                this.touhouHomingPattern(boss, bulletKey, Math.floor(6*density), 180);
                break;
            case 4: // 扇形触手弹幕
                this.touhouFanPattern(boss, bulletKey, Math.floor(16*density), 260, 0, 0x440066);
                break;
            case 5: // 全屏边缘雨
                this.touhouScreenRainPattern(boss, bulletKey, Math.floor(14*density), 190);
                break;
        }
        
        // 战中对话（阶段1中段）
        if (phase === 10 && !this.finalBossPhaseTriggered[0]) {
            this.finalBossPhaseTriggered[0] = true;
            this.showBossDialogue("你的同伴，不过是梦里的影子……");
        }
    }
    
    // ========== 阶段2：血眼狂潮（75% → 50%）==========
    finalBossPhase2(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: // 全屏激光网
                this.laserNetPattern(boss, bulletKey, Math.floor(12*density), 220, 0xFF0022);
                break;
            case 1: // 眼球追踪弹（红色homing）
                this.eyeHomingPattern(boss, bulletKey, Math.floor(10*density), 200);
                break;
            case 2: // 梦境幻觉弹（召唤幻影）
                this.illusionPattern(boss, bulletKey, Math.floor(14*density), 230);
                break;
            case 3: // 血眼环形弹
                this.touhouMultiRingPattern(boss, bulletKey, Math.floor(3*density), Math.floor(16*density), 170);
                break;
            case 4: // 密集瞄准弹
                this.touhouAimedPattern(boss, bulletKey, Math.floor(20*density), 280);
                break;
            case 5: // 血色旋涡
                this.touhouVortexPattern(boss, bulletKey, density);
                break;
        }
        
        // 战中对话
        if (phase === 12 && !this.finalBossPhaseTriggered[1]) {
            this.finalBossPhaseTriggered[1] = true;
            this.showBossDialogue("圣光？不过是可笑的幻梦……");
        }
    }
    
    // ========== 阶段3：混沌星辰崩坏（50% → 25%）==========
    finalBossPhase3(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: // 星辰坠落弹
                this.starFallPattern(boss, bulletKey, Math.floor(16*density), 210, 0xFFDD00);
                break;
            case 1: // 旋转星环弹
                this.starRingPattern(boss, bulletKey, Math.floor(4*density), Math.floor(14*density), 190);
                break;
            case 2: // 时间扭曲弹
                this.timeWarpPattern(boss, bulletKey, Math.floor(18*density), 230);
                break;
            case 3: // 高密度混沌弹
                this.highDensityChaosPattern(boss, bulletKey, Math.floor(20*density), 250);
                break;
            case 4: // 双重螺旋
                this.touhouSpiralPattern(boss, bulletKey, Math.floor(12*density), 240);
                this.time.delayedCall(150, () => {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        this.touhouSpiralPattern(boss, bulletKey, Math.floor(12*density), 240, Math.PI);
                    }
                });
                break;
            case 5: // 屏幕边缘+中心混合攻击
                this.touhouScreenRainPattern(boss, bulletKey, Math.floor(16*density), 185);
                break;
        }
        
        // 战中对话
        if (phase === 14 && !this.finalBossPhaseTriggered[2]) {
            this.finalBossPhaseTriggered[2] = true;
            this.showBossDialogue("海之歌？不过是临死前的哀鸣……");
        }
    }
    
    // ========== 阶段4：梦境崩解（25% → 10%）==========
    finalBossPhase4(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: // 高密度混沌弹
                this.highDensityChaosPattern(boss, bulletKey, Math.floor(25*density), 260);
                break;
            case 1: // 自机狙击弹
                this.sniperLaserPattern(boss, bulletKey, 280);
                break;
            case 2: // 梦境镜像弹
                this.mirrorImagePattern(boss, bulletKey, Math.floor(12*density), 240);
                break;
            case 3: // 极速追踪弹群
                for (let i = 0; i < 3; i++) {
                    this.time.delayedCall(i * 80, () => {
                        if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                            this.touhouHomingPattern(boss, bulletKey, Math.floor(8*density), 220);
                        }
                    });
                }
                break;
            case 4: // 全屏环形+扇形组合
                this.touhouCirclePattern(boss, bulletKey, Math.floor(28*density), 160, 0x880088);
                this.time.delayedCall(100, () => {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        this.touhouFanPattern(boss, bulletKey, Math.floor(18*density), 290);
                    }
                });
                break;
            case 5: // 弹幕矩阵+屏幕雨
                this.touhouMatrixPattern(boss, bulletKey, density);
                this.time.delayedCall(200, () => {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        this.touhouScreenRainPattern(boss, bulletKey, Math.floor(18*density), 175);
                    }
                });
                break;
        }
        
        // 战中对话（玩家宣言）
        if (phase === 16 && !this.finalBossPhaseTriggered[3]) {
            this.finalBossPhaseTriggered[3] = true;
            this.showPlayerDeclaration();
        }
    }
    
    // ========== 阶段5：最终核心（10% → 0%）==========
    finalBossPhase5(boss, bulletKey, phase, density, ratio) {
        const type = phase % 8;
        switch (type) {
            case 0: // 极致弹幕风暴
                this.ultimateDanmakuStorm(boss, bulletKey, Math.floor(30*density), 270);
                break;
            case 1: // 多层激光网
                this.multiLayerLaserNet(boss, bulletKey, Math.floor(16*density), 230);
                break;
            case 2: // 心核脉冲
                this.corePulsePattern(boss, bulletKey, Math.floor(20*density), 250);
                break;
            case 3: // 全屏追踪弹雨
                this.fullScreenHomingRain(boss, bulletKey, Math.floor(22*density), 200);
                break;
            case 4: // 死亡螺旋
                this.deathSpiralPattern(boss, bulletKey, Math.floor(28*density), 290);
                break;
            case 5: // 终极组合
                this.touhouCirclePattern(boss, bulletKey, Math.floor(32*density), 140, 0xFF4400);
                this.time.delayedCall(80, () => {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        this.touhouScreenRainPattern(boss, bulletKey, Math.floor(20*density), 165);
                    }
                });
                break;
            case 6: // 极速连击
                for (let i = 0; i < 3; i++) {
                    this.time.delayedCall(i * 60, () => {
                        if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                            this.touhouFanPattern(boss, bulletKey, Math.floor(18*density), 340);
                            this.touhouHomingPattern(boss, bulletKey, Math.floor(8*density), 240);
                        }
                    });
                }
                break;
            case 7: // 最后的疯狂
                this.chaosApocalypsePattern(boss, bulletKey, Math.floor(35*density), 300);
                break;
        }
    }
    
    showBossDialogue(text) {
        const dialogueBox = this.add.rectangle(GAME_WIDTH/2, 80, GAME_WIDTH - 100, 60, 0x000000, 0.85).setDepth(255).setScrollFactor(0);
        const dialogueText = this.add.text(GAME_WIDTH/2, 80, text, {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#FF0044',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(256).setScrollFactor(0);
        
        this.time.delayedCall(4000, () => {
            this.tweens.add({
                targets: [dialogueBox, dialogueText],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    dialogueBox.destroy();
                    dialogueText.destroy();
                }
            });
        });
    }
    
    showPlayerDeclaration() {
        const overlay = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(254).setScrollFactor(0);
        
        const lines = [
            "我不是为了'值得'而战……",
            "我是为了莉娅的眼泪、丝薇尔的笑容、米娅的歌声……",
            "为了这个世界所有还在等待明天的人而战！",
            "结束这个梦吧！"
        ];
        
        lines.forEach((line, index) => {
            const text = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 60 + index * 35, line, {
                fontSize: index === 3 ? '28px' : '22px',
                fontFamily: 'Courier New',
                fontWeight: index === 3 ? 'bold' : 'normal',
                color: index === 3 ? '#FFD700' : '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(255).setScrollFactor(0).setAlpha(0);
            
            this.tweens.add({
                targets: text,
                alpha: 1,
                delay: 800 + index * 1200,
                duration: 500
            });
            
            this.time.delayedCall(800 + (lines.length * 1200) + 1500, () => {
                this.tweens.add({
                    targets: [overlay, ...lines.map((l, i) => null)],
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        overlay.destroy();
                        text.destroy();
                    }
                });
            });
        });
    }
    bossLevel2(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouFanPattern(boss, bulletKey, Math.floor(10*density), 230, 0, 0x22CC22); break; // 绿色扇
            case 1: this.touhouCirclePattern(boss, bulletKey, Math.floor(14*density), 200, 0x66FF66); break; // 绿色环
            case 2: this.touhouSpiralPattern(boss, bulletKey, Math.floor(7*density), 210); break; // 螺旋
            case 3: this.touhouAimedPattern(boss, bulletKey, Math.floor(8*density), 260); break; // 瞄准
            case 4: this.touhouVinePattern(boss, bulletKey, density, 0x33AA33); break; // 藤蔓
            case 5: if (ratio < 0.65) this.touhouDoubleFanPattern(boss, bulletKey, Math.floor(9*density), 240, 600); break;
        }
    }

    // ========== 第3关：兽王 ==========
    bossLevel3(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouFanPattern(boss, bulletKey, Math.floor(13*density), 280, 0, 0xCC4444); break; // 红冲击
            case 1: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(2*density), Math.floor(10*density), 170); break; // 环
            case 2: this.touhouAimedPattern(boss, bulletKey, Math.floor(10*density), 300); break;
            case 3: this.touhouHomingPattern(boss, bulletKey, Math.floor(5*density), 180); break; // 追踪
            case 4: if (ratio < 0.6) { this.touhouCirclePattern(boss, bulletKey, Math.floor(15*density), 160); } break;
            case 5: this.touhouSpiralPattern(boss, bulletKey, Math.floor(8*density), 240); break;
        }
    }

    // ========== 第4关：亡灵守卫 ==========
    bossLevel4(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouCirclePattern(boss, bulletKey, Math.floor(16*density), 190, 0x9999AA); break; // 紫诅咒
            case 1: this.touhouHomingPattern(boss, bulletKey, Math.floor(6*density), 170); break;
            case 2: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(3*density), Math.floor(9*density), 160); break;
            case 3: if (ratio < 0.6) this.touhouAimedPattern(boss, bulletKey, Math.floor(9*density), 280); break;
            case 4: this.touhouSpiralPattern(boss, bulletKey, Math.floor(8*density), 210, 0xAA44AA); break;
            case 5: this.touhouScreenRainPattern(boss, bulletKey, Math.floor(10*density), 180); break; // 边缘雨
        }
    }

    // ========== 第5关：堕落大主教 ==========
    bossLevel5(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouDoubleFanPattern(boss, bulletKey, Math.floor(11*density), 250, 700); break;
            case 1: this.touhouCirclePattern(boss, bulletKey, Math.floor(20*density), 150, 0xDDDD00); break;
            case 2: this.touhouSpiralPattern(boss, bulletKey, Math.floor(9*density), 220); break;
            case 3: if (ratio < 0.55) this.touhouHomingPattern(boss, bulletKey, Math.floor(7*density), 190); break;
            case 4: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(4*density), Math.floor(12*density), 170); break;
            case 5: if (ratio < 0.5) { this.touhouFanPattern(boss, bulletKey, Math.floor(10*density), 290); this.time.delayedCall(200, () => { if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(12*density), 180); }); } break;
        }
    }

    // ========== 第6关：深海魔物 ==========
    bossLevel6(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouVortexPattern(boss, bulletKey, density); break; // 旋涡
            case 1: this.touhouCirclePattern(boss, bulletKey, Math.floor(18*density), 170, 0x44AAFF); break;
            case 2: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(4*density), Math.floor(10*density), 160); break;
            case 3: this.touhouAimedPattern(boss, bulletKey, Math.floor(9*density), 270); break;
            case 4: this.touhouFanPattern(boss, bulletKey, Math.floor(12*density), 260, 0, 0x2288EE); break;
            case 5: if (ratio < 0.6) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(14*density), 190); break;
        }
    }

    // ========== 第7关：迷宫守护者 ==========
    bossLevel7(boss, bulletKey, phase, density, ratio) {
        const type = phase % 6;
        switch (type) {
            case 0: this.touhouMatrixPattern(boss, bulletKey, density); break; // 迷宫矩阵
            case 1: this.touhouSpiralPattern(boss, bulletKey, Math.floor(10*density), 230); break;
            case 2: this.touhouDoubleFanPattern(boss, bulletKey, Math.floor(12*density), 240, 750); break;
            case 3: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(3*density), Math.floor(11*density), 165); break;
            case 4: if (ratio < 0.5) this.touhouHomingPattern(boss, bulletKey, Math.floor(8*density), 200); break;
            case 5: if (ratio < 0.55) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(13*density), 185); break;
        }
    }

    // ========== 第8关：魔王四天王 ==========
    bossLevel8(boss, bulletKey, phase, density, ratio) {
        const type = phase % 8;
        switch (type) {
            case 0: if (ratio < 0.55) { this.touhouFanPattern(boss, bulletKey, Math.floor(12*density), 310); this.time.delayedCall(150, () => { if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) this.touhouFanPattern(boss, bulletKey, Math.floor(10*density), 290, Math.PI/6); }); } break;
            case 1: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(4*density), Math.floor(12*density), 175); break;
            case 2: this.touhouSpiralPattern(boss, bulletKey, Math.floor(10*density), 240); break;
            case 3: if (ratio < 0.5) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(16*density), 190); break;
            case 4: this.touhouHomingPattern(boss, bulletKey, Math.floor(7*density), 185); break;
            case 5: this.touhouCirclePattern(boss, bulletKey, Math.floor(22*density), 145); break;
            case 6: this.touhouMatrixPattern(boss, bulletKey, density); break;
            case 7: this.touhouAimedPattern(boss, bulletKey, Math.floor(11*density), 300); break;
        }
    }

    // ========== 第9关：三大军团长 ==========
    bossLevel9(boss, bulletKey, phase, density, ratio) {
        const type = phase % 8;
        switch (type) {
            case 0: if (ratio < 0.5) { this.touhouCirclePattern(boss, bulletKey, Math.floor(24*density), 140); this.time.delayedCall(100, () => { if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) this.touhouFanPattern(boss, bulletKey, Math.floor(14*density), 290); }); } break;
            case 1: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(4*density), Math.floor(13*density), 160); break;
            case 2: this.touhouVortexPattern(boss, bulletKey, density); break;
            case 3: this.touhouHomingPattern(boss, bulletKey, Math.floor(8*density), 190); break;
            case 4: if (ratio < 0.5) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(18*density), 175); break;
            case 5: this.touhouMatrixPattern(boss, bulletKey, density); break;
            case 6: this.touhouSpiralPattern(boss, bulletKey, Math.floor(11*density), 230); break;
            case 7: this.touhouDoubleFanPattern(boss, bulletKey, Math.floor(13*density), 250, 800); break;
        }
    }

    // ========== 第10关：魔王 - 末日弹幕 ==========
    bossLevel10(boss, bulletKey, phase, density, ratio) {
        const type = phase % 8;
        switch (type) {
            case 0: if (ratio < 0.45) { this.touhouCirclePattern(boss, bulletKey, Math.floor(28*density), 135); this.time.delayedCall(80, () => { if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) this.touhouCirclePattern(boss, bulletKey, Math.floor(22*density), 155); }); } break;
            case 1: this.touhouVortexPattern(boss, bulletKey, density); break;
            case 2: if (ratio < 0.45) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(20*density), 170); break;
            case 3: this.touhouMultiRingPattern(boss, bulletKey, Math.floor(5*density), Math.floor(15*density), 150); break;
            case 4: this.touhouHomingPattern(boss, bulletKey, Math.floor(9*density), 180); break;
            case 5: this.touhouMatrixPattern(boss, bulletKey, density); break;
            case 6: if (ratio < 0.45) this.touhouSpiralPattern(boss, bulletKey, Math.floor(13*density), 230); break;
            case 7: if (ratio < 0.4) { this.touhouFanPattern(boss, bulletKey, Math.floor(15*density), 320); this.time.delayedCall(120, () => { if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) this.touhouScreenRainPattern(boss, bulletKey, Math.floor(16*density), 185); }); } break;
        }
    }

    touhouFanPattern(boss, bulletKey, bulletCount, speed, angleOffset = 0, color = 0xFF4444) {
        const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + angleOffset;
        const spreadAngle = Math.PI / 3;
        const angleStep = spreadAngle / (bulletCount - 1);
        const startAngle = baseAngle - spreadAngle / 2;

        for (let i = 0; i < bulletCount; i++) {
            const angle = startAngle + angleStep * i;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(14, 14);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.8);
            bullet.setOrigin(0.5);
            bullet.setTint(color);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 3000;
            bullet.maxDistance = 650;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.5;
        }
    }

    touhouCirclePattern(boss, bulletKey, bulletCount, speed, color = 0xFF4444) {
        const angleStep = (Math.PI * 2) / bulletCount;
        for (let i = 0; i < bulletCount; i++) {
            const angle = angleStep * i;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(12, 12);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.75);
            bullet.setOrigin(0.5);
            bullet.setTint(color);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 3000;
            bullet.maxDistance = 650;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.45;
        }
    }

    touhouMultiRingPattern(boss, bulletKey, ringCount, bulletsPerRing, speed) {
        for (let ring = 0; ring < ringCount; ring++) {
            this.time.delayedCall(ring * 200, () => {
                const angleStep = (Math.PI * 2) / bulletsPerRing;
                for (let i = 0; i < bulletsPerRing; i++) {
                    const angle = angleStep * i;
                    const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    bullet.setDisplaySize(12, 12);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.7);
                    bullet.setOrigin(0.5);
                    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    bullet.lifespan = 2500;
                    bullet.maxDistance = 550;
                    bullet.startX = boss.x;
                    bullet.startY = boss.y;
                    bullet.damage = boss.damage * 0.4;
                }
            });
        }
    }

    // ========== 藤蔓弹幕 ==========
    touhouVinePattern(boss, bulletKey, density, color = 0x33AA33) {
        const bulletCount = Math.floor(6 * density);
        for (let i = 0; i < bulletCount; i++) {
            const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
            const angle = baseAngle + (Math.random() - 0.5) * 0.8;
            this.time.delayedCall(i * 80, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    bullet.setDisplaySize(10, 24); // 长条形
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.7);
                    bullet.setOrigin(0.5);
                    bullet.setTint(color);
                    bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
                    bullet.lifespan = 3500;
                    bullet.damage = boss.damage * 0.4;
                }
            });
        }
    }

    // ========== 追踪子弹 ==========
    touhouHomingPattern(boss, bulletKey, bulletCount, speed) {
        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(15, 15);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.85);
            bullet.setOrigin(0.5);
            bullet.setTint(0xFF44FF); // 紫粉色追踪
            bullet.isHoming = true; // 标记为追踪弹
            bullet.homingSpeed = speed;
            bullet.homingTurnRate = 0.08; // 转向速度
            bullet.lifespan = 4000;
            bullet.damage = boss.damage * 0.6;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
        }
    }

    // ========== 旋涡弹幕 ==========
    touhouVortexPattern(boss, bulletKey, density) {
        const layers = Math.floor(3 * density);
        const bulletsPerLayer = Math.floor(10 * density);
        
        for (let layer = 0; layer < layers; layer++) {
            this.time.delayedCall(layer * 120, () => {
                const angleStep = (Math.PI * 2) / bulletsPerLayer;
                for (let i = 0; i < bulletsPerLayer; i++) {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const angle = angleStep * i + (layer * 0.3); // 每层偏移
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(11, 11);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.75);
                        bullet.setOrigin(0.5);
                        bullet.setTint(0x22DDFF);
                        bullet.setVelocity(Math.cos(angle) * (160 + layer * 20), Math.sin(angle) * (160 + layer * 20));
                        bullet.lifespan = 3200;
                        bullet.damage = boss.damage * 0.4;
                    }
                }
            });
        }
    }

    // ========== 矩阵弹幕 ==========
    touhouMatrixPattern(boss, bulletKey, density) {
        const cols = Math.floor(5 * density);
        const rows = Math.floor(4 * density);
        
        for (let row = 0; row < rows; row++) {
            this.time.delayedCall(row * 90, () => {
                for (let col = 0; col < cols; col++) {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const startX = boss.x + (col - cols/2) * 40;
                        const startY = boss.y + 50;
                        const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);
                        
                        const bullet = this.enemyBullets.create(startX, startY, bulletKey);
                        bullet.setDisplaySize(13, 13);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.7);
                        bullet.setOrigin(0.5);
                        bullet.setTint(0xEEBB44);
                        bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
                        bullet.lifespan = 3000;
                        bullet.damage = boss.damage * 0.4;
                    }
                }
            });
        }
    }

    touhouRandomPattern(boss, bulletKey, bulletCount, speed) {
        for (let i = 0; i < bulletCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(10, 10);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.6);
            bullet.setOrigin(0.5);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 2500;
            bullet.maxDistance = 600;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.3;
        }
    }

    // 全屏弹幕雨 - 从屏幕四周随机位置生成子弹，全部瞄准玩家
    touhouScreenRainPattern(boss, bulletKey, bulletCount, speed) {
        for (let i = 0; i < bulletCount; i++) {
            // 随机选择屏幕边缘的一个点作为子弹生成位置
            let startX, startY;
            const edge = Math.floor(Math.random() * 4); // 0:上 1:右 2:下 3:左

            switch (edge) {
                case 0: // 上边缘
                    startX = Math.random() * GAME_WIDTH;
                    startY = -20;
                    break;
                case 1: // 右边缘
                    startX = GAME_WIDTH + 20;
                    startY = Math.random() * GAME_HEIGHT;
                    break;
                case 2: // 下边缘
                    startX = Math.random() * GAME_WIDTH;
                    startY = GAME_HEIGHT + 20;
                    break;
                case 3: // 左边缘
                    startX = -20;
                    startY = Math.random() * GAME_HEIGHT;
                    break;
            }

            // 计算从生成点到玩家的角度（瞄准玩家）
            const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);

            const bullet = this.enemyBullets.create(startX, startY, bulletKey);
            bullet.setDisplaySize(14, 14);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.85);
            bullet.setOrigin(0.5);

            // 添加颜色变化 - 根据来源边缘着色
            const edgeColors = [0xFF4444, 0xFFAA00, 0x44FF44, 0x4488FF]; // 上红 右橙 下绿 左蓝
            bullet.setTint(edgeColors[edge]);

            bullet.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );

            bullet.lifespan = 3500;
            bullet.maxDistance = 800;
            bullet.startX = startX;
            bullet.startY = startY;
            bullet.damage = boss.damage * 0.35; // 稍微降低伤害，因为数量多
        }

        // 添加警告效果 - 屏幕边缘闪烁
        if (this.screenFlash) {
            this.screenFlash.destroy();
        }
        this.screenFlash = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0xFF0000, 0.08);
        this.screenFlash.setDepth(100);
        this.tweens.add({
            targets: this.screenFlash,
            alpha: 0,
            duration: 400,
            onComplete: () => {
                if (this.screenFlash && this.screenFlash.active) {
                    this.screenFlash.destroy();
                    this.screenFlash = null;
                }
            }
        });
    }

    // ==================== 魔神Boss特有弹幕模式 ====================
    
    // 触手直线弹
    tentacleLinePattern(boss, bulletKey, bulletCount, speed, color = 0x220044) {
        for (let i = 0; i < bulletCount; i++) {
            const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + (Math.random() - 0.5) * 0.4;
            this.time.delayedCall(i * 30, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    bullet.setDisplaySize(10, 28); // 长条形
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.85);
                    bullet.setTint(color);
                    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    bullet.lifespan = 3000;
                    bullet.damage = boss.damage * 0.35;
                }
            });
        }
    }
    
    // 触手波浪扫射
    tentacleWavePattern(boss, bulletKey, bulletCount, speed) {
        for (let i = 0; i < bulletCount; i++) {
            const baseAngle = (Math.PI * 2 / bulletCount) * i;
            const waveOffset = Math.sin(this.time.now / 300 + i) * 0.5;
            
            if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                bullet.setDisplaySize(12, 24);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
                bullet.setAlpha(0.8);
                bullet.setTint(0x441166);
                
                const angle = baseAngle + waveOffset;
                bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                bullet.lifespan = 3500;
                bullet.damage = boss.damage * 0.3;
            }
        }
    }
    
    // 孢子散弹
    sporeSpreadPattern(boss, bulletKey, bulletCount, speed, color = 0x8822AA) {
        const angleStep = (Math.PI * 2) / bulletCount;
        for (let i = 0; i < bulletCount; i++) {
            const angle = angleStep * i;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(14, 14);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.75);
            bullet.setTint(color);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 2800;
            bullet.damage = boss.damage * 0.25;
        }
    }
    
    // 激光网
    laserNetPattern(boss, bulletKey, bulletCount, speed, color = 0xFF0022) {
        const lines = Math.floor(bulletCount / 3);
        for (let line = 0; line < lines; line++) {
            const startAngle = (Math.PI / lines) * line;
            for (let i = 0; i < 3; i++) {
                this.time.delayedCall(i * 50, () => {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(6, 40); // 激光条形
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.9);
                        bullet.setTint(color);
                        
                        const angle = startAngle + (i - 1) * 0.15;
                        bullet.setVelocity(Math.cos(angle) * speed * 1.2, Math.sin(angle) * speed * 1.2);
                        bullet.lifespan = 2500;
                        bullet.damage = boss.damage * 0.45;
                    }
                });
            }
        }
    }
    
    // 眼球追踪弹
    eyeHomingPattern(boss, bulletKey, bulletCount, speed) {
        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(18, 18); // 大眼球
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.9);
            bullet.setTint(0xFF0000);
            bullet.isHoming = true;
            bullet.homingSpeed = speed;
            bullet.homingTurnRate = 0.12; // 更强的追踪能力
            bullet.lifespan = 4500;
            bullet.damage = boss.damage * 0.55;
        }
    }
    
    // 幻觉弹（召唤幻影）
    illusionPattern(boss, bulletKey, bulletCount, speed) {
        // 从屏幕两侧生成幻影弹幕
        const leftX = 50;
        const rightX = GAME_WIDTH - 50;
        
        for (let i = 0; i < bulletCount / 2; i++) {
            const y = 100 + (i * 60);
            
            // 左侧幻影
            this.time.delayedCall(i * 80, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const angleL = Phaser.Math.Angle.Between(leftX, y, this.player.x, this.player.y);
                    const bulletL = this.enemyBullets.create(leftX, y, bulletKey);
                    bulletL.setDisplaySize(16, 16);
                    bulletL.setBlendMode(Phaser.BlendModes.ADD);
                    bulletL.setTint(0xAA00AA);
                    bulletL.setVelocity(Math.cos(angleL) * speed, Math.sin(angleL) * speed);
                    bulletL.lifespan = 3200;
                    bulletL.damage = boss.damage * 0.4;
                    
                    // 右侧幻影
                    const angleR = Phaser.Math.Angle.Between(rightX, y, this.player.x, this.player.y);
                    const bulletR = this.enemyBullets.create(rightX, y, bulletKey);
                    bulletR.setDisplaySize(16, 16);
                    bulletR.setBlendMode(Phaser.BlendModes.ADD);
                    bulletR.setTint(0xAA00AA);
                    bulletR.setVelocity(Math.cos(angleR) * speed, Math.sin(angleR) * speed);
                    bulletR.lifespan = 3200;
                    bulletR.damage = boss.damage * 0.4;
                }
            });
        }
    }
    
    // 星辰坠落弹
    starFallPattern(boss, bulletKey, bulletCount, speed, color = 0xFFDD00) {
        for (let i = 0; i < bulletCount; i++) {
            const x = Math.random() * GAME_WIDTH;
            const startY = -20 - Math.random() * 100;
            
            this.time.delayedCall(i * 60, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(x, startY, bulletKey);
                    bullet.setDisplaySize(24, 24); // 大星辰
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.85);
                    bullet.setTint(color);
                    bullet.setVelocity((Math.random() - 0.5) * 100, speed);
                    bullet.lifespan = 4000;
                    bullet.damage = boss.damage * 0.6;
                    bullet.isStar = true; // 标记为星辰弹，可分裂
                    
                    // 星辰落地后分裂
                    this.time.delayedCall(1500, () => {
                        if (bullet && bullet.active && bullet.isStar) {
                            const splitCount = 8;
                            const splitAngleStep = (Math.PI * 2) / splitCount;
                            for (let j = 0; j < splitCount; j++) {
                                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                                    const splitBullet = this.enemyBullets.create(bullet.x, bullet.y, bulletKey);
                                    splitBullet.setDisplaySize(10, 10);
                                    splitBullet.setBlendMode(Phaser.BlendModes.ADD);
                                    splitBullet.setTint(0xFFAA00);
                                    splitBullet.setVelocity(
                                        Math.cos(splitAngleStep * j) * 180,
                                        Math.sin(splitAngleStep * j) * 180
                                    );
                                    splitBullet.lifespan = 2000;
                                    splitBullet.damage = boss.damage * 0.25;
                                }
                            }
                            bullet.destroy();
                        }
                    });
                }
            });
        }
    }
    
    // 旋转星环弹
    starRingPattern(boss, bulletKey, ringCount, bulletsPerRing, speed) {
        for (let ring = 0; ring < ringCount; ring++) {
            this.time.delayedCall(ring * 250, () => {
                const angleStep = (Math.PI * 2) / bulletsPerRing;
                const rotationSpeed = (ring % 2 === 0 ? 1 : -1) * 0.02; // 交替旋转方向
                
                for (let i = 0; i < bulletsPerRing; i++) {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const angle = angleStep * i + (this.time.now / 500) * (ring + 1);
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(13, 13);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setTint(0xFFCC00);
                        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        bullet.lifespan = 3000;
                        bullet.damage = boss.damage * 0.35;
                        bullet.rotationDir = rotationSpeed;
                    }
                }
            });
        }
    }
    
    // 时间扭曲弹（变速弹）
    timeWarpPattern(boss, bulletKey, bulletCount, speed) {
        const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = baseAngle + (i - bulletCount/2) * 0.1;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(15, 15);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setTint(0x8888FF);
            
            // 随机初始速度，会突然加速或减速
            const initialSpeed = speed * (0.5 + Math.random());
            bullet.setVelocity(Math.cos(angle) * initialSpeed, Math.sin(angle) * initialSpeed);
            bullet.lifespan = 4000;
            bullet.damage = boss.damage * 0.4;
            bullet.isTimeWarped = true; // 标记为时间扭曲弹
            
            // 随机时间后改变速度
            const warpDelay = Phaser.Math.Between(800, 2000);
            this.time.delayedCall(warpDelay, () => {
                if (bullet && bullet.active) {
                    const newSpeed = speed * (Math.random() > 0.5 ? 1.5 : 0.3);
                    bullet.setVelocity(Math.cos(angle) * newSpeed, Math.sin(angle) * newSpeed);
                }
            });
        }
    }
    
    // 高密度混沌弹
    highDensityChaosPattern(boss, bulletKey, bulletCount, speed) {
        // 混合多种弹幕类型
        const patterns = ['fan', 'circle', 'homing', 'aimed'];
        
        for (let i = 0; i < bulletCount; i++) {
            const pattern = patterns[i % 4];
            const angle = (Math.PI * 2 / bulletCount) * i;
            
            this.time.delayedCall(i * 20, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    bullet.setDisplaySize(12, 12);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.8);
                    bullet.setTint(0x666666);
                    
                    let finalAngle, finalSpeed;
                    switch (pattern) {
                        case 'fan':
                            finalAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + (Math.random() - 0.5) * 0.8;
                            finalSpeed = speed;
                            break;
                        case 'circle':
                            finalAngle = angle;
                            finalSpeed = speed * 0.9;
                            break;
                        case 'homing':
                            finalAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                            finalSpeed = speed * 0.7;
                            bullet.isHoming = true;
                            bullet.homingSpeed = finalSpeed;
                            bullet.homingTurnRate = 0.08;
                            break;
                        case 'aimed':
                        default:
                            finalAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                            finalSpeed = speed * 1.1;
                            break;
                    }
                    
                    bullet.setVelocity(Math.cos(finalAngle) * finalSpeed, Math.sin(finalAngle) * finalSpeed);
                    bullet.lifespan = 3500;
                    bullet.damage = boss.damage * 0.3;
                }
            });
        }
    }
    
    // 狙击激光
    sniperLaserPattern(boss, bulletKey, speed) {
        // 精准指向自机的极细激光
        const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
        
        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
        bullet.setDisplaySize(4, 60); // 极细长条
        bullet.setBlendMode(Phaser.BlendModes.ADD);
        bullet.setAlpha(1);
        bullet.setTint(0xFF0000);
        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        bullet.lifespan = 2000;
        bullet.damage = boss.damage * 0.8; // 高伤害
    }
    
    // 镜像弹
    mirrorImagePattern(boss, bulletKey, bulletCount, speed) {
        // 在玩家周围生成镜像位置发射弹幕
        for (let i = 0; i < bulletCount; i++) {
            const offsetX = (Math.random() - 0.5) * 200;
            const offsetY = (Math.random() - 0.5) * 200;
            const mirrorX = this.player.x + offsetX;
            const mirrorY = this.player.y + offsetY;
            
            // 边界检查
            const clampedX = Phaser.Math.Clamp(mirrorX, 50, GAME_WIDTH - 50);
            const clampedY = Phaser.Math.Clamp(mirrorY, 50, GAME_HEIGHT - 50);
            
            this.time.delayedCall(i * 70, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const angle = Phaser.Math.Angle.Between(clampedX, clampedY, this.player.x, this.player.y);
                    const bullet = this.enemyBullets.create(clampedX, clampedY, bulletKey);
                    bullet.setDisplaySize(14, 14);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setTint(0xFF44FF);
                    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    bullet.lifespan = 3000;
                    bullet.damage = boss.damage * 0.45;
                }
            });
        }
    }
    
    // 极致弹幕风暴
    ultimateDanmakuStorm(boss, bulletKey, bulletCount, speed) {
        // 全屏高密度弹幕
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i + (this.time.now / 1000);
            
            this.time.delayedCall(i * 10, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    bullet.setDisplaySize(11, 11);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.75);
                    bullet.setTint(0xFF2222);
                    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    bullet.lifespan = 2500;
                    bullet.damage = boss.damage * 0.25;
                }
            });
        }
    }
    
    // 多层激光网
    multiLayerLaserNet(boss, bulletKey, bulletCount, speed) {
        const layers = 3;
        const perLayer = Math.floor(bulletCount / layers);
        
        for (let layer = 0; layer < layers; layer++) {
            this.time.delayedCall(layer * 120, () => {
                for (let i = 0; i < perLayer; i++) {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const angle = (Math.PI / perLayer) * i + (layer * 0.2);
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(5, 45);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.95);
                        bullet.setTint(0xFF0044);
                        bullet.setVelocity(Math.cos(angle) * speed * (1 + layer * 0.2), 
                                          Math.sin(angle) * speed * (1 + layer * 0.2));
                        bullet.lifespan = 2200;
                        bullet.damage = boss.damage * 0.5;
                    }
                }
            });
        }
    }
    
    // 心核脉冲
    corePulsePattern(boss, bulletKey, bulletCount, speed) {
        // 全屏冲击波式脉冲
        for (let pulse = 0; pulse < 3; pulse++) {
            this.time.delayedCall(pulse * 300, () => {
                const countPerPulse = Math.floor(bulletCount / 3);
                for (let i = 0; i < countPerPulse; i++) {
                    const angle = (Math.PI * 2 / countPerPulse) * i;
                    
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(16, 16);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.9);
                        bullet.setTint(0xFFAA00);
                        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        bullet.lifespan = 2800;
                        bullet.damage = boss.damage * 0.4;
                    }
                }
                
                // 警告效果
                if (this.screenFlash) this.screenFlash.destroy();
                this.screenFlash = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0xFF0000, 0.06);
                this.screenFlash.setDepth(100).setScrollFactor(0);
                this.tweens.add({
                    targets: this.screenFlash,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => { if (this.screenFlash) { this.screenFlash.destroy(); this.screenFlash = null; } }
                });
            });
        }
    }
    
    // 全屏追踪弹雨
    fullScreenHomingRain(boss, bulletKey, bulletCount, speed) {
        // 从全屏边缘生成追踪弹
        for (let i = 0; i < bulletCount; i++) {
            let startX, startY;
            const edge = Math.floor(Math.random() * 4);
            
            switch (edge) {
                case 0: startX = Math.random() * GAME_WIDTH; startY = -20; break;
                case 1: startX = GAME_WIDTH + 20; startY = Math.random() * GAME_HEIGHT; break;
                case 2: startX = Math.random() * GAME_WIDTH; startY = GAME_HEIGHT + 20; break;
                case 3: startX = -20; startY = Math.random() * GAME_HEIGHT; break;
            }
            
            this.time.delayedCall(i * 40, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    const bullet = this.enemyBullets.create(startX, startY, bulletKey);
                    bullet.setDisplaySize(14, 14);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.85);
                    bullet.setTint(0xFF00FF);
                    bullet.isHoming = true;
                    bullet.homingSpeed = speed;
                    bullet.homingTurnRate = 0.1;
                    bullet.lifespan = 4500;
                    bullet.damage = boss.damage * 0.4;
                }
            });
        }
    }
    
    // 死亡螺旋
    deathSpiralPattern(boss, bulletKey, bulletCount, speed) {
        // 多重螺旋交叉
        const spirals = 4;
        const perSpiral = Math.floor(bulletCount / spirals);
        
        for (let spiral = 0; spiral < spirals; spiral++) {
            this.time.delayedCall(spiral * 80, () => {
                const baseAngle = (Math.PI * 2 / spirals) * spiral;
                for (let i = 0; i < perSpiral; i++) {
                    if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                        const angle = baseAngle + (i * 0.3) + (this.time.now / 400);
                        const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                        bullet.setDisplaySize(12, 12);
                        bullet.setBlendMode(Phaser.BlendModes.ADD);
                        bullet.setAlpha(0.8);
                        bullet.setTint(spiral % 2 === 0 ? 0xFF0000 : 0xFFFF00);
                        bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        bullet.lifespan = 3000;
                        bullet.damage = boss.damage * 0.32;
                    }
                }
            });
        }
    }
    
    // 混沌末日弹
    chaosApocalypsePattern(boss, bulletKey, bulletCount, speed) {
        // 所有弹幕类型的终极混合
        const types = ['line', 'homing', 'circle', 'laser', 'rain'];
        
        for (let i = 0; i < bulletCount; i++) {
            const type = types[i % types.length];
            
            this.time.delayedCall(i * 15, () => {
                if (this.enemyBullets && this.enemyBullets.getChildren().length < this.maxBullets) {
                    let bullet, angle, finalSpeed;
                    
                    switch (type) {
                        case 'line':
                            angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + (Math.random() - 0.5) * 0.6;
                            finalSpeed = speed;
                            break;
                        case 'homing':
                            angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                            finalSpeed = speed * 0.75;
                            break;
                        case 'circle':
                            angle = (Math.PI * 2 / bulletCount) * i;
                            finalSpeed = speed * 0.85;
                            break;
                        case 'laser':
                            angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
                            finalSpeed = speed * 1.3;
                            break;
                        case 'rain': {
                            const edge = Math.floor(Math.random() * 4);
                            switch (edge) {
                                case 0: bullet = this.enemyBullets.create(Math.random() * GAME_WIDTH, -20, bulletKey); break;
                                case 1: bullet = this.enemyBullets.create(GAME_WIDTH + 20, Math.random() * GAME_HEIGHT, bulletKey); break;
                                case 2: bullet = this.enemyBullets.create(Math.random() * GAME_WIDTH, GAME_HEIGHT + 20, bulletKey); break;
                                default: bullet = this.enemyBullets.create(-20, Math.random() * GAME_HEIGHT, bulletKey); break;
                            }
                            angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, this.player.x, this.player.y);
                            finalSpeed = speed * 0.9;
                            break;
                        }
                        default:
                            angle = (Math.PI * 2 / bulletCount) * i;
                            finalSpeed = speed;
                    }
                    
                    if (!bullet) {
                        bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                    }
                    
                    bullet.setDisplaySize(type === 'laser' ? 5 : 12, type === 'laser' ? 50 : 12);
                    bullet.setBlendMode(Phaser.BlendModes.ADD);
                    bullet.setAlpha(0.8);
                    bullet.setTint(0xFF3333);
                    
                    if (type === 'homing') {
                        bullet.isHoming = true;
                        bullet.homingSpeed = finalSpeed;
                        bullet.homingTurnRate = 0.09;
                    }
                    
                    bullet.setVelocity(Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed);
                    bullet.lifespan = 3500;
                    bullet.damage = boss.damage * 0.28;
                }
            });
        }
    }

    touhouAimedPattern(boss, bulletKey, bulletCount, speed) {
        const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = baseAngle + (i - Math.floor(bulletCount / 2)) * 0.08;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(14, 14);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.9);
            bullet.setOrigin(0.5);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 3000;
            bullet.maxDistance = 700;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.6;
        }
    }

    touhouCirclePattern(boss, bulletKey, bulletCount, speed) {
        const angleStep = (Math.PI * 2) / bulletCount;

        for (let i = 0; i < bulletCount; i++) {
            const angle = angleStep * i;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(12, 12);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.8);
            bullet.setOrigin(0.5);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 2500;
            bullet.maxDistance = 500;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.5;
        }
    }

    touhouSpiralPattern(boss, bulletKey, bulletCount, speed, angleOffset = 0, color = 0xFF4444) {
        // 支持两种模式：
        if (angleOffset === 0 && bulletCount < 10) { // 简单旋转螺旋模式
            const angleStep = (Math.PI * 2) / bulletCount;
            const baseAngle = this.time.now / 500;
            for (let i = 0; i < bulletCount; i++) {
                const angle = baseAngle + angleStep * i;
                const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                bullet.setDisplaySize(10, 10);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
                bullet.setAlpha(0.7);
                bullet.setOrigin(0.5);
                bullet.setTint(color);
                bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                bullet.lifespan = 3000;
                bullet.maxDistance = 600;
                bullet.startX = boss.x;
                bullet.startY = boss.y;
                bullet.damage = boss.damage * 0.5;
            }
        } else { // 扇形偏移模式
            const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + angleOffset;
            for (let i = 0; i < bulletCount; i++) {
                const angle = baseAngle + (i - 1) * 0.15;
                const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                bullet.setDisplaySize(14, 14);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
                bullet.setAlpha(0.8);
                bullet.setOrigin(0.5);
                bullet.setTint(color);
                bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                bullet.lifespan = 3000;
                bullet.maxDistance = 650;
                bullet.startX = boss.x;
                bullet.startY = boss.y;
                bullet.damage = boss.damage * 0.5;
            }
        }
    }

    touhouDoubleFanPattern(boss, bulletKey, bulletCount, speed, delay) {
        const baseAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
        const spreadAngle = Math.PI / 4;
        const angleStep = spreadAngle / (bulletCount / 2 - 1);

        // 第一波 - 向上分散
        for (let i = 0; i < bulletCount / 2; i++) {
            const angle = -Math.PI / 2 + (i - 1) * angleStep;
            const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
            bullet.setDisplaySize(12, 12);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setAlpha(0.8);
            bullet.setOrigin(0.5);
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.lifespan = 3000;
            bullet.maxDistance = 650;
            bullet.startX = boss.x;
            bullet.startY = boss.y;
            bullet.damage = boss.damage * 0.5;
        }

        // 第二波 - 延迟后向下分散
        this.time.delayedCall(delay, () => {
            for (let i = 0; i < bulletCount / 2; i++) {
                const angle = Math.PI / 2 + (i - 1) * angleStep;
                const bullet = this.enemyBullets.create(boss.x, boss.y, bulletKey);
                bullet.setDisplaySize(12, 12);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
                bullet.setAlpha(0.8);
                bullet.setOrigin(0.5);
                bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                bullet.lifespan = 3000;
                bullet.maxDistance = 650;
                bullet.startX = boss.x;
                bullet.startY = boss.y;
                bullet.damage = boss.damage * 0.5;
            }
        });
    }

    enemyDash(enemy, angle) {
        const dashSpeed = enemy.speed * 3;
        enemy.setVelocity(
            Math.cos(angle) * dashSpeed,
            Math.sin(angle) * dashSpeed
        );

        this.tweens.add({
            targets: enemy,
            alpha: 0.7,
            duration: 100,
            yoyo: true,
            repeat: 1
        });

        this.time.delayedCall(300, () => {
            if (enemy.active && !enemy.isDead) {
                enemy.setVelocity(
                    Math.cos(angle) * enemy.speed,
                    Math.sin(angle) * enemy.speed
                );
            }
        });
    }

    killEnemy(enemy) {
        if (!enemy || enemy.isDead) return;
        enemy.isDead = true;

        // 只在boss死亡时播放音效（但最终Boss不播放死亡音效）
        if (enemy.isBoss && !enemy.isFinalBoss) {
            this.playSound('death');
        }

        // 确保dropCoins是数组
        const dropCoins = Array.isArray(enemy.dropCoins) ? enemy.dropCoins : [enemy.dropCoins || 0, enemy.dropCoins || 0];
        const coinDrop = Phaser.Math.Between(
            isNaN(dropCoins[0]) ? 0 : dropCoins[0], 
            isNaN(dropCoins[1]) ? 0 : dropCoins[1]
        );
        
        // 安全检查：确保coinDrop是有效数字
        if (!isNaN(coinDrop) && isFinite(coinDrop) && coinDrop > 0) {
            this.player.coins = (this.player.coins || 0) + coinDrop;
        }

        const expReward = enemy.isBoss ? 100 : Math.floor(enemy.maxHealth / 2);
        this.addExperience(expReward);
        
        const energyReward = enemy.isBoss ? 50 : 5;
        this.addEnergy(energyReward);

        // 敌人死亡时掉落道具（增加奖励）
        if (!enemy.isBoss && Math.random() < 0.35) { // 35%概率掉落
            this.time.delayedCall(100, () => {
                if (this.gameState === 'playing') {
                    this.spawnEnemyDropItem(enemy.x, enemy.y);
                }
            });
        }

        this.updateUI();

        // 安全销毁血条和文本（只对Boss）
        if (enemy.isBoss) {
            if (enemy.healthBar && enemy.healthBar.active) enemy.healthBar.destroy();
            if (enemy.healthBarBg && enemy.healthBarBg.active) enemy.healthBarBg.destroy();
            if (enemy.nameText && enemy.nameText.active) enemy.nameText.destroy();
        }

        // 最终Boss处理：走正常胜利流程，进入第12章终幕剧情
        if (enemy.isBoss && enemy.isFinalBoss) {
            console.log('🎬 最终Boss被击败！进入第12章终幕剧情...');
            if (this.enemyBullets) {
                this.enemyBullets.getChildren().forEach(b => { if (b && b.active) b.destroy(); });
            }
            if (this.bossPhaseIndicator) { try { this.bossPhaseIndicator.destroy(); } catch(e){} }
            enemy.destroy();
            this.time.delayedCall(500, () => {
                this.triggerVictory();
            });
            return;
        }

        this.tweens.add({
            targets: enemy,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (enemy && enemy.active) {
                    enemy.destroy();
                }
            }
        });

        if (!enemy.isBoss) {
            this.enemiesDefeated++;
            this.updateUI();
            this.checkWinCondition();
        } else {
            this.onBossDefeated();
        }
    }

    onBossDefeated() {
        this.playSound('level_up');
        this.cameras.main.shake(500, 0.02);

        window.audioManager.stop('boss_bgm');

        // 立即停止游戏逻辑，防止后续伤害
        this.gameState = 'victory';

        // 立即停止玩家移动
        if (this.player && this.player.active) {
            this.player.setVelocity(0, 0);
        }

        // 清理所有子弹（包括玩家子弹和敌人子弹）
        if (this.enemyBullets) {
            this.enemyBullets.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    bullet.destroy();
                }
            });
        }

        if (this.bullets) {
            this.bullets.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    bullet.destroy();
                }
            });
        }

        // 停止所有敌人移动
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active) {
                    enemy.setVelocity(0, 0);
                }
            });
        }

        // 显示胜利界面
        this.showVictoryUI();

        // 播放胜利音乐
        window.audioManager.play('victory_bgm', null, false, this.musicVolume * 0.5);

        // 延迟后检查是否有战后对话
        this.time.delayedCall(2500, () => {
            if (this.levelData.endingDialogue) {
                this.showPostBattleDialogue();
            } else {
                this.endLevel();
            }
        });
    }

    showPostBattleDialogue() {
        console.log('📜 显示战后对话');

        // 隐藏胜利UI
        if (this.victoryOverlay) this.victoryOverlay.setAlpha(0);
        if (this.victoryText) this.victoryText.setAlpha(0);
        if (this.victoryRewardText) this.victoryRewardText.setAlpha(0);
        if (this.victoryHintText) this.victoryHintText.setAlpha(0);

        // 使用 DialogueManager 播放战后对话
        this.dialogueManager = new DialogueManager(this);
        this.dialogueManager.startDialogue(this.levelData.endingDialogue, () => {
            console.log('✅ 战后对话完毕，进入章节结算');
            this.dialogueManager = null;
            this.showChapterCompleteCard();
        });
    }

    showChapterCompleteCard() {
        console.log('🏆 显示章节完成卡片');

        // 章节完成遮罩
        const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
        overlay.setDepth(200);

        // "章节完成" 标题
        const completeTitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '—— 章节完成 ——', {
            fontSize: '40px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        // 章节名称
        const chapterName = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.levelData.name || '', {
            fontSize: '24px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        // 结算文字（如有）
        let endingTextObj = null;
        if (this.levelData.endingText) {
            const shortText = this.levelData.endingText.split('\n')[0];
            endingTextObj = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, shortText, {
                fontSize: '16px',
                fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
                color: '#AADDFF',
                align: 'center',
                wordWrap: { width: GAME_WIDTH - 200 }
            }).setOrigin(0.5).setDepth(201).setAlpha(0);
        }

        // 继续提示
        const continueHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, '按 ENTER 继续', {
            fontSize: '18px',
            fontFamily: 'Microsoft YaHei, SimHei, sans-serif',
            color: '#88FF88',
            align: 'center'
        }).setOrigin(0.5).setDepth(201).setAlpha(0);

        // 淡入动画
        this.tweens.add({
            targets: overlay,
            alpha: 0.85,
            duration: 500
        });

        this.tweens.add({
            targets: [completeTitle, chapterName, endingTextObj, continueHint].filter(Boolean),
            alpha: 1,
            duration: 600,
            delay: 300,
            stagger: 150
        });

        // 闪烁提示
        this.tweens.add({
            targets: continueHint,
            alpha: 0.3,
            duration: 600,
            delay: 1500,
            yoyo: true,
            repeat: -1
        });

        // 监听 Enter 键
        const enterHandler = () => {
            this.input.keyboard.off('keydown-ENTER', enterHandler);
            this.input.off('pointerdown', clickHandler);

            this.tweens.add({
                targets: [overlay, completeTitle, chapterName, endingTextObj, continueHint].filter(Boolean),
                alpha: 0,
                duration: 400,
                onComplete: () => {
                    [overlay, completeTitle, chapterName, endingTextObj, continueHint].forEach(obj => {
                        if (obj && obj.active) obj.destroy();
                    });
                    this.endLevel();
                }
            });
        };

        const clickHandler = () => {
            enterHandler();
        };

        this.input.keyboard.on('keydown-ENTER', enterHandler);
        this.input.on('pointerdown', clickHandler);
    }

    showVictoryUI() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        // 半透明黑色遮罩
        this.victoryOverlay = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
        this.victoryOverlay.setDepth(100);

        // 胜利文字
        this.victoryText = this.add.text(centerX, centerY - 50, '胜利！', {
            fontSize: '64px',
            fontFamily: 'Courier New',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(101);

        // 显示获得的奖励
        this.victoryRewardText = this.add.text(centerX, centerY + 30, `金币: ${this.player.coins}  等级: ${this.player.level}`, {
            fontSize: '24px',
            fontFamily: 'Courier New',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(101);

        // 继续提示（闪烁效果）
        this.victoryHintText = this.add.text(centerX, centerY + 80, '按 Enter 键继续', {
            fontSize: '22px',
            fontFamily: 'Courier New',
            color: '#00FF00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(101);

        // 闪烁动画
        this.tweens.add({
            targets: this.victoryHintText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 文字动画
        this.tweens.add({
            targets: this.victoryText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    checkWinCondition() {
        // 检查是否应该触发Boss或胜利
        if (this.bossSpawned) return; // Boss已出现，不再检查

        // ===== 最终Boss关卡特殊处理：无小怪，直接进入胜利检测 =====
        if (this.isFinalBossLevel) {
            // 最终Boss已经生成（在create中），这里只做最终胜利检测
            // 胜利条件在onEnemyDeath中处理
            return;
        }

        // 精确统计场上存活的敌人（排除正在死亡动画的）
        const allEnemies = this.enemies.getChildren();
        const trulyAliveEnemies = allEnemies.filter(e => 
            e.active && 
            !e.isDead && 
            e.alpha > 0.5 &&  // 排除正在淡出的
            e.scaleX > 0.3    // 排除正在缩小的
        ).length;
        
        const dyingEnemies = allEnemies.length - trulyAliveEnemies;
        
        console.log(`📊 战场状态: 存活=${trulyAliveEnemies}, 死亡中=${dyingEnemies}, 击败=${this.enemiesDefeated}, 计划=${this.totalEnemiesToSpawn}, 已生成=${this.enemiesSpawned}`);

        // ===== 有Boss的关卡：必须清完小怪才能出现Boss =====
        if (this.levelData.boss) {
            // 条件：必须击败所有已生成的敌人 + 场上没有存活的普通敌人
            const allNormalEnemiesDefeated = (trulyAliveEnemies === 0 || 
                (this.enemiesDefeated >= this.totalEnemiesToSpawn && trulyAliveEnemies <= 2));
            
            // 额外检查：确保至少生成了一部分敌人（防止开局就触发）
            const hasProgress = this.enemiesDefeated > 0 || this.enemiesSpawned >= Math.floor(this.totalEnemiesToSpawn * 0.5);
            
            if (allNormalEnemiesDefeated && hasProgress && !this.bossSpawned) {
                console.log(`✅ Boss条件满足: 击败=${this.enemiesDefeated}, 存活=${trulyAliveEnemies}`);
                
                // 延迟生成boss，确保清理干净
                this.time.delayedCall(500, () => {
                    if (this.gameState === 'playing' && !this.bossSpawned) {
                        // 最终确认：场上必须基本干净
                        const finalAlive = this.enemies.getChildren().filter(e => 
                            e.active && !e.isDead && e.alpha > 0.5
                        ).length;
                        
                        if (finalAlive <= 2) { // 最多允许2个残留（可能是刚生成的）
                            console.log(`👹 Boss出现: 场上剩余${finalAlive}个`);
                            
                            // 销毁残留的小怪
                            this.enemies.getChildren().forEach(enemy => {
                                if (enemy.active && !enemy.isDead && !enemy.isBoss) {
                                    enemy.destroy();
                                }
                            });
                            
                            this.spawnBoss();
                        } else {
                            console.log(`⏳ 延迟: 场上仍有${finalAlive}个小怪`);
                            // 继续等待
                            this.time.delayedCall(1500, () => {
                                if (this.gameState === 'playing' && !this.bossSpawned) {
                                    const lastCheck = this.enemies.getChildren().filter(e => 
                                        e.active && !e.isDead && e.alpha > 0.5
                                    ).length;
                                    
                                    if (lastCheck <= 3) {
                                        // 强制清理剩余小怪
                                        this.enemies.getChildren().forEach(enemy => {
                                            if (enemy.active && !enemy.isDead && !enemy.isBoss) {
                                                enemy.destroy();
                                            }
                                        });
                                        this.spawnBoss();
                                    }
                                }
                            });
                        }
                    }
                });
            }
            
        } else {
            // ===== 无Boss的关卡：必须击败所有敌人才能胜利 =====
            
            // 严格条件：必须击败计划总数的95%以上 且 场上存活为0
            const requiredDefeats = Math.ceil(this.totalEnemiesToSpawn * 0.98); // 要求98%！
            const allCleared = this.enemiesDefeated >= requiredDefeats && trulyAliveEnemies === 0;
            
            // 备用条件：如果场上确实没有活跃的敌人了
            const noActiveEnemies = trulyAliveEnemies === 0 && this.enemiesDefeated > 0;
            
            if ((allCleared || noActiveEnemies) && this.gameState === 'playing') {
                console.log(`✅ 胜利条件满足: 击败=${this.enemiesDefeated}/${this.totalEnemiesToSpawn}, 存活=${trulyAliveEnemies}`);
                this.triggerVictory();
            }
        }
    }

    triggerVictory() {
        // 显示胜利界面并结束关卡
        this.gameState = 'victory';

        // 立即停止玩家移动
        if (this.player && this.player.active) {
            this.player.setVelocity(0, 0);
        }

        // 清理所有子弹
        if (this.enemyBullets) {
            this.enemyBullets.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    bullet.destroy();
                }
            });
        }
        
        if (this.bullets) {
            this.bullets.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    bullet.destroy();
                }
            });
        }
        
        // 停止所有敌人移动
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active) {
                    enemy.setVelocity(0, 0);
                }
            });
        }
        
        this.showVictoryUI();
        
        // 延迟进入下一关
        this.time.delayedCall(3000, () => {
            if (this.gameState === 'victory') {
                this.endLevel();
            }
        });
    }

    triggerFinalBossVictory() {
        if (this._bossVictoryTriggered) return;
        this._bossVictoryTriggered = true;
        
        console.log('🎬 触发最终Boss救世结局动画...');
        
        this.gameState = 'victory';
        
        try { window.audioManager.stopAll(); } catch(e) {}
        
        try {
            if (this.player && this.player.active) {
                this.player.setVelocity(0, 0);
                this.player.setVisible(false);
            }
            if (this.enemyBullets) {
                this.enemyBullets.getChildren().forEach(b => { if (b && b.active) b.destroy(); });
            }
            if (this.bullets) {
                this.bullets.getChildren().forEach(b => { if (b && b.active) b.destroy(); });
            }
            if (this.enemies) {
                this.enemies.getChildren().forEach(e => { if (e && e.active) e.setVisible(false); });
            }
            if (this.boss && this.boss.active) {
                this.boss.setVisible(false);
            }
        } catch(e) {}
        
        const blackOverlay = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0);
        blackOverlay.setDepth(600).setScrollFactor(0);
        
        this.tweens.add({
            targets: blackOverlay,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                console.log('✅ 黑屏完成');
                this._startAutoEndingSequence(blackOverlay);
            }
        });
        
        this.time.delayedCall(15000, () => {
            if (!this._endingDone) {
                console.warn('⚠️ 结局总超时，强制跳转');
                this._forceJumpToEpilogue();
            }
        });
    }

    _startAutoEndingSequence(blackOverlay) {
        this._endingBlackOverlay = blackOverlay;
        this._endingDone = false;
        this._endingObjects = [];
        
        this.tweens.add({
            targets: blackOverlay,
            alpha: 0.6,
            duration: 800
        });
        
        const lines = [
            { name: "旁白", text: "你选择刺出那一剑——星辉之力彻底觉醒！", color: '#FFFFFF' },
            { name: "虚空魔神·阿撒托斯", text: "不……这不可能……我的梦……怎么会……", color: '#FF4444' },
            { name: "旁白", text: "心核碎裂，魔神整个身体爆炸成无数黑色与金色粒子。", color: '#FFFFFF' },
            { name: "旁白", text: "整个背景开始剧烈崩塌，白光吞没屏幕……", color: '#FFFFFF' },
            { name: "旁白", text: "当光芒散去，你发现自己站在一片废墟之上。", color: '#AAAAAA' },
            { name: "旁白", text: "废墟之中，一株嫩绿的新芽正从焦土中顽强地钻出。", color: '#44FF88' },
            { name: "旁白", text: "远方，残破的王都钟声再次响起……", color: '#88FFFF' }
        ];
        
        let lineIndex = 0;
        
        const showLine = () => {
            if (lineIndex >= lines.length || this._endingDone) {
                finishDialogue();
                return;
            }
            
            const line = lines[lineIndex];
            
            try {
                const bg = this.add.rectangle(
                    GAME_WIDTH / 2, GAME_HEIGHT - 100,
                    GAME_WIDTH - 40, 150,
                    0x000000, 0.85
                ).setDepth(650);
                
                const nameText = this.add.text(
                    60, GAME_HEIGHT - 155, line.name,
                    { fontSize: '20px', fontFamily: 'Courier New', color: '#FFD700',
                      stroke: '#000000', strokeThickness: 3 }
                ).setDepth(651).setAlpha(0);
                
                const bodyText = this.add.text(
                    60, GAME_HEIGHT - 125, '',
                    { fontSize: '18px', fontFamily: 'Courier New', color: line.color || '#FFFFFF',
                      wordWrap: { width: GAME_WIDTH - 120 } }
                ).setDepth(651).setAlpha(0);
                
                this._endingObjects.push(bg, nameText, bodyText);
                
                this.tweens.add({ targets: nameText, alpha: 1, duration: 200 });
                this.tweens.add({ targets: bodyText, alpha: 1, duration: 200, delay: 100 });
                
                const fullText = line.text;
                let charIdx = 0;
                const typeTimer = this.time.addEvent({
                    delay: 35,
                    repeat: fullText.length - 1,
                    callback: () => {
                        charIdx++;
                        if (bodyText.active) {
                            bodyText.setText(fullText.substring(0, charIdx));
                        }
                    }
                });
                
                this.time.delayedCall(3000, () => {
                    if (typeTimer) typeTimer.remove();
                    
                    if (bodyText.active) bodyText.setText(fullText);
                    
                    this.time.delayedCall(800, () => {
                        try {
                            this.tweens.add({ targets: [bg, nameText, bodyText], alpha: 0, duration: 300 });
                        } catch(e) {}
                        
                        lineIndex++;
                        this.time.delayedCall(400, showLine);
                    });
                });
                
            } catch(e) {
                console.error('显示结局行失败:', e, '行号:', lineIndex);
                lineIndex++;
                this.time.delayedCall(500, showLine);
            }
        };
        
        const finishDialogue = () => {
            if (this._endingDone) return;
            this._endingDone = true;
            
            console.log('✅ 结局对话完毕');
            
            try {
                this._endingObjects.forEach(obj => {
                    if (obj && obj.active) obj.destroy();
                });
            } catch(e) {}
            this._endingObjects = [];
            
            this._goToEpilogue();
        };
        
        this.time.delayedCall(500, showLine);
    }

    _goToEpilogue() {
        if (this._epilogueStarted) return;
        this._epilogueStarted = true;
        
        console.log('🎬 跳转EpilogueScene');
        
        try { window.audioManager.stopAll(); } catch(e) {}
        
        if (this._endingBlackOverlay && this._endingBlackOverlay.active) {
            try { this._endingBlackOverlay.destroy(); } catch(e) {}
        }
        
        this.time.delayedCall(500, () => {
            try {
                this.scene.start('EpilogueScene', { gameData: this.gameData || {} });
            } catch(e) {
                console.error('scene.start失败:', e);
                this._forceJumpToEpilogue();
            }
        });
    }

    _forceJumpToEpilogue() {
        if (this._forceJumped) return;
        this._forceJumped = true;
        this._endingDone = true;
        this._epilogueStarted = true;
        
        console.log('🚨 强制跳转EpilogueScene');
        
        try { window.audioManager.stopAll(); } catch(e) {}
        try { this.tweens.killAll(); } catch(e) {}
        
        this.time.delayedCall(200, () => {
            try {
                this.scene.start('EpilogueScene', { gameData: this.gameData || {} });
            } catch(e2) {
                console.error('强制跳转也失败了:', e2);
                try { this.scene.start('MenuScene'); } catch(e3) {}
            }
        });
    }

    onPlayerItemCollision(player, item) {
        if (item.isCollected) return;
        item.isCollected = true;

        this.playSound('pickup');

        const itemType = STORY_DATA.itemTypes[item.itemType];
        let actualEffect;

        // 确定实际效果类型
        if (item.itemType === 'experience') {
            actualEffect = 'experience';
        } else if (itemType) {
            actualEffect = itemType.effect;
        }

        // 显示拾取数值反馈（用简化的类型）
        this.showItemPickupFeedback(item.x, item.y, item.value, actualEffect);

        if (actualEffect === 'experience') {
            // 应用经验加成（如果有）
            const expBoost = this.player.expBoost || 1;
            const finalExpValue = Math.floor(item.value * expBoost);
            this.addExperience(finalExpValue);
            
            // 特殊的拾取效果
            this.tweens.add({
                targets: item,
                scale: 2,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    if (item && item.active) item.destroy();
                }
            });
            
            this.updateUI();
            return;
        }

        if (!itemType) {
            this.tweens.add({
                targets: item,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (item && item.active) item.destroy();
                }
            });
            return;
        }

        switch (itemType.effect) {
            case 'health':
                const healAmount = Math.min(item.value, this.player.maxHealth - this.player.health);
                this.player.health += healAmount;
                
                // 回血特效：绿色粒子
                this.showHealEffect(player.x, player.y);
                break;
            case 'coin':
                const coinMultiplier = this.player.coinMagnet || 1;
                const coinValue = item.value || 0;
                const earnedCoins = Math.floor(coinValue * coinMultiplier);
                // 安全检查：确保金币数有效
                if (!isNaN(earnedCoins) && isFinite(earnedCoins) && earnedCoins > 0) {
                    this.player.coins = (this.player.coins || 0) + earnedCoins;
                }
                break;
            case 'speed':
                this.player.speed *= itemType.value;
                this.time.delayedCall(itemType.duration, () => {
                    this.player.speed /= itemType.value;
                });
                break;
            case 'attack':
                this.player.attackDamage *= itemType.value;
                this.time.delayedCall(itemType.duration, () => {
                    this.player.attackDamage /= itemType.value;
                });
                break;
            case 'shield':
                this.player.shield = itemType.value;
                this.time.delayedCall(itemType.duration, () => {
                    this.player.shield = 0;
                });
                break;
        }

        this.updateUI();

        this.tweens.add({
            targets: item,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                if (item && item.active) item.destroy();
            }
        });
    }

    showItemPickupFeedback(x, y, value, type) {
        let color;
        let text;
        
        switch (type) {
            case 'experience':
                color = '#AA00FF'; // 紫色
                text = `+${value} EXP`;
                break;
            case 'health':
                color = '#00FF00'; // 绿色
                text = `+${value} HP`;
                break;
            case 'coin':
                color = '#FFD700'; // 金色
                text = `+${value}`;
                break;
            default:
                color = '#FFFFFF';
                text = `+${value}`;
        }

        const feedbackText = this.add.text(x, y - 20, text, {
            fontSize: '18px',
            fontFamily: 'Courier New',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(150);

        // 向上飘动并淡出
        this.tweens.add({
            targets: feedbackText,
            y: y - 60,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                if (feedbackText && feedbackText.active) {
                    feedbackText.destroy();
                }
            }
        });

        // 轻微放大效果
        this.tweens.add({
            targets: feedbackText,
            scaleX: { from: 0.5, to: 1.2 },
            scaleY: { from: 0.5, to: 1.2 },
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    showHealEffect(x, y) {
        // 创建多个绿色粒子表示回血
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const particle = this.add.circle(
                x + Math.cos(angle) * 15,
                y + Math.sin(angle) * 15,
                Phaser.Math.Between(3, 6),
                0x00FF88,
                0.9
            ).setDepth(140);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 40,
                y: y + Math.sin(angle) * 40 - 20,
                alpha: 0,
                scale: 0.3,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Power2',
                onComplete: () => {
                    if (particle && particle.active) {
                        particle.destroy();
                    }
                }
            });
        }

        // 中心十字光芒
        const crossH = this.add.rectangle(x, y, 30, 4, 0x00FF88, 0.8).setDepth(139);
        const crossV = this.add.rectangle(x, y, 4, 30, 0x00FF88, 0.8).setDepth(139);

        this.tweens.add({
            targets: [crossH, crossV],
            alpha: 0,
            scale: 2,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                if (crossH && crossH.active) crossH.destroy();
                if (crossV && crossV.active) crossV.destroy();
            }
        });
    }

    damagePlayer(amount) {
        if (this.player.shield > 0) {
            const absorbed = Math.min(this.player.shield, amount);
            this.player.shield -= absorbed;
            amount -= absorbed;
        }

        this.player.health -= amount;

        this.updateUI();

        if (this.player.health <= 0) {
            this.onPlayerDeath();
        }
    }

    onPlayerDeath() {
        if (this.gameState === 'transitioning') return;
        this.gameState = 'transitioning';

        this.playSound('death');
        // 停止所有音效，防止残留
        window.audioManager.stopAll();

        // 保存当前状态，让玩家可以重新挑战当前关卡
        this.gameData = {
            currentLevel: this.levelData.id, // 保持当前关卡
            playerHealth: 100, // 死亡后重置生命值
            playerMaxHealth: this.player.maxHealth, // 保留最大生命值（可能被卡片增强）
            playerCoins: Math.floor(this.player.coins * 0.9), // 死亡损失10%金币
            playerLevel: this.player.level, // 保留等级
            playerExperience: this.player.experience, // 保留经验值
            playerEnergy: this.player.energy || 0,
            difficulty: this.gameData.difficulty,
            // 保留卡片增益效果
            attackDamage: this.player.attackDamage,
            speed: this.player.speed,
            bulletCount: this.player.bulletCount,
            bulletSpread: this.player.bulletSpread,
            orbitBullets: this.player.orbitBullets || 0,
            hasOrbit: this.player.hasOrbit || false,
            coinMagnet: this.player.coinMagnet || 1,
            pickupRange: this.player.pickupRange || 50,
            regenRate: this.player.regenRate || 0,
            hasRegen: this.player.hasRegen || false,
            critChance: this.player.critChance || 0,
            critDamage: this.player.critDamage || 1.5,
            maxEnergy: this.player.maxEnergy || 100,
            expBoost: this.player.expBoost || 1
        };

        this.tweens.add({
            targets: this.player,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            angle: 360,
            duration: 500,
            onComplete: () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
            }
        });

        this.time.delayedCall(1000, () => {
            this.scene.start('GameOverScene', {
                levelIndex: this.levelIndex,
                gameData: this.gameData
            });
        });
    }

    endLevel() {
        this.gameState = 'transitioning';

        // 停止所有音效，防止残留
        window.audioManager.stopAll();

        this.player.health = this.player.maxHealth;

        this.gameData = {
            currentLevel: this.levelData.id + 1,
            playerHealth: this.player.maxHealth,
            playerMaxHealth: this.player.maxHealth,
            playerCoins: this.player.coins,
            playerLevel: this.player.level,
            playerExperience: this.player.experience,
            playerEnergy: this.player.energy,
            difficulty: this.gameData.difficulty,
            // 保存卡片增益效果
            attackDamage: this.player.attackDamage,
            speed: this.player.speed,
            bulletCount: this.player.bulletCount,
            bulletSpread: this.player.bulletSpread,
            orbitBullets: this.player.orbitBullets || 0,
            hasOrbit: this.player.hasOrbit || false,
            coinMagnet: this.player.coinMagnet || 1,
            pickupRange: this.player.pickupRange || 50,
            regenRate: this.player.regenRate || 0,
            hasRegen: this.player.hasRegen || false,
            critChance: this.player.critChance || 0,
            critDamage: this.player.critDamage || 1.5,
            maxEnergy: this.player.maxEnergy,
            expBoost: this.player.expBoost || 1
        };

        SaveSystem.saveGame(this.gameData);

        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(800, () => {
            // 前进到下一个关卡
            const nextLevelIndex = this.levelIndex + 1;
            console.log('尝试进入下一关卡，当前关卡索引:', this.levelIndex, '下一关卡索引:', nextLevelIndex, '总关数:', STORY_DATA.levels.length);
            
            if (nextLevelIndex < STORY_DATA.levels.length) {
                try {
                    this.scene.start('StoryScene', {
                        levelIndex: nextLevelIndex,
                        gameData: this.gameData,
                        showEndingFirst: false
                    });
                } catch (error) {
                    console.error('场景切换失败:', error);
                    // 如果切换失败，尝试回到主菜单
                    this.scene.start('MenuScene');
                }
            } else {
                // 如果已经是最后一关，触发Ending场景
                console.log('🎬 通关全部关卡，进入Ending...');
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    // 触发电影式Ending动画
                    this.scene.start('EndingScene', { 
                        isFinal: true,
                        gameData: this.gameData
                    });
                });
            }
        });
    }

    playerAttack() {
        const now = this.time.now;
        if (now - this.player.lastAttack < this.player.attackCooldown) return;

        this.player.lastAttack = now;
        this.player.isAttacking = true;

        this.playSound('attack');

        const bulletCount = this.player.bulletCount;
        const bulletKey = 'item_attack';
        if (!this.textures.exists(bulletKey)) {
            this.createBulletTexture(bulletKey);
        }

        // 使用最后移动方向（而不是当前按键），让射击更直觉
        let moveDirection = this.player.lastMoveDirection || 0; // 默认向右

        // 基础方向（相对于移动方向）
        const baseDirections = [
            moveDirection,          // 正前方
            moveDirection - Math.PI/2,  // 左上方
            moveDirection + Math.PI/2,  // 右下方
            moveDirection + Math.PI     // 后方
        ];

        // 斜向45度（相对于移动方向）
        const diagonalDirections = [
            moveDirection - Math.PI/4,   // 右前方
            moveDirection + Math.PI/4,   // 左前方
            moveDirection - 3*Math.PI/4, // 右后方
            moveDirection + 3*Math.PI/4  // 左后方
        ];

        // 根据等级选择射击方向
        let directions = [];
        if (bulletCount >= 1) directions.push(baseDirections[0]); // 正前方
        if (bulletCount >= 2) directions.push(baseDirections[2]); // 右下方
        if (bulletCount >= 3) directions.push(baseDirections[1]); // 左上方
        if (bulletCount >= 4) directions.push(baseDirections[3]); // 后方
        if (bulletCount >= 5) directions.push(diagonalDirections[0]); // 右前方
        if (bulletCount >= 6) directions.push(diagonalDirections[1]); // 左前方
        if (bulletCount >= 7) directions.push(diagonalDirections[2]); // 右后方
        if (bulletCount >= 8) directions.push(diagonalDirections[3]); // 左后方

        // 子弹花样增强系统
        const attackStyle = (this.player.attackCounter || 0) % 5; // 循环5种样式
        this.player.attackCounter = (this.player.attackCounter || 0) + 1;

        // 每个方向射出子弹，根据attackStyle应用不同视觉效果
        directions.forEach((angle, dirIndex) => {
            for (let i = 0; i < 2; i++) {
                const spread = (i - 0.5) * 0.15; // 小角度扩散
                const bullet = this.bullets.create(this.player.x, this.player.y, bulletKey);

                // 样式变化：大小和颜色
                let size = 16;
                let colorTint = 0xFFFFFF; // 默认白色
                let alpha = 1;
                let speed = 300;

                switch (attackStyle) {
                    case 0: // 标准模式 - 蓝色能量弹
                        size = 16;
                        colorTint = 0x44AAFF;
                        speed = 320;
                        break;
                    case 1: // 火焰模式 - 红橙色大子弹
                        size = 20;
                        colorTint = 0xFF6622;
                        speed = 280;
                        alpha = 0.95;
                        break;
                    case 2: // 冰霜模式 - 青色小子弹快速
                        size = 12;
                        colorTint = 0x00FFCC;
                        speed = 380;
                        break;
                    case 3: // 雷电模式 - 黄色中型子弹
                        size = 18;
                        colorTint = 0xFFEE00;
                        speed = 340;
                        alpha = 0.9;
                        break;
                    case 4: // 暗影模式 - 紫色大子弹慢速高伤感
                        size = 22;
                        colorTint = 0xCC44FF;
                        speed = 260;
                        alpha = 0.85;
                        break;
                }

                bullet.setDisplaySize(size, size);
                bullet.setBlendMode(Phaser.BlendModes.ADD);
                bullet.setAlpha(alpha);
                bullet.setOrigin(0.5);
                bullet.setTint(colorTint);

                bullet.setVelocity(
                    Math.cos(angle + spread) * speed,
                    Math.sin(angle + spread) * speed
                );

                bullet.lifespan = 3000;

                // 添加尾迹渐隐效果
                this.tweens.add({
                    targets: bullet,
                    alpha: 0.3,
                    duration: bullet.lifespan * 0.7,
                    ease: 'Power2',
                    onComplete: () => {
                        if (bullet && bullet.active) {
                            bullet.destroy();
                        }
                    }
                });
            }
        });

        this.time.delayedCall(100, () => {
            this.player.isAttacking = false;
        });
    }

    findNearestEnemy() {
        let nearest = null;
        let nearestDist = Infinity;

        this.enemies.getChildren().forEach(enemy => {
            if (enemy.isDead) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    }

    moveEnemies() {
        const enemies = this.enemies.getChildren();
        const maxEnemiesPerFrame = 10;
        const startIndex = (this.updateCounter % Math.ceil(enemies.length / maxEnemiesPerFrame)) * maxEnemiesPerFrame;
        const endIndex = Math.min(startIndex + maxEnemiesPerFrame, enemies.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const enemy = enemies[i];
            if (!enemy || enemy.isDead || !enemy.active) continue;

            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            
            // 根据行为模式应用不同的移动策略
            let vx = 0;
            let vy = 0;
            const speedMultiplier = 50;
            
            switch (enemy.behaviorPattern) {
                case 'chase':
                    // 追击模式：直接冲向玩家
                    vx = Math.cos(angle) * enemy.speed * speedMultiplier;
                    vy = Math.sin(angle) * enemy.speed * speedMultiplier;
                    break;
                    
                case 'orbit':
                    // 环绕模式：围绕玩家旋转
                    const orbitAngle = angle + Math.PI / 2;
                    const orbitDist = 120;
                    const targetX = this.player.x + Math.cos(orbitAngle) * orbitDist;
                    const targetY = this.player.y + Math.sin(orbitAngle) * orbitDist;
                    const orbitAngle2 = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
                    vx = Math.cos(orbitAngle2) * enemy.speed * speedMultiplier * 0.7;
                    vy = Math.sin(orbitAngle2) * enemy.speed * speedMultiplier * 0.7;
                    break;
                    
                case 'zigzag':
                    // Z字形移动：左右摆动前进
                    const zigzagOffset = Math.sin(this.time.now * 0.003 + enemy.x) * 50;
                    const zigzagAngle = angle + (zigzagOffset > 0 ? 0.5 : -0.5);
                    vx = Math.cos(zigzagAngle) * enemy.speed * speedMultiplier * 0.9;
                    vy = Math.sin(zigzagAngle) * enemy.speed * speedMultiplier * 0.9;
                    break;
                    
                case 'rush':
                    // 冲锋模式：保持距离后突然冲刺
                    if (distance > 200) {
                        // 远距离时缓慢接近
                        vx = Math.cos(angle) * enemy.speed * speedMultiplier * 0.4;
                        vy = Math.sin(angle) * enemy.speed * speedMultiplier * 0.4;
                    } else if (distance < 80) {
                        // 太近时后退
                        vx = -Math.cos(angle) * enemy.speed * speedMultiplier * 0.6;
                        vy = -Math.sin(angle) * enemy.speed * speedMultiplier * 0.6;
                    } else {
                        // 中距离时快速冲刺
                        vx = Math.cos(angle) * enemy.speed * speedMultiplier * 1.8;
                        vy = Math.sin(angle) * enemy.speed * speedMultiplier * 1.8;
                    }
                    break;
                    
                case 'retreat':
                    // 撤退模式：保持安全距离
                    if (distance < 150) {
                        // 太近时后退
                        vx = -Math.cos(angle) * enemy.speed * speedMultiplier * 1.2;
                        vy = -Math.sin(angle) * enemy.speed * speedMultiplier * 1.2;
                    } else if (distance > 250) {
                        // 太远时缓慢接近
                        vx = Math.cos(angle) * enemy.speed * speedMultiplier * 0.3;
                        vy = Math.sin(angle) * enemy.speed * speedMultiplier * 0.3;
                    } else {
                        // 安全距离内横向移动
                        const retreatAngle = angle + Math.PI / 2;
                        vx = Math.cos(retreatAngle) * enemy.speed * speedMultiplier * 0.6;
                        vy = Math.sin(retreatAngle) * enemy.speed * speedMultiplier * 0.6;
                    }
                    break;
                    
                default:
                    // 默认行为：追击
                    vx = Math.cos(angle) * enemy.speed * speedMultiplier;
                    vy = Math.sin(angle) * enemy.speed * speedMultiplier;
            }

            enemy.setVelocity(vx, vy);

            // 处理特殊能力
            if (enemy.hasSpecialAbility && this.time.now - enemy.lastAbilityUse > enemy.abilityCooldown) {
                this.useEnemySpecialAbility(enemy, angle);
                enemy.lastAbilityUse = this.time.now;
            }

            // Boss血条已固定在界面下方，不再跟随移动
            // 血条位置在onBossDialogueComplete()中创建时固定

            // 处理敌人的远程攻击
            if (enemy.canShoot && this.time.now - enemy.lastAttack > enemy.attackCooldown) {
                this.enemyShoot(enemy);
                enemy.lastAttack = this.time.now;
            }

            // 处理敌人的冲刺
            if (enemy.canDash && this.time.now - enemy.lastDash > enemy.dashCooldown) {
                this.enemyDash(enemy, angle);
                enemy.lastDash = this.time.now;
            }
        }
    }

    useEnemySpecialAbility(enemy, angle) {
        switch (enemy.specialAbilityType) {
            case 0: // 加速冲刺
                const rushSpeed = enemy.speed * 3;
                enemy.setVelocity(
                    Math.cos(angle) * rushSpeed * 50,
                    Math.sin(angle) * rushSpeed * 50
                );
                // 视觉效果：短暂变红
                enemy.setTint(0xFF4444);
                this.time.delayedCall(300, () => {
                    if (enemy && enemy.active) {
                        enemy.clearTint();
                    }
                });
                break;
                
            case 1: // 分裂（生成小敌人）
                if (this.enemies.getLength() < 50) { // 防止过多敌人
                    for (let i = 0; i < 2; i++) {
                        const splitAngle = angle + (Math.random() - 0.5) * Math.PI;
                        const spawnX = enemy.x + Math.cos(splitAngle) * 30;
                        const spawnY = enemy.y + Math.sin(splitAngle) * 30;
                        
                        // 创建分裂小怪
                        const miniEnemy = this.enemies.create(spawnX, spawnY, enemy.texture.key);
                        if (miniEnemy) {
                            miniEnemy.setDisplaySize(24, 24); // 更小的体型
                            miniEnemy.setAlpha(0.8);
                            miniEnemy.health = enemy.maxHealth * 0.25;
                            miniEnemy.maxHealth = miniEnemy.health;
                            miniEnemy.speed = enemy.speed * 1.3;
                            miniEnemy.damage = enemy.damage * 0.5;
                            miniEnemy.enemyType = enemy.enemyType;
                            miniEnemy.isDead = false;
                            miniEnemy.behaviorPattern = 'chase';
                            miniEnemy.hasSpecialAbility = false;
                            miniEnemy.attackCooldown = 2500;
                            miniEnemy.canShoot = false;
                            miniEnemy.lastAttack = 0;
                            miniEnemy.healthBar = null;
                            
                            this.totalEnemiesToSpawn++;
                            this.enemiesSpawned++;
                            
                            // 分裂动画效果
                            this.tweens.add({
                                targets: miniEnemy,
                                scaleX: { from: 0.3, to: 1 },
                                scaleY: { from: 0.3, to: 1 },
                                alpha: { from: 0.5, to: 0.8 },
                                duration: 300,
                                ease: 'Back.easeOut'
                            });
                        }
                    }
                    // 原敌人损失部分生命值
                    enemy.health -= enemy.maxHealth * 0.15;
                    if (enemy.health <= 0) {
                        this.killEnemy(enemy);
                    }
                }
                break;
                
            case 2: // 护盾恢复
                if (enemy.shield < enemy.maxShield) {
                    enemy.shield = Math.min(enemy.maxShield, enemy.shield + enemy.maxShield * 0.5);
                    // 视觉效果：闪烁蓝光
                    enemy.setTint(0x4444FF);
                    this.time.delayedCall(200, () => {
                        if (enemy && enemy.active) {
                            enemy.clearTint();
                        }
                    });
                }
                break;
        }
    }

    resumeGame() {
        this.gameState = 'playing';
        this.scene.resume();
        // 恢复游戏后更新所有敌人的血条位置
        this.moveEnemies();
    }

    playSound(soundKey) {
        // 在对话或非游戏状态时不播放战斗音效
        if (this.gameState === 'dialogue' || this.gameState === 'victory' || this.gameState === 'transitioning' || this.gameState === 'cardSelection') {
            return;
        }
        
        // 攻击音效：大幅降低播放频率（每5次攻击只播放1次）
        if (soundKey === 'attack') {
            if (!this.attackSoundCounter) this.attackSoundCounter = 0;
            this.attackSoundCounter++;
            if (this.attackSoundCounter % 5 !== 1) { // 每5次只播放第1次
                return; // 只跳过音效，不影响射击
            }
        }
        
        // Boss出现后，减少小怪音效的播放频率（只保留攻击和重要音效）
        if (this.bossSpawned && soundKey === 'enemy_hit') {
            // Boss出现后，小怪受击音效降低到10%的概率播放（原20%）
            if (Math.random() > 0.1) {
                return; // 只跳过音效
            }
        }
        
        // 音效节流：检查是否在冷却时间内
        const now = this.time.now;
        // 不同音效使用不同的冷却时间
        let throttleTime = this.soundThrottleTime;
        if (soundKey === 'attack') throttleTime = 200; // 攻击音效冷却200ms
        else if (soundKey === 'enemy_hit') throttleTime = 150; // 受击音效冷却150ms
        else if (soundKey === 'player_hit') throttleTime = 300; // 玩家受伤音效冷却300ms
        
        if (this.soundCooldowns[soundKey] && now - this.soundCooldowns[soundKey] < throttleTime) {
            return; // 跳过音效播放，但不影响游戏逻辑
        }
        
        // 更新最后播放时间
        this.soundCooldowns[soundKey] = now;
        
        const key = this.getAudioPath(soundKey);
        if (key) {
            window.audioManager.play(key, null, false, this.sfxVolume);
        }
    }

    stopCombatSounds() {
        // 停止所有战斗相关的音效（包括背景音乐）
        const combatSounds = ['attack', 'enemy_hit', 'player_hit', 'game_bgm', 'boss_bgm'];
        combatSounds.forEach(soundKey => {
            if (window.audioManager) {
                window.audioManager.stop(soundKey);
            }
        });
        
        // 额外安全措施：停止所有正在播放的音频
        if (window.audioManager && window.audioManager.stopAll) {
            window.audioManager.stopAll();
        }
    }

    stopCombatSoundsOnly() {
        // 只停止战斗音效，保留背景音乐（用于卡片选择等需要静音但保留BGM的场景）
        const combatSoundEffects = ['attack', 'enemy_hit', 'player_hit'];
        combatSoundEffects.forEach(soundKey => {
            if (window.audioManager) {
                window.audioManager.stop(soundKey);
            }
        });
    }

    freezeAllEnemies() {
        // 停止所有敌人的移动
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (enemy && enemy.active && !enemy.isDead) {
                    enemy.setVelocity(0, 0);
                    // 禁用物理体，防止任何移动
                    if (enemy.body) {
                        enemy.body.enable = false;
                    }
                }
            });
        }
        
        // 停止并销毁所有敌人子弹（彻底清除）
        if (this.enemyBullets) {
            this.enemyBullets.getChildren().forEach(bullet => {
                if (bullet && bullet.active) {
                    bullet.setVelocity(0, 0);
                    // 直接销毁敌人子弹，防止残留
                    bullet.destroy();
                }
            });
        }

        // 停止环绕子弹的旋转
        if (this.player.orbitBulletsGroup) {
            // 环绕子弹不需要停止，它们会继续跟随玩家
        }
    }

    update(time, delta) {
        if (this.gameState === 'dialogue') {
            if (this.dialogueManager && this.dialogueManager.isActive) {
                this.dialogueManager.update();
            }
            // 确保对话期间玩家完全停止
            if (this.player && this.player.active) {
                this.player.setVelocity(0, 0);
            }
            return;
        }

        // 胜利或过渡状态时完全停止游戏逻辑
        if (this.gameState === 'victory' || this.gameState === 'transitioning') {
            // 确保玩家完全停止
            if (this.player && this.player.active) {
                this.player.setVelocity(0, 0);
            }
            // 停止所有战斗音效
            this.stopCombatSounds();
            
            // 检测Enter键或空格键：允许玩家手动进入下一关
            if (this.gameState === 'victory' && (Phaser.Input.Keyboard.JustDown(this.wasd.enter) || Phaser.Input.Keyboard.JustDown(this.cursors.space))) {
                console.log('⏭️ 玩家按Enter/空格键跳过等待');
                this.endLevel();
            }
            
            return;
        }

        // 卡片选择状态时停止敌人移动，但保留玩家子弹和背景音乐
        if (this.gameState === 'cardSelection') {
            // 确保玩家完全停止移动
            if (this.player && this.player.active) {
                this.player.setVelocity(0, 0);
            }
            // 停止敌人移动和战斗音效（但保留背景音乐，只执行一次）
            if (!this.isCardFreezeApplied) {
                this.freezeAllEnemies();
                this.stopCombatSoundsOnly(); // 只停止战斗音效，不停止BGM
                this.isCardFreezeApplied = true;
            }
            
            // 仍然更新玩家子弹和环绕子弹（让它们继续飞行）
            if (this.updateCounter % 2 === 0) {
                this.updateBullets(16); // 传入固定delta值
                this.updateOrbitBulletsPosition();
            }
            
            return; // 不执行后续的敌人和玩家控制逻辑
        } else {
            this.isCardFreezeApplied = false; // 重置标志
        }

        if (this.gameState !== 'playing') return;

        // 性能优化：增加更新计数器
        this.updateCounter++;

        // 每1帧更新一次玩家移动和攻击
        this.updatePlayerMovement();
        this.checkPlayerAttack();
        this.checkUltimate();
        
        // 每2帧更新一次子弹和UI
        if (this.updateCounter % 2 === 0) {
            this.updateBullets(delta);
            this.updateEnemyBullets(delta);
            this.updateEnergyUI();
            this.updateOrbitBulletsPosition();
        }

        // 每3帧更新一次敌人AI（进一步减少计算量）
        if (this.updateCounter % 3 === 0) {
            this.updateEnemies();
        }

        // 每4帧更新一次判定点位置
        if (this.updateCounter % 4 === 0 && this.player && this.player.hitbox) {
            this.player.hitbox.setPosition(this.player.x, this.player.y);
        }
    }

    checkUltimate() {
        if (this.input.keyboard.checkDown(this.input.keyboard.addKey('Q'), 250)) {
            this.useUltimate();
        }
    }

    updateBullets(delta) {
        if (!this.bullets) return;

        const children = this.bullets.getChildren();
        // 性能优化：使用倒序循环，避免数组长度变化影响循环
        for (let i = children.length - 1; i >= 0; i--) {
            const bullet = children[i];
            if (bullet && bullet.active && bullet.lifespan > 0) {
                // 取消子弹跟踪，让子弹直线飞行
                bullet.lifespan -= delta;
                if (bullet.lifespan <= 0) {
                    bullet.destroy();
                }
            } else if (bullet) {
                bullet.destroy();
            }
        }
    }

    updateEnemyBullets(delta) {
        if (!this.enemyBullets) return;

        const children = this.enemyBullets.getChildren();
        // 性能优化：使用倒序循环，避免数组长度变化影响循环
        for (let i = children.length - 1; i >= 0; i--) {
            const bullet = children[i];
            if (bullet && bullet.active && bullet.lifespan > 0) {
                // ========== 追踪子弹逻辑 ==========
                if (bullet.isHoming) {
                    const targetAngle = Phaser.Math.Angle.Between(bullet.x, bullet.y, this.player.x, this.player.y);
                    const currentAngle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
                    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                    
                    // 平滑转向
                    const turn = bullet.homingTurnRate * (delta / 16);
                    const newAngle = currentAngle + Phaser.Math.Clamp(angleDiff, -turn, turn);
                    
                    bullet.setVelocity(
                        Math.cos(newAngle) * bullet.homingSpeed,
                        Math.sin(newAngle) * bullet.homingSpeed
                    );
                }

                // 检查最大飞行距离
                if (bullet.maxDistance && bullet.startX !== undefined) {
                    const distance = Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y);
                    if (distance > bullet.maxDistance) {
                        bullet.destroy();
                        continue;
                    }
                }

                bullet.lifespan -= delta;
                if (bullet.lifespan <= 0) {
                    bullet.destroy();
                }
            } else if (bullet) {
                bullet.destroy();
            }
        }
    }

    updatePlayerMovement() {
        // 只有在游戏状态为playing时才处理玩家移动
        if (this.gameState !== 'playing') {
            this.player.setVelocity(0, 0);
            return;
        }

        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;

        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

        if (vx !== 0 || vy !== 0) {
            const length = Math.sqrt(vx * vx + vy * vy);
            vx /= length;
            vy /= length;
            
            // 更新最后移动方向（用于子弹发射）
            this.player.lastMoveDirection = Math.atan2(vy, vx);
            
            // 根据移动方向旋转玩家精灵（显示朝向）
            const angleDeg = this.player.lastMoveDirection * (180 / Math.PI) + 90; // +90因为纹理默认朝上
            this.player.setRotation(Phaser.Math.DegToRad(angleDeg));
        }

        // 按住shift加速
        const speedMultiplier = this.wasd.speed.isDown ? 1.5 : 1;
        const targetVx = vx * this.player.speed * speedMultiplier;
        const targetVy = vy * this.player.speed * speedMultiplier;

        // 边界限制：防止玩家移出游戏区域
        const margin = 15;
        const canMoveX = !(this.player.x <= margin && targetVx < 0) &&
                         !(this.player.x >= GAME_WIDTH - margin && targetVx > 0);
        const canMoveY = !(this.player.y <= margin && targetVy < 0) &&
                         !(this.player.y >= GAME_HEIGHT - margin && targetVy > 0);

        if (canMoveX && canMoveY) {
            this.player.setVelocity(targetVx, targetVy);
        } else if (canMoveX) {
            this.player.setVelocity(targetVx, 0);
        } else if (canMoveY) {
            this.player.setVelocity(0, targetVy);
        } else {
            this.player.setVelocity(0, 0);
        }

        // 强制位置修正（双重保险）
        if (this.player.active) {
            this.player.x = Phaser.Math.Clamp(this.player.x, margin, GAME_WIDTH - margin);
            this.player.y = Phaser.Math.Clamp(this.player.y, margin, GAME_HEIGHT - margin);
        }
    }

    updateEnemies() {
        this.moveEnemies();
    }

    checkPlayerAttack() {
        if (this.wasd.attack.isDown && !this.player.isAttacking) {
            this.playerAttack();
        }
    }

    shutdown() {
        window.audioManager.stopAll();
        if (this.bullets) {
            this.bullets.clear(true, true);
        }
    }
}

window.GameScene = GameScene;