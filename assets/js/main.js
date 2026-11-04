/*!
 * 架け橋パートナーズ コーポレートサイト(制作サンプル)
 * main.js — Vanilla JS(ライブラリなし)
 *
 *  1. 計測(dataLayer / GA4 イベント)
 *  2. ヘッダーのメニュー(スマホ)
 *  3. セクションをつなぐ線(スクロール連動)
 *  4. 出現アニメーション(IntersectionObserver)
 *  5. 数字のカウントアップ
 *  6. スマホの追従ボタン
 *  7. フォーム(入力チェック・送信)
 *  8. 求人カード(開閉・「この求人について相談する」・線の演出)
 *  9. 送信完了ページ
 */
(function () {
  'use strict';

  window.__kh = true;
  var root = document.documentElement;
  if (!root.classList.contains('js')) root.classList.replace('no-js', 'js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* ---------------------------------------------------------
   * 1. 計測
   *    GTM 経由で GA4 に送る想定。個人情報(名前・メール・本文・ファイル名)は送らない。
   * ------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var payload = Object.assign({ event: event, page_path: location.pathname }, params || {});
    window.dataLayer.push(payload);
    if (window.console && console.info) console.info('[dataLayer]', payload);
  }

  document.addEventListener('click', function (e) {
    var cta = e.target.closest('[data-cta]');
    if (cta) track('cta_click', { cta_type: cta.dataset.cta, cta_position: cta.dataset.ctaPos || '' });
    var tel = e.target.closest('[data-tel]');
    if (tel) track('tel_click', { tel_type: tel.dataset.tel });
  });

  /* ---------------------------------------------------------
   * 2. ヘッダーのメニュー
   * ------------------------------------------------------- */
  (function initNav() {
    var header = $('[data-header]');
    var toggle = $('[data-nav-toggle]');
    if (!header || !toggle) return;
    var nav = document.getElementById(toggle.getAttribute('aria-controls'));
    var mq = window.matchMedia('(max-width: 1023px)');

    function setOpen(open, returnFocus) {
      header.classList.toggle('is-nav-open', open);
      document.body.classList.toggle('is-locked', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      if (open) {
        var first = nav.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && mq.matches) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-nav-open')) setOpen(false, true);
    });
    // メニュー内でフォーカスを循環させる
    header.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !header.classList.contains('is-nav-open')) return;
      var items = [toggle].concat($$('a, button', nav));
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    mq.addEventListener('change', function (e) { if (!e.matches) setOpen(false); });
  })();

  /* ---------------------------------------------------------
   * 3. セクションをつなぐ線
   *    ティール→コーラルの1本の線が、スクロールに合わせて上から下へ伸びる。
   *    各セクションの見出しの位置に点があり、線が届くと点がともる。
   * ------------------------------------------------------- */
  (function initFlow() {
    if (!document.body.classList.contains('has-flow')) return;
    var main = $('main');
    var sections = $$('[data-flow]', main);
    if (!main || !sections.length) return;

    main.style.position = 'relative';
    var flow = document.createElement('div');
    flow.className = 'flow';
    flow.setAttribute('aria-hidden', 'true');
    flow.innerHTML = '<span class="flow__track"></span><span class="flow__line"></span>';
    main.insertBefore(flow, main.firstChild);

    var dots = sections.map(function (sec) {
      var d = document.createElement('span');
      d.className = 'flow-dot';
      d.setAttribute('aria-hidden', 'true');
      sec.appendChild(d);
      return d;
    });

    var startY = 0, length = 1, dotY = [];
    function measure() {
      var mainTop = main.getBoundingClientRect().top + window.scrollY;
      var firstTop = sections[0].getBoundingClientRect().top + window.scrollY;
      var lastSec = sections[sections.length - 1];
      var endY = lastSec.getBoundingClientRect().top + window.scrollY + lastSec.offsetHeight;
      flow.style.top = (firstTop - mainTop) + 'px';
      flow.style.bottom = 'auto';
      flow.style.height = (endY - firstTop) + 'px';
      startY = firstTop;
      length = Math.max(1, endY - firstTop);
      dotY = dots.map(function (d) { return d.getBoundingClientRect().top + window.scrollY + 8; });
    }

    var ticking = false;
    function update() {
      ticking = false;
      var head = window.scrollY + window.innerHeight * 0.62;
      flow.style.setProperty('--p', clamp((head - startY) / length, 0, 1).toFixed(4));
      for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('is-lit', head >= dotY[i]);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

    measure(); update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('load', function () { measure(); update(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); onScroll(); }).observe(main);
  })();

  /* ---------------------------------------------------------
   * 4. 出現アニメーション
   * ------------------------------------------------------- */
  function observeOnce(elements, options, onEnter) {
    if (!elements.length) return;
    if (!hasIO || reduceMotion) { elements.forEach(onEnter); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { onEnter(entry.target); io.unobserve(entry.target); }
      });
    }, options);
    elements.forEach(function (el) { io.observe(el); });
  }

  observeOnce($$('.reveal'), { rootMargin: '0px 0px -10% 0px' }, function (el) { el.classList.add('is-in'); });
  observeOnce($$('[data-anim]'), { rootMargin: '0px 0px -20% 0px' }, function (el) { el.classList.add('is-in'); });

  /* ---------------------------------------------------------
   * 5. 数字のカウントアップ(0 から増えて止まる)
   * ------------------------------------------------------- */
  (function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length || reduceMotion || !hasIO) return;
    var fmt = new Intl.NumberFormat('ja-JP');
    counters.forEach(function (el) { el.textContent = '0'; });
    observeOnce(counters, { threshold: 0.6 }, function (el) {
      var to = Number(el.dataset.count) || 0;
      var dur = 1600, t0 = performance.now();
      (function step(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - t, 4);
        el.textContent = fmt.format(Math.round(to * eased));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    });
  })();

  /* ---------------------------------------------------------
   * 6. スマホの追従ボタン
   *    ファーストビューを過ぎたら表示し、フォームが見えている間は隠す。
   * ------------------------------------------------------- */
  (function initSticky() {
    var bar = $('[data-sticky-cta]');
    if (!bar || !hasIO) return;
    var hero = $('.hero, .page-hero');
    var form = $('#contact, #form');
    var pastHero = false, formVisible = false;
    function sync() { bar.classList.toggle('is-shown', pastHero && !formVisible); }
    if (hero) new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; sync(); }).observe(hero);
    if (form) new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; sync(); }).observe(form);
  })();

  /* ---------------------------------------------------------
   * 7. フォーム
   * ------------------------------------------------------- */
  var MAX_FILES = 2;
  var MAX_TOTAL = 5 * 1024 * 1024;
  var FILE_EXT = /\.(pdf|doc|docx)$/i;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function labelOf(input) {
    var label = input.id && document.querySelector('label[for="' + input.id + '"]');
    if (!label) return '';
    var text = '';
    label.childNodes.forEach(function (n) { if (n.nodeType === 3) text += n.textContent; });
    return text.trim();
  }

  function formatSize(bytes) {
    return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + 'MB' : Math.max(1, Math.round(bytes / 1024)) + 'KB';
  }

  function validate(input) {
    var v = (input.value || '').trim();
    var label = labelOf(input);
    if (input.type === 'checkbox') return input.required && !input.checked ? 'プライバシーポリシーへの同意が必要です' : '';
    if (input.type === 'file') {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) return '';
      if (files.length > MAX_FILES) return 'ファイルは' + MAX_FILES + 'つまで添付できます';
      if (files.some(function (f) { return !FILE_EXT.test(f.name); })) return 'PDF・Word(.pdf / .doc / .docx)のファイルを選んでください';
      var total = files.reduce(function (s, f) { return s + f.size; }, 0);
      if (total > MAX_TOTAL) return '合計5MBまでです(現在 ' + formatSize(total) + ')';
      return '';
    }
    if (input.required && !v) return input.tagName === 'SELECT' ? label + 'を選択してください' : label + 'を入力してください';
    if (v && input.type === 'email' && !EMAIL_RE.test(v)) return 'メールアドレスの形が正しくありません(例:name@example.com)';
    if (v && input.type === 'tel') {
      var digits = v.replace(/[‐－―ー\-\s()()]/g, '').replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xFEE0); });
      if (!/^\d{10,11}$/.test(digits)) return '電話番号は10〜11桁の数字で入力してください(ハイフンはあってもなくても大丈夫です)';
    }
    return '';
  }

  function showError(input, message) {
    var field = input.closest('[data-field]');
    if (!field) return;
    var box = field.querySelector('[data-error]');
    field.classList.toggle('is-invalid', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) box.textContent = message;
  }

  $$('form[data-form]').forEach(function (form) {
    var type = form.dataset.form; // company | seeker
    var summary = $('[data-summary]', form);
    var inputs = $$('input:not([type=hidden]):not([name=website]), select, textarea', form);
    var started = false;

    function onFirstInput() {
      if (started) return;
      started = true;
      track('form_start', { form_type: type });
    }
    form.addEventListener('input', onFirstInput);
    form.addEventListener('change', onFirstInput);

    inputs.forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.type === 'checkbox' || input.type === 'file') return;
        if (input.value.trim() || input.dataset.touched) showError(input, validate(input));
        input.dataset.touched = '1';
      });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') showError(input, validate(input));
      });
      input.addEventListener('change', function () {
        if (input.type === 'checkbox' || input.tagName === 'SELECT' || input.type === 'file') showError(input, validate(input));
      });
    });

    // 添付ファイルの一覧
    var fileInput = $('input[type=file]', form);
    var fileList = $('[data-file-list]', form);
    if (fileInput && fileList) {
      fileInput.addEventListener('change', function () {
        fileList.innerHTML = '';
        Array.prototype.forEach.call(fileInput.files, function (f) {
          var li = document.createElement('li');
          var name = document.createElement('span'); name.textContent = f.name;
          var size = document.createElement('span'); size.textContent = formatSize(f.size);
          li.append(name, size);
          fileList.appendChild(li);
        });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = inputs.map(function (input) {
        var msg = validate(input);
        showError(input, msg);
        return msg ? input : null;
      }).filter(Boolean);

      if (errors.length) {
        summary.textContent = '入力内容をご確認ください(' + errors.length + '件)。';
        summary.classList.add('is-shown');
        errors[0].focus();
        return;
      }
      summary.classList.remove('is-shown');
      summary.textContent = '';

      var dest = new URL(form.getAttribute('action'), location.href);
      dest.searchParams.set('type', type);

      // 迷惑な送信の対策(見えない入力欄)— ボットには成功したように見せて何もしない
      var hp = form.querySelector('[name=website]');
      if (hp && hp.value) { location.href = dest.href; return; }

      // 送信回数の制限(本番ではサーバー側でも制限する)
      try {
        var last = Number(sessionStorage.getItem('kh_last_submit')) || 0;
        if (Date.now() - last < 30000) {
          summary.textContent = '続けて送信されています。少し時間をおいてから、もう一度お試しください。';
          summary.classList.add('is-shown');
          summary.focus();
          return;
        }
        sessionStorage.setItem('kh_last_submit', String(Date.now()));
      } catch (err) { /* ストレージが使えない環境では制限しない */ }

      var jobType = form.querySelector('[name=position], [name=jobtype]');
      track('generate_lead', {
        form_type: type,
        job_type: jobType ? jobType.value || '未選択' : '',
        has_attachment: !!(fileInput && fileInput.files && fileInput.files.length)
      });

      var btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      btn.firstChild.textContent = '送信しています…';
      // 制作サンプルのため送信はせず、送信完了ページへ移動する
      setTimeout(function () { location.href = dest.href; }, 700);
    });
  });

  /* ---------------------------------------------------------
   * 8. 求人カード
   * ------------------------------------------------------- */
  (function initJobs() {
    var wrap = $('[data-jobs]');
    if (!wrap) return;
    var cards = $$('[data-job]', wrap);
    var interest = document.getElementById('s-interest');

    cards.forEach(function (card, i) {
      card.style.setProperty('--i', i);
      var id = card.dataset.job;
      var title = card.dataset.jobTitle;
      var toggle = $('[data-job-toggle]', card);
      var label = $('[data-job-toggle-label]', card);

      toggle.addEventListener('click', function () {
        var open = !card.classList.contains('is-open');
        card.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        label.textContent = open ? '閉じる' : '詳しく見る';
        if (open) track('job_click', { job_id: id });
      });

      $('[data-job-consult]', card).addEventListener('click', function (e) {
        if (!interest) return;
        e.preventDefault();
        pick(id, title);
        track('job_consult', { job_id: id });
        var form = $('#form');
        form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(function () { interest.focus({ preventScroll: true }); }, reduceMotion ? 0 : 700);
      });
    });

    function pick(id, title) {
      interest.value = id + ' ' + title;
      cards.forEach(function (c) { c.classList.toggle('is-picked', c.dataset.job === id); });
      var field = interest.closest('[data-field]');
      field.classList.remove('is-filled-by-job');
      void field.offsetWidth;
      field.classList.add('is-filled-by-job');
    }

    // URLの ?job=J-002 で、気になる求人を入れた状態にする
    var q = new URLSearchParams(location.search).get('job');
    if (q && interest) {
      var hit = cards.filter(function (c) { return c.dataset.job === q; })[0];
      if (hit) pick(hit.dataset.job, hit.dataset.jobTitle);
    }

    // 「あなた」の点から各カードへ伸びる線
    var svg = $('.jobs__lines', wrap);
    var you = $('.jobs__you-dot', wrap);
    var grad = svg && svg.querySelector('linearGradient');
    if (!svg || !you) return;
    var paths = cards.map(function (_, i) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.style.setProperty('--i', i);
      svg.appendChild(p);
      return p;
    });

    function draw() {
      var wr = wrap.getBoundingClientRect();
      var yr = you.getBoundingClientRect();
      var sx = yr.left + yr.width / 2 - wr.left;
      var sy = yr.top + yr.height / 2 - wr.top;
      svg.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height);
      if (grad) { grad.setAttribute('y1', sy); grad.setAttribute('y2', wr.height); }
      cards.forEach(function (card, i) {
        var r = card.getBoundingClientRect();
        var ex = r.left + r.width / 2 - wr.left;
        var ey = r.top - wr.top + 1;
        var d = 'M' + sx + ' ' + sy + ' C ' + sx + ' ' + (sy + (ey - sy) * 0.55) + ', ' + ex + ' ' + (sy + (ey - sy) * 0.35) + ', ' + ex + ' ' + ey;
        paths[i].setAttribute('d', d);
        paths[i].style.setProperty('--len', Math.ceil(paths[i].getTotalLength()) + 1);
      });
    }
    draw();
    window.addEventListener('load', draw);
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(wrap);
    else window.addEventListener('resize', draw);
  })();

  /* ---------------------------------------------------------
   * 9. 送信完了ページ:種類に合わせて案内を出し分け
   * ------------------------------------------------------- */
  (function initThanks() {
    var blocks = $$('[data-thanks]');
    if (!blocks.length) return;
    var type = new URLSearchParams(location.search).get('type');
    if (type !== 'company' && type !== 'seeker') return;
    blocks.forEach(function (b) { b.hidden = b.dataset.thanks !== type; });
  })();
})();
