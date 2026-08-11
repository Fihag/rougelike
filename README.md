# 肉鸽小游戏(Pigeon)

一款基于 Canvas 的轻量 Roguelite 生存小游戏:单机、无需构建、浏览器直接打开即玩。

## 快速开始

双击打开即可游玩:

- **`index.html`** — 正式版(推荐)
- **`debug.html`** — Debug 版(按 `F1` 打开调试面板)

> 注意:请直接通过文件方式打开,或使用任意静态服务器(如 `python -m http.server`)托管整个目录。

## 游戏玩法

- **目标**:在越来越密集的敌人浪潮中生存,击杀敌人获取经验、升级武器
- **武器**:魔法弹、飞刃、冰霜、闪电链、陨石、暗影精灵,可组合进化
- **难度**:简单 / 普通 / 困难 / 地狱,影响敌人属性、出怪频率与初始生命
- **精英波次**:每 60 秒一波精英来袭,清空后获得宝箱奖励
- **Boss**:死神骑士(剑气/冲击波)、虫巢母皇(召唤/毒液)、暗影刺客(瞬影突进/影刃回旋),击杀掉落专属道具
- **灵魂宝库 / 圣物商店 / 成就系统**:局外成长与收集要素
- **死神之指**:开启后进入"禁奖励"高难模式(正式版主菜单可开关)

## 文件结构

```
Pigeon/
├── index.html           正式版入口(无 Debug 面板,主菜单含死神之指开关)
├── debug.html           Debug 版入口(F1 打开调试面板)
├── css/
│   ├── base.css         CSS 变量 / 全局 / 游戏容器
│   ├── hud.css          HUD / 暂停遮罩 / 顶部按钮 / 死神之指按钮
│   ├── panels.css       升级 / Boss掉落 / 结算 / 主菜单 / 灵魂宝库面板
│   └── debug.css        Debug 面板样式(仅 debug.html 引用)
├── js/                  (按依赖顺序加载,见 index.html 中的 script 顺序)
│   ├── 00-const.js      DOM 引用 / ICONS 图标 / game 状态对象 / dbg 基础对象
│   ├── 01-input.js      输入管理
│   ├── 02-utils.js      工具函数 / 音效 / 粒子 / 伤害数字 / 屏幕震动
│   ├── 03-skills.js     武器技能注册表 / 难度配置 / 进化融合 / 协同
│   ├── 04-meta.js       灵魂宝库 / 圣物商店 / 成就系统 / 存档
│   ├── 05-enemies.js    敌人类型 / 敌人类 / Boss 技能
│   ├── 06-player.js     玩家类(属性 / 受伤 / 升级)
│   ├── 07-projectiles.js 投射物
│   ├── 08-upgrades.js   升级逻辑 / 精灵锁敌
│   ├── 09-deathmark.js  死神之指逻辑
│   ├── 10-events.js     精英宝箱 / 祭坛传送门 / 超级Boss / 刷怪 / Boss 生成
│   ├── 11-game.js       主循环 update / draw / 菜单绑定 / 启动
│   └── debug.js         Debug 面板(仅 debug.html 引用)
└── _archive/            旧版单文件 HTML 与图标映射备份
```

## 开发说明

- 无构建步骤、无依赖,原生 HTML/CSS/JS,可直接修改刷新
- JS 文件为顶层共享作用域,按固定顺序加载,**新增 JS 文件时请保持依赖顺序**(`00` → `11`,`debug.js` 在 `11-game.js` 之前)
- 正式版不加载 `debug.js` / `debug.css` / Debug 面板 HTML;`11-game.js` 中通过 `if (typeof dbgInit === 'function') dbgInit();` 兼容两种版本
- 快捷键:`P` / `Esc` 暂停,`M` 静音,`F1` 调试面板(仅 Debug 版)

## 分支历史

`_archive/` 中保留了拆分前的单文件版本(正式版 / debug / blood),供回溯对比。

##
