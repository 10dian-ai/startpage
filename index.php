<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!-- 允许双指缩放（原来禁止缩放，看不清字的人放大不了）；viewport-fit=cover 让底部提示避开手机底部横条 -->
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <!-- 手机浏览器地址栏颜色，跟随浅色 / 暗色模式 -->
    <meta name="theme-color" content="#f7f4f8" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#1e1924" media="(prefers-color-scheme: dark)">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="instap">
    <link rel="icon" href="https://tc.lqay.cn/LightPicture/2026/03/5f64e0f0f361e19c.png">
    <title>永久引导页</title>
    <!-- 提前和图片接口、图标 CDN 建立连接，第一张图更快出来；改了 imageApi 的域名记得同步改这里 -->
    <link rel="preconnect" href="https://api.lqay.cn">
    <link rel="preconnect" href="https://cdn.jsdmirror.com">
    <!-- 本地 css / js 后面的 ?v= 是版本号：改了这些文件后把数字加 1，浏览器和服务器缓存就会换成新文件，
         不会出现"新页面 + 旧样式表"导致的错乱（比如背景图按原图尺寸把页面撑大） -->
    <link href="assets/m.css?v=2" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="assets/style.css?v=2">
    <!-- 装饰性点击反馈，不需要可以和底部的 effects.js 一起删掉 -->
    <link rel="stylesheet" href="assets/effects.css?v=2">
    <!-- 浏览器禁用 JS 时：两个列表都显示，联系方式不会被藏起来；Banner 不显示加载动画 -->
    <noscript><style>.app-list[hidden] { display: flex; } .banner-layers.is-loading::before { animation: none; }</style></noscript>
