/*!
 * 引导页脚本：背景 / Banner 轮播、导航 / 联系标签、二维码弹窗
 *
 * - 不依赖 jQuery 或其它第三方库（原来 jQuery 从 CDN 加载失败时，整段脚本直接报错，
 *   标签切换、弹窗、背景和 Banner 轮播会全部失效）。
 * - 可改的设置都在 index.php 里的 window.STARTPAGE_CONFIG，不用改这个文件。
 * - 调试：网址后面加 ?debug，控制台会输出每次预加载 / 切换 / 重试的日志。
 * - 本文件要放在 </body> 前、第三方脚本之前引入（会立刻初始化，不等外部脚本）。
 */
(() => {
	'use strict';

	/* ======================= 配置 ======================= */

	const DEFAULTS = {
		imageApi: 'https://api.lqay.cn/api/zxsjt/?cat=heng', // 背景和 Banner 共用的随机图接口
		background: { interval: 5000, api: '', fallback: '' }, // api 留空 = 用 imageApi
		banner: { interval: 3000, api: '', fallback: '' }, // fallback：接口挂了时先显示的本地图
		loadTimeout: 15000, // 单张图片最长等待时间（毫秒）
		retryDelay: 2000, // 加载失败后的首次重试间隔，之后每次翻倍
		maxRetryDelay: 30000, // 重试间隔上限
	};
	const MIN_INTERVAL = 1500; // 防呆：轮播间隔至少要比切换动画长

	const DEBUG = /[?&]debug\b/.test(location.search);
	const log = {
		debug: (...a) => { if (DEBUG) console.debug('[startpage]', ...a); },
		info: (...a) => console.info('[startpage]', ...a),
		warn: (...a) => console.warn('[startpage]', ...a),
	};

	function readConfig() {
		const user = window.STARTPAGE_CONFIG || {};
		const cfg = {
			...DEFAULTS,
			...user,
			background: { ...DEFAULTS.background, ...user.background },
			banner: { ...DEFAULTS.banner, ...user.banner },
		};
		for (const key of ['loadTimeout', 'retryDelay', 'maxRetryDelay']) {
			if (!(Number(cfg[key]) > 0)) {
				log.warn(`配置 ${key}=${cfg[key]} 无效，改用默认值 ${DEFAULTS[key]}`);
				cfg[key] = DEFAULTS[key];
			}
			cfg[key] = Number(cfg[key]);
		}
		for (const name of ['background', 'banner']) {
			const c = cfg[name];
			if (!(Number(c.interval) >= MIN_INTERVAL)) {
				log.warn(`配置 ${name}.interval=${c.interval} 无效（至少 ${MIN_INTERVAL}ms），改用默认值 ${DEFAULTS[name].interval}`);
				c.interval = DEFAULTS[name].interval;
			}
			c.interval = Number(c.interval);
			c.api = c.api || cfg.imageApi;
		}
		return cfg;
	}

	/* ======================= 工具函数 ======================= */

	function isHttpUrl(value) {
		if (typeof value !== 'string' || !value.trim()) return false;
		try {
			return /^https?:$/.test(new URL(value, location.href).protocol);
		} catch (e) {
			return false;
		}
	}

	// 随机图接口每次都要换参数，否则浏览器 / CDN 可能返回缓存的同一张图。
	// 用 URL 对象拼参数：接口地址本身带不带 "?" 都不会拼错。
	let seq = 0;
	function freshUrl(api) {
		const url = new URL(api, location.href);
		url.searchParams.set('_t', Date.now().toString(36) + (seq++).toString(36));
		return url.href;
	}

	function createImg(src) {
		const img = new Image();
		img.alt = '';
		img.decoding = 'async';
		img.draggable = false;
		if (src) img.src = src;
		return img;
	}

	// 预加载一张图片，成功后返回这个 <img> 元素本身，由图层直接显示它。
	// 原来是预加载完再把"同一个网址"设成 CSS 背景，靠浏览器缓存复用；随机图接口如果
	// 不允许缓存或者用 302 跳转，第二次请求可能重新下载、甚至换成另一张图，切换动画时就会空白。
	function loadImage(url, timeout) {
		return new Promise((resolve, reject) => {
			const img = createImg();
			let settled = false;
			const timer = setTimeout(() => done(new Error(`超过 ${timeout / 1000} 秒没加载完`)), timeout);
			function done(err) {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				img.onload = img.onerror = null;
				if (err) {
					img.removeAttribute('src'); // 放弃这次下载
					reject(err);
				} else {
					resolve(img);
				}
			}
			// 尽量解码完再交给轮播，避免切换动画第一帧卡一下
			img.onload = () => (img.decode ? img.decode() : Promise.resolve()).then(() => done(null), () => done(null));
			img.onerror = () => done(new Error('请求失败'));
			img.src = url;
		});
	}

	// "0.9s, 600ms" -> 0.9（秒）
	function maxSeconds(list) {
		return Math.max(0, ...String(list).split(',').map((t) => {
			const v = parseFloat(t);
			if (!Number.isFinite(v)) return 0;
			return /ms\s*$/.test(t) ? v / 1000 : v;
		}));
	}

	// 等元素上的 CSS 动画播完。animationend 不一定会来（后台标签页不渲染、动画被取消等），
	// 原来的代码只靠它解锁，一旦没来轮播就永远卡住；这里按 CSS 里写的时长 + 余量兜底。
	function animationDone(el) {
		const cs = getComputedStyle(el);
		if (!cs.animationName || cs.animationName === 'none') return Promise.resolve();
		const limit = (maxSeconds(cs.animationDuration) + maxSeconds(cs.animationDelay)) * 1000 + 500;
		return new Promise((resolve) => {
			let timer = 0;
			const finish = (e) => {
				if (e && (e.target !== el || e.pseudoElement)) return; // 只认这个元素自己的动画
				clearTimeout(timer);
				el.removeEventListener('animationend', finish);
				el.removeEventListener('animationcancel', finish);
				resolve();
			};
			timer = setTimeout(finish, limit);
			el.addEventListener('animationend', finish);
			el.addEventListener('animationcancel', finish);
		});
	}

	/* ======================= 切换动画 ======================= */

	// 背景：毛刺淡出 + 弹性淡入（动画本身定义在 style.css）
	const fadeTransition = () => ({
		classes: ['layer-animate-out', 'layer-animate-in'],
		run(from, to) {
			from.classList.add('layer-animate-out');
			to.classList.add('layer-animate-in');
			return Promise.all([animationDone(from), animationDone(to)]);
		},
	});

	// Banner：左右方向交替滑动 + 光效扫过
	const slideTransition = (container) => {
		let leftToRight = true;
		return {
			classes: ['banner-slide-ltr-out', 'banner-slide-ltr-in', 'banner-slide-rtl-out', 'banner-slide-rtl-in'],
			async run(from, to) {
				const dir = leftToRight ? 'ltr' : 'rtl';
				leftToRight = !leftToRight;
				container.classList.remove('banner-glow');
				void container.offsetWidth; // 强制重排，让光效动画每次都重新播放
				container.classList.add('banner-glow');
				from.classList.add(`banner-slide-${dir}-out`);
				to.classList.add(`banner-slide-${dir}-in`);
				await Promise.all([animationDone(from), animationDone(to)]);
				container.classList.remove('banner-glow');
			},
		};
	};

	/* ======================= 双图层轮播 ======================= */

	/**
	 * 背景和 Banner 共用的轮播逻辑（原来是两份几乎一样的代码，bug 也是两份）。
	 *
	 * 和原版的区别：
	 * - 直接显示预加载好的 <img>，不再对随机图地址发第二次请求；
	 * - 预加载的图片"取用即清空"：不会因为下一张还没下载完就把当前这张再切一遍；
	 * - 同一时间最多一个预加载请求：网速慢时不会越积越多；
	 * - 用 setTimeout 链代替 setInterval + 150ms 轮询：接口出错时不会无限叠加定时器；
	 * - 加载失败按 2s、4s、8s… 退避重试（上限 maxRetryDelay），接口恢复后自动继续；
	 * - 页面切到后台时暂停，回到前台再继续，后台不再下载壁纸。
	 */
	function createCarousel({ name, layers, transition, api, interval, fallback }, cfg) {
		let [front, back] = layers; // front：当前显示的图层
		let upcoming = null; // 预加载中的下一张（Promise<HTMLImageElement>）
		let shown = false; // 是否已经显示过图片（包括兜底图）
		let busy = false; // 正在加载 / 切换中
		let timer = 0;
		let failures = 0;

		const paint = (el, img) => {
			if (img) el.replaceChildren(img);
			else el.replaceChildren();
		};

		function preload() {
			if (!upcoming) {
				const url = freshUrl(api);
				log.debug(name, '预加载', url);
				upcoming = loadImage(url, cfg.loadTimeout);
				upcoming.catch(() => {}); // 失败留到 take() 时统一处理，这里只避免"未处理的 rejection"警告
			}
			return upcoming;
		}

		function take() {
			const next = preload();
			upcoming = null; // 每张预加载的图只用一次
			return next;
		}

		async function show(img) {
			if (!shown) { // 第一张直接显示，不播放切换动画（和原版一致）
				paint(front, img);
				shown = true;
				return;
			}
			paint(back, img);
			back.classList.add('is-incoming');
			await transition.run(front, back);
			// 在同一帧里收尾：新图层变成当前层，旧图层复位并清空，避免闪一下
			back.classList.add('is-active');
			back.classList.remove('is-incoming', ...transition.classes);
			front.classList.remove('is-active', ...transition.classes);
			paint(front, null);
			[front, back] = [back, front];
		}

		function schedule(delay) {
			clearTimeout(timer);
			timer = setTimeout(tick, delay);
		}

		async function tick() {
			timer = 0;
			if (busy) return;
			if (shown && document.hidden) return; // 后台暂停，visibilitychange 时恢复
			busy = true;
			let delay;
			try {
				const img = await take();
				const started = Date.now(); // 从这张图出现开始算，下载慢时也能完整展示一个间隔
				if (failures) log.info(`${name}：图片接口恢复正常`);
				failures = 0;
				await show(img);
				log.debug(name, '已切换', img.src);
				if (!document.hidden) preload(); // 展示这一张的同时准备下一张
				delay = Math.max(0, interval - (Date.now() - started));
			} catch (err) {
				failures += 1;
				delay = Math.min(cfg.maxRetryDelay, cfg.retryDelay * 2 ** (failures - 1));
				const msg = `${name}：图片加载失败（${err.message}），${Math.round(delay / 1000)} 秒后重试`;
				if (failures === 1) log.warn(msg); else log.debug(msg);
				if (!shown && fallback) {
					log.info(`${name}：先显示兜底图 ${fallback}`);
					paint(front, createImg(fallback));
					shown = true;
				}
			} finally {
				busy = false;
			}
			if (!(shown && document.hidden)) schedule(delay);
		}

		function onVisibilityChange() {
			if (document.hidden) {
				if (shown) {
					clearTimeout(timer);
					timer = 0;
					log.debug(name, '页面不可见，暂停');
				}
			} else if (!busy && !timer) {
				log.debug(name, '页面可见，继续');
				schedule(failures ? cfg.retryDelay : interval);
			}
		}

		return {
			start() {
				document.addEventListener('visibilitychange', onVisibilityChange);
				tick();
			},
		};
	}

	function initCarousels(cfg) {
		const byId = (id) => document.getElementById(id);
		const setups = [
			{ name: '背景', ids: ['bgLayer1', 'bgLayer2'], conf: cfg.background, transition: () => fadeTransition() },
			{ name: 'Banner', ids: ['bannerLayer1', 'bannerLayer2', 'bannerLayers'], conf: cfg.banner, transition: () => slideTransition(byId('bannerLayers')) },
		];
		for (const s of setups) {
			const missing = s.ids.filter((id) => !byId(id));
			if (missing.length) {
				log.warn(`${s.name}：页面里找不到 #${missing.join('、#')}，不启动轮播`);
				continue;
			}
			if (!isHttpUrl(s.conf.api)) {
				log.warn(`${s.name}：图片接口地址无效（${s.conf.api}），不启动轮播`);
				continue;
			}
			createCarousel({
				name: s.name,
				layers: [byId(s.ids[0]), byId(s.ids[1])],
				transition: s.transition(),
				api: s.conf.api,
				interval: s.conf.interval,
				fallback: s.conf.fallback,
			}, cfg).start();
		}
	}

	/* ======================= 标签：导航 / 联系 ======================= */

	function initTabs() {
		const tabs = Array.from(document.querySelectorAll('.tab-list [role="tab"]'));
		if (!tabs.length) return;
		const panelOf = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

		function select(tab, focus) {
			for (const t of tabs) {
				const on = t === tab;
				t.classList.toggle('active', on);
				t.setAttribute('aria-selected', String(on));
				t.tabIndex = on ? 0 : -1;
				const panel = panelOf(t);
				if (panel) panel.hidden = !on;
			}
			if (focus) tab.focus();
		}

		tabs.forEach((tab, i) => {
			tab.addEventListener('click', () => select(tab));
			tab.addEventListener('keydown', (e) => { // 键盘也能切换：回车 / 空格 / 左右方向键
				const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					select(tab);
				} else if (step) {
					e.preventDefault();
					select(tabs[(i + step + tabs.length) % tabs.length], true);
				}
			});
		});
		select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
	}

	/* ======================= 二维码弹窗 ======================= */

	function initQrDialog() {
		const dialog = document.getElementById('myModal');
		const img = document.getElementById('modalImage');
		if (!dialog || !img || typeof dialog.showModal !== 'function') {
			return null; // 极老的浏览器不支持 <dialog>：链接本身指向二维码图片，点击直接打开
		}

		function open(src) {
			img.src = src;
			if (!dialog.open) dialog.showModal();
		}

		document.addEventListener('click', (e) => {
			const trigger = e.target.closest('[data-qr]');
			if (!trigger) return;
			e.preventDefault();
			open(trigger.getAttribute('data-qr'));
		});

		dialog.addEventListener('click', (e) => {
			if (e.target.closest('.close')) {
				dialog.close();
				return;
			}
			const r = dialog.getBoundingClientRect(); // 点在弹窗外面（遮罩上）也关闭
			if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
				dialog.close();
			}
		});
		return open;
	}

	/* ======================= 启动 ======================= */

	function init() {
		const cfg = readConfig();
		initTabs();
		const openQr = initQrDialog();
		if (openQr) window.showModal = openQr; // 兼容旧写法：onclick="showModal('photos/QQ.jpg')"
		initCarousels(cfg);
		log.debug('初始化完成', cfg);
	}

	// 页面结构已经在脚本前面解析完就立即启动，不等 DOMContentLoaded
	// （那要等后面的第三方脚本全部下载执行完，外部站点慢的话轮播和标签都会被拖住）
	if (document.getElementById('myModal')) init();
	else document.addEventListener('DOMContentLoaded', init);
})();
