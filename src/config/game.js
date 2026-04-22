const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const PIXEL_SCALE = 3;

const CONFIG = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        StoryScene,
        GameScene,
        EpilogueScene,
        EndingScene,
        PauseScene,
        GameOverScene
    ]
};

const CONTROLS = {
    UP: ['UP', 'W'],
    DOWN: ['DOWN', 'S'],
    LEFT: ['LEFT', 'A'],
    RIGHT: ['RIGHT', 'D'],
    ATTACK: ['SPACE', 'K'],
    INTERACT: ['E', 'L'],
    PAUSE: ['ESC', 'P']
};

const DIFFICULTY = {
    EASY: { enemySpeed: 0.8, enemyHealth: 0.7, dropRate: 0.5 },
    NORMAL: { enemySpeed: 1, enemyHealth: 1, dropRate: 0.3 },
    HARD: { enemySpeed: 1.3, enemyHealth: 1.5, dropRate: 0.2 }
};

window.CONFIG = CONFIG;
window.GAME_WIDTH = GAME_WIDTH;
window.GAME_HEIGHT = GAME_HEIGHT;
window.PIXEL_SCALE = PIXEL_SCALE;
window.CONTROLS = CONTROLS;
window.DIFFICULTY = DIFFICULTY;