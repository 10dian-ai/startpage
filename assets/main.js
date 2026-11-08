/*!
 * 引导页核心脚本：背景 / Banner 轮播、导航 / 联系标签、二维码弹窗、复制群号、图标兜底
 *
 * - 不依赖 jQuery 或其它第三方库（原来 jQuery 从 CDN 加载失败时，整段脚本直接报错，
 *   标签切换、弹窗、背景和 Banner 轮播会全部失效）。
 * - 可改的设置都在 index.php 里的 window.STARTPAGE_CONFIG，不用改这个文件。
 * - 调试：网址后面加 ?debug，控制台会输出每次预加载 / 切换 / 暂停 / 重试的日志。
 * - 本文件要放在 </body> 前、第三方脚本之前引入（会立刻初始化，不等外部脚本）。
 * - 装饰效果（波纹、戳头像）在 effects.js，和这里互不依赖。
 */
(() => {
	'use strict';

	/* ======================= 配置 ======================= */

	const DEFAULTS = {
		imageApi: 'https://api.lqay.cn/api/zxsjt/?cat=heng', // 背景和 Banner 共用的随机图接口
		background: { interval: 5000, api: '', fallback: '' }, // api 留空 = 用 imageApi
		banner: { interval: 3000, api: '', fallback: '', pauseOffscreen: true }, // 滚出屏幕时暂停
		respectSaveData: true, // 浏览器开了"省流量"时只加载一张，不自动轮播
		loadTimeout: 15000, // 单张图片最长等待时间（毫秒）
		retryDelay: 2000, // 加载失败后的首次重试间隔，之后每次翻倍
		maxRetryDelay: 30000, // 重试间隔上限
	};
	const MIN_INTERVAL = 1500; // 防呆：轮播间隔至少要比切换动画长
	// 和 style.css 开头的 --startpage-css-version 对应。对不上 = 浏览器或服务器还在用旧的样式表缓存
	const CSS_VERSION = '2';

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

	// 浏览器开了"省流量"（Chrome 安卓的 Lite 模式等）
	function saveDataOn() {
		const c = navigator.connection;
		return Boolean(c && c.saveData);
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

	// 预加载一张图片，成功后返回这个 Image 对象。
	// 图层用 CSS 背景显示它（background-image 永远不会影响页面布局，哪怕样式表是旧的缓存版本，
	// 也不会像 <img> 那样按原图尺寸把页面撑大）；轮播会一直持有这个对象直到图层清空，
	// 让浏览器从内存里复用这张图，不会再下载一次。
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
	// 时长从 CSS 读取，所以"减少动态效果"时换成的短动画也能正确等待。
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
	 * - 图片画成图层的 CSS 背景：不管样式表新旧，都不会撑大页面；
	 * - 预加载的图片"取用即清空"：不会因为下一张还没下载完就把当前这张再切一遍；
	 * - 同一时间最多一个预加载请求：网速慢时不会越积越多；
	 * - 用 setTimeout 链代替 setInterval + 150ms 轮询：接口出错时不会无限叠加定时器；
	 * - 加载失败按 2s、4s、8s… 退避重试（上限 maxRetryDelay），接口恢复后自动继续；
	 * - 暂停条件可以叠加：页面切到后台、Banner 滚出屏幕；都恢复后才继续轮播；
	 * - rotate=false（省流量）时只显示一张。
	 */
	function createCarousel(opts, cfg) {
		const { name, layers, transition, api, interval, fallback, watch, rotate, onFirstShown } = opts;
		let [front, back] = layers; // front：当前显示的图层
		let upcoming = null; // 预加载中的下一张（Promise<HTMLImageElement>）
		let shown = false; // 是否已经显示过图片（包括兜底图）
		let busy = false; // 正在加载 / 切换中
		let timer = 0;
		let failures = 0;
		const pauses = new Set(); // 'hidden' | 'offscreen'

		const paused = () => pauses.size > 0;
		const resting = () => shown && (paused() || !rotate); // 已经有图了，而且现在不该继续换

		// 正在显示的图片对象：持有它，浏览器就会从内存里复用这张图，不会再请求一次随机图地址
		const held = new Map();

		const paint = (el, img) => {
			if (img) {
				held.set(el, img);
				el.style.backgroundImage = `url("${img.src}")`;
			} else {
				held.delete(el);
				el.style.backgroundImage = '';
			}
		};

		function firstShown() {
			shown = true;
			if (onFirstShown) onFirstShown();
		}

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
			if (!shown) { // 第一张直接淡入，不播放切换动画
				front.classList.add('is-first');
				paint(front, img);
				firstShown();
				return;
			}
			front.classList.remove('is-first'); // 第一次淡入只播一次
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
			if (busy || resting()) return;
			busy = true;
			let delay;
			try {
				const img = await take();
				const started = Date.now(); // 从这张图出现开始算，下载慢时也能完整展示一个间隔
				if (failures) log.info(`${name}：图片接口恢复正常`);
				failures = 0;
				await show(img);
				log.debug(name, '已切换', img.src);
				if (rotate && !paused()) preload(); // 展示这一张的同时准备下一张
				delay = Math.max(0, interval - (Date.now() - started));
			} catch (err) {
				failures += 1;
				delay = Math.min(cfg.maxRetryDelay, cfg.retryDelay * 2 ** (failures - 1));
				const msg = `${name}：图片加载失败（${err.message}），${Math.round(delay / 1000)} 秒后重试`;
				if (failures === 1) log.warn(msg); else log.debug(msg);
				if (!shown && fallback) {
					log.info(`${name}：先显示兜底图 ${fallback}`);
					front.classList.add('is-first');
					paint(front, createImg(fallback));
					firstShown();
				}
			} finally {
				busy = false;
			}
			if (!resting()) schedule(delay);
		}

		// 暂停 / 恢复。还没显示过图片时不暂停，保证页面至少有一张图
		function setPause(reason, on) {
			const before = paused();
			if (on) pauses.add(reason); else pauses.delete(reason);
			if (paused() === before) return;
			if (paused()) {
				if (shown) {
					clearTimeout(timer);
					timer = 0;
					log.debug(name, '暂停：', [...pauses].join('、'));
				}
			} else if (rotate && !busy && !timer) {
				log.debug(name, '继续轮播');
				schedule(failures ? cfg.retryDelay : interval);
			}
		}

		return {
			start() {
				setPause('hidden', document.hidden);
				document.addEventListener('visibilitychange', () => setPause('hidden', document.hidden));
				if (watch && 'IntersectionObserver' in window) {
					new IntersectionObserver((entries) => {
						const entry = entries[entries.length - 1];
						setPause('offscreen', !entry.isIntersecting);
					}).observe(watch);
				}
				tick();
			},
		};
	}

	function initCarousels(cfg) {
		const byId = (id) => document.getElementById(id);
		const rotate = !(cfg.respectSaveData && saveDataOn());
		if (!rotate) log.info('浏览器开启了省流量模式：背景和 Banner 只加载一张，不自动轮播');
		const setups = [
			{
				name: '背景',
				ids: ['bgLayer1', 'bgLayer2'],
				conf: cfg.background,
				transition: () => fadeTransition(),
			},
			{
				name: 'Banner',
				ids: ['bannerLayer1', 'bannerLayer2', 'bannerLayers'],
				conf: cfg.banner,
				transition: () => slideTransition(byId('bannerLayers')),
				watch: () => (cfg.banner.pauseOffscreen ? byId('bannerContainer') || byId('bannerLayers') : null),
				onFirstShown: () => byId('bannerLayers').classList.remove('is-loading'), // 收起骨架闪光
			},
		];
		for (const s of setups) {
			const missing = s.ids.filter((id) => !byId(id));
			if (missing.length) {
				log.warn(`${s.name}：页面里找不到 #${missing.join('、#')}，不启动轮播`);
				continue;
			}
			if (!isHttpUrl(s.conf.api)) {
				log.warn(`${s.name}：图片接口地址无效（${s.conf.api}），不启动轮播`);
				if (s.onFirstShown) s.onFirstShown();
				continue;
			}
			createCarousel({
				name: s.name,
				layers: [byId(s.ids[0]), byId(s.ids[1])],
				transition: s.transition(),
				api: s.conf.api,
				interval: s.conf.interval,
				fallback: s.conf.fallback,
				watch: s.watch ? s.watch() : null,
				rotate,
				onFirstShown: s.onFirstShown,
			}, cfg).start();
		}
	}

	/* ======================= 标签：导航 / 联系 ======================= */

	function initTabs() {
		const list = document.querySelector('.tab-list');
		const tabs = Array.from(document.querySelectorAll('.tab-list [role="tab"]'));
		if (!list || !tabs.length) return;
		const panelOf = (tab) => document.getElementById(tab.getAttribute('aria-controls'));
		list.style.setProperty('--tab-count', String(tabs.length));

		function select(tab, focus) {
			list.style.setProperty('--tab-index', String(tabs.indexOf(tab))); // 粉色底块滑过去
			for (const t of tabs) {
				const on = t === tab;
				t.classList.toggle('active', on);
				t.setAttribute('aria-selected', String(on));
				t.tabIndex = on ? 0 : -1;
				const panel = panelOf(t);
				if (!panel) continue;
				if (on && panel.hidden) { // 新显示的面板淡入一下
					panel.classList.remove('is-entering');
					void panel.offsetWidth;
					panel.classList.add('is-entering');
				}
				panel.hidden = !on;
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
		for (const t of tabs) {
			const panel = panelOf(t);
			if (panel) panel.addEventListener('animationend', () => panel.classList.remove('is-entering'));
		}
		select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
	}

	/* ======================= 底部提示 ======================= */

	let toastEl = null;
	let toastTimer = 0;

	function initToast() {
		toastEl = document.createElement('div');
		toastEl.className = 'toast';
		toastEl.setAttribute('role', 'status'); // 读屏软件会念出提示
		toastEl.setAttribute('aria-live', 'polite');
		document.body.appendChild(toastEl);
	}

	function toast(message) {
		if (!toastEl) initToast();
		toastEl.textContent = message;
		toastEl.classList.remove('is-visible');
		void toastEl.offsetWidth; // 连续提示时重新弹一下
		toastEl.classList.add('is-visible');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
	}

	/* ======================= 复制（群号等） ======================= */

	async function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch (e) {
				log.debug('Clipboard API 不可用，改用备用方式', e);
			}
		}
		// http 网站或旧浏览器：用隐藏的文本框复制
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
		document.body.appendChild(ta);
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch (e) {
			ok = false;
		}
		ta.remove();
		return ok;
	}

	function initCopy() {
		const resetTimers = new WeakMap();
		document.addEventListener('click', async (e) => {
			const btn = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
			if (!btn) return;
			e.preventDefault();
			e.stopPropagation(); // 不触发卡片本身的链接
			const text = btn.getAttribute('data-copy');
			const ok = await copyText(text);
			if (ok) {
				toast(btn.getAttribute('data-copy-done') || '已复制');
				btn.classList.add('is-copied');
				clearTimeout(resetTimers.get(btn));
				resetTimers.set(btn, setTimeout(() => btn.classList.remove('is-copied'), 1600));
			} else {
				toast(`没能自动复制，请手动复制：${text}`);
			}
		});
	}

	/* ======================= 二维码弹窗 ======================= */

	function initQrDialog() {
		const dialog = document.getElementById('myModal');
		const img = document.getElementById('modalImage');
		const title = document.getElementById('modalTitle');
		const save = document.getElementById('modalSave');
		if (!dialog || !img || typeof dialog.showModal !== 'function') {
			return null; // 极老的浏览器不支持 <dialog>：链接本身指向二维码图片，点击直接打开
		}
		const defaultTitle = title ? title.textContent : '';

		function open(src, heading) {
			img.src = src;
			if (title) title.textContent = heading || defaultTitle;
			if (save) save.href = src;
			dialog.classList.remove('is-closing');
			if (!dialog.open) dialog.showModal();
		}

		// 先播关闭动画再真正关闭
		function close() {
			if (!dialog.open || dialog.classList.contains('is-closing')) return;
			dialog.classList.add('is-closing');
			animationDone(dialog).then(() => {
				dialog.classList.remove('is-closing');
				dialog.close();
			});
		}

		document.addEventListener('click', (e) => {
			const trigger = e.target instanceof Element ? e.target.closest('[data-qr]') : null;
			if (!trigger) return;
			e.preventDefault();
			open(trigger.getAttribute('data-qr'), trigger.getAttribute('data-qr-title'));
		});

		dialog.addEventListener('cancel', (e) => { // Esc
			e.preventDefault();
			close();
		});

		dialog.addEventListener('click', (e) => {
			if (e.target.closest('.close')) {
				close();
				return;
			}
			const r = dialog.getBoundingClientRect(); // 点在弹窗外面（遮罩上）也关闭
			if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
				close();
			}
		});
		return open;
	}

	/* ======================= 图标加载失败兜底 ======================= */

	// 导航图标来自外部 CDN，挂了的时候用名称的第一个字代替，而不是一个破图标
	function initImageFallbacks() {
		const replace = (img) => {
			const tile = img.closest('.item');
			const name = tile ? tile.querySelector('.app-name') : null;
			const letter = Array.from(name ? name.textContent.trim() : '')[0] || '·';
			const span = document.createElement('span');
			span.className = 'img-fallback';
			span.setAttribute('aria-hidden', 'true');
			span.textContent = letter;
			log.warn('图标加载失败，已用文字代替：', img.currentSrc || img.src);
			img.replaceWith(span);
		};
		for (const img of document.querySelectorAll('.img-wrap img')) {
			if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) replace(img);
			else img.addEventListener('error', () => replace(img), { once: true });
		}
	}

	/* ======================= 启动 ======================= */

	// 新的 HTML / 脚本配上旧的 style.css（服务器或浏览器缓存）会让页面错乱，这里在控制台直接点明原因
	function checkStylesheet() {
		const found = getComputedStyle(document.documentElement)
			.getPropertyValue('--startpage-css-version').trim().replace(/["']/g, '');
		if (found !== CSS_VERSION) {
			log.warn(`样式表版本不对（需要 ${CSS_VERSION}，实际 ${found || '没有加载到'}）：浏览器或服务器可能还在用旧的 style.css 缓存。`
				+ '请强制刷新页面；如果是服务器缓存，把 index.php 里 css / js 链接后面的 ?v= 版本号改一下。');
		}
	}

	function init() {
		checkStylesheet();
		const cfg = readConfig();
		// iOS Safari 只有页面监听了 touchstart 才会显示 :active 按下效果
		document.addEventListener('touchstart', () => {}, { passive: true });
		initToast();
		initTabs();
		initCopy();
		initImageFallbacks();
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
