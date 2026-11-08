#!/usr/bin/env python3
"""startpage 端到端测试 —— 不需要 PHP、不需要开服务器、也不访问外网。

所有请求都在浏览器里拦截：本站文件直接从仓库读取；随机图接口、图标 CDN、
音乐播放器换成可控的假数据，可以模拟接口变慢、出错、中断。

准备（只需一次）：
    pip install playwright
    python -m playwright install chromium     # 或者设置 CHROME_PATH 使用本机的 Chrome
运行：
    python tests/e2e.py                 # 全部用例，约 3 分钟
    python tests/e2e.py dialog copy     # 只跑名字里带这些词的用例
全部通过退出码为 0，否则为 1。tests/ 目录不需要上传到网站。
"""
import asyncio
import os
import re
import struct
import sys
import time
import zlib
from urllib.parse import unquote, urlparse

from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTTPS = "https://startpage.test"
HTTP = "http://startpage.test"
CONTENT_TYPES = {
    ".php": "text/html; charset=utf-8", ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
}
NAV_NAMES = ["个人主页", "个人博客", "导航网站", "MC小号", "短网址生成器", "免费API(99%)", "图床(进群可使用)", "服务器监控面板", "画廊"]


# ---------------------------------------------------------------- 假数据

def png(rgb, w=64, h=36):
    """不依赖 Pillow 的纯色 PNG。"""
    raw = b"".join(b"\x00" + bytes(rgb) * w for _ in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


ICON = png((231, 76, 60), 8, 8)
HUGE = png((120, 90, 200), 3840, 2160)  # 和真实壁纸一样大的 4K 图


class FakeImageApi:
    """随机图接口替身：每次请求返回一张新颜色的图。fail(i, t) 决定第 i 个请求是否失败。"""

    def __init__(self, latency=0.3, fail=None, body=None):
        self.latency, self.fail, self.body = latency, fail or (lambda i, t: False), body
        self.t0 = time.monotonic()
        self.n = 0
        self.log = []  # (开始时间, 结束时间, url, 状态码)

    def now(self):
        return time.monotonic() - self.t0

    async def respond(self, route):
        self.n += 1
        i, start = self.n, self.now()
        failed = self.fail(i, start)
        await asyncio.sleep(self.latency)
        try:
            if failed:
                await route.fulfill(status=502, body="bad gateway")
            else:
                await route.fulfill(status=200, content_type="image/png",
                                    body=self.body or png(((i * 67) % 256, (i * 151) % 256, (i * 29) % 256)))
        except Exception:
            return  # 页面已经关了
        self.log.append((start, self.now(), route.request.url, 502 if failed else 200))

    def requests_between(self, a, b):
        return sum(1 for s, *_ in self.log if a <= s < b)

    def max_in_flight(self):
        return max((sum(1 for s2, e2, *_ in self.log if s2 <= s < e2) for s, *_ in self.log), default=0)

    def duplicate_urls(self):
        seen = {}
        for _, _, url, _ in self.log:
            seen[url] = seen.get(url, 0) + 1
        return [u for u, c in seen.items() if c > 1]


# 页面里的探针：记录轮播图层每次换图、每秒 setTimeout 次数，并允许测试切换"页面可见性"
PROBE = r"""
(() => {
  const now = () => Math.round(performance.now());
  const timers = {};
  window.__timers = timers;
  const st = window.setTimeout;
  window.setTimeout = function (fn, ms, ...a) {
    const s = Math.floor(performance.now() / 1000);
    timers[s] = (timers[s] || 0) + 1;
    return st.call(this, fn, ms, ...a);
  };
  const events = [];
  window.__layers = events;
  const current = el => el.style.backgroundImage || ((el.querySelector('img') || {}).src || '');
  document.addEventListener('DOMContentLoaded', () => {
    ['bgLayer1', 'bgLayer2', 'bannerLayer1', 'bannerLayer2'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      let last = current(el);
      new MutationObserver(() => {
        const src = current(el);
        if (src !== last) { last = src; if (src) events.push({ t: now(), group: id.startsWith('bg') ? 'bg' : 'banner', src }); }
      }).observe(el, { attributes: true, attributeFilter: ['style'], childList: true });
    });
  });
  let hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
})();
"""


# ---------------------------------------------------------------- 打开页面

class Session:
    """一次页面访问：拦截全部请求、注入探针、收集错误。"""

    def __init__(self, browser, api=None, *, origin=HTTPS, base="", viewport=(1280, 900), color_scheme="light",
                 reduced_motion="no-preference", js=True, blocked=(), html_patch=None, icon_status=200,
                 permissions=(), init_scripts=()):
        self.browser, self.api = browser, api or FakeImageApi()
        self.origin, self.base = origin, base
        self.opts = dict(viewport={"width": viewport[0], "height": viewport[1]}, color_scheme=color_scheme,
                         reduced_motion=reduced_motion, java_script_enabled=js, permissions=list(permissions))
        self.blocked, self.html_patch, self.icon_status = set(blocked), html_patch, icon_status
        self.init_scripts = [PROBE, *init_scripts]
        self.errors, self.missing, self.hosts, self.console = [], [], set(), []

    async def route(self, route):
        url = urlparse(route.request.url)
        self.hosts.add(url.hostname)
        if url.hostname == "startpage.test":
            return await self.serve_file(route, unquote(url.path))
        if url.hostname == "api.lqay.cn":
            asyncio.create_task(self.api.respond(route))
            return None
        if url.hostname in ("cdn.jsdmirror.com", "tc.lqay.cn"):
            if self.icon_status != 200:
                return await route.fulfill(status=self.icon_status, body="")
            return await route.fulfill(status=200, content_type="image/png", body=ICON)
        if url.hostname == "player.xfyun.club":
            return await route.fulfill(status=200, content_type="application/javascript", body="/* stub */")
        return await route.abort()

    async def serve_file(self, route, path):
        if self.base:  # 模拟部署在子目录：子目录以外的地址都是 404
            if not (path == self.base or path.startswith(self.base + "/")):
                self.missing.append(path)
                return await route.fulfill(status=404, body="not found")
            path = path[len(self.base):] or "/"
        if path.endswith("/"):
            path += "index.php"
        file = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if path in self.blocked or not file.startswith(ROOT) or not os.path.isfile(file):
            self.missing.append(path)
            return await route.fulfill(status=404, body="not found")
        body = open(file, "rb").read()
        if path.endswith("index.php") and self.html_patch:
            body = self.html_patch(body.decode("utf-8")).encode("utf-8")
        ext = os.path.splitext(file)[1].lower()
        return await route.fulfill(status=200, body=body, content_type=CONTENT_TYPES.get(ext, "application/octet-stream"))

    async def __aenter__(self):
        self.ctx = await self.browser.new_context(**self.opts)
        for script in self.init_scripts:
            await self.ctx.add_init_script(script)
        await self.ctx.route("**/*", self.route)
        self.page = await self.ctx.new_page()
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("console", lambda m: self.console.append(m.text))
        await self.page.goto(f"{self.origin}{self.base}/", wait_until="domcontentloaded")
        return self

    async def __aexit__(self, *exc):
        await self.ctx.close()

    async def ev(self, js):
        return await self.page.evaluate(js)

    async def layers(self):
        events = await self.ev("window.__layers")
        out = {}
        for group in ("bg", "banner"):
            seq = [e for e in events if e["group"] == group]
            srcs = [e["src"] for e in seq]
            ts = [e["t"] for e in seq]
            out[group] = {
                "count": len(seq),
                "repeats": sum(1 for a, b in zip(srcs, srcs[1:]) if a == b),
                "gaps": [round((b - a) / 1000, 2) for a, b in zip(ts, ts[1:])],
                "srcs": srcs,
            }
        return out

    async def timer_rate(self):
        """最近一整秒里 setTimeout 被调用的次数。"""
        t = await self.ev("window.__timers")
        last = max((int(k) for k in t), default=0)
        return t.get(str(last - 1), 0)


def config_patch(addition):
    """在页面配置后面、main.js 前面插入几行脚本（只影响测试，不改仓库文件）。"""
    def patch(html):
        marker = '<script src="assets/main.js'
        assert marker in html, "index.php 里找不到 main.js 的 <script>"
        return html.replace(marker, f"<script>{addition}</script>\n    {marker}", 1)
    return patch


# ---------------------------------------------------------------- 用例

TESTS = []


def case(fn):
    TESTS.append(fn)
    return fn


@case
async def static_files(browser, check):
    page = open(os.path.join(ROOT, "index.php"), encoding="utf-8").read()
    check("<?" not in page, "index.php 里不应该有 PHP 标签（页面是纯 HTML）")
    check("jquery" not in page.lower(), "不应该再依赖 jQuery")
    check('src="/photos' not in page and "('/photos" not in page, "图片路径应该是相对路径（子目录部署）")
    check("user-scalable=no" not in page, "不应该禁止双指缩放")
    readme = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
    check(readme.count("```") % 2 == 0, "README 的代码块围栏应该成对")
    # 本地 css / js 都要带 ?v= 版本号，部署后浏览器 / 服务器缓存才会换成新文件
    local = re.findall(r'(?:href|src)="(assets/[^"]+\.(?:css|js)[^"]*)"', page)
    check(local and all("?v=" in u for u in local), f"本地 css / js 链接都要带版本号：{local}")
    css = open(os.path.join(ROOT, "assets/style.css"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "assets/main.js"), encoding="utf-8").read()
    css_v = re.search(r'--startpage-css-version:\s*"([^"]+)"', css)
    js_v = re.search(r"const CSS_VERSION = '([^']+)'", js)
    check(css_v and js_v and css_v.group(1) == js_v.group(1), "style.css 和 main.js 里的样式表版本号要一致")


# 背景层已经显示出图片（不管图片是画成 CSS 背景还是放了 <img>）
BG_SHOWN = """(() => { const l = document.getElementById('bgLayer1'), i = l.querySelector('img');
  return l.style.backgroundImage !== '' || Boolean(i && i.complete && i.naturalWidth > 0); })()"""
# 每个轮播图层里最大的盒子（图层本身或里面的任何元素）的宽高
LAYER_BOXES = """['bgLayer1', 'bgLayer2', 'bannerLayer1', 'bannerLayer2'].map(id => {
  const el = document.getElementById(id), rs = [el, ...el.querySelectorAll('*')].map(e => e.getBoundingClientRect());
  return [id, Math.round(Math.max(...rs.map(r => r.width))), Math.round(Math.max(...rs.map(r => r.height)))]; })"""


@case
async def huge_wallpaper_keeps_page_size(browser, check):
    # 真实壁纸是 4K 大图：显示后页面不能变大、不能横向滑动，背景正好铺满屏幕
    for viewport in ((390, 844), (1280, 800)):
        async with Session(browser, FakeImageApi(latency=0.2, body=HUGE), viewport=viewport) as s:
            await s.page.wait_for_function(BG_SHOWN, timeout=15000)
            await asyncio.sleep(0.8)
            m = await s.ev("""(() => { const d = document.documentElement, r = document.getElementById('bgLayer1').getBoundingClientRect();
              return { sw: d.scrollWidth, iw: innerWidth, ih: innerHeight, lw: r.width, lh: r.height }; })()""")
            boxes = await s.ev(LAYER_BOXES)
            check(m["sw"] <= m["iw"], f"{viewport}：页面不应出现横向滚动（{m['sw']} > {m['iw']}）")
            check(round(m["lw"]) == m["iw"] and round(m["lh"]) == m["ih"], f"{viewport}：背景层应正好铺满屏幕：{m}")
            check(all(w <= m["iw"] and h <= m["ih"] for _, w, h in boxes), f"{viewport}：图层里不应有超出屏幕的图片：{boxes}")


@case
async def missing_stylesheet_cannot_blow_up_page(browser, check):
    # 样式表没加载到，或者浏览器 / 服务器还在用旧版 style.css（同样没有新图层的样式）时，
    # 大图也不能按原图尺寸把页面撑大、变得可以滑动；控制台要说明原因
    async with Session(browser, FakeImageApi(latency=0.2, body=HUGE), viewport=(390, 844), blocked={"/assets/style.css"}) as s:
        await s.page.wait_for_function(BG_SHOWN, timeout=15000)
        await asyncio.sleep(0.8)
        boxes = await s.ev(LAYER_BOXES)
        vw = await s.ev("innerWidth")
        check(all(w <= vw and h < 400 for _, w, h in boxes), f"图层不应按原图尺寸展开：{boxes}")
        check(any("样式表版本不对" in c for c in s.console), "控制台应提示样式表不是当前版本")


@case
async def carousel_cadence(browser, check):
    async with Session(browser, FakeImageApi(latency=0.3)) as s:
        await asyncio.sleep(16)
        lay = await s.layers()
        check(lay["bg"]["count"] >= 3 and all(4.2 <= g <= 5.9 for g in lay["bg"]["gaps"]), f"背景应每 5 秒切换：{lay['bg']['gaps']}")
        check(lay["banner"]["count"] >= 5 and all(2.4 <= g <= 3.9 for g in lay["banner"]["gaps"]), f"Banner 应每 3 秒切换：{lay['banner']['gaps']}")
        check(lay["bg"]["repeats"] == 0 and lay["banner"]["repeats"] == 0, "不应重复显示同一张图")
        check(not s.api.duplicate_urls(), f"同一个图片地址不应请求两次：{s.api.duplicate_urls()}")
        check("cdn.bootcdn.net" not in s.hosts, "不应再请求 bootcdn")
        check(not s.errors, f"页面报错：{s.errors}")


@case
async def slow_api(browser, check):
    async with Session(browser, FakeImageApi(latency=4.5)) as s:
        await asyncio.sleep(26)
        lay = await s.layers()
        check(lay["banner"]["repeats"] == 0 and lay["bg"]["repeats"] == 0, f"慢网速下不应把同一张图再切一遍：{lay}")
        check(min(lay["banner"]["gaps"] or [9]) >= 2.4, f"每张图至少完整展示一个间隔：{lay['banner']['gaps']}")
        check(s.api.max_in_flight() <= 2, f"同时最多两个下载（每个轮播一个），实际 {s.api.max_in_flight()}")


@case
async def first_load_failure(browser, check):
    api = FakeImageApi(latency=0.2, fail=lambda i, t: i <= 2)  # 两个轮播的第一次请求都失败
    async with Session(browser, api) as s:
        await asyncio.sleep(9)
        lay = await s.layers()
        check(lay["banner"]["srcs"][:1] and "bj.png" in lay["banner"]["srcs"][0], f"Banner 应先显示兜底图：{lay['banner']['srcs'][:1]}")
        check(any("api.lqay.cn" in x for x in lay["banner"]["srcs"]), "Banner 重试后应显示接口图片")
        check(any("api.lqay.cn" in x for x in lay["bg"]["srcs"]), "背景重试后应显示接口图片")
        loading = await s.ev("document.getElementById('bannerLayers').classList.contains('is-loading')")
        check(not loading, "显示图片后 Banner 骨架应收起")


@case
async def outage_recovery(browser, check):
    api = FakeImageApi(latency=0.2, fail=lambda i, t: i > 2 and 1.0 <= t < 12.0)
    patch = config_patch("window.STARTPAGE_CONFIG.maxRetryDelay = 4000;")
    async with Session(browser, api, html_patch=patch) as s:
        await asyncio.sleep(11)
        rate = await s.timer_rate()
        check(rate < 30, f"接口出错期间定时器不应越积越多：{rate} 次/秒")
        check(api.requests_between(1.0, 12.0) <= 14, f"接口出错期间应退避重试，实际请求 {api.requests_between(1.0, 12.0)} 次")
        before = await s.layers()
        await asyncio.sleep(13)
        after = await s.layers()
        for g in ("bg", "banner"):
            check(after[g]["count"] > before[g]["count"], f"{g}：接口恢复后应自动继续轮播")


@case
async def hover_is_stable(browser, check):
    async with Session(browser) as s:
        p = s.page
        await p.wait_for_load_state("load")
        items = p.locator(".a1 .item")
        b0, b1 = await items.nth(0).bounding_box(), await items.nth(1).bounding_box()
        width = "getComputedStyle(document.querySelector('.a1 .item')).width"
        rest = await s.ev(width)
        await p.mouse.move(b0["x"] + 20, b0["y"] + b0["height"] / 2)
        await asyncio.sleep(0.4)
        check(await s.ev(width) == rest, "悬停不应改变卡片宽度")
        check(abs((await items.nth(1).bounding_box())["x"] - b1["x"]) < 0.5, "悬停时同一行的邻居不应移动")
        x, y = b0["x"] + b0["width"] - 3, b0["y"] + b0["height"] / 2
        states = []
        for k in range(10):
            await p.mouse.move(x + (k % 2), y)
            await asyncio.sleep(0.05)
            states.append(await s.ev("document.querySelector('.a1 .item').matches(':hover')"))
        check(len(set(states)) == 1, f"鼠标在卡片边缘时悬停状态不应来回跳：{states}")


@case
async def desc_padding(browser, check):
    async with Session(browser) as s:
        pad = await s.ev("getComputedStyle(document.querySelector('.desc')).paddingLeft")
        check(pad == "12px", f".desc 应有 12px 左右内边距，实际 {pad}")


@case
async def subdirectory_deploy(browser, check):
    async with Session(browser, base="/sub") as s:
        await s.page.wait_for_load_state("load")
        await asyncio.sleep(0.5)
        check(not s.missing, f"子目录部署不应有 404：{s.missing}")
        ok = await s.ev("[...document.querySelectorAll('.logo img, .a2 .img-wrap img')].every(i => i.complete && i.naturalWidth > 0)")
        check(ok, "头像和 QQ 图标应正常加载")
        mask = await s.ev("getComputedStyle(document.querySelector('.tab-item.lx'), '::before').webkitMaskImage")
        check("/sub/assets/lx.png" in mask, f"标签图标应按样式表位置解析：{mask}")


@case
async def pause_when_hidden(browser, check):
    async with Session(browser) as s:
        await asyncio.sleep(4)
        await s.ev("window.__setHidden(true)")
        await asyncio.sleep(1.5)
        n = s.api.n
        await asyncio.sleep(12)
        check(s.api.n == n, f"页面在后台时不应下载图片，实际 {s.api.n - n} 次")
        await s.ev("window.__setHidden(false)")
        await asyncio.sleep(7)
        check(s.api.n > n, "回到前台后应继续轮播")


@case
async def pause_banner_offscreen(browser, check):
    async with Session(browser, viewport=(390, 600)) as s:
        await asyncio.sleep(4.5)
        await s.ev("window.scrollTo(0, document.documentElement.scrollHeight)")
        await asyncio.sleep(1)
        before = await s.layers()
        await asyncio.sleep(8)
        mid = await s.layers()
        check(mid["banner"]["count"] == before["banner"]["count"], "Banner 滚出屏幕后应暂停")
        check(mid["bg"]["count"] > before["bg"]["count"], "背景不受 Banner 暂停影响")
        await s.ev("window.scrollTo(0, 0)")
        await asyncio.sleep(5)
        check((await s.layers())["banner"]["count"] > mid["banner"]["count"], "Banner 回到屏幕后应继续")


@case
async def save_data_mode(browser, check):
    fake = "Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });"
    async with Session(browser, init_scripts=[fake]) as s:
        await asyncio.sleep(12)
        lay = await s.layers()
        check(lay["bg"]["count"] == 1 and lay["banner"]["count"] == 1, f"省流量模式下每个轮播只显示一张：{lay['bg']['count']}/{lay['banner']['count']}")
        check(s.api.n == 2, f"省流量模式下只应请求 2 张图，实际 {s.api.n}")


@case
async def tabs_keyboard(browser, check):
    async with Session(browser) as s:
        p = s.page
        state = "() => [document.querySelector('.lx').getAttribute('aria-selected'), getComputedStyle(document.querySelector('.a2')).display, document.querySelector('.tab-list').style.getPropertyValue('--tab-index'), document.activeElement.classList.contains('lx')]"
        await p.focus(".tab-item.zy")
        await p.keyboard.press("ArrowRight")
        check(await p.evaluate(state) == ["true", "flex", "1", True], f"→ 应切到联系并移动焦点：{await p.evaluate(state)}")
        await p.keyboard.press("ArrowLeft")
        check(await p.evaluate(state) == ["false", "none", "0", False], "← 应切回导航")
        await p.click(".tab-item.lx")
        check((await p.evaluate(state))[:3] == ["true", "flex", "1"], "点击应切到联系")


@case
async def qr_dialog(browser, check):
    async with Session(browser) as s:
        p = s.page
        is_open = "document.getElementById('myModal').open"
        await p.click(".tab-item.lx")
        await p.click(".a2 .item >> nth=0")
        check(await s.ev(is_open), "点「我的QQ」应打开二维码弹窗")
        check(await s.ev("document.getElementById('modalTitle').textContent") == "用 QQ 扫码加我", "弹窗标题应来自 data-qr-title")
        check((await s.ev("document.getElementById('modalSave').getAttribute('href')")).endswith("photos/QQ.jpg"), "保存按钮应指向二维码")
        await p.keyboard.press("Escape")
        await asyncio.sleep(0.6)
        check(not await s.ev(is_open), "Esc 应关闭弹窗")
        await p.click(".a2 .item >> nth=0")
        await p.mouse.click(5, 5)
        await asyncio.sleep(0.6)
        check(not await s.ev(is_open), "点遮罩应关闭弹窗")
        await p.click(".a2 .item >> nth=0")
        await p.click("#modalImage")
        check(await s.ev(is_open), "点二维码本身不应关闭")
        await p.click("#myModal .close")
        await asyncio.sleep(0.6)
        check(not await s.ev(is_open), "点 × 应关闭弹窗")
        await s.ev("showModal('photos/QQ.jpg')")
        check(await s.ev(is_open), "README 旧写法 showModal() 应仍然可用")
        await s.ev("""(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:2147483647'; document.body.appendChild(d); })()""")
        top = await s.ev("document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest('#myModal') !== null")
        check(top, "弹窗应在最上层（不被 z-index 最大的悬浮组件挡住）")


@case
async def copy_group_number(browser, check):
    async with Session(browser, permissions=["clipboard-read", "clipboard-write"]) as s:
        p = s.page
        await p.click(".tab-item.lx")
        await p.click(".copy-chip")
        await asyncio.sleep(0.4)
        check(await s.ev("navigator.clipboard.readText()") == "950348367", "应复制群号到剪贴板")
        toast = await s.ev("(() => { const t = document.querySelector('.toast'); return [t.textContent, t.classList.contains('is-visible')]; })()")
        check(toast == ["群号已复制", True], f"应提示「群号已复制」：{toast}")
        check(len(s.ctx.pages) == 1, "点复制按钮不应打开群链接")


@case
async def copy_fallback_on_http(browser, check):
    spy = "document.addEventListener('copy', () => { window.__copied = String(getSelection()); }, true);"
    async with Session(browser, origin=HTTP, init_scripts=[spy]) as s:
        await s.page.click(".tab-item.lx")
        await s.page.click(".copy-chip")
        await asyncio.sleep(0.3)
        check(await s.ev("window.__copied") == "950348367", "http 网站上应用备用方式复制")


@case
async def icon_fallback(browser, check):
    async with Session(browser, icon_status=404) as s:
        await s.page.wait_for_load_state("load")
        await asyncio.sleep(0.5)
        letters = await s.ev("[...document.querySelectorAll('.a1 .img-fallback')].map(e => e.textContent)")
        check(letters == [n[0] for n in NAV_NAMES], f"图标加载失败应显示名称首字：{letters}")


@case
async def reduced_motion(browser, check):
    async with Session(browser, reduced_motion="reduce") as s:
        p = s.page
        await p.wait_for_load_state("load")
        anim = await s.ev("(() => { const d = document.createElement('div'); d.className = 'layer-animate-in'; document.body.appendChild(d); return getComputedStyle(d).animationName; })()")
        check(anim == "layer-fade-in", f"减少动态效果时应改用淡入淡出：{anim}")
        box = await p.locator(".a1 .item >> nth=0").bounding_box()
        await p.mouse.move(box["x"] + 30, box["y"] + 20)
        await p.mouse.down()
        await asyncio.sleep(0.1)
        ripples = await s.ev("document.querySelectorAll('.ripple').length")
        await p.mouse.move(0, 0)
        await p.mouse.up()
        visible = await s.ev("[...document.querySelectorAll('.ripple')].some(r => getComputedStyle(r).display !== 'none')")
        check(ripples == 0 or not visible, "减少动态效果时不应显示波纹")
        sakura = await s.ev("(() => { const c = document.createElement('canvas'); c.id = 'canvas_sakura'; document.body.appendChild(c); return getComputedStyle(c).display; })()")
        check(sakura == "none", "减少动态效果时应隐藏樱花画布")


@case
async def dark_mode(browser, check):
    async with Session(browser, color_scheme="dark") as s:
        bg = await s.ev("getComputedStyle(document.getElementById('app')).backgroundColor")
        ink = await s.ev("getComputedStyle(document.querySelector('.tab-item.active')).color")
        check(bg == "rgba(30, 25, 36, 0.82)", f"暗色模式卡片背景：{bg}")
        check(ink == "rgb(255, 209, 230)", f"暗色模式选中标签颜色：{ink}")


@case
async def without_javascript(browser, check):
    async with Session(browser, js=False) as s:
        # 禁用 JS 时用定位器读页面状态
        a1 = await s.page.locator(".a1").is_visible()
        a2 = await s.page.locator(".a2").is_visible()
        href = await s.page.locator(".a2 .item >> nth=0").get_attribute("href")
        check(a1 and a2, "禁用 JS 时两个列表都应显示")
        check(href == "photos/QQ.jpg", "禁用 JS 时「我的QQ」应直接链接到二维码图片")


@case
async def effects_are_removable(browser, check):
    blocked = {"/assets/effects.js", "/assets/effects.css"}
    async with Session(browser, blocked=blocked, permissions=["clipboard-read", "clipboard-write"]) as s:
        p = s.page
        await asyncio.sleep(2)
        check(not s.errors, f"删掉 effects 后不应报错：{s.errors}")
        check((await s.layers())["bg"]["count"] >= 1, "删掉 effects 后轮播照常")
        check(await s.ev("document.querySelector('.logo').getAttribute('role')") is None, "没有 effects 时头像不应变成按钮")
        await p.click(".tab-item.lx")
        await p.click(".copy-chip")
        await asyncio.sleep(0.3)
        check(await s.ev("navigator.clipboard.readText()") == "950348367", "删掉 effects 后复制照常")
        await p.click(".a2 .item >> nth=0")
        check(await s.ev("document.getElementById('myModal').open"), "删掉 effects 后弹窗照常")


@case
async def avatar_poke(browser, check):
    async with Session(browser) as s:
        p = s.page
        await p.wait_for_load_state("load")
        await p.click(".logo")
        await asyncio.sleep(0.15)
        bubble = await s.ev("(() => { const b = document.querySelector('.avatar-bubble'); return [b.textContent, b.classList.contains('is-visible')]; })()")
        check(bubble[1] and bubble[0] in ["欢迎来玩～", "今天也要开心呀", "戳我也不会掉糖哦", "喵～"], f"戳头像应冒出一句话：{bubble}")
        check(await s.ev("document.querySelectorAll('.heart').length") >= 1, "戳头像应冒小爱心")
        await asyncio.sleep(2.5)
        await p.focus(".logo")
        await p.keyboard.press("Enter")
        await asyncio.sleep(0.1)
        check(await s.ev("document.querySelector('.avatar-bubble').classList.contains('is-visible')"), "键盘回车也能戳头像")


@case
async def effects_config_off(browser, check):
    patch = config_patch("window.STARTPAGE_CONFIG.effects.avatarBoop = false; window.STARTPAGE_CONFIG.effects.ripple = false;")
    async with Session(browser, html_patch=patch) as s:
        p = s.page
        await p.wait_for_load_state("load")
        check(not await s.ev("document.querySelector('.logo').classList.contains('is-pokeable')"), "avatarBoop=false 时头像不可戳")
        box = await p.locator(".a1 .item >> nth=0").bounding_box()
        await p.mouse.move(box["x"] + 30, box["y"] + 20)
        await p.mouse.down()
        await asyncio.sleep(0.1)
        check(await s.ev("document.querySelectorAll('.ripple').length") == 0, "ripple=false 时不应有波纹")
        await p.mouse.move(0, 0)
        await p.mouse.up()


# ---------------------------------------------------------------- 运行

async def main():
    wanted = sys.argv[1:]
    cases = [t for t in TESTS if not wanted or any(w in t.__name__ for w in wanted)]
    chrome = os.environ.get("CHROME_PATH")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(**({"executable_path": chrome} if chrome else {}), args=["--no-sandbox"])
        gate = asyncio.Semaphore(8)

        async def run(fn):
            fails = []

            def check(cond, msg):
                if not cond:
                    fails.append(msg)

            async with gate:
                started = time.monotonic()
                try:
                    await fn(browser, check)
                except Exception as e:  # 一个用例出错不影响其它用例
                    fails.append(f"运行出错：{e!r}")
                return fn.__name__, fails, time.monotonic() - started

        results = await asyncio.gather(*(run(fn) for fn in cases))
        await browser.close()
    failed = 0
    for name, fails, secs in results:
        print(f"{'PASS' if not fails else 'FAIL'}  {name}  ({secs:.0f}s)")
        for f in fails:
            print(f"      - {f}")
        failed += bool(fails)
    print(f"\n{len(results) - failed}/{len(results)} 通过")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
