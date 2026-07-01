// МойЩит — Content Script
// Запускается на document_start для всех страниц

(function () {
  'use strict';

  // Не запускаем в служебных страницах
  const href = location.href;
  if (href.startsWith('chrome-extension://') || href.startsWith('chrome://') || href.startsWith('about:')) return;

  // Проверяем инкогнито через chrome.extension (работает в content script)
  // Основная блокировка инкогнито — в background.js через tabs.onCreated
  // Здесь — дополнительная страховка

  const ADULT_PATTERNS = [
    /\/xxx\//i, /porn/i, /\bsex\b/i, /nude\b/i, /naked/i,
    /nsfw/i, /\/adult\//i, /18\+/i, /erotic/i, /hentai/i,
    /xnxx/i, /xvideos/i, /xhamster/i, /redtube/i, /youporn/i,
    /spankbang/i, /eporner/i, /beeg\.com/i, /ixxx/i, /slutload/i,
    /drtuber/i, /porntrex/i, /hclips/i, /tnaflix/i, /tube8/i
  ];

  const GAMBLING_PATTERNS = [
    /1xbet/i, /mostbet/i, /melbet/i, /1win\./i, /vulkan(?:casino|bet)/i,
    /fonbet/i, /leon\.bet/i, /olimp\.bet/i, /betcity/i, /winline/i,
    /\/casino\//i, /\/slots\//i, /\/poker\//i, /\/roulette\//i
  ];

  const urlToCheck = href + ' ' + document.title;

  function matchesList(patterns, str) {
    return patterns.some(p => p.test(str));
  }

  function showBlockOverlay(type) {
    // Предотвращаем рендеринг страницы
    if (document.documentElement) {
      document.documentElement.style.visibility = 'hidden';
    }

    const isAdult = type === 'adult';
    const emoji = isAdult ? '🔞' : '🎰';
    const reason = isAdult
      ? 'Контент для взрослых заблокирован'
      : 'Азартные игры заблокированы';
    const msg = isAdult
      ? 'Вы сами установили это ограничение. Держитесь — вы сильнее этого!'
      : 'Деньги лучше копить, чем проигрывать. Ваш будущий "я" скажет спасибо.';

    document.addEventListener('DOMContentLoaded', () => buildOverlay(emoji, reason, msg));
    if (document.readyState !== 'loading') buildOverlay(emoji, reason, msg);
  }

  function buildOverlay(emoji, reason, msg) {
    document.documentElement.style.visibility = 'visible';
    document.body.innerHTML = '';
    document.body.style.cssText = `
      margin:0; padding:0; background:#0f172a; color:#f8fafc;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      display:flex; align-items:center; justify-content:center;
      min-height:100vh;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      text-align:center; max-width:480px; padding:48px 32px;
    `;
    box.innerHTML = `
      <div style="font-size:80px;margin-bottom:24px;">${emoji}</div>
      <div style="font-size:14px;font-weight:600;letter-spacing:4px;color:#64748b;text-transform:uppercase;margin-bottom:16px;">МойЩит</div>
      <h1 style="font-size:28px;font-weight:700;margin:0 0 16px;color:#f8fafc;">${reason}</h1>
      <p style="font-size:16px;color:#94a3b8;line-height:1.6;margin:0 0 40px;">${msg}</p>
      <button onclick="history.back()" style="
        background:#3b82f6; color:#fff; border:none; padding:14px 32px;
        border-radius:12px; font-size:16px; font-weight:600; cursor:pointer;
        transition:background .2s;
      " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
        ← Вернуться назад
      </button>
      <p style="margin-top:32px;font-size:13px;color:#475569;">
        💡 Если нужно изменить настройки — откройте расширение МойЩит
      </p>
    `;
    document.body.appendChild(box);
    document.title = 'Заблокировано — МойЩит';
  }

  if (matchesList(ADULT_PATTERNS, urlToCheck)) {
    showBlockOverlay('adult');
  } else if (matchesList(GAMBLING_PATTERNS, urlToCheck)) {
    showBlockOverlay('gambling');
  }
})();
