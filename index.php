<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black">
    <meta name="apple-mobile-web-app-title" content="instap">
    <link rel="icon" href="https://tc.lqay.cn/LightPicture/2026/03/5f64e0f0f361e19c.png">
    <title>永久引导页</title>
    <link href="assets/m.css" rel="stylesheet">
    <link rel="stylesheet" type="text/css" href="assets/style.css">
    <!-- 浏览器禁用 JS 时两个列表都显示，联系方式不会被藏起来 -->
    <noscript><style>.app-list[hidden] { display: flex; }</style></noscript>
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
                <div class="banner-layers" id="bannerLayers" aria-hidden="true">
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
            <div class="tab-list" role="tablist">
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
                <!-- data-qr：点击弹出二维码；href 指向同一张图，脚本没跑起来时也能直接打开 -->
                <a href="photos/QQ.jpg" class="item" data-qr="photos/QQ.jpg">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="photos/QQ图标.png" alt=""></div>
                        <p class="app-name">我的QQ</p>
                    </div>
                </a>
                <!-- QQ群 - 图标改成和QQ一样的图片结构 -->
                <a href="https://qm.qq.com/q/RtC6VXxpCu" class="item" target="_blank">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="photos/QQ图标.png" alt="QQ群"></div>
                        <div>
                            <p class="app-name">流欺交流群</p>
                            <span class="app-sub">950348367</span>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </div>
    
    <!-- 二维码弹窗：原生 <dialog>，Esc / 点遮罩 / 点 × 都能关闭 -->
    <dialog id="myModal" class="modal" aria-label="QQ 二维码">
        <button type="button" class="close" aria-label="关闭">&times;</button>
        <img id="modalImage" alt="QQ 二维码">
    </dialog>

    <script>
        // ========== 站点配置：换图源、改轮播速度改这里就行 ==========
        window.STARTPAGE_CONFIG = {
            imageApi: "https://api.lqay.cn/api/zxsjt/?cat=heng", // 背景和 Banner 共用的随机图接口
            background: { interval: 5000 },                      // 背景每 5 秒换一张
            banner: { interval: 3000, fallback: "photos/bj.png" } // Banner 每 3 秒换一张；接口挂了先显示 bj.png
        };
    </script>
    <script src="assets/main.js"></script>
    <div id="xf-MusicPlayer" data-cdnName="https://player.xfyun.club/js" data-themeColor="xf-orange" data-songList="12785396384" data-fadeOutAutoplay></div>
    <script src="https://player.xfyun.club/js/xf-MusicPlayer/js/xf-MusicPlayer.min.js"></script>
    <script src="https://player.xfyun.club/js/yinghua.js"></script>
</body>
</html>