class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
        this.loadedAssets = 0;
        this.totalAssets = 0;
        this.failedAssets = [];
    }

    preload() {
        this.createLoadingUI();

        this.load.on('loaderror', (file) => {
            console.warn('资源加载错误:', file.key);
            this.failedAssets.push(file.key);
        });

        this.createBaseSprites();
        this.loadAssets();

        this.load.on('complete', () => this.onLoadComplete());
    }

    createLoadingUI() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        const bgBar = this.add.rectangle(centerX, centerY + 50, 400, 20, 0x333333);
        bgBar.setStrokeStyle(2, 0x666666);

        this.loadingBar = this.add.rectangle(centerX - 195, centerY + 50, 0, 16, 0x00ff00);
        this.loadingText = this.add.text(centerX, centerY, '正在加载资源...', {
            fontSize: '20px',
            fontFamily: 'Courier New',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.tipsText = this.add.text(centerX, centerY - 50, this.getRandomTip(), {
            fontSize: '16px',
            fontFamily: 'Courier New',
            color: '#aaaaaa'
        }).setOrigin(0.5);
    }

    getRandomTip() {
        const tips = [
            '提示：使用 WASD 或方向键移动',
            '提示：按空格键或K键攻击',
            '提示：按E键与NPC交互或确认',
            '提示：按ESC或P键暂停游戏',
            '提示：收集金币可以购买道具',
            '提示：击败敌人可以获得更好的装备'
        ];
        return tips[Math.floor(Math.random() * tips.length)];
    }

    loadAssets() {
        // 背景图片 - assets/images/Parallaxes/
        this.load.image('parallax_blue_sky', 'assets/images/Parallaxes/BlueSky.png');
        this.load.image('parallax_cloudy_sky1', 'assets/images/Parallaxes/CloudySky1.png');
        this.load.image('parallax_cloudy_sky2', 'assets/images/Parallaxes/CloudySky2.png');
        this.load.image('parallax_dark_space1', 'assets/images/Parallaxes/DarkSpace1.png');
        this.load.image('parallax_dark_space2', 'assets/images/Parallaxes/DarkSpace2.png');
        this.load.image('parallax_mountains1', 'assets/images/Parallaxes/Mountains1.png');
        this.load.image('parallax_mountains2', 'assets/images/Parallaxes/Mountains2.png');
        this.load.image('parallax_mountains3', 'assets/images/Parallaxes/Mountains3.png');
        this.load.image('parallax_mountains4', 'assets/images/Parallaxes/Mountains4.png');
        this.load.image('parallax_mountains5', 'assets/images/Parallaxes/Mountains5.png');
        this.load.image('parallax_ocean1', 'assets/images/Parallaxes/Ocean1.png');
        this.load.image('parallax_ocean2', 'assets/images/Parallaxes/Ocean2.png');
        this.load.image('parallax_sea_of_clouds', 'assets/images/Parallaxes/SeaofClouds.png');
        this.load.image('parallax_starlit_sky', 'assets/images/Parallaxes/StarlitSky.png');
        this.load.image('parallax_sunset', 'assets/images/Parallaxes/Sunset.png');
        this.load.image('parallax_bg001', 'assets/images/Parallaxes/bg001.png');

        // 背景图片 - assets/images/backgrounds/
        this.load.image('menu_bg', 'assets/images/backgrounds/K7chl.jpg');

        // 标题素材 - assets/images/titles2/
        this.load.image('title_dragons', 'assets/images/titles2/Dragons.png');
        this.load.image('title_fire', 'assets/images/titles2/Fire.png');
        this.load.image('title_forest', 'assets/images/titles2/Forest.png');
        this.load.image('title_gargoyles', 'assets/images/titles2/Gargoyles.png');
        this.load.image('title_heroes', 'assets/images/titles2/Heroes.png');
        this.load.image('title_leaves', 'assets/images/titles2/Leaves.png');
        this.load.image('title_metal', 'assets/images/titles2/Metal.png');
        this.load.image('title_mist', 'assets/images/titles2/Mist.png');
        this.load.image('title_mountains', 'assets/images/titles2/Mountains.png');

        // 角色图片 - assets/images/characters/
        this.load.spritesheet('player', 'assets/images/characters/Actor1.png', {
            frameWidth: 48,
            frameHeight: 48
        });

        // 立绘图片 - assets/images/characters/
        this.load.image('hero', 'assets/images/characters/hero.png');
        this.load.image('shengnv', 'assets/images/characters/shengnv.png');
        this.load.image('siweier', 'assets/images/characters/siweier.png');
        // 米娅暂用shengnv替代
        this.load.image('miya', 'assets/images/characters/miya.png');

        // 敌人图片 - assets/images/enemies/
        this.load.spritesheet('enemy_slime', 'assets/images/enemies/Slime.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_bat', 'assets/images/enemies/Bat.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_ghost', 'assets/images/enemies/Ghost.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_demon', 'assets/images/enemies/Demon.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_skeleton', 'assets/images/enemies/Skeleton.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_dragon', 'assets/images/enemies/Dragon.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_werewolf', 'assets/images/enemies/Werewolf.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_vampire', 'assets/images/enemies/Vampire.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_gargoyle', 'assets/images/enemies/Gargoyle.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_minotaur', 'assets/images/enemies/Minotaur.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('enemy_evilgod', 'assets/images/enemies/Evilgod.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        
        // Boss图片 - assets/images/enemies/
        this.load.spritesheet('boss_slime', 'assets/images/enemies/史莱姆王.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('boss_wolf', 'assets/images/enemies/狼王.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('boss_demon', 'assets/images/enemies/暗黑领主.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('boss_god', 'assets/images/enemies/黑暗之神.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // 物品图片 - assets/images/items/
        this.load.image('item_coin', 'assets/images/items/Crystal.png');
        this.load.image('item_health', 'assets/images/items/Fountain.png');
        this.load.image('item_speed', 'assets/images/items/Wind10.png');
        this.load.image('item_attack', 'assets/images/items/Sword.png');
        this.load.image('item_shield', 'assets/images/items/Castle.png');

        // 更多物品图标 - assets/images/items/
        this.load.image('item_book', 'assets/images/items/Book.png');
        this.load.image('item_crossed_swords', 'assets/images/items/CrossedSwords.png');
        this.load.image('item_crystal', 'assets/images/items/Crystal.png');
        this.load.image('item_demon_castle', 'assets/images/items/DemonCastle.png');
        this.load.image('item_devil', 'assets/images/items/Devil.png');
        this.load.image('item_dragon_icon', 'assets/images/items/Dragon.png');
        this.load.image('item_fountain', 'assets/images/items/Fountain.png');
        this.load.image('item_gates', 'assets/images/items/Gates.png');
        this.load.image('item_hexagram', 'assets/images/items/Hexagram.png');
        this.load.image('item_island', 'assets/images/items/Island.png');
        this.load.image('item_night', 'assets/images/items/Night.png');
        this.load.image('item_plain', 'assets/images/items/Plain.png');
        this.load.image('item_sword_icon', 'assets/images/items/Sword.png');
        this.load.image('item_tower1', 'assets/images/items/Tower1.png');
        this.load.image('item_tower2', 'assets/images/items/Tower2.png');
        this.load.image('item_universe', 'assets/images/items/Universe.png');
        this.load.image('item_volcano', 'assets/images/items/Volcano.png');
        this.load.image('item_world', 'assets/images/items/World.png');
        this.load.image('item_world_map', 'assets/images/items/WorldMap.png');

        // 加载音频 - assets/audio/bgm/
        this.load.audio('menu_bgm', 'assets/audio/bgm/tukito_max2_ending.mp3');
        this.load.audio('game_bgm', 'assets/audio/bgm/Field1.ogg');
        this.load.audio('victory_bgm', 'assets/audio/ME/Victory1.ogg');
        this.load.audio('game_over_bgm', 'assets/audio/ME/Gameover1.ogg');
        this.load.audio('ending_bgm', 'assets/audio/bgm/ending2.ogg');
        
        // 加载所有 Boss 战音乐
        this.load.audio('boss_bgm', 'assets/audio/bgm/Battle1.ogg');
        this.load.audio('boss_bgm_ch2', 'assets/audio/bgm/屑163com - Batter Nusi.mp3');
        this.load.audio('boss_bgm_ch3', 'assets/audio/bgm/dungeon_last.ogg');
        this.load.audio('boss_bgm_ch4', 'assets/audio/bgm/沉溺于空虚之中 - 秘密姬克缇boss战.mp3');
        this.load.audio('boss_bgm_ch5', 'assets/audio/bgm/冰雪聪明华法琳 - Ucchii0 - Darkness in the Light-Long ver【Free Ver】.mp3');
        this.load.audio('boss_bgm_ch6', 'assets/audio/bgm/_PuRe_MeMoRY_ - Cyaegha (Laur Remix) - USAO vs. Laur.mp3');
        this.load.audio('boss_bgm_ch7', 'assets/audio/bgm/裏ボス４.ogg');
        this.load.audio('boss_bgm_ch8', 'assets/audio/bgm/七实的好朋友 - Ideal，Electrified.mp3');
        this.load.audio('boss_bgm_ch9', 'assets/audio/bgm/裏ボス５.ogg');
        this.load.audio('boss_bgm_ch10', 'assets/audio/bgm/裏ボス６.mp3');
        this.load.audio('boss_bgm_ch11', 'assets/audio/bgm/冰雪聪明华法琳 - Ucchii0 - たったそれだけの物語【Free Ver】.mp3');

        // 加载音效 - assets/audio/SE/
        this.load.audio('attack', 'assets/audio/SE/Attack1.ogg');
        this.load.audio('enemy_hit', 'assets/audio/SE/Damage1.ogg');
        this.load.audio('player_hit', 'assets/audio/SE/Damage2.ogg');
        this.load.audio('pickup', 'assets/audio/SE/Item1.ogg');
        this.load.audio('death', 'assets/audio/SE/Scream.ogg');
        this.load.audio('coin', 'assets/audio/SE/Coin.ogg');
        this.load.audio('level_up', 'assets/audio/SE/Powerup.ogg');
        this.load.audio('button_click', 'assets/audio/SE/Decision1.ogg');

        // 更多场景/城镇/地牢/主题 BGM（安全加载）
        const safeBGM = [
            ['scene_bgm_1', 'Scene1'], ['scene_bgm_2', 'Scene2'], ['scene_bgm_3', 'Scene3'],
            ['scene_bgm_4', 'Scene4'], ['scene_bgm_5', 'Scene5'], ['scene_bgm_6', 'Scene6'],
            ['town_bgm_1', 'Town1'], ['town_bgm_2', 'Town2'], ['town_bgm_3', 'Town3'],
            ['dungeon_bgm_1', 'Dungeon1'], ['dungeon_bgm_2', 'Dungeon2'], ['dungeon_bgm_3', 'Dungeon3'],
            ['theme_bgm_1', 'Theme1'], ['theme_bgm_2', 'Theme2'],
            ['epilogue_bgm', 'scene_epilogue1'], ['alice_bgm', 'scene_alice']
        ];
        safeBGM.forEach(([key, name]) => {
            this.load.audio(key, `assets/audio/bgm/${name}.ogg`);
        });

        // ME 音乐效果（安全加载）
        const safeME = [
            ['me_fanfare1', 'Fanfare1'], ['me_fanfare2', 'Fanfare2'], ['me_fanfare3', 'Fanfare3'],
            ['me_inn', 'Inn'], ['me_mystery', 'Mystery'], ['me_organ', 'Organ'],
            ['me_shock', 'Shock'], ['me_victory2', 'Victory2']
        ];
        safeME.forEach(([key, name]) => {
            this.load.audio(key, `assets/audio/ME/${name}.ogg`);
        });

        // 环境音 BGS（安全加载）
        const safeBGS = [
            ['bgs_rain', 'Rain'], ['bgs_wind', 'Wind'], ['bgs_fire', 'Fire'], ['bgs_storm', 'Storm']
        ];
        safeBGS.forEach(([key, name]) => {
            this.load.audio(key, `assets/audio/BGS/${name}.ogg`);
        });

        // 更多音效（安全加载，不存在则跳过）
        const safeSE = [
            ['se_blind', 'Blind'], ['se_confuse', 'Confuse'], ['se_poison', 'Poison'],
            ['se_sleep', 'Sleep'], ['se_silence', 'Silence'], ['se_paralyze1', 'Paralyze1'],
            ['se_reflection', 'Reflection'], ['se_barrier', 'Barrier'], ['se_evasion1', 'Evasion1'],
            ['se_powerup', 'Powerup'], ['se_recovery', 'Recovery'], ['se_teleport', 'Teleport'],
            ['se_resonance', 'Resonance'], ['se_starlight', 'Starlight'], ['se_darkness1', 'Darkness1']
        ];
        safeSE.forEach(([key, name]) => {
            this.load.audio(key, `assets/audio/SE/${name}.ogg`);
        });

        // 音频加载错误处理 - 防止不存在的音频文件导致崩溃
        this.load.on('loaderror', (fileObj) => {
            if (fileObj && fileObj.key) {
                console.warn('⚠️ 资源加载失败（已跳过）:', fileObj.key, fileObj.url);
            }
        });
    }

    calculateTotalAssets() {
        return 160;
    }

    createBaseSprites() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // 玩家 - 棕色方块
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('player', 32, 32);
        graphics.clear();

        // 史莱姆 - 绿色圆形
        graphics.fillStyle(0x00AA00, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0x006600, 1);
        graphics.fillCircle(12, 12, 4);
        graphics.fillCircle(20, 12, 4);
        graphics.generateTexture('enemy_slime', 32, 32);
        graphics.clear();

        // 蝙蝠 - 紫色圆形
        graphics.fillStyle(0x880088, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xFFAAFF, 1);
        graphics.fillCircle(12, 10, 5);
        graphics.fillCircle(20, 10, 5);
        graphics.generateTexture('enemy_bat', 32, 32);
        graphics.clear();

        // 骷髅 - 灰色矩形
        graphics.fillStyle(0x888888, 1);
        graphics.fillRect(0, 8, 32, 24);
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(8, 12, 4, 4);
        graphics.fillRect(20, 12, 4, 4);
        graphics.generateTexture('enemy_skeleton', 32, 32);
        graphics.clear();

        // Boss史莱姆王 - 红色大圆形
        graphics.fillStyle(0xFF4444, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0x330000, 1);
        graphics.fillCircle(12, 12, 3);
        graphics.fillCircle(20, 12, 3);
        graphics.generateTexture('boss_slime', 32, 32);
        graphics.clear();

        // Boss狼王 - 灰色大圆形
        graphics.fillStyle(0x666666, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0xAA0000, 1);
        graphics.fillCircle(16, 16, 10);
        graphics.generateTexture('boss_wolf', 32, 32);
        graphics.clear();

        // Boss黑暗领主 - 紫色大圆形
        graphics.fillStyle(0x880088, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0xFF0000, 1);
        graphics.fillCircle(16, 16, 10);
        graphics.generateTexture('boss_demon', 32, 32);
        graphics.clear();

        // Boss黑暗之神 - 黑色大圆形
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0xFF0000, 1);
        graphics.fillCircle(12, 12, 5);
        graphics.fillCircle(20, 12, 5);
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillCircle(16, 18, 3);
        graphics.generateTexture('boss_god', 32, 32);
        graphics.clear();

        // 金币 - 金色圆形
        graphics.fillStyle(0xFFD700, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0xFFA500, 1);
        graphics.fillCircle(12, 12, 4);
        graphics.generateTexture('item_coin', 32, 32);
        graphics.clear();

        // 生命药水 - 红色矩形
        graphics.fillStyle(0xFF0000, 1);
        graphics.fillRect(8, 4, 16, 24);
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillRect(10, 6, 12, 8);
        graphics.generateTexture('item_health', 32, 32);
        graphics.clear();

        // 速度提升 - 蓝色三角形
        graphics.fillStyle(0x4444FF, 1);
        graphics.fillRect(6, 6, 20, 20);
        graphics.fillStyle(0x8888FF, 1);
        graphics.fillTriangle(16, 10, 10, 20, 22, 20);
        graphics.generateTexture('item_speed', 32, 32);
        graphics.clear();

        // 攻击提升 - 橙色矩形
        graphics.fillStyle(0xFF8800, 1);
        graphics.fillRect(6, 10, 20, 16);
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillRect(10, 14, 12, 8);
        graphics.generateTexture('item_attack', 32, 32);
        graphics.clear();

        // 护盾 - 灰色圆形
        graphics.fillStyle(0xAAAAAA, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0x666666, 1);
        graphics.fillCircle(16, 16, 10);
        graphics.generateTexture('item_shield', 32, 32);
        graphics.clear();

        // 幽灵 - 灰白色圆形
        graphics.fillStyle(0x888888, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0xAA0000, 1);
        graphics.fillCircle(16, 16, 8);
        graphics.generateTexture('enemy_ghost', 32, 32);
        graphics.clear();

        // 恶魔 - 红橙色圆形
        graphics.fillStyle(0xAA0000, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xFFAA00, 1);
        graphics.fillCircle(10, 10, 4);
        graphics.fillCircle(22, 10, 4);
        graphics.generateTexture('enemy_demon', 32, 32);
        graphics.clear();

        // 幼龙 - 绿色矩形
        graphics.fillStyle(0x00AA00, 1);
        graphics.fillRect(4, 8, 24, 16);
        graphics.fillStyle(0xAA0000, 1);
        graphics.fillTriangle(16, 2, 8, 10, 24, 10);
        graphics.fillStyle(0xFFFF00, 1);
        graphics.fillCircle(12, 14, 3);
        graphics.fillCircle(20, 14, 3);
        graphics.generateTexture('enemy_dragon', 32, 32);
        graphics.clear();

        // 狼人 - 深灰色圆形
        graphics.fillStyle(0x444444, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0x880000, 1);
        graphics.fillCircle(16, 16, 8);
        graphics.generateTexture('enemy_werewolf', 32, 32);
        graphics.clear();

        // 吸血鬼 - 紫色圆形
        graphics.fillStyle(0x660066, 1);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xFF0066, 1);
        graphics.fillCircle(12, 12, 4);
        graphics.fillCircle(20, 12, 4);
        graphics.generateTexture('enemy_vampire', 32, 32);
        graphics.clear();

        // 石像鬼 - 灰黑色矩形
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(0, 8, 32, 24);
        graphics.fillStyle(0xAA0000, 1);
        graphics.fillRect(12, 12, 8, 8);
        graphics.generateTexture('enemy_gargoyle', 32, 32);
        graphics.clear();

        // 牛头人 - 棕色大圆形
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0x333333, 1);
        graphics.fillCircle(12, 12, 4);
        graphics.fillCircle(20, 12, 4);
        graphics.generateTexture('enemy_minotaur', 32, 32);
        graphics.clear();

        // 邪神 - 紫黑色圆形
        graphics.fillStyle(0x220022, 1);
        graphics.fillCircle(16, 16, 15);
        graphics.fillStyle(0xFF0000, 1);
        graphics.fillCircle(12, 12, 5);
        graphics.fillCircle(20, 12, 5);
        graphics.generateTexture('enemy_evilgod', 32, 32);
        graphics.clear();

        // 背景纹理 - 深蓝色
        graphics.fillStyle(0x1a1a2e, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        graphics.generateTexture('menu_bg', GAME_WIDTH, GAME_HEIGHT);
        graphics.clear();

        // 背景纹理 - 蓝色天空
        graphics.fillStyle(0x4488ff, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        graphics.generateTexture('parallax_blue_sky', GAME_WIDTH, GAME_HEIGHT);
        graphics.clear();

        // 背景纹理 - 多云天空
        graphics.fillStyle(0x667788, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        graphics.generateTexture('parallax_cloudy_sky1', GAME_WIDTH, GAME_HEIGHT);
        graphics.clear();

        // 背景纹理 - 星空
        graphics.fillStyle(0x0a0a1a, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        graphics.generateTexture('parallax_starlit_sky', GAME_WIDTH, GAME_HEIGHT);
        graphics.clear();

        // 背景纹理 - 山脉
        graphics.fillStyle(0x445566, 1);
        graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        graphics.generateTexture('parallax_mountains1', GAME_WIDTH, GAME_HEIGHT);
        graphics.clear();

        graphics.destroy();
    }

    onLoadProgress(value) {
        const progress = Math.min(value, 1);
        this.loadingBar.setScale(progress, 1);
    }

    onLoadComplete() {
        if (this.failedAssets.length > 0) {
            console.warn('以下资源加载失败，使用后备纹理:', this.failedAssets);
        }
        console.log('加载完成，可用纹理:', this.textures.getTextureKeys());
        this.scene.start('MenuScene');
    }
}

window.PreloadScene = PreloadScene;