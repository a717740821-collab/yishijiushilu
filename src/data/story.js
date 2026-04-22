const STORY_DATA = {
    menuText: {
        title: "异世救世录",
        subtitle: "从零开始的魔王讨伐与神之终焉",
        startGame: "新的传说",
        continueGame: "继续冒险",
        settings: "游戏设置",
        music: "音乐",
        soundEffects: "音效",
        quit: "退出游戏",
        pressStart: "— 按 ENTER 开始你的冒险 —",
        paused: "游戏暂停",
        resume: "继续游戏",
        restart: "重新开始",
        mainMenu: "主菜单",
        gameOver: "战斗失败",
        replay: "重新挑战"
    },
    player: {
        name: "艾伦·冯·星辉",
        health: 100,
        speed: 200,
        attackDamage: 20,
        attackRange: 100,
        attackCooldown: 300
    },
    itemTypes: {
        health_potion: {
            name: "生命药水",
            effect: "health",
            value: 30,
            sprite: "item_health"
        },
        coin: {
            name: "金币",
            effect: "coin",
            value: 10,
            sprite: "item_coin"
        }
    },
    levels: [
        {
            id: 0,
            name: "序章：零之转生",
            type: "story",
            introBackground: "parallax_bg001",
            introDialogue: {
                cg: null,
                portraits: {
                    left: null,
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "漆黑的虚空，无数星辰如破碎的玻璃般漂浮。你躺在自家沙发上，手里还握着手机，最后一幕是魂系游戏的【GAME OVER】画面。", speaker: "narration" },
                    { name: "旁白", text: "突然，一道柔和的白色光芒包裹而来……", speaker: "narration" },
                    { name: "神秘声音", text: "勇者啊……这个世界已在崩坏的边缘。只有'星辉勇者'才能逆转命运。请你……来吧。", speaker: "narration" },
                    { name: "旁白", text: "光芒爆裂，你猛然睁眼。你转生为15岁少年「艾伦·冯·星辉」，躺在王都中央的巨大星辉祭坛上。", speaker: "narration" },
                    { name: "莉娅", text: "艾伦大人……您终于醒了！预言中的星辉勇者……王都已陷入恐慌，魔王军的斥候已在边境集结。请您……拯救我们！", speaker: "right" },
                    { name: "贤者", text: "孩子，时间紧迫。你的身体已与星辉之力融合，但力量尚弱。先去新手村熟悉战斗吧。愿星辉指引你。", speaker: "narration" },
                    { name: "旁白", text: "屏幕淡出，显示【第1章 即将开启】……", speaker: "narration" }
                ]
            },
            gameStart: false,
            nextLevel: 1
        },
        {
            id: 1,
            name: "第1章：新手村的觉醒",
            type: "game",
            introBackground: "parallax_bg001",
            backgrounds: ["parallax_bg001"],
            bossBackground: "parallax_dark_space1",
            enemies: [
                { type: "Goblin", minCount: 8, maxCount: 12 },
                { type: "Wolf", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 50 },
                { type: "coin", weight: 50 }
            ],
            boss: null,
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "王都郊外的新手村，木屋错落，麦田金黄。夕阳西下，村口火把摇曳，村民们惊慌失措地奔跑。空气中弥漫着焦糊味与野兽的低吼。", speaker: "narration" },
                    { name: "莉娅", text: "艾伦大人，这里是您的起点。村长说，魔王军的斥候——一群哥布林与狼骑——正袭击村子。请您用我教您的'星辉斩'试试！", speaker: "right" },
                    { name: "艾伦", text: "我握紧初始木剑，身体还带着转生后的轻微眩晕。但我知道……这是我必须面对的战斗！", speaker: "left" }
                ]
            },
            introText: "前往新手村学习基本操作...\n\n按ENTER键继续",
            gameTutorial: true,
            tutorialSteps: [
                { instruction: "使用 WASD 或 方向键 移动" },
                { instruction: "按 空格键 发射星辉之力" },
                { instruction: "消灭所有哥布林和狼骑！保护村民！" }
            ],
            afterTutorialDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "战斗结束。你喘着粗气，但心中充满了胜利的喜悦。", speaker: "narration" },
                    { name: "村长", text: "勇者大人！您救了我们全村！这是祖传的皮甲和金币，请收下！", speaker: "narration" },
                    { name: "莉娅", text: "艾伦，您做得很好……但这只是开始。森林里还有更强的魔化野兽在等着我们。", speaker: "right" },
                    { name: "旁白", text: "第1章完成！艾伦在新手村学会了基本的战斗技巧，踏上了冒险之旅。", speaker: "narration" }
                ]
            },
            endingText: "第1章完成！\n\n艾伦在新手村学会了基本的战斗技巧，踏上了冒险之旅。\n\n提示：【第2章 森林的试炼 已解锁】",
            endingBackground: "parallax_sunset",
            nextLevel: 2
        },
        {
            id: 2,
            name: "第2章：森林的试炼",
            type: "game",
            introBackground: "parallax_bg001",
            backgrounds: ["parallax_bg001"],
            enemies: [
                { type: "Plant", minCount: 8, maxCount: 12 },
                { type: "Fairy", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 40 },
                { type: "coin", weight: 60 }
            ],
            boss: { type: "Ifrit", name: "污染树妖之王" },
            bossBackground: "parallax_dark_space1",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "星辉森林深处，参天古树遮天蔽日，藤蔓如蛇缠绕，地面铺满发光的苔藓。空气潮湿，远处传来野兽咆哮与树木断裂声。", speaker: "narration" },
                    { name: "丝薇尔", text: "人类……魔王军污染了森林之母……树妖失控了……求求你……", speaker: "right" },
                    { name: "莉娅", text: "艾伦，我们必须清除污染源！丝薇尔会指引我们。", speaker: "narration" },
                    { name: "艾伦", text: "我会拯救这片森林！", speaker: "left" }
                ]
            },
            introText: "进入星辉森林清除魔化野兽...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B4513
                },
                lines: [
                    { name: "污染树妖之王", text: "渺小的生物……你们不该来这里！森林的愤怒由我承载！", speaker: "narration" },
                    { name: "艾伦", text: "星辉之力……引导我！", speaker: "left" },
                    { name: "丝薇尔", text: "小心！它的根部攻击范围很大！", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "污染树妖之王轰然倒塌，紫雾在爆炸中消散。丝薇尔的伤势逐渐恢复。", speaker: "narration" },
                    { name: "丝薇尔", text: "我……愿追随您，星辉勇者。森林告诉我，魔王并非独自苏醒……", speaker: "right" },
                    { name: "莉娅", text: "我们走吧，边境要塞已传来急报！", speaker: "narration" },
                    { name: "旁白", text: "丝薇尔加入了队伍。精灵盟友已加入！", speaker: "narration" }
                ]
            },
            endingText: "第2章完成！\n\n艾伦在星辉森林击败污染树妖之王，丝薇尔加入队伍。\n\n提示：【第3章 边境要塞的攻防战 已解锁】",
            endingBackground: "parallax_cloudy_sky1",
            nextLevel: 3
        },
        {
            id: 3,
            name: "第3章：边境要塞的攻防战",
            type: "game",
            introBackground: "parallax_mountains2",
            backgrounds: ["parallax_mountains2", "parallax_sunset", "parallax_ocean1"],
            enemies: [
                { type: "Orc", minCount: 6, maxCount: 10 },
                { type: "Soldier", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 35 },
                { type: "coin", weight: 65 }
            ],
            boss: { type: "General", name: "兽王" },
            bossBackground: "parallax_dark_space1",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "王国边境石质要塞，城墙布满箭孔，火油滚烫。夜色中，魔王军兽人军团的火把如海潮涌来，战鼓震天。", speaker: "narration" },
                    { name: "要塞守将", text: "勇者！兽人攻城车已到门前！我们撑不住了！", speaker: "narration" },
                    { name: "艾伦", text: "全军听令！跟我冲！", speaker: "left" },
                    { name: "莉娅", text: "艾伦，我用圣光支援你！", speaker: "right" }
                ]
            },
            introText: "前往边境要塞支援防御战...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B4513
                },
                lines: [
                    { name: "兽王", text: "愚蠢的人类！魔王大人的军队是不可战胜的！", speaker: "narration" },
                    { name: "艾伦", text: "为了守护这个世界，我不会让你们通过！", speaker: "left" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B4513
                },
                lines: [
                    { name: "旁白", text: "兽王轰然倒地，双斧断裂。艾伦浑身浴血，但眼中燃烧着不屈的火焰。", speaker: "narration" },
                    { name: "要塞守将", text: "感谢勇者大人！您是我们的救世主！请收下这把'王国之剑'！", speaker: "narration" },
                    { name: "莉娅", text: "艾伦，有传闻说魔王军中有一个'无面将军'……实力深不可测。", speaker: "right" }
                ]
            },
            endingText: "第3章完成！\n\n艾伦击败兽王，获得王国之剑。\n\n提示：【第4章 沙漠遗迹的秘宝 已解锁】",
            endingBackground: "parallax_sunset",
            nextLevel: 4
        },
        {
            id: 4,
            name: "第4章：沙漠遗迹的秘宝",
            type: "game",
            introBackground: "parallax_sunset",
            backgrounds: ["parallax_sunset", "parallax_mountains3", "parallax_dark_space1"],
            enemies: [
                { type: "Skeleton", minCount: 5, maxCount: 8 },
                { type: "Zombie", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 30 },
                { type: "coin", weight: 70 }
            ],
            boss: { type: "Mummy", name: "亡灵守卫长" },
            bossBackground: "parallax_dark_space1",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "南方灼热沙漠，金色沙海无边，烈日灼烧。遗迹入口是半埋的古代石门，内部走廊布满流沙机关。", speaker: "narration" },
                    { name: "丝薇尔", text: "圣器碎片就在最深处……但魔王军已先我们一步！", speaker: "right" },
                    { name: "艾伦", text: "那就抢回来！", speaker: "left" },
                    { name: "莉娅", text: "小心，遗迹中有古老的亡灵守护者……", speaker: "narration" }
                ]
            },
            introText: "前往南方灼热沙漠寻找星辉圣器...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x696969
                },
                lines: [
                    { name: "亡灵守卫长", text: "擅闯圣地者……死！星辉碎片属于黑暗！", speaker: "narration" },
                    { name: "艾伦", text: "星辉之力，与我同在！", speaker: "left" },
                    { name: "丝薇尔", text: "小心！它们曾经是古代的守护者！", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "亡灵守卫长化作尘埃，你成功夺取了第一块星辉圣器碎片。", speaker: "narration" },
                    { name: "艾伦", text: "找到了！这就是星辉圣器的碎片！", speaker: "left" },
                    { name: "丝薇尔", text: "它与你的星辉之力产生了共鸣……你的力量在提升！", speaker: "right" },
                    { name: "莉娅", text: "艾伦！大事不好！魔王军早已潜入遗迹，正在抢夺另一部分圣器！", speaker: "narration" },
                    { name: "艾伦", text: "什么！我们必须阻止他们！", speaker: "left" }
                ]
            },
            endingText: "第4章完成！\n\n艾伦取得星辉圣器碎片，力量大幅提升。\n\n提示：【第5章 雪山圣堂的背叛 已解锁】",
            endingBackground: "parallax_sunset",
            nextLevel: 5
        },
        {
            id: 5,
            name: "第5章：雪山圣堂的背叛",
            type: "game",
            introBackground: "parallax_mountains4",
            backgrounds: ["parallax_mountains4", "parallax_cloudy_sky2", "parallax_ocean2"],
            enemies: [
                { type: "Icelady", minCount: 4, maxCount: 6 },
                { type: "Frost", minCount: 3, maxCount: 5 },
                { type: "Priest", minCount: 2, maxCount: 4 }
            ],
            items: [
                { type: "health_potion", weight: 35 },
                { type: "coin", weight: 65 }
            ],
            boss: { type: "Bishop", name: "堕落大主教" },
            bossBackground: "parallax_dark_space1",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "北方雪山之巅，暴风雪肆虐，冰霜圣堂金碧辉煌却笼罩黑气。大主教厅堂内烛火摇曳，墙上挂满堕落骑士的画像。", speaker: "narration" },
                    { name: "大主教", text: "勇者，欢迎……来接受我的'祝福'吧。", speaker: "narration" },
                    { name: "莉娅", text: "不！他的灵魂已被腐蚀！", speaker: "right" },
                    { name: "艾伦", text: "大主教……你！", speaker: "left" }
                ]
            },
            introText: "前往雪山圣堂寻求教会支持...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B0000
                },
                lines: [
                    { name: "堕落大主教", text: "呵呵……愚蠢的勇者，你以为我会帮助你们？我早已将自己献给了魔王大人！", speaker: "narration" },
                    { name: "艾伦", text: "什么！连教会都被腐蚀了？！", speaker: "left" },
                    { name: "莉娅", text: "大主教大人……为什么……", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "堕落大主教在圣光中化为灰烬。圣堂的黑暗气息逐渐消散。", speaker: "narration" },
                    { name: "艾伦", text: "结束了……大主教。", speaker: "left" },
                    { name: "莉娅", text: "连教会都……艾伦，我们真的能相信任何人吗？", speaker: "right" },
                    { name: "艾伦", text: "不管发生什么，我都会保护你。", speaker: "left" },
                    { name: "丝薇尔", text: "我们得到了'圣堂权杖'……这是重要的力量。", speaker: "narration" }
                ]
            },
            endingText: "第5章完成！\n\n艾伦击败堕落大主教，获得圣堂权杖。\n\n提示：【第6章 海上迷航与海妖之歌 已解锁】",
            endingBackground: "parallax_mountains4",
            nextLevel: 6
        },
        {
            id: 6,
            name: "第6章：海上迷航与海妖之歌",
            type: "game",
            introBackground: "parallax_ocean1",
            backgrounds: ["parallax_ocean1", "parallax_ocean2", "parallax_sea_of_clouds"],
            enemies: [
                { type: "Sahagin", minCount: 5, maxCount: 8 },
                { type: "Jellyfish", minCount: 4, maxCount: 6 },
                { type: "Kraken", minCount: 2, maxCount: 3 }
            ],
            items: [
                { type: "health_potion", weight: 35 },
                { type: "coin", weight: 65 }
            ],
            boss: { type: "SeaMonster", name: "深海魔物" },
            bossBackground: "parallax_dark_space1",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "miya.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x00CED1
                },
                lines: [
                    { name: "旁白", text: "西方汪洋，狂风暴雨，船只在巨浪中颠簸。海面下紫光闪烁，海妖的歌声如幻觉般飘来。", speaker: "narration" },
                    { name: "米娅", text: "风暴是海妖引来的！勇者，保护我们的船！", speaker: "right" },
                    { name: "艾伦", text: "我不会让任何人牺牲！", speaker: "left" },
                    { name: "莉娅", text: "前方有巨大的魔力反应……小心！", speaker: "narration" }
                ]
            },
            introText: "乘船前往西方诸岛寻找封印知识...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x000080
                },
                lines: [
                    { name: "深海魔物", text: "愚蠢的人类……你们不该闯入我的领域！", speaker: "narration" },
                    { name: "艾伦", text: "我不会输给海洋的怪物！", speaker: "left" },
                    { name: "米娅", text: "让我来帮你！我熟悉水性！", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "miya.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x00CED1
                },
                lines: [
                    { name: "旁白", text: "深海魔物发出最后的咆哮，庞大的身躯沉入海底。风暴逐渐平息。", speaker: "narration" },
                    { name: "米娅", text: "谢谢你们救了我！我叫米娅，是船长的女儿。", speaker: "right" },
                    { name: "米娅", text: "我是水系魔法天才，我想加入你们的队伍！", speaker: "right" },
                    { name: "艾伦", text: "欢迎加入，米娅！", speaker: "left" },
                    { name: "米娅", text: "我还带来了重要消息……魔王并非这个世界的原生邪恶，而是从'虚空裂隙'中降临的异界之灾。", speaker: "narration" }
                ]
            },
            endingText: "第6章完成！\n\n艾伦击败深海魔物，米娅加入队伍，并得知魔王的真正起源。\n\n提示：【第7章 地下城迷宫的永恒轮回 已解锁】",
            endingBackground: "parallax_ocean1",
            nextLevel: 7
        },
        {
            id: 7,
            name: "第7章：地下城迷宫的永恒轮回",
            type: "game",
            introBackground: "parallax_dark_space1",
            backgrounds: ["parallax_dark_space1", "parallax_dark_space2", "parallax_mountains5"],
            enemies: [
                { type: "Ghost", minCount: 6, maxCount: 10 },
                { type: "Skeleton", minCount: 5, maxCount: 8 },
                { type: "Demon", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 30 },
                { type: "coin", weight: 70 }
            ],
            boss: { type: "Minotaur", name: "迷宫守护者" },
            bossBackground: "parallax_dark_space2",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "魔王军地下大迷宫，石壁发光，时间扭曲，幻影重叠。这里能让闯入者一次次'死'去。", speaker: "narration" },
                    { name: "米娅", text: "根据我收集的情报，魔王军控制着一座地下大迷宫。迷宫内据说有通往魔王城的传送门。", speaker: "narration" },
                    { name: "丝薇尔", text: "迷宫说……你能在这里找到真相。", speaker: "right" },
                    { name: "艾伦", text: "那我们还等什么？进去吧！", speaker: "left" }
                ]
            },
            introText: "潜入魔王军控制的地下大迷宫...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B4513
                },
                lines: [
                    { name: "迷宫守护者", text: "没有人能通过这里！永远！时间……对我没有意义！", speaker: "narration" },
                    { name: "艾伦", text: "时间回溯……让我看清你的弱点！", speaker: "left" },
                    { name: "丝薇尔", text: "它的核心在胸口！攻击那里！", speaker: "narration" }
                ]
            },
            deathDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0xFF0000
                },
                lines: [
                    { name: "旁白", text: "你倒下了……", speaker: "narration" },
                    { name: "旁白", text: "但星辉之力让你重新站了起来。", speaker: "narration" },
                    { name: "旁白", text: "迷宫似乎在不断变化……你必须找到真相！", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "迷宫守护者崩解，露出了核心中的传送门。你终于掌握'时间回溯'的力量。", speaker: "narration" },
                    { name: "艾伦", text: "我看到了……迷宫的核心！", speaker: "left" },
                    { name: "莉娅", text: "艾伦！你发现了什么？！", speaker: "right" },
                    { name: "艾伦", text: "魔王正在利用迷宫的力量汲取世界本源……这就是为什么它在不断变强！", speaker: "left" },
                    { name: "艾伦", text: "而且……我获得了新的力量——'时间回溯'技能碎片！", speaker: "left" }
                ]
            },
            endingText: "第7章完成！\n\n艾伦发现魔王的真正目的，获得时间回溯技能。\n\n提示：【第8章 王国决战·王都沦陷 已解锁】",
            endingBackground: "parallax_dark_space1",
            nextLevel: 8
        },
        {
            id: 8,
            name: "第8章：王国决战·王都沦陷",
            type: "game",
            introBackground: "parallax_sunset",
            backgrounds: ["parallax_sunset", "parallax_mountains1", "parallax_ocean1"],
            enemies: [
                { type: "Orc", minCount: 8, maxCount: 12 },
                { type: "Soldier", minCount: 6, maxCount: 10 },
                { type: "Demon", minCount: 4, maxCount: 6 }
            ],
            items: [
                { type: "health_potion", weight: 25 },
                { type: "coin", weight: 75 }
            ],
            boss: { type: "Darklord", name: "魔王四天王之一" },
            bossBackground: "parallax_dark_space2",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "王都街道火光冲天，宫殿半毁，平民尖叫逃窜。魔王军的旗帜在风中猎猎作响。", speaker: "narration" },
                    { name: "莉娅", text: "艾伦！魔王军全面进攻王都了！", speaker: "right" },
                    { name: "艾伦", text: "什么！他们怎么能突破防线？！", speaker: "left" },
                    { name: "丝薇尔", text: "是魔王四天王……他们亲自出动了！", speaker: "narration" },
                    { name: "艾伦", text: "我们必须回去！保护王都！", speaker: "left" }
                ]
            },
            introText: "赶回王都参加决战...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x8B0000
                },
                lines: [
                    { name: "魔王四天王", text: "愚蠢的勇者……你以为能阻止魔王的崛起吗？", speaker: "narration" },
                    { name: "艾伦", text: "为了这个世界……我必须赢！", speaker: "left" },
                    { name: "莉娅", text: "艾伦！我会用圣光支援你！", speaker: "right" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x4169E1
                },
                lines: [
                    { name: "旁白", text: "魔王四天王之一在火焰中化为灰烬。王都的一半已经化为废墟，但你们阻止了更糟的结果。", speaker: "narration" },
                    { name: "国王", text: "艾伦……王都的一半已经化为废墟……但你阻止了更糟的结果……拿着这个。", speaker: "narration" },
                    { name: "国王", text: "这是'星辉王冠'……世界的未来就交给你了。", speaker: "narration" },
                    { name: "艾伦", text: "我……我一定会打败魔王！", speaker: "left" }
                ]
            },
            endingText: "第8章完成！\n\n艾伦击退魔王四天王，但王都半数城区化为废墟，获得星辉王冠。\n\n提示：【第9章 魔王城前哨战 已解锁】",
            endingBackground: "parallax_sunset",
            nextLevel: 9
        },
        {
            id: 9,
            name: "第9章：魔王城前哨战",
            type: "game",
            introBackground: "parallax_dark_space2",
            backgrounds: ["parallax_dark_space2", "parallax_dark_space1", "parallax_mountains5"],
            enemies: [
                { type: "Demon", minCount: 8, maxCount: 12 },
                { type: "Ghost", minCount: 6, maxCount: 10 },
                { type: "Assassin", minCount: 5, maxCount: 8 }
            ],
            items: [
                { type: "health_potion", weight: 30 },
                { type: "coin", weight: 70 }
            ],
            boss: { type: "General", name: "三大军团长" },
            bossBackground: "parallax_dark_space2",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "siweier.png",
                    leftColor: 0x4169E1,
                    rightColor: 0x90EE90
                },
                lines: [
                    { name: "旁白", text: "魔王城外围，黑石高墙，熔岩河流。空气中弥漫着硫磺与死亡的气息。", speaker: "narration" },
                    { name: "丝薇尔", text: "我们终于到达魔王城外围了。", speaker: "right" },
                    { name: "米娅", text: "前方有魔王军三大军团长把守……", speaker: "narration" },
                    { name: "莉娅", text: "兽王、死灵君主、暗影刺客……每一个都是强敌。", speaker: "narration" },
                    { name: "艾伦", text: "不管他们有多强，我都会一一击败！", speaker: "left" }
                ]
            },
            introText: "击败魔王城三大军团长...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x4B0082
                },
                lines: [
                    { name: "兽王", text: "哼……又来了一个送死的。", speaker: "narration" },
                    { name: "艾伦", text: "星辉之力……斩！", speaker: "left" },
                    { name: "兽王临死", text: "愚蠢的勇者……你以为这就是终点吗？魔王背后……有更恐怖的存在……", speaker: "narration" },
                    { name: "死灵君主", text: "有趣……让我看看你的实力！", speaker: "narration" },
                    { name: "艾伦", text: "我不会退缩！", speaker: "left" },
                    { name: "死灵君主临死", text: "呵……你终究会发现……这个世界的真相……", speaker: "narration" },
                    { name: "暗影刺客", text: "你能走到这里……确实不简单。", speaker: "narration" },
                    { name: "艾伦", text: "最后一场战斗……来吧！", speaker: "left" },
                    { name: "暗影刺客临死", text: "我们……不过是棋子……真正的灾厄……即将苏醒……", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: "shengnv.png",
                    leftColor: 0x4169E1,
                    rightColor: 0xFFFFFF
                },
                lines: [
                    { name: "旁白", text: "三大军团长都被击败了。魔王城的大门就在眼前。", speaker: "narration" },
                    { name: "丝薇尔", text: "三大军团长都被击败了……", speaker: "narration" },
                    { name: "米娅", text: "但他们临死前的话……让人不安。", speaker: "narration" },
                    { name: "莉娅", text: "艾伦……你准备好了吗？", speaker: "right" },
                    { name: "艾伦", text: "不管前方有什么……我们一起面对。", speaker: "left" },
                    { name: "丝薇尔", text: "魔王城大门就在眼前……最后的战斗要开始了。", speaker: "narration" }
                ]
            },
            endingText: "第9章完成！\n\n艾伦击败魔王城三大军团长，站在魔王城门前。\n\n提示：【第10章 魔王对决·终焉的开端 已解锁】",
            endingBackground: "parallax_dark_space2",
            nextLevel: 10
        },
        {
            id: 10,
            name: "第10章：魔王对决·终焉的开端",
            type: "game",
            introBackground: "parallax_dark_space2",
            backgrounds: ["parallax_dark_space2", "parallax_dark_space1", "parallax_mountains5"],
            enemies: [
                { type: "Demon", minCount: 10, maxCount: 15 },
                { type: "Ghost", minCount: 8, maxCount: 12 },
                { type: "Dragon", minCount: 3, maxCount: 5 }
            ],
            items: [
                { type: "health_potion", weight: 20 },
                { type: "coin", weight: 80 }
            ],
            boss: { type: "God", name: "魔王巴尔泽芬" },
            bossBackground: "parallax_dark_space2",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x4B0082
                },
                lines: [
                    { name: "旁白", text: "魔王城最深处，紫焰王座厅，空气扭曲。魔王巴尔泽芬坐在王座上，黑翼缓缓展开。", speaker: "narration" },
                    { name: "魔王巴尔泽芬", text: "欢迎来到我的城堡，勇者。我承认……你比我预想的要走得远。", speaker: "narration" },
                    { name: "艾伦", text: "巴尔泽芬……今天就是你的末日！", speaker: "left" },
                    { name: "魔王巴尔泽芬", text: "愚蠢的人类……你以为能打败我？我可是拥有黑暗力量的魔王！", speaker: "narration" }
                ]
            },
            introText: "与魔王巴尔泽芬决战...\n\n按ENTER键继续",
            bossDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x4B0082
                },
                lines: [
                    { name: "魔王巴尔泽芬", text: "你的同伴……一个接一个倒下！", speaker: "narration" },
                    { name: "丝薇尔", text: "艾伦……我们相信你！", speaker: "narration" },
                    { name: "米娅", text: "用我们的力量……打败他！", speaker: "narration" },
                    { name: "莉娅", text: "星辉之力……觉醒吧！", speaker: "narration" },
                    { name: "艾伦", text: "星辉之力……完全觉醒！", speaker: "left" },
                    { name: "魔王巴尔泽芬", text: "不可能……我的力量……！", speaker: "narration" }
                ]
            },
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x4B0082
                },
                lines: [
                    { name: "魔王巴尔泽芬", text: "可恶……我竟然输给了人类……", speaker: "narration" },
                    { name: "魔王巴尔泽芬", text: "但这不会结束的……不会……", speaker: "narration" },
                    { name: "旁白", text: "魔王的身体崩解，化作黑雾消散……", speaker: "narration" },
                    { name: "旁白", text: "王都的天空逐渐放晴，同伴们欢呼着胜利。", speaker: "narration" },
                    { name: "艾伦", text: "我们……终于赢了！", speaker: "left" },
                    { name: "莉娅", text: "是的，艾伦……我们做到了！", speaker: "narration" }
                ]
            },
            endingText: "第10章完成！\n\n艾伦与同伴们成功击败魔王巴尔泽芬，王都重获和平。\n\n提示：【最终章 魔神的降临·世界终焉 已解锁】",
            endingBackground: "parallax_starlit_sky",
            nextLevel: 11
        },
        {
            id: 11,
            name: "最终章：魔神的降临·世界终焉",
            type: "final_boss", // 特殊类型：直接进入Boss战
            introBackground: "parallax_dark_space2",
            backgrounds: ["parallax_dark_space1", "parallax_dark_space2"], // 崩坏背景
            enemies: [], // 无小怪
            items: [],
            boss: { type: "VoidGod", name: "Void God · Azathoth" }, // 虚空魔神
            bossBackground: "parallax_dark_space2",
            isFinalBoss: true, // 标记为最终Boss
            bossPhases: 5, // 5个阶段
            bossPhaseHP: [100, 75, 50, 25, 10], // 各阶段血量百分比
            preBattleCutscene: true, // 有战前过场动画
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "魔王城最深处大厅突然剧烈震颤……紫色王座崩裂，天花板碎成无数漂浮的黑色碎片。", speaker: "narration" },
                    { name: "旁白", text: "短暂的胜利喜悦后——天空被无形巨手撕裂，一道贯穿天际的漆黑裂隙出现。", speaker: "narration" },
                    { name: "旁白", text: "裂隙内无数血红眼球旋转，混沌星辰疯狂涌动……一股恐怖威压让整个屏幕剧烈抖动！", speaker: "narration" },
                    { name: "虚空魔神·阿撒托斯", text: "渺小的星辉之子……你打败了我的玩具，却亲手唤醒了我。", speaker: "narration", fontSize: 28, color: '#FF0044' },
                    { name: "虚空魔神·阿撒托斯", text: "这个世界，不过是我沉睡时的一个漫长梦境。现在……梦该醒了。", speaker: "narration", fontSize: 28, color: '#FF0044' },
                    { name: "莉娅", text: "艾伦……我们一起战斗到最后！", speaker: "right" },
                    { name: "丝薇尔", text: "森林之灵与你同在……", speaker: "narration", color: '#44FF88' },
                    { name: "米娅", text: "海之歌，永不停止！", speaker: "narration", color: '#44AAFF' },
                    { name: "虚空魔神·阿撒托斯", text: "来吧，星辉之子。杀了我，你也会随这个梦一起消失。你，愿意为了一个虚假的世界，舍弃自己的存在吗？", speaker: "narration", fontSize: 26, color: '#FF0044' }
                ]
            },
            trueEndIntroDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x4169E1,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "你的同伴们一个个为了保护你而战死……", speaker: "narration" },
                    { name: "丝薇尔", text: "艾伦……这是我能为你做的最后一件事……", speaker: "narration" },
                    { name: "旁白", text: "丝薇尔用生命为森林献祭，化作一道绿光……", speaker: "narration" },
                    { name: "米娅", text: "我相信你……一定能做到……", speaker: "narration" },
                    { name: "旁白", text: "米娅以海之歌魂化作屏障，挡住了魔神的攻击……", speaker: "narration" },
                    { name: "莉娅", text: "艾伦……我永远相信你……", speaker: "narration" },
                    { name: "旁白", text: "莉娅用圣光燃烧自己，为你争取最后一击的机会……", speaker: "narration" },
                    { name: "旁白", text: "你孤身站在魔神面前……星辉之力彻底觉醒，化作一把贯穿虚空的圣剑。", speaker: "narration" },
                    { name: "虚空魔神·阿撒托斯", text: "杀了我，你也会随这个梦境一起消失。你……愿意为了这个虚假的世界……舍弃自己的存在吗？", speaker: "narration" }
                ]
            },
            introText: "最终抉择时刻……\n\n按ENTER键继续",
            endingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0xFFFF00,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "你选择刺出那一剑——星辉之力彻底觉醒！", speaker: "narration" },
                    { name: "虚空魔神·阿撒托斯", text: "不……这不可能……我的梦……怎么会……", speaker: "narration", fontSize: 28, color: '#FF0044' },
                    { name: "旁白", text: "心核碎裂，魔神整个身体爆炸成无数黑色与金色粒子。整个背景开始剧烈崩塌，白光吞没屏幕。", speaker: "narration" },
                    { name: "旁白", text: "画面由刺眼白光转为一片宁静的星空。废墟之上，新的绿色嫩芽从焦土中钻出，远方残破的王都钟声再次响起。", speaker: "narration" },
                    { name: "女声（温柔）", text: "艾伦……不，应该叫你'玩家'。谢谢你陪这个世界，走完了最后一程。", speaker: "narration", color: '#88FFFF' },
                    { name: "女声（温柔）", text: "你选择了牺牲自己，却让这个梦继续下去。这个世界……会永远记住你。", speaker: "narration", color: '#88FFFF' },
                    { name: "旁白", text: "镜头拉远：一个与你转生前长得一模一样的孩子在村子里出生，手里握着一枚小小的星辉碎片，对着天空轻轻微笑。", speaker: "narration" }
                ]
            },
            badEndingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x000000,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "你被魔神的力量腐蚀……", speaker: "narration" },
                    { name: "旁白", text: "黑暗结局：你反过头来毁灭了世界，成为新的魔神……", speaker: "narration" },
                    { name: "旁白", text: "世界陷入永无止境的黑暗……", speaker: "narration" }
                ]
            },
            escapeEndingDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0x808080,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "你拒绝战斗，选择与魔神谈判……", speaker: "narration" },
                    { name: "虚空魔神·阿撒托斯", text: "愚蠢的人类……你将成为我新的玩具。", speaker: "narration" },
                    { name: "旁白", text: "你被吸入虚空，永世在梦中循环……", speaker: "narration" },
                    { name: "旁白", text: "逃避结局：永远困在魔神的梦境中……", speaker: "narration" }
                ]
            },
            endingText: "真·救世结局达成！\n\n感谢你，勇者。\n这个世界……会永远记住你。\n\n《异世救世录》完\n\n感谢游玩。",
            endingBackground: "parallax_starlit_sky"
        },
        {
            id: 12,
            name: "终幕：星辉的余韵",
            type: "story",
            autoEnding: true,
            introBackground: "parallax_starlit_sky",
            introDialogue: {
                cg: null,
                portraits: {
                    left: "hero.png",
                    right: null,
                    leftColor: 0xFFFF00,
                    rightColor: 0x000000
                },
                lines: [
                    { name: "旁白", text: "你选择刺出那一剑——星辉之力彻底觉醒！", speaker: "narration" },
                    { name: "虚空魔神·阿撒托斯", text: "不……这不可能……我的梦……怎么会……", speaker: "narration", fontSize: 28, color: '#FF0044' },
                    { name: "旁白", text: "心核碎裂，魔神整个身体爆炸成无数黑色与金色粒子。整个背景开始剧烈崩塌，白光吞没屏幕。", speaker: "narration" },
                    { name: "旁白", text: "画面由刺眼白光转为一片宁静的星空。废墟之上，新的绿色嫩芽从焦土中钻出，远方残破的王都钟声再次响起。", speaker: "narration" },
                    { name: "女声（温柔）", text: "艾伦……不，应该叫你'玩家'。谢谢你陪这个世界，走完了最后一程。", speaker: "narration", color: '#88FFFF' },
                    { name: "女声（温柔）", text: "你选择了牺牲自己，却让这个梦继续下去。这个世界……会永远记住你。", speaker: "narration", color: '#88FFFF' },
                    { name: "旁白", text: "镜头拉远：一个与你转生前长得一模一样的孩子在村子里出生，手里握着一枚小小的星辉碎片，对着天空轻轻微笑。", speaker: "narration" },
                    { name: "旁白", text: "——《异世救世录》 完——", speaker: "narration", color: '#FFD700', fontSize: 24 }
                ]
            }
        }
    ],
    enemyTypes: {
        Goblin: { sprite: 'enemy_slime', health: 45, speed: 1.2, damage: 15, dropCoins: 8 },
        Orc: { sprite: 'enemy_bat', health: 75, speed: 1.0, damage: 22, dropCoins: 15 },
        Wolf: { sprite: 'enemy_ghost', health: 30, speed: 1.8, damage: 12, dropCoins: 5 },
        Plant: { sprite: 'enemy_slime', health: 60, speed: 0.7, damage: 18, dropCoins: 12 },
        Earthspirit: { sprite: 'enemy_bat', health: 50, speed: 0.9, damage: 15, dropCoins: 10 },
        Fairy: { sprite: 'enemy_ghost', health: 35, speed: 1.5, damage: 12, dropCoins: 7 },
        Soldier: { sprite: 'enemy_bat', health: 90, speed: 1.1, damage: 25, dropCoins: 18 },
        Bat: { sprite: 'enemy_bat', health: 25, speed: 2.0, damage: 10, dropCoins: 4 },
        Skeleton: { sprite: 'enemy_ghost', health: 65, speed: 0.8, damage: 20, dropCoins: 14 },
        Zombie: { sprite: 'enemy_slime', health: 80, speed: 0.6, damage: 24, dropCoins: 16 },
        Scorpion: { sprite: 'enemy_bat', health: 45, speed: 1.4, damage: 18, dropCoins: 9 },
        Icelady: { sprite: 'enemy_ghost', health: 75, speed: 1.0, damage: 22, dropCoins: 15 },
        Frost: { sprite: 'enemy_ghost', health: 65, speed: 1.1, damage: 20, dropCoins: 13 },
        Priest: { sprite: 'enemy_slime', health: 60, speed: 0.9, damage: 19, dropCoins: 12 },
        Sahagin: { sprite: 'enemy_bat', health: 65, speed: 1.2, damage: 21, dropCoins: 13 },
        Jellyfish: { sprite: 'enemy_ghost', health: 40, speed: 1.6, damage: 15, dropCoins: 8 },
        Kraken: { sprite: 'enemy_bat', health: 120, speed: 0.8, damage: 30, dropCoins: 28 },
        Ghost: { sprite: 'enemy_ghost', health: 45, speed: 1.3, damage: 16, dropCoins: 9 },
        Demon: { sprite: 'enemy_bat', health: 95, speed: 1.1, damage: 28, dropCoins: 22 },
        Assassin: { sprite: 'enemy_ghost', health: 60, speed: 1.9, damage: 26, dropCoins: 18 },
        Dragon: { sprite: 'enemy_bat', health: 450, speed: 0.9, damage: 35, dropCoins: 45 },
        Ifrit: { sprite: 'enemy_slime', health: 360, speed: 1.0, damage: 32, dropCoins: 30 },
        General: { sprite: 'enemy_bat', health: 540, speed: 0.8, damage: 35, dropCoins: 38 },
        Mummy: { sprite: 'enemy_ghost', health: 405, speed: 0.7, damage: 30, dropCoins: 27 },
        Bishop: { sprite: 'enemy_slime', health: 450, speed: 0.9, damage: 32, dropCoins: 33 },
        SeaMonster: { sprite: 'enemy_bat', health: 675, speed: 0.7, damage: 40, dropCoins: 52 },
        Minotaur: { sprite: 'enemy_ghost', health: 600, speed: 1.0, damage: 38, dropCoins: 42 },
        Darklord: { sprite: 'enemy_bat', health: 900, speed: 0.9, damage: 45, dropCoins: 75 },
        God: { sprite: 'enemy_ghost', health: 1350, speed: 0.8, damage: 50, dropCoins: 150 },
        VoidGod: { sprite: 'enemy_bat', health: 5000, speed: 1.2, damage: 60, dropCoins: 999 } // 虚空魔神·阿撒托斯 - 最终Boss
    }
};

window.STORY_DATA = STORY_DATA;
