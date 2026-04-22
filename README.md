# 音频资源结构说明

本项目使用 Phaser.js 的音频系统，支持 MP3 格式的音频文件。

## 目录结构

```
assets/
├── audio/
│   ├── bgm/          # 背景音乐
│   │   ├── menu.mp3       # 主菜单音乐
│   │   ├── game.mp3       # 游戏进行音乐
│   │   ├── boss.mp3       # Boss战音乐
│   │   └── victory.mp3    # 胜利音乐
│   └── sfx/          # 音效
│       ├── attack.mp3     # 攻击音效
│       ├── enemy_hit.mp3  # 敌人受击
│       ├── player_hit.mp3 # 玩家受击
│       ├── pickup.mp3     # 拾取物品
│       ├── death.mp3      # 死亡音效
│       ├── coin.mp3       # 金币音效
│       ├── level_up.mp3   # 升级音效
│       └── button_click.mp3 # 按钮点击
```

## 音频文件要求

### 背景音乐 (BGM)
- 格式: MP3
- 建议时长: 60-180秒循环
- 建议比特率: 128-256 kbps

| 文件名 | 用途 | 建议风格 |
|--------|------|----------|
| menu.mp3 | 主菜单 | 轻松、奇幻风格 |
| game.mp3 | 普通关卡 | 紧张、冒险风格 |
| boss.mp3 | Boss战 | 激烈、战斗风格 |
| victory.mp3 | 胜利/结局 | 史诗、凯旋风格 |

### 音效 (SFX)
- 格式: MP3 或 WAV
- 建议时长: 0.1-2秒
- 建议比特率: 128 kbps

| 文件名 | 触发时机 | 建议风格 |
|--------|----------|----------|
| attack.mp3 | 玩家攻击 | 短促、有力 |
| enemy_hit.mp3 | 攻击命中敌人 | 金属撞击 |
| player_hit.mp3 | 玩家受伤 | 沉闷冲击 |
| pickup.mp3 | 拾取道具 | 叮咚、清脆 |
| death.mp3 | 敌人死亡 | 消散、消失 |
| coin.mp3 | 获得金币 | 金属碰撞 |
| level_up.mp3 | Boss死亡 | 凯旋、胜利 |
| button_click.mp3 | 按钮点击 | 短促点击 |

## 音频系统工作原理

1. **PreloadScene** 在 `loadAssets()` 中加载所有音频
2. **MenuScene** 播放菜单BGM `menu_bgm`
3. **GameScene** 播放游戏BGM `game_bgm`，Boss战切换到 `boss_bgm`
4. **EndingScene** 播放胜利BGM `victory_bgm`

## 音量控制

音量设置存储在 localStorage 中:
- `musicVolume`: 0.0 - 1.0 (默认 0.7)
- `sfxVolume`: 0.0 - 1.0 (默认 0.8)

## 添加自定义音频

1. 将音频文件放入对应目录
2. 在 `PreloadScene.js` 的 `loadAssets()` 方法中添加:
   ```javascript
   this.load.audio('your_key', 'assets/audio/your_path.mp3');
   ```
3. 在对应场景中使用:
   ```javascript
   this.sound.play('your_key', { volume: 0.5 });
   ```

## 无音频文件时的处理

项目已内置基本的程序生成纹理作为备选，当音频文件不存在时会静默失败。
建议在实际发布时添加高质量的音频文件以提升游戏体验。

## 免费音频资源推荐

- **freesound.org** - 免费音效库
- **opengameart.org** - 开源游戏资源
- **bfxr.net** - 8-bit风格音效生成器