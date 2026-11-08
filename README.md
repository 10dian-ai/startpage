# 永久引导页 - 个人导航站

一个功能丰富、视觉效果出众的个人引导页/导航页，支持动态背景切换、Banner轮播、多标签页导航等功能。

## ✨ 特性

- 🎨 **双图层动态背景** - 背景图自动切换，带有毛刺淡出+弹性淡入的创意动画效果
- 🖼️ **Banner轮播** - 顶部横幅图片自动切换，支持左右滑动动画和光效扫过效果
- 👤 **圆形头像展示** - 头像半悬停在Banner上，戳一下会弹一下、冒小爱心和一句话
- 👆 **点击反馈** - 卡片按下会下沉并泛开粉色波纹，标签的粉色底块会滑到选中项，复制群号有提示
- 🌙 **暗色模式** - 跟随系统自动切换；毛玻璃卡片让壁纸隐约透出
- 📱 **响应式设计** - 完美适配移动端和PC端
- 🎵 **音乐播放器** - 集成第三方音乐播放组件
- 🌸 **樱花飘落特效** - 页面装饰效果，增加视觉趣味
- 🔄 **双标签页切换** - 支持"导航"和"联系"两个内容区域切换（支持键盘操作）
- ♿ **无障碍** - 文字对比度达到 WCAG AA，全部操作可用键盘完成，尊重系统的"减少动态效果"设置

## 🛠️ 技术栈

- HTML5 / CSS3（设计变量、原生 `<dialog>`）
- 原生 JavaScript（无 jQuery 等第三方依赖）
- 第三方API集成

## 📁 项目结构

```text
├── index.php          # 主页面文件（纯 HTML，也可以改名为 index.html）；站点配置也在这里
├── assets/            # 静态资源目录
│   ├── m.css          # 基础样式（normalize + 页面容器）
│   ├── style.css      # 主样式文件（颜色等设计变量在文件开头）
│   ├── main.js        # 轮播、标签切换、二维码弹窗、复制群号
│   ├── effects.css    # 装饰效果样式（可删除）
│   ├── effects.js     # 装饰效果：点击波纹、戳头像（可删除）
│   ├── lx.png         # 联系标签图标
│   └── zy.png         # 导航标签图标
├── photos/            # 图片资源目录
│   ├── TX.jpg         # 头像图片
│   ├── QQ.jpg         # QQ二维码
│   ├── QQ图标.png      # QQ图标
│   └── bj.png         # Banner 兜底图（图片接口不可用时显示）
└── tests/             # 自动化测试（不需要上传到网站）
    └── e2e.py
```

## 🚀 快速开始

### 部署到服务器

直接将项目文件上传到您的网站根目录或任意子目录即可（资源都是相对路径）。`tests/` 目录不需要上传。

页面里没有 PHP 代码，不支持 PHP 的静态托管（GitHub Pages、Nginx 纯静态等）把 `index.php` 改名为 `index.html` 即可。

### 更新网站后页面错乱？（缓存）

`index.php` 里本地 css / js 的链接后面带着版本号，比如 `assets/style.css?v=2`。改了 `assets/` 里的 css 或 js 之后，把这些 `?v=` 的数字加 1，浏览器和服务器就会下载新文件，不会出现"新页面配旧样式表"的错乱。

- 网站开了 CDN，并且 CDN 设置了"忽略 / 过滤 URL 参数"时，版本号不起作用，需要在 CDN 后台刷新一次 `assets/` 目录的缓存。
- 样式表和页面对不上时，浏览器控制台会提示"样式表版本不对"。改了页面结构（`index.php` 里的类名、图层等）时，把 `style.css` 开头的 `--startpage-css-version` 和 `main.js` 里的 `CSS_VERSION` 一起加 1。
- 背景和 Banner 图片画在图层的 CSS 背景上，样式表就算是旧的，也不会按原图尺寸把页面撑大。

## ⚙️ 配置说明

### 修改个人信息

在 `index.php` 中找到以下部分进行修改：

```html
<!-- 修改作者名称 -->
<div class="author-name">引导页</div>

<!-- 修改头像图片路径 -->
<div class="logo">
    <img src="photos/TX.jpg" alt="">
</div>
```

### 修改导航链接

在 `.app-list.a1` 区域修改或添加导航项：

```html
<a href="你的链接" class="item" target="_blank">
    <div class="content-wrap">
        <div class="img-wrap">
            <img src="图片地址" alt="">
        </div>
        <p class="app-name">项目名称</p>
    </div>
</a>
```

图标加载失败时会自动用名称的第一个字代替。

### 修改联系信息

在 `.app-list.a2` 区域修改联系方式：

