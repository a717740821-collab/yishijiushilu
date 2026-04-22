class AudioManager {
    constructor() {
        this.game = null; // Phaser game实例
        this.activeSounds = {}; // 当前播放的音效对象
        this.currentBgm = null; // 当前播放的BGM（key）
        this.lastPlayTime = {}; // 音效冷却时间记录
        this.cooldown = 100; // 默认100ms
    }

    // 初始化：保存Phaser game引用
    init(gameInstance) {
        this.game = gameInstance;
        console.log('✅ AudioManager 已初始化（使用 Phaser 音频系统）');
    }

    /**
     * 播放音频
     * @param {string} key - 音频键名（对应 PreloadScene 中加载的键名）
     * @param {string} audioPath - 音频路径（现在可以忽略，因为我们用Phaser缓存）
     * @param {boolean} loop - 是否循环
     * @param {number} volume - 音量
     * @returns {Phaser.Sound.BaseSound|null} - Phaser 音频对象
     */
    play(key, audioPath, loop = false, volume = 0.5) {
        console.log('🎵 AudioManager.play() called:', { key, audioPath, loop, volume });

        if (!this.game || !this.game.sound) {
            console.warn('⚠️ AudioManager 未初始化，无法播放');
            return null;
        }

        try {
            // 先停止同key的旧音频（如果是循环BGM）
            if (loop && this.activeSounds[key]) {
                console.log('🎵 停止旧音频:', key);
                this.stop(key);
            }

            // 处理音效冷却（只对非循环音效）
            if (!loop) {
                const now = Date.now();
                if (this.lastPlayTime[key] && now - this.lastPlayTime[key] < this.cooldown) {
                    console.log('🎵 音效冷却中，跳过:', key);
                    return null;
                }
                this.lastPlayTime[key] = now;
            }

            // 如果是循环BGM，先停止当前BGM
            if (loop && this.currentBgm && this.currentBgm !== key) {
                console.log('🎵 停止当前BGM:', this.currentBgm);
                this.stop(this.currentBgm);
            }

            // 直接使用 Phaser 音频系统播放（必须已经在 PreloadScene 中加载过）
            let sound;
            
            if (loop) {
                // 循环 BGM
                sound = this.game.sound.add(key, {
                    volume: volume,
                    loop: true
                });
                sound.play();
                this.activeSounds[key] = sound;
                this.currentBgm = key;
                console.log('✅ BGM 开始播放:', key);
            } else {
                // 单次音效
                sound = this.game.sound.add(key, {
                    volume: volume,
                    loop: false
                });
                sound.play();
                this.activeSounds[key] = sound;
                console.log('✅ 音效 开始播放:', key);
                
                // 音效播放结束后清理
                sound.once('complete', () => {
                    if (this.activeSounds[key] === sound) {
                        delete this.activeSounds[key];
                    }
                });
            }

            return sound;
        } catch (e) {
            console.error('❌ AudioManager 播放失败:', key, e);
            return null;
        }
    }

    stop(key) {
        console.log('🎵 AudioManager.stop() called:', key);

        if (this.activeSounds[key]) {
            try {
                if (this.activeSounds[key] && typeof this.activeSounds[key].stop === 'function') {
                    this.activeSounds[key].stop();
                }
                if (this.activeSounds[key] && typeof this.activeSounds[key].destroy === 'function') {
                    this.activeSounds[key].destroy();
                }
                console.log('✅ 音频已停止:', key);
            } catch (e) {
                console.warn('⚠️ 停止音频出错:', key, e);
            }
            
            if (this.currentBgm === key) {
                this.currentBgm = null;
            }
            
            delete this.activeSounds[key];
        }
    }

    stopAll() {
        console.log('🎵 AudioManager.stopAll() called');
        
        for (const key in this.activeSounds) {
            this.stop(key);
        }
        
        this.activeSounds = {};
        this.currentBgm = null;
        this.lastPlayTime = {};
        
        console.log('✅ 所有音频已停止');
    }

    setVolume(key, volume) {
        if (this.activeSounds[key]) {
            this.activeSounds[key].volume = volume;
        }
    }

    getVolume(key) {
        return this.activeSounds[key] ? this.activeSounds[key].volume : 0.5;
    }
}

window.AudioManager = AudioManager;
window.audioManager = new AudioManager();

const game = new Phaser.Game(CONFIG);

// 初始化 AudioManager（在 game 创建后）
game.events.once('ready', () => {
    console.log('🎮 Phaser Game 已就绪，初始化 AudioManager');
    window.audioManager.init(game);
});

window.game = game;

