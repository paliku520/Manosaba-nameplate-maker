# Manosaba Nameplate Maker（魔法少女的魔女审判 · 名片合成）

从原项目 **[Manosaba-character-extracter](https://github.com/paliku520/Manosaba-character-extracter)**（魔法少女的魔女审判角色立绘合成器）中剥离出的**纯静态名片合成器**：HTML + CSS + 原生 JavaScript，
没有任何后端、构建步骤或外部 CDN 依赖，所有合成都在浏览器 Canvas 中完成。

| 仓库 | 说明 |
| --- | --- |
| [paliku520/Manosaba-nameplate-maker](https://github.com/paliku520/Manosaba-nameplate-maker) | 本项目：浏览器端名片合成器（纯静态） |
| [paliku520/Manosaba-character-extracter](https://github.com/paliku520/Manosaba-character-extracter) | 原项目：角色立绘 / 名片合成桌面工具（Python + Electron） |

> **声明**：排版参数解析自游戏文件，但受字体渲染差异影响，不保证与游戏原作 100% 完全一致。
> 源代码遵循 [MIT License](./LICENSE) 开源协议。

## 在线访问
| 站点 | 地址 |
| --- | --- |
| cloudflare | [manosaba-nameplate.pages.dev/](https://manosaba-nameplate.pages.dev/) |
| github.io | [paliku520.github.io/Manosaba-nameplate-maker/](https://paliku520.github.io/Manosaba-nameplate-maker/) |

## 功能

### 排版

- 按游戏内规则排版：**姓氏首字大 / 名字首字中 / 其余字小**（1.0em / 0.8em / 0.6em）
- 底板 601 × 289；名字过长时只向右加宽画布（字号与基线不变），与原版后台一致
- 两种游戏原版明朝体：`TsukushiMincho` / `SourceHanSerifSC`，字体行下方提示中文名字请使用 `SourceHanSerifSC`

### 外观

- 首字颜色：16 个角色主题色、色相 × 明度取色板、hex / `rgb()` / `R,G,B` 文本输入与 R/G/B 数值精确调整
- 不选颜色时首字跟随正文色（白色）
- 中文 / 日本語 / English 界面切换（右上角非原生下拉控件），首次打开按浏览器语言自动选择
- 中文使用 `TitleLogo@ZhHans.png`，其他语言统一使用 `TitleLogo@Ja.png`
- 深色 / 浅色主题切换（默认深色），强调色沿用原项目的 **Ema** 粉色主题
- 纯色页面背景，无渐变
- 首字颜色模态窗口带打开 / 关闭过渡动画，支持 `Esc` 关闭与焦点循环

### 交互与导出

- 生成 / 复制 / 保存三个按钮；`Ctrl`（macOS 为 `⌘`）+ `Enter` 快捷生成
- 修改姓名、字体或颜色后提示「请重新生成预览」
- 导出全尺寸 PNG 下载（文件名 = 姓氏 + 名字）或直接复制到剪贴板
- 姓名、字体、首字颜色、语言与主题自动保存，下次打开自动恢复
- 页脚集中展示免责声明、版权、MIT License 与 GitHub 仓库链接
- 响应式布局，手机 / 平板可用

## 运行

本项目是零依赖的静态页面，任选一种方式：

1. **直接打开**：双击 [`index.html`](./index.html)（Chrome / Edge 下已验证 `file://` 可加载字体）。
2. **本地静态服务器**（当浏览器限制 `file://` 下的字体或剪贴板时使用）：

```powershell
python -m http.server 8000
# 然后打开 http://localhost:8000/
```

仓库内没有构建产物，也可以把整个目录部署到任意静态托管（如 GitHub Pages）。

## 使用说明

1. 填写**姓氏**与**名字**（各最多 16 个字符）。
2. 选择字体：中文名字建议 `SourceHanSerifSC`。
3. 点击「首字颜色」挑选角色主题色或自定义颜色（可选）。
4. 点击「生成预览」，右侧显示合成结果与导出尺寸。
5. 点击「保存 PNG」下载，或「复制 PNG」写入剪贴板。

语言、主题与输入内容保存在浏览器 `localStorage`（键 `manosaba.nameplate.maker.v1`），
不会上传到任何服务器。

## 素材说明

以下文件为游戏素材，随项目本地携带，仅用于本机合成：

```
assets/NamePlateBase.png
assets/fonts/TsukushiMincho.otf
assets/fonts/SourceHanSerifSC.otf
assets/game_titles/TitleLogo@ZhHans.png   # 中文
assets/game_titles/TitleLogo@Ja.png       # 其他语言（日文 / 英文等）
assets/favicon.ico                        # 站点图标（192 × 192）
```

标题图按语言选择：中文使用 `TitleLogo@ZhHans.png`，其余语言统一使用
`TitleLogo@Ja.png`。如需为某个语言换成独立标题图，修改
[`js/app.js`](./js/app.js) 中的 `GAME_LOGOS` / `gameLogoFor()` 即可。

原项目的素材由运行时从游戏 bundle 提取（见原项目的 `src/nameplate.py`）；纯静态版没有后端，
因此改为随项目本地携带。

## 排版参数

参数解析自游戏 UI 节点（与原项目 `src/nameplate.py` 一致）：

| 项目 | 值 |
| --- | --- |
| 底板 `NamePlateBase` | 601 × 289 |
| 基准字号 `LABEL_FONT_SIZE` | 136 |
| 文本左边界（相对底板左缘） | 87.5（= 601 / 2 − 213） |
| 文本垂直中心（相对底板中心，Unity 坐标系） | +14 |
| 姓氏首字 / 名字首字 / 其余字 | 1.0em / 0.8em / 0.6em |
| 右侧留白 | 16px |

字体在三个字号下的 ascent / descent 取自 Pillow `ImageFont.getmetrics()`，
记录在 [`js/app.js`](./js/app.js) 的 `FONT_METRICS` 中，用于复现原版基线位置。

名字过长时只向右加宽画布，字号与基线保持不变：

```js
const textLeft = 601 / 2 - 213;            // 87.5
const width = Math.max(601, Math.ceil(textLeft + textWidth + 16));
```

## 目录结构

```
manosaba-nameplate-maker/
├─ index.html
├─ css/
│  └─ style.css      # 主题变量、布局、下拉、模态与页脚样式
├─ js/
│  ├─ i18n.js        # 中 / 日 / 英文案与语言检测
│  └─ app.js         # Canvas 渲染、颜色模态、导出、状态管理
├─ assets/
│  ├─ NamePlateBase.png
│  ├─ favicon.ico
│  ├─ game_titles/
│  │  ├─ TitleLogo@ZhHans.png
│  │  └─ TitleLogo@Ja.png
│  └─ fonts/
│     ├─ TsukushiMincho.otf
│     └─ SourceHanSerifSC.otf
├─ LICENSE
└─ README.md
```

## 嵌入 / 自动化 API

页面加载完成并返回 `ready() === true` 后，可通过 `window.NameplateMaker` 直接调用：

```js
const canvas = NameplateMaker.render({
  surname: '樱羽',
  given: '艾玛',
  font: 'TsukushiMincho',   // 或 'SourceHanSerifSC'
  headColor: '#FF8FB4',     // 留空 = 与正文同色（白色）
});
document.body.appendChild(canvas);
// canvas.width / canvas.height 为最终导出尺寸
```

| 方法 / 属性 | 说明 |
| --- | --- |
| `NameplateMaker.version` | 当前版本号 |
| `NameplateMaker.ready()` | 底板与字体是否加载完成 |
| `NameplateMaker.render(params)` | 同步生成并返回 `HTMLCanvasElement`（不更新界面） |
| `NameplateMaker.generate()` | 按当前界面状态生成预览 |
| `NameplateMaker.copy()` | 把当前预览 PNG 复制到剪贴板 |
| `NameplateMaker.save()` | 下载当前预览 PNG |
| `NameplateMaker.getCanvas()` | 最近一次生成的画布 |

`render()` 在底板未加载或字体不可用时会抛错，调用前请先检查 `ready()`。

## 与原桌面版的差异

- 不提供「一键提取素材 / 手动选择 bundle / 停止查找」——素材已随项目提供
- 保存改为浏览器下载，不再写入 `output/nameplate/`
- 复制 PNG 依赖浏览器的 Clipboard API（`file://` 与 `http://localhost` 在 Chromium 中可用）；
  不支持时会尝试选中预览图后执行旧式复制，仍失败则提示改用「保存 PNG」
- 不提供「打开输出目录」按钮；界面与合成逻辑其余部分保持一致

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| 中文名字字形不对 | 在字体下拉中选择 `SourceHanSerifSC` |
| 「保存 / 复制」按钮不可用 | 先点击「生成预览」；资源加载完成前按钮同样保持禁用 |
| 字体加载失败 | 确认 `assets/fonts/` 下的 `.otf` 文件存在 |
| 复制图片失败 | 浏览器不支持时请改用「保存 PNG」 |
| 预览与输入不一致 | 修改姓名、字体或颜色后需重新生成预览 |

## 相关仓库

- **本项目**：[paliku520/Manosaba-nameplate-maker](https://github.com/paliku520/Manosaba-nameplate-maker)
- **原项目**：[paliku520/Manosaba-character-extracter](https://github.com/paliku520/Manosaba-character-extracter)
  —— 魔法少女的魔女审判角色立绘合成器

## 免责声明与许可

页面底部的页脚集中展示以下信息，并随界面语言切换：

- **免责声明**：排版参数解析自游戏文件，但不保证与游戏原作 100% 完全一致；
  本工具为非官方同人工具，仅供学习交流与本地合成导出使用，请勿用于商业用途。
- **版权**：游戏名称、角色与素材版权归原作者所有（© 2024 Re,AER LLC. / Acacia）。
- **许可**：本项目遵循 MIT License 开源协议，详见 [LICENSE](./LICENSE)。
- **仓库**：页脚提供指向本项目 GitHub 仓库的链接。

> 注意：MIT License 仅覆盖本项目的源代码。**游戏素材**（名片底板、游戏字体、游戏标题图）
> 不属于 MIT License 范畴，版权归原作者所有，请勿再分发。

## 版权

非官方同人工具，仅供本地合成与导出。游戏名称、角色与素材版权归原作者所有
（© 2024 Re,AER LLC. / Acacia）。源代码遵循 [MIT License](./LICENSE) 开源协议，
Copyright (c) 2026 paliku520。