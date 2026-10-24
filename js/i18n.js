/* ============================================================
 * i18n.js — 纯静态名片合成器的多语言文案
 *
 * 文案取自主项目 i18n/common/{zh_CN,ja_JP,en_US}.yaml 的 np 段，
 * 并为纯静态版补充了加载状态、页脚等文案。
 * ============================================================ */
(function () {
  'use strict';

  const LANG_META = {
    zh_CN: { htmlLang: 'zh-CN' },
    ja_JP: { htmlLang: 'ja-JP' },
    en_US: { htmlLang: 'en-US' },
  };

  const DICT = {
    zh_CN: {
      'np.page_title': '魔法少女的魔女审判 · 名片合成',
      'np.game_title': '魔法少女的魔女审判',
      'np.title': '名片合成',
      'np.desc': '按游戏内规则合成角色名片：姓氏首字用大字号、名字首字用中字号、其余字用小字号。',
      'np.surname': '姓氏',
      'np.surname_ph': '例如：樱羽',
      'np.given': '名字',
      'np.given_ph': '例如：艾玛',
      'np.name_example': '示例：樱羽 艾玛',
      'np.font': '字体',
      'np.font_hint': '提示：中文名字请使用 SourceHanSerifSC',
      'np.font_loading': '正在加载字体…',
      'np.font_ready': '字体已就绪',
      'np.no_font': '未选择字体',
      'np.fonts_empty': '未找到可用字体',
      'np.color_default': '跟随文字颜色',
      'np.color_input_hint': '颜色框支持 #RGB、#RRGGBB、rgb(r,g,b) 或 R,G,B 写法；也可用下方的 R/G/B 数值框精确调整。',
      'np.head_color': '首字颜色',
      'np.palette': '角色主题色',
      'np.generate': '生成预览',
      'np.rendering': '正在生成…',
      'np.empty_preview': '填写姓名后点击「生成预览」',
      'np.save': '保存 PNG',
      'np.copy': '复制 PNG',
      'np.copied': '已复制到剪贴板',
      'np.copy_failed': '复制失败：{msg}',
      'np.copy_unsupported': '当前浏览器不支持复制图片，请使用「保存 PNG」',
      'np.size': '尺寸 {w} × {h}',
      'np.saved': '名片已保存',
      'np.save_failed': '保存失败：{msg}',
      'np.render_failed': '渲染失败：{msg}',
      'np.nothing_to_save': '请先生成预览',
      'np.lang_label': '语言',
      'np.theme_light': '切换到浅色模式',
      'np.theme_dark': '切换到深色模式',
      'np.cancel': '取消',
      'np.confirm': '确定',
      'np.loading_assets': '正在加载底板与字体…',
      'np.base_failed': '底板加载失败：{msg}',
      'np.fonts_failed': '没有可用字体，请确认 assets/fonts 中的字体文件存在。',
      'np.generate_hint': '修改姓名、字体或颜色后，请重新点击「生成预览」。',
      'np.preview_alt': '名片预览',
      'np.disclaimer': '排版参数解析自游戏文件，但不保证与游戏原作 100% 完全一致。',
      'np.footer_title': '免责声明',
      'np.footer_note': '本工具为非官方同人工具，仅供学习交流与本地合成导出使用，请勿用于商业用途。',
      'np.copyright': '© 2024 Re,AER LLC. / Acacia — 游戏名称、角色与素材版权归原作者所有。',
      'np.license': '遵循MIT License开源协议',
      'np.license_title': '查看 MIT License 全文',
      'np.layout_note': '底板 601 × 289 · 基准字号 136',
    },

    ja_JP: {
      'np.page_title': '魔法少女ノ魔女裁判 · 名刺合成',
      'np.game_title': '魔法少女ノ魔女裁判',
      'np.title': '名刺合成',
      'np.desc': 'ゲーム内と同じルールでキャラクター名刺を合成します（姓の1字目＝大、名の1字目＝中、残り＝小）。',
      'np.surname': '姓',
      'np.surname_ph': '例：桜羽',
      'np.given': '名前',
      'np.given_ph': '例：エマ',
      'np.name_example': '例：桜羽 エマ',
      'np.font': 'フォント',
      'np.font_hint': 'ヒント：中国語の名前は SourceHanSerifSC を使用してください',
      'np.font_loading': 'フォントを読み込み中…',
      'np.font_ready': 'フォントの準備ができました',
      'np.no_font': 'フォント未選択',
      'np.fonts_empty': '利用できるフォントがありません',
      'np.color_default': '文字色に合わせる',
      'np.color_input_hint': 'カラー欄は #RGB、#RRGGBB、rgb(r,g,b)、R,G,B に対応。下の R/G/B 欄で微調整もできます。',
      'np.head_color': '1字目の色',
      'np.palette': 'キャラクターテーマ色',
      'np.generate': 'プレビュー生成',
      'np.rendering': '生成中…',
      'np.empty_preview': '名前を入力して「プレビュー生成」を押してください',
      'np.save': 'PNG を保存',
      'np.copy': 'PNG をコピー',
      'np.copied': 'クリップボードにコピーしました',
      'np.copy_failed': 'コピーに失敗しました: {msg}',
      'np.copy_unsupported': 'このブラウザは画像のコピーに対応していません。「PNG を保存」をご利用ください',
      'np.size': 'サイズ {w} × {h}',
      'np.saved': '名刺を保存しました',
      'np.save_failed': '保存に失敗しました: {msg}',
      'np.render_failed': '描画に失敗しました: {msg}',
      'np.nothing_to_save': '先にプレビューを生成してください',
      'np.lang_label': '言語',
      'np.theme_light': 'ライトモードに切り替え',
      'np.theme_dark': 'ダークモードに切り替え',
      'np.cancel': 'キャンセル',
      'np.confirm': '決定',
      'np.loading_assets': 'ベースとフォントを読み込み中…',
      'np.base_failed': 'ベースの読み込みに失敗しました: {msg}',
      'np.fonts_failed': '利用できるフォントがありません。assets/fonts のフォントファイルを確認してください。',
      'np.generate_hint': '名前・フォント・色を変更したら、もう一度「プレビュー生成」を押してください。',
      'np.preview_alt': '名刺プレビュー',
      'np.disclaimer': '組版パラメータはゲームファイルから解析していますが、原作と 100% 一致することを保証するものではありません。',
      'np.footer_title': '免責事項',
      'np.footer_note': '本ツールは非公式のファンメイドツールです。学習・交流およびローカルでの合成・書き出しにのみご利用ください。営利目的での使用はご遠慮ください。',
      'np.copyright': '© 2024 Re,AER LLC. / Acacia — ゲーム名・キャラクター・素材の権利は原作者に帰属します。',
      'np.license': 'MIT License で公開されています',
      'np.license_title': 'MIT License の全文を表示',
      'np.layout_note': 'ベース 601 × 289 · 基準文字サイズ 136',
    },

    en_US: {
      'np.page_title': 'Magical Girl Witch Trials · Name plate maker',
      'np.game_title': 'Magical Girl Witch Trials',
      'np.title': 'Name plate',
      'np.desc': 'Compose an in-game character name plate: the surname\u2019s first glyph is large, the given name\u2019s first glyph medium, all remaining glyphs small.',
      'np.surname': 'Surname',
      'np.surname_ph': 'e.g. Sakuraba',
      'np.given': 'Given name',
      'np.given_ph': 'e.g. Ema',
      'np.name_example': 'Example: Sakuraba Ema',
      'np.font': 'Font',
      'np.font_hint': 'Tip: use SourceHanSerifSC for Chinese names',
      'np.font_loading': 'Loading fonts…',
      'np.font_ready': 'Fonts ready',
      'np.no_font': 'No font selected',
      'np.fonts_empty': 'No usable font found',
      'np.color_default': 'Follow text colour',
      'np.color_input_hint': 'Accepts #RGB, #RRGGBB, rgb(r,g,b) or R,G,B — or fine-tune with the R/G/B fields below.',
      'np.head_color': 'First glyph colour',
      'np.palette': 'Character theme colours',
      'np.generate': 'Generate preview',
      'np.rendering': 'Generating…',
      'np.empty_preview': 'Enter a name and click “Generate preview”',
      'np.save': 'Save PNG',
      'np.copy': 'Copy PNG',
      'np.copied': 'Copied to clipboard',
      'np.copy_failed': 'Copy failed: {msg}',
      'np.copy_unsupported': 'This browser cannot copy images — use “Save PNG” instead.',
      'np.size': 'Size {w} × {h}',
      'np.saved': 'Name plate saved',
      'np.save_failed': 'Save failed: {msg}',
      'np.render_failed': 'Render failed: {msg}',
      'np.nothing_to_save': 'Generate a preview first',
      'np.lang_label': 'Language',
      'np.theme_light': 'Switch to light mode',
      'np.theme_dark': 'Switch to dark mode',
      'np.cancel': 'Cancel',
      'np.confirm': 'OK',
      'np.loading_assets': 'Loading base plate and fonts…',
      'np.base_failed': 'Failed to load the base plate: {msg}',
      'np.fonts_failed': 'No usable font. Check the font files under assets/fonts.',
      'np.generate_hint': 'Click “Generate preview” again after changing the name, font or colour.',
      'np.preview_alt': 'Name plate preview',
      'np.disclaimer': 'Layout parameters are parsed from the game files, but 100% fidelity to the original game is not guaranteed.',
      'np.footer_title': 'Disclaimer',
      'np.footer_note': 'This is an unofficial fan tool, provided for learning, exchange and local composition/export only. Please do not use it commercially.',
      'np.copyright': '© 2024 Re,AER LLC. / Acacia — Game title, characters and assets belong to their respective owners.',
      'np.license': 'Released under the MIT License',
      'np.license_title': 'View the full MIT License',
      'np.layout_note': 'Base 601 × 289 · Base font size 136',
    },
  };

  let current = 'zh_CN';

  function has(lang) {
    return Object.prototype.hasOwnProperty.call(DICT, lang);
  }

  function detect() {
    const list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (const raw of list) {
      const lang = String(raw || '').toLowerCase();
      if (lang.indexOf('zh') === 0) return 'zh_CN';
      if (lang.indexOf('ja') === 0) return 'ja_JP';
      if (lang.indexOf('en') === 0) return 'en_US';
    }
    return 'zh_CN';
  }

  /** 取文案并替换 {name} 占位符；缺失时回退中文，再回退键名 */
  function t(key, vars) {
    let text = (DICT[current] && DICT[current][key]);
    if (text == null) text = DICT.zh_CN[key];
    if (text == null) text = key;
    if (vars) {
      text = String(text).replace(/\{(\w+)\}/g, (match, name) => (
        vars[name] != null ? String(vars[name]) : match
      ));
    }
    return text;
  }

  function setLang(lang) {
    current = has(lang) ? lang : 'zh_CN';
    return current;
  }

  /** 把 data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-aria 应用到 DOM */
  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  window.MCE_I18N = {
    languages: Object.keys(DICT),
    detect,
    setLang,
    t,
    apply,
    get lang() { return current; },
    get htmlLang() { return LANG_META[current].htmlLang; },
  };
})();