```html
<!-- 点击弹出二维码：data-qr 和 href 都写二维码图片地址，data-qr-title 是弹窗标题 -->
<a href="photos/QQ.jpg" class="item" data-qr="photos/QQ.jpg" data-qr-title="用 QQ 扫码加我">
    ...
</a>

<!-- 整张卡片打开链接，另外带一个"复制"按钮：data-copy 是要复制的内容，data-copy-done 是复制成功的提示 -->
<div class="item">
    <div class="content-wrap">
        <div class="img-wrap"><img src="photos/QQ图标.png" alt=""></div>
        <div class="item-text">
            <a class="app-name stretched-link" href="QQ群链接" target="_blank">群名称</a>
            <button type="button" class="copy-chip" data-copy="群号" data-copy-done="群号已复制" aria-label="复制群号">
                <span class="app-sub">群号</span>
            </button>
        </div>
    </div>
</div>
```

旧写法 `onclick="showModal('photos/QQ.jpg')"` 仍然可用。

### 站点配置（图片接口、轮播、点击效果）

修改 `index.php` 底部的 `window.STARTPAGE_CONFIG`，不需要改 JS 文件：

```js
window.STARTPAGE_CONFIG = {
    imageApi: "https://api.lqay.cn/api/zxsjt/?cat=heng",
    background: { interval: 5000 },
    banner: { interval: 3000, fallback: "photos/bj.png" },
    effects: {
        ripple: true,
        avatarBoop: true,
        avatarLines: ["欢迎来玩～", "今天也要开心呀", "戳我也不会掉糖哦", "喵～"],
        clickHearts: false
    }
};
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `imageApi` | `https://api.lqay.cn/api/zxsjt/?cat=heng` | 背景和 Banner 共用的随机图接口 |
| `background.interval` / `banner.interval` | 5000 / 3000 | 切换间隔（毫秒，至少 1500） |
| `background.api` / `banner.api` | 空 | 想让背景和 Banner 用不同接口时填写 |
| `background.fallback` / `banner.fallback` | 空 / `photos/bj.png` | 接口不可用时先显示的本地图片，留空不显示 |
| `banner.pauseOffscreen` | `true` | Banner 滚出屏幕时暂停，不下载看不见的图 |
| `respectSaveData` | `true` | 浏览器开了省流量时只加载一张，不自动轮播 |
| `loadTimeout` | 15000 | 单张图片最长等待时间（毫秒） |
| `retryDelay` / `maxRetryDelay` | 2000 / 30000 | 加载失败后的重试间隔（每次翻倍）和上限 |
| `effects.ripple` | `true` | 点卡片 / 标签时的粉色波纹 |
| `effects.avatarBoop` | `true` | 戳头像：弹一下 + 小爱心 + 冒一句话 |
| `effects.avatarLines` | 4 句 | 戳头像时随机说的话 |
| `effects.clickHearts` | `false` | 页面任意位置点击冒小爱心 |

改了 `imageApi` 的域名时，记得把 `index.php` 开头 `<link rel="preconnect">` 里的域名一起改掉。

### 修改配色

颜色都写在 `assets/style.css` 开头的设计变量里（浅色一组、暗色一组），比如主色 `--accent`、文字 `--ink`、次要文字 `--ink-soft`。

### 去掉装饰效果

不想要点击波纹和戳头像：删掉 `assets/effects.css`、`assets/effects.js`，以及 `index.php` 里引用它们的两行，页面其它功能完全不受影响。也可以只在配置里把对应的 `effects` 项改成 `false`。

## 📱 功能说明

### 背景图切换

- 每5秒自动切换一次
- 带有毛刺淡出+弹性淡入动画
- 双图层预加载机制，切换流畅；图片出来之前显示柔和的渐变

### Banner轮播

- 每3秒自动切换一次
- 支持左右方向交替滑动
- 切换时带有光效扫过效果
- 第一张图出来之前显示骨架闪光；滚出屏幕时暂停

### 加载失败与后台

- 图片加载失败会按 2 秒、4 秒、8 秒……自动重试（最长 30 秒一次），接口恢复后继续轮播
- 页面切到后台时暂停轮播，不在后台下载图片

### 标签页切换

- 导航：展示个人项目/网站链接
- 联系：展示QQ和QQ群联系方式，群号可以一键复制

### 系统设置

- 暗色模式：跟随系统
- 减少动态效果：背景和 Banner 改为淡入淡出，不播放波纹、爱心和樱花
- 减少透明度：卡片改为不透明

## 🧪 测试

`tests/e2e.py` 用无头浏览器检查轮播、大尺寸壁纸、弹窗、复制、键盘操作、暗色模式等 24 项行为。不需要 PHP 或服务器，也不访问外网（接口和 CDN 都换成了可控的假数据）。

```bash
pip install playwright
python -m playwright install chromium
python tests/e2e.py            # 全部用例，约 3 分钟
python tests/e2e.py dialog     # 只跑名字里带 dialog 的用例
```

调试：网址后面加 `?debug`，浏览器控制台会输出预加载、切换、暂停、重试的日志。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

## 🙏 致谢

- 音乐播放器由 小枫音乐播放器 提供
- 图片API由 lqay.cn 提供

## 📧 联系方式

如有问题或建议，欢迎联系：

- 个人主页：https://me.lqay.cn
- 博客：https://blog.lqay.cn

⭐ 如果这个项目对你有帮助，欢迎点个Star！
