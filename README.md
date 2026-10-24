# Manosaba Nameplate Maker（魔法少女的魔女审判 · 名片合成）

从主项目 `MCE_PyWebView` 中剥离出的**纯静态名片合成器**：HTML + CSS + 原生 JavaScript，
没有任何后端、构建步骤或外部 CDN 依赖。所有合成都在浏览器 Canvas 中完成。

> **声明**：排版参数解析自游戏文件，但受字体渲染差异影响，不保证与游戏原作 100% 完全一致。
> 源代码遵循 [MIT License](./LICENSE) 开源协议。

## 功能

- 按游戏内规则排版：**姓氏首字大 / 名字首字中 / 其余字小**，底板 601 × 289
- 名字过长时自动向右加宽画布（字号不变），与原版后台一致
- 两种游戏原版明朝体：`TsukushiMincho` / `SourceHanSerifSC`
  - 字体行下方附提示：中文名字请使用 `SourceHanSerifSC`
- 首字颜色：角色主题色、色相/明度取色板、hex 与 R/G/B 精确输入
- 中文 / 日本語 / English 界面切换（右上角非原生下拉控件），自动记住上次输入与设置
- 中文使用 `TitleLogo@ZhHans.png`，其他语言统一使用 `TitleLogo@Ja.png`
- 默认使用原项目的 **Ema** 角色主题色（粉），支持浅色 / 深色模式切换并持久化
- 纯色页面背景，无渐变
- 导出：全尺寸 PNG 下载或直接复制到剪贴板
- 首字颜色模态窗口带打开/关闭过渡动画
- 页脚集中展示免责声明、版权与 MIT License 开源协议信息
- 响应式布局，手机/平板可用

## 运行

直接双击 [`index.html`](./index.html) 即可（Chrome / Edge 下已验证 `file://` 可加载字体）。
如果使用的浏览器限制 `file://` 下的字体加载，可在本目录启动一个静态服务器：

```powershell
python -m http.server 8000
# 然后打开 http://localhost:8000/
```

## 素材说明

本目录中的以下文件为游戏素材，仅用于本机合成：

```
assets/NamePlateBase.png
assets/fonts/TsukushiMincho.otf
assets/fonts/SourceHanSerifSC.otf
```

游戏标题图：

```
assets/game_titles/TitleLogo@ZhHans.png   # 中文
assets/game_titles/TitleLogo@Ja.png       # 其他语言（日文 / 英文等）
```

标题图按语言选择：中文使用 `TitleLogo@ZhHans.png`，其余语言统一使用
`TitleLogo@Ja.png`。如需为某个语言换成独立标题图，修改
[`js/app.js`](./js/app.js) 中的 `GAME_LOGOS` / `gameLogoFor()` 即可。

原项目的素材由运行时从游戏 bundle 提取（见 `src/nameplate.py`）；纯静态版没有后端，
因此改为随项目本地携带。

## 排版参数

参数解析自游戏 UI 节点（与 `src/nameplate.py` 完全一致）：

| 项目 | 值 |
| --- | --- |
| 底板 `NamePlateBase` | 601 × 289 |
| 基准字号 `LABEL_FONT_SIZE` | 136 |
| 文本左边界（相对底板中心） | −213 |
| 文本垂直中心（相对底板中心） | +14 |
| 姓氏首字 / 名字首字 / 其余字 | 1.0em / 0.8em / 0.6em |
| 右侧留白 | 16px |

字体在三个字号下的 ascent/descent 取自 Pillow `ImageFont.getmetrics()`，
记录在 [`js/app.js`](./js/app.js) 的 `FONT_METRICS` 中，用于复现原版基线位置。

## 目录结构

```
manosaba-nameplate-maker/
├─ index.html
├─ css/style.css
├─ js/
│  ├─ i18n.js        # 中/日/英文案
│  └─ app.js         # Canvas 渲染、颜色模态、下载、状态管理
├─ assets/
│  ├─ NamePlateBase.png
│  ├─ game_titles/
│  │  ├─ TitleLogo@ZhHans.png
│  │  └─ TitleLogo@Ja.png
│  └─ fonts/
│     ├─ TsukushiMincho.otf
│     └─ SourceHanSerifSC.otf
├─ .gitignore
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
// canvas.width / canvas.height 为最终导出尺寸
```

| 方法 | 说明 |
| --- | --- |
| `NameplateMaker.ready()` | 底板与字体是否加载完成 |
| `NameplateMaker.render(params)` | 同步生成并返回 `HTMLCanvasElement`（不更新界面） |
| `NameplateMaker.generate()` | 按当前界面状态生成预览 |
| `NameplateMaker.copy()` | 把当前预览 PNG 复制到剪贴板 |
| `NameplateMaker.save()` | 下载当前预览 PNG |
| `NameplateMaker.getCanvas()` | 最近一次生成的画布 |

## 与原桌面版的差异

- 不提供「一键提取素材 / 手动选择 bundle / 停止查找」——素材已随项目提供
- 保存改为浏览器下载，不再写入 `output/nameplate/`
- 复制 PNG 依赖浏览器的 Clipboard API（`file://` 与 `http://localhost` 在 Chromium 中可用）；
  不支持时会尝试选中预览图后执行旧式复制，仍失败则提示改用「保存 PNG」
- 不提供「打开输出目录」按钮
- 默认深色主题，可切换浅色 / 深色并持久化

## 免责声明与许可

页面底部的页脚集中展示以下信息，并随界面语言切换：

- **免责声明**：排版参数解析自游戏文件，但不保证与游戏原作 100% 完全一致；
  本工具为非官方同人工具，仅供学习交流与本地合成导出使用，请勿用于商业用途。
- **版权**：游戏名称、角色与素材版权归原作者所有（© 2024 Re,AER LLC. / Acacia）。
- **许可**：本项目遵循 MIT License 开源协议，详见 [LICENSE](./LICENSE)。

> 注意：MIT License 仅覆盖本项目的源代码。**游戏素材**（名片底板、游戏字体、游戏标题图）
> 不属于 MIT License 范畴，版权归原作者所有，请勿再分发。

## 版权

非官方同人工具，仅供本地合成与导出。游戏名称、角色与素材版权归原作者所有
（© 2024 Re,AER LLC. / Acacia）。源代码遵循 [MIT License](./LICENSE) 开源协议。