</head>
<body>
    <!-- 页面背景双图层（纯装饰，读屏软件跳过） -->
    <div class="bg-stage" aria-hidden="true">
        <div class="bg-layer is-active" id="bgLayer1"></div>
        <div class="bg-layer" id="bgLayer2"></div>
    </div>
    
    <div id="app">
        <div class="header">
            <div class="banner-container" id="bannerContainer">
                <!-- 图片层用独立的容器，设置 overflow:hidden 裁剪溢出 -->
                <div class="banner-layers is-loading" id="bannerLayers" aria-hidden="true">
                    <div class="banner-layer is-active" id="bannerLayer1"></div>
                    <div class="banner-layer" id="bannerLayer2"></div>
                </div>
                <div class="logo">
                    <img src="photos/TX.jpg" alt="">
                </div>
            </div>
            <div class="author-name">引导页</div>
            <p class="desc">永久引导页</p>
        </div>
        <div class="body">
            <div class="tab-list" role="tablist" aria-label="页面内容">
                <span class="tab-indicator" aria-hidden="true"></span>
                <div class="tab-item zy active" role="tab" id="tab-nav" aria-controls="panel-nav" aria-selected="true" tabindex="0">
                    <span class="text">导航</span>
                </div>
                <div class="tab-item lx" role="tab" id="tab-contact" aria-controls="panel-contact" aria-selected="false" tabindex="-1">
                    <span class="text">联系</span>
                </div>
            </div>
            <!-- 应用列表1 - 导航 -->
            <div class="app-list a1" id="panel-nav" role="tabpanel" aria-labelledby="tab-nav">
                <a href="https://me.lqay.cn" class="item" target="_blank" ><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻413.jpg" alt=""></div><p class="app-name">个人主页</p></div></a>
                
                <a href="https://blog.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻1048.jpg" alt=""></div><p class="app-name">个人博客</p></div></a>
                
                <a href="https://dh.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻1014.jpg" alt=""></div><p class="app-name">导航网站</p></div></a>
                
                <a href="https://cookie.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻1086.jpg" alt=""></div><p class="app-name">MC小号</p></div></a>
                
                <a href="https://i.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻575.jpg" alt=""></div><p class="app-name">短网址生成器</p></div></a>
                
                <a href="https://apiv2.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻566.jpeg" alt=""></div><p class="app-name">免费API(99%)</p></div></a>
                
                <a href="https://tc.lqay.cn" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻748.jpg" alt=""></div><p class="app-name">图床(进群可使用)</p></div></a>
                
                <a href="https://vps.lqay.cc.cd" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻960.jpg" alt=""></div><p class="app-name">服务器监控面板</p></div></a>
                
                <a href="https://gallery.lqay.cn/" class="item" target="_blank"><div class="content-wrap"><div class="img-wrap"><img src="https://cdn.jsdmirror.com/gh/lqay-cn/cdn@main/img/zx/f/真寻216.jpg" alt=""></div><p class="app-name">画廊</p></div></a>
            </div>
            <!-- 应用列表2 - 联系 -->
            <div class="app-list a2" id="panel-contact" role="tabpanel" aria-labelledby="tab-contact" hidden>
                <!-- data-qr：点击弹出二维码（data-qr-title 是弹窗标题）；href 指向同一张图，脚本没跑起来时也能直接打开 -->
                <a href="photos/QQ.jpg" class="item" data-qr="photos/QQ.jpg" data-qr-title="用 QQ 扫码加我">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="photos/QQ图标.png" alt=""></div>
                        <p class="app-name">我的QQ</p>
                    </div>
                </a>
                <!-- QQ群：点卡片任意位置打开群链接；点群号是复制（data-copy 是要复制的内容，data-copy-done 是复制成功的提示） -->
                <div class="item">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="photos/QQ图标.png" alt=""></div>
                        <div class="item-text">
                            <a class="app-name stretched-link" href="https://qm.qq.com/q/RtC6VXxpCu" target="_blank">流欺交流群</a>
                            <button type="button" class="copy-chip" data-copy="950348367" data-copy-done="群号已复制" aria-label="复制群号 950348367">
                                <span class="app-sub">950348367</span>
                                <svg class="copy-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 二维码弹窗：原生 <dialog>，Esc / 点遮罩 / 点 × 都能关闭 -->
    <dialog id="myModal" class="modal" aria-labelledby="modalTitle">
        <button type="button" class="close" aria-label="关闭">&times;</button>
        <p class="modal-title" id="modalTitle">用 QQ 扫码加我</p>
        <div class="modal-qr"><img id="modalImage" alt="QQ 二维码"></div>
        <a class="modal-save" id="modalSave" href="photos/QQ.jpg" download="QQ二维码">保存二维码</a>
    </dialog>

    <script>
        // ========== 站点配置：换图源、改轮播速度、开关点击效果都在这里 ==========
        window.STARTPAGE_CONFIG = {
            imageApi: "https://api.lqay.cn/api/zxsjt/?cat=heng", // 背景和 Banner 共用的随机图接口
            background: { interval: 5000 },                       // 背景每 5 秒换一张
            banner: { interval: 3000, fallback: "photos/bj.png" }, // Banner 每 3 秒换一张；接口挂了先显示 bj.png
            effects: {                                            // 装饰效果（effects.js），删掉那个文件这里就不起作用
                ripple: true,                                     // 点卡片 / 标签时的粉色波纹
                avatarBoop: true,                                 // 戳头像：弹一下 + 小爱心 + 冒一句话
                avatarLines: ["欢迎来玩～", "今天也要开心呀", "戳我也不会掉糖哦", "喵～"],
                clickHearts: false                                // 页面任意位置点击冒小爱心
            }
        };
    </script>
    <script src="assets/main.js?v=2"></script>
    <script src="assets/effects.js?v=2"></script>
    <div id="xf-MusicPlayer" data-cdnName="https://player.xfyun.club/js" data-themeColor="xf-orange" data-songList="12785396384" data-fadeOutAutoplay></div>
    <script src="https://player.xfyun.club/js/xf-MusicPlayer/js/xf-MusicPlayer.min.js"></script>
    <script src="https://player.xfyun.club/js/yinghua.js"></script>
</body>
</html>