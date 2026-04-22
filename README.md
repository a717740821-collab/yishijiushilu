# 土豆兄弟 - 像素肉鸽闯关游戏

一款使用 Phaser.js 制作的闯关游戏，支持多关卡、Boss战、道具系统和存档功能。

## 项目结构

```
rouge/
├── index.html                 # 游戏入口HTML
├── assets/                    # 游戏资源
│   ├── audio/                 # 音频文件
│   │   ├── bgm/              # 背景音乐
│   │   │   ├── menu.mp3
│   │   │   ├── game.mp3
│   │   │   ├── boss.mp3
│   │   │   └── victory.mp3
│   │   ├── sfx/              # 游戏音效
│   │   │   ├── attack.mp3
│   │   │   ├── enemy_hit.mp3
│   │   │   ├── player_hit.mp3
│   │   │   ├── pickup.mp3
│   │   │   ├── death.mp3
│   │   │   ├── coin.mp3
│   │   │   ├── level_up.mp3
│   │   │   └── button_click.mp3
│   │   └── README.md          # 音频说明
│   └── images/               # 图片资源
│       ├── backgrounds/       # 背景图
│       ├── characters/       # 角色图
│       ├── enemies/          # 敌人图
│       ├── items/            # 道具图
│       └── ui/               # UI图
└── src/
    ├── main.js               # 游戏启动入口
    ├── config/
    │   ├── game.js           # 游戏配置（分辨率、按键等）
    │   └── saveSystem.js    # 存档系统
    ├── data/
    │   └── story.js          # 剧情、敌人、道具数据
    └── scenes/
        ├── BootScene.js      # 启动场景
        ├── PreloadScene.js   # 加载场景
        ├── MenuScene.js      # 主菜单
        ├── StoryScene.js     # 剧情场景
        ├── GameScene.js      # 游戏主场景
        ├── EndingScene.js    # 关卡结局
        ├── PauseScene.js     # 暂停菜单
        └── GameOverScene.js  # 游戏结束
```

## 快速开始

### 运行游戏

1. 使用任意本地服务器运行（防止CORS问题）:

```bash
# Python 3
python -m http.server 8080

# Node.js
npx http-server .

# VS Code Live Server 插件
```

1. 浏览器访问 `http://localhost:8080`

### 操作说明

| 按键         | 功能    |
| ---------- | ----- |
| WASD / 方向键 | 移动    |
| 空格键 / K    | 攻击    |
| E / L      | 确认/交互 |
| ESC / P    | 暂停游戏  |

## 自定义修改指南

### 1. 修改剧情文本

编辑 `src/data/story.js` 中的 `STORY_DATA` 对象：

```javascript
levels: [
    {
        id: 1,
        name: "第一章：自定义标题",
        introText: "在这里输入你的剧情文本...\n换行使用\\n",
        // ...
    }
]
```

### 2. 添加新关卡

在 `story.js` 的 `levels` 数组中添加：

```javascript
{
    id: 5,
    name: "第五章：新关卡",
    introText: "新关卡剧情...",
    backgrounds: ["bg_5_1", "bg_5_2"],
    enemies: [
        { type: "slime", minCount: 3, maxCount: 5 }
    ],
    items: [...],
    boss: { type: "boss_new", name: "新Boss" },
    endingText: "关卡结束文本...",
    nextLevel: null  // 设置为null表示最后一关
}
```

### 3. 添加新敌人

在 `enemyTypes` 中添加：

```javascript
new_enemy: {
    name: "新敌人",
    health: 50,
    speed: 80,
    damage: 15,
    sprite: "enemy_new",  // 对应加载的精灵图key
    dropCoins: [10, 25]
}
```

### 4. 添加新道具

在 `itemTypes` 中添加：

```javascript
new_item: {
    name: "新道具",
    sprite: "item_new",
    effect: "health",  // health/coin/speed/attack/shield
    value: 50
}
```

### 5. 修改分辨率

编辑 `src/config/game.js`:

```javascript
const GAME_WIDTH = 1280;   // 修改宽度
const GAME_HEIGHT = 720;  // 修改高度
```

### 6. 修改按键绑定

编辑 `src/config/game.js`:

```javascript
const CONTROLS = {
    UP: ['UP', 'W'],      // 继续游戏使用这些按键
    // ...
};
```

### 7. 添加背景图片

1. 将PNG图片放入 `assets/images/backgrounds/`
2. 在 `PreloadScene.js` 的 `loadAssets()` 中添加加载代码：

```javascript
this.load.image('my_bg', 'assets/images/backgrounds/my_bg.png');
```

1. 在 `story.js` 中使用：

```javascript
backgrounds: ['my_bg', 'other_bg']
```

## 存档系统

游戏自动使用 localStorage 保存进度：

- `potato_brothers_save`: 游戏存档
- `potato_brothers_settings`: 设置（音量等）

### 手动保存/读取

```javascript
// 保存
SaveSystem.saveGame({
    currentLevel: 1,
    playerHealth: 100,
    playerCoins: 50,
    // ...
});

// 读取
const data = SaveSystem.loadGame();

// 检查存档
if (SaveSystem.hasSave()) { ... }
```

## 敌人AI说明

敌人会自动追踪玩家：

- 普通敌人持续追踪
- Boss有更大的碰撞范围
- 所有敌人有独立的生命条

## 游戏流程

```
主菜单 → 剧情场景 → 游戏场景 → (循环直到Boss) → 结局场景 → (下一关或胜利)
                                              ↓
                                         游戏结束 → 重玩/主菜单
```

## 技术栈

- Phaser 3.60.0
- 原生 JavaScript ES6+
- HTML5 Canvas/WebGL

## 浏览器兼容

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 许可证

MIT License
