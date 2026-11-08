<!DOCTYPE html>
<? ob_start();?>
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
</head>
<body>
    <!-- 页面背景双图层 -->
    <div class="bg-stage">
        <div class="bg-layer bg-current" id="bgLayer1"></div>
        <div class="bg-layer bg-next" id="bgLayer2"></div>
    </div>
    
    <div id="app">
        <div class="header">
            <div class="banner-container" id="bannerContainer">
                <!-- 图片层用独立的容器，设置 overflow:hidden 裁剪溢出 -->
                <div class="banner-layers" id="bannerLayers">
                    <div class="banner-layer banner-current" id="bannerLayer1"></div>
                    <div class="banner-layer banner-next" id="bannerLayer2"></div>
                </div>
                <div class="logo">
                    <img src="/photos/TX.jpg" alt="">
                </div>
            </div>
            <div class="author-name">引导页</div>
            <p class="desc">永久引导页</p>
        </div>
        <div class="body">
            <div class="tab-list">
                <div class="tab-item zy">
                    <span class="text">导航</span>
                </div>
                <div class="tab-item lx">
                    <span class="text">联系</span>
                </div>
            </div>
            <!-- 应用列表1 - 导航 -->
            <div class="app-list a1">
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
            <div class="app-list a2">
                <a href="javascript:void(0);" class="item" onclick="showModal('/photos/QQ.jpg')">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="/photos/QQ图标.png" alt=""></div>
                        <p class="app-name">我的QQ</p>
                    </div>
                </a>
                <!-- QQ群 - 图标改成和QQ一样的图片结构 -->
                <a href="https://qm.qq.com/q/RtC6VXxpCu" class="item" target="_blank">
                    <div class="content-wrap">
                        <div class="img-wrap"><img src="/photos/QQ图标.png" alt="QQ群"></div>
                        <div>
                            <p class="app-name">流欺交流群</p>
                            <span class="app-sub">950348367</span>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </div>
    
    <div id="myModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <img id="modalImage" src="" alt="Image" style="width:100%">
        </div>
    </div>
    
    <script src="https://cdn.bootcdn.net/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
    <script>
        jQuery(document).ready(function($) {
            $(".a1").css("display", "flex");
            $(".a2").css("display", "none");
            $(".zy").click(function() { 
                $(".a1").css("display", "flex"); 
                $(".a2").css("display", "none"); 
            });
            $(".lx").click(function() { 
                $(".a1").css("display", "none"); 
                $(".a2").css("display", "flex"); 
            });
        });
        
        function showModal(imageSrc) { 
            $("#modalImage").attr("src", imageSrc); 
            $("#myModal").css("display", "block"); 
        }
        $(".close").click(function() { 
            $("#myModal").css("display", "none"); 
        });
        $(window).click(function(event) { 
            if ($(event.target).is("#myModal")) { 
                $("#myModal").css("display", "none"); 
            } 
        });
        
        // ========== 背景图双图层切换 ==========
        (function() {
            const API_BASE = "https://api.lqay.cn/api/zxsjt/?cat=heng";
            const layer1 = document.getElementById('bgLayer1');
            const layer2 = document.getElementById('bgLayer2');
            
            let currentLayer = layer1;
            let nextLayer = layer2;
            let isSwitching = false;
            let preloadedUrl = null;
            let intervalId = null;
            
            function buildUrl() {
                return API_BASE + "&_t=" + Date.now() + "&_rand=" + Math.random().toString(36).substring(2, 10);
            }
            
            function preloadNext() {
                const url = buildUrl();
                const img = new Image();
                img.onload = () => { preloadedUrl = url; };
                img.onerror = () => { preloadedUrl = null; };
                img.src = url;
            }
            
            function performSwitch() {
                if (isSwitching) return;
                if (!preloadedUrl) { setTimeout(performSwitch, 150); return; }
                isSwitching = true;
                
                nextLayer.style.backgroundImage = `url("${preloadedUrl}")`;
                currentLayer.classList.remove('layer-animate-out');
                nextLayer.classList.remove('layer-animate-in');
                void currentLayer.offsetHeight;
                
                currentLayer.classList.add('layer-animate-out');
                nextLayer.classList.add('layer-animate-in');
                nextLayer.style.opacity = '1';
                
                const onAnimationEnd = () => {
                    const temp = currentLayer;
                    currentLayer = nextLayer;
                    nextLayer = temp;
                    nextLayer.style.backgroundImage = '';
                    nextLayer.style.opacity = '0';
                    nextLayer.classList.remove('layer-animate-in', 'layer-animate-out');
                    currentLayer.classList.remove('layer-animate-out', 'layer-animate-in');
                    isSwitching = false;
                    currentLayer.removeEventListener('animationend', onAnimationEnd);
                    nextLayer.removeEventListener('animationend', onAnimationEnd);
                };
                
                currentLayer.addEventListener('animationend', onAnimationEnd, { once: true });
                preloadNext();
            }
            
            const firstUrl = buildUrl();
            const firstImg = new Image();
            firstImg.onload = () => {
                currentLayer.style.backgroundImage = `url("${firstUrl}")`;
                currentLayer.style.opacity = '1';
                nextLayer.style.opacity = '0';
                preloadNext();
                intervalId = setInterval(performSwitch, 5000);
            };
            firstImg.onerror = () => { 
                setTimeout(() => { 
                    const retry = buildUrl(); 
                    new Image().onload = () => { 
                        currentLayer.style.backgroundImage = `url("${retry}")`; 
                        preloadNext(); 
                        intervalId = setInterval(performSwitch, 5000); 
                    }; 
                    new Image().src = retry; 
                }, 1000); 
            };
            firstImg.src = firstUrl;
            
            window.addEventListener('beforeunload', () => { if (intervalId) clearInterval(intervalId); });
        })();
        
        // ========== Banner 双图层切换 - 修复图片溢出 ==========
        (function() {
            const API_BASE = "https://api.lqay.cn/api/zxsjt/?cat=heng";
            const layer1 = document.getElementById('bannerLayer1');
            const layer2 = document.getElementById('bannerLayer2');
            const layersContainer = document.getElementById('bannerLayers');
            
            let currentLayer = layer1;
            let nextLayer = layer2;
            let isSwitching = false;
            let preloadedUrl = null;
            let intervalId = null;
            let slideDirection = 'left-to-right';
            
            function buildUrl() {
                return API_BASE + "&_t=" + Date.now() + "&_rand=" + Math.random().toString(36).substring(2, 10);
            }
            
            function preloadNext() {
                const url = buildUrl();
                const img = new Image();
                img.onload = () => { preloadedUrl = url; };
                img.onerror = () => { preloadedUrl = null; };
                img.src = url;
            }
            
            function performSwitch() {
                if (isSwitching) return;
                if (!preloadedUrl) { setTimeout(performSwitch, 150); return; }
                isSwitching = true;
                
                layersContainer.classList.add('banner-glow');
                setTimeout(() => layersContainer.classList.remove('banner-glow'), 500);
                
                nextLayer.style.backgroundImage = `url("${preloadedUrl}")`;
                nextLayer.style.display = 'block';
                nextLayer.style.opacity = '1';
                
                if (slideDirection === 'left-to-right') {
                    currentLayer.style.transform = 'translateX(0%)';
                    nextLayer.style.transform = 'translateX(-100%)';
                    currentLayer.classList.remove('banner-slide-ltr-out');
                    nextLayer.classList.remove('banner-slide-ltr-in');
                    void currentLayer.offsetHeight;
                    currentLayer.classList.add('banner-slide-ltr-out');
                    nextLayer.classList.add('banner-slide-ltr-in');
                } else {
                    currentLayer.style.transform = 'translateX(0%)';
                    nextLayer.style.transform = 'translateX(100%)';
                    currentLayer.classList.remove('banner-slide-rtl-out');
                    nextLayer.classList.remove('banner-slide-rtl-in');
                    void currentLayer.offsetHeight;
                    currentLayer.classList.add('banner-slide-rtl-out');
                    nextLayer.classList.add('banner-slide-rtl-in');
                }
                
                const onAnimationEnd = () => {
                    const temp = currentLayer;
                    currentLayer = nextLayer;
                    nextLayer = temp;
                    nextLayer.style.backgroundImage = '';
                    nextLayer.classList.remove('banner-slide-ltr-out', 'banner-slide-ltr-in', 'banner-slide-rtl-out', 'banner-slide-rtl-in');
                    currentLayer.classList.remove('banner-slide-ltr-out', 'banner-slide-ltr-in', 'banner-slide-rtl-out', 'banner-slide-rtl-in');
                    currentLayer.style.transform = 'translateX(0%)';
                    currentLayer.style.opacity = '1';
                    nextLayer.style.transform = '';
                    nextLayer.style.opacity = '0';
                    isSwitching = false;
                    currentLayer.removeEventListener('animationend', onAnimationEnd);
                    nextLayer.removeEventListener('animationend', onAnimationEnd);
                    slideDirection = slideDirection === 'left-to-right' ? 'right-to-left' : 'left-to-right';
                };
                
                currentLayer.addEventListener('animationend', onAnimationEnd, { once: true });
                preloadNext();
            }
            
            const firstUrl = buildUrl();
            const firstImg = new Image();
            firstImg.onload = () => {
                currentLayer.style.backgroundImage = `url("${firstUrl}")`;
                currentLayer.style.transform = 'translateX(0%)';
                currentLayer.style.opacity = '1';
                nextLayer.style.opacity = '0';
                preloadNext();
                intervalId = setInterval(performSwitch, 3000);
            };
            firstImg.onerror = () => {
                setTimeout(() => {
                    const retry = buildUrl();
                    new Image().onload = () => {
                        currentLayer.style.backgroundImage = `url("${retry}")`;
                        preloadNext();
                        intervalId = setInterval(performSwitch, 3000);
                    };
                    new Image().src = retry;
                }, 1000);
            };
            firstImg.src = firstUrl;
            
            window.addEventListener('beforeunload', () => { if (intervalId) clearInterval(intervalId); });
        })();
    </script>
    <div id="xf-MusicPlayer" data-cdnName="https://player.xfyun.club/js" data-themeColor="xf-orange" data-songList="12785396384" data-fadeOutAutoplay></div>
    <script src="https://player.xfyun.club/js/xf-MusicPlayer/js/xf-MusicPlayer.min.js"></script>
    <script src="https://player.xfyun.club/js/yinghua.js"></script>
</body>
</html>