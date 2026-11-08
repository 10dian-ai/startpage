/*!
 * 装饰性点击反馈（和 effects.css 配套使用）
 *
 * - 点卡片 / 标签：从按下的位置泛开一圈粉色波纹（键盘回车 / 空格从中心泛开）
 * - 戳头像：弹一下、冒几颗小爱心、头像上方冒一句话（话可以在配置里改）
 * - 可选：页面任意位置点击冒小爱心（默认关闭）
 *
 * 全部可选：删掉 effects.js + effects.css（以及 index.php 里引用它们的两行）页面功能不受影响。
 * 系统开了"减少动态效果"时不播放波纹和爱心。
 * 配置：window.STARTPAGE_CONFIG.effects（见 index.php）
 */
(() => {
	'use strict';

	const DEFAULTS = {
		ripple: true, // 卡片 / 标签点击波纹
		avatarBoop: true, // 戳头像
		avatarLines: ['欢迎来玩～', '今天也要开心呀', '戳我也不会掉糖哦', '喵～'],
		clickHearts: false, // 页面任意位置点击冒爱心
	};
	const PINKS = ['#ee5a9b', '#ff8fc0', '#f472b6', '#fb7185', '#c084fc'];

	const userCfg = (window.STARTPAGE_CONFIG && window.STARTPAGE_CONFIG.effects) || {};
	const cfg = { ...DEFAULTS, ...userCfg };
	const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	const calm = () => Boolean(motionQuery && motionQuery.matches); // 每次触发时现查，系统设置改了立即生效

	/* ======================= 点击波纹 ======================= */

	function ripple(host, x, y) {
		const r = host.getBoundingClientRect();
		// 波纹半径 = 按下点到最远一个角的距离，保证能铺满整个元素
		const radius = Math.hypot(Math.max(x - r.left, r.right - x), Math.max(y - r.top, r.bottom - y));
		const dot = document.createElement('span');
		dot.className = 'ripple';
		dot.setAttribute('aria-hidden', 'true');
		dot.style.width = dot.style.height = `${radius * 2}px`;
		dot.style.left = `${x - r.left - radius}px`;
		dot.style.top = `${y - r.top - radius}px`;
		host.appendChild(dot);
		const remove = () => dot.remove();
		dot.addEventListener('animationend', remove, { once: true });
		setTimeout(remove, 1000); // 兜底：动画事件没来也会清掉
	}

	// 波纹画在哪个元素里：卡片画在圆角卡片里，标签画在标签里；"复制群号"按钮不画
	function rippleHost(target) {
		if (!(target instanceof Element) || target.closest('.copy-chip')) return null;
		const tile = target.closest('.item');
		if (tile) return tile.querySelector('.content-wrap');
		return target.closest('.tab-item');
	}

	function initRipple() {
		document.addEventListener('pointerdown', (e) => {
			if (calm() || e.button !== 0) return;
			const host = rippleHost(e.target);
			if (host) ripple(host, e.clientX, e.clientY);
		});
		document.addEventListener('keydown', (e) => {
			if (calm() || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
			const host = rippleHost(e.target);
			if (!host) return;
			const r = host.getBoundingClientRect();
			ripple(host, r.left + r.width / 2, r.top + r.height / 2);
		});
	}

	/* ======================= 小爱心 ======================= */

	function hearts(x, y, count) {
		if (calm()) return;
		for (let i = 0; i < count; i++) {
			const h = document.createElement('span');
			h.className = 'heart';
			h.setAttribute('aria-hidden', 'true');
			const angle = ((-90 + (Math.random() - 0.5) * 150) * Math.PI) / 180; // 大致往上散开
			const dist = 30 + Math.random() * 40;
			h.style.setProperty('--x', `${x}px`);
			h.style.setProperty('--y', `${y}px`);
			h.style.setProperty('--dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
			h.style.setProperty('--dy', `${(Math.sin(angle) * dist).toFixed(1)}px`);
			h.style.setProperty('--s', (0.7 + Math.random() * 0.6).toFixed(2));
			h.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 60)}deg`);
			h.style.setProperty('--c', PINKS[i % PINKS.length]);
			h.style.animationDelay = `${i * 18}ms`;
			document.body.appendChild(h);
			const remove = () => h.remove();
			h.addEventListener('animationend', remove, { once: true });
			setTimeout(remove, 1500);
		}
	}

	/* ======================= 戳头像 ======================= */

	function initAvatar() {
		const logo = document.querySelector('.logo');
		if (!logo) return;
		const lines = (Array.isArray(cfg.avatarLines) ? cfg.avatarLines : [])
			.filter((s) => typeof s === 'string' && s.trim());

		// 只有启用了这个效果，头像才变成可以聚焦、可以"按"的按钮
		logo.classList.add('is-pokeable');
		logo.setAttribute('role', 'button');
		logo.setAttribute('aria-label', '戳一下头像');
		logo.tabIndex = 0;

		const bubble = document.createElement('span');
		bubble.className = 'avatar-bubble';
		bubble.setAttribute('role', 'status'); // 读屏软件会念出气泡里的话
		logo.appendChild(bubble);

		let hideTimer = 0;
		let last = -1;

		function poke(x, y) {
			logo.classList.remove('is-booped');
			void logo.offsetWidth; // 连续戳也每次重新弹
			logo.classList.add('is-booped');
			if (lines.length) {
				let i = Math.floor(Math.random() * lines.length);
				if (lines.length > 1 && i === last) i = (i + 1) % lines.length; // 不连着说同一句
				last = i;
				bubble.textContent = lines[i];
				bubble.classList.add('is-visible');
				clearTimeout(hideTimer);
				hideTimer = setTimeout(() => bubble.classList.remove('is-visible'), 2200);
			}
			hearts(x, y, 7);
		}

		logo.addEventListener('click', (e) => {
			const r = logo.getBoundingClientRect();
			// 键盘触发的 click 没有坐标，用头像中心
			poke(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
		});
		logo.addEventListener('keydown', (e) => {
			if (e.key !== 'Enter' && e.key !== ' ') return;
			e.preventDefault();
			logo.click();
		});
		logo.addEventListener('animationend', (e) => {
			if (e.animationName === 'boop') logo.classList.remove('is-booped');
		});
	}

	/* ======================= 全局点击爱心（可选） ======================= */

	function initClickHearts() {
		document.addEventListener('pointerdown', (e) => {
			if (e.button !== 0 || (e.target instanceof Element && e.target.closest('.logo'))) return;
			hearts(e.clientX, e.clientY, 5);
		});
	}

	if (cfg.ripple) initRipple();
	if (cfg.avatarBoop) initAvatar();
	if (cfg.clickHearts) initClickHearts();
})();
