'use strict';

// ─── Хеширование PIN ─────────────────────────────────────────
async function hashPin(pin) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Авторизация ─────────────────────────────────────────────
let unlocked = false;

async function checkGate() {
  const data = await chrome.storage.local.get('passwordHash');

  if (!data.passwordHash) {
    // PIN ещё не установлен → показываем форму установки
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('setup-form').style.display = 'flex';
  }
  // Иначе — форма логина уже показана (по умолчанию)
}

document.getElementById('btn-setup').addEventListener('click', async () => {
  const pin = document.getElementById('pin-new').value;
  const confirm = document.getElementById('pin-confirm').value;
  const errEl = document.getElementById('setup-error');

  errEl.textContent = '';

  if (pin.length < 6) {
    errEl.textContent = 'PIN должен быть не менее 6 символов';
    return;
  }
  if (pin !== confirm) {
    errEl.textContent = 'PIN-коды не совпадают';
    return;
  }

  const hash = await hashPin(pin);
  await chrome.storage.local.set({ passwordHash: hash });
  showSettings();
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const pin = document.getElementById('pin-login').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  if (!pin) { errEl.textContent = 'Введите PIN'; return; }

  const data = await chrome.storage.local.get('passwordHash');
  const hash = await hashPin(pin);

  if (hash !== data.passwordHash) {
    errEl.textContent = 'Неверный PIN';
    document.getElementById('pin-login').value = '';
    return;
  }
  showSettings();
});

// Enter в полях PIN
document.getElementById('pin-login').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});
document.getElementById('pin-confirm').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-setup').click();
});

function showSettings() {
  unlocked = true;
  document.getElementById('gate').style.display = 'none';
  document.getElementById('settings').style.display = 'block';
  loadSettings();
}

document.getElementById('btn-lock').addEventListener('click', () => {
  unlocked = false;
  document.getElementById('settings').style.display = 'none';
  document.getElementById('gate').style.display = 'flex';
  document.getElementById('pin-login').value = '';
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('setup-form').style.display = 'none';
});

// ─── Загрузка настроек ────────────────────────────────────────
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'blockAdult', 'blockGambling', 'blockIncognito',
    'waterIntervalMin', 'breakIntervalMin',
    'savingsGoal', 'savingsTotal'
  ]);

  document.getElementById('block-adult').checked    = data.blockAdult !== false;
  document.getElementById('block-gambling').checked = data.blockGambling !== false;
  document.getElementById('block-incognito').checked = data.blockIncognito !== false;
  document.getElementById('water-interval').value   = data.waterIntervalMin || 20;
  document.getElementById('break-interval').value   = data.breakIntervalMin || 50;
  document.getElementById('savings-goal').value     = data.savingsGoal || 0;
  document.getElementById('savings-total').value    = data.savingsTotal || 0;
}

// ─── Переключатели блокировок ────────────────────────────────
['block-adult', 'block-gambling', 'block-incognito'].forEach(id => {
  document.getElementById(id).addEventListener('change', async (e) => {
    const keyMap = {
      'block-adult':     'blockAdult',
      'block-gambling':  'blockGambling',
      'block-incognito': 'blockIncognito'
    };
    await chrome.storage.local.set({ [keyMap[id]]: e.target.checked });
    flashSaved();
  });
});

// ─── Интервалы напоминаний ────────────────────────────────────
document.getElementById('btn-save-alarms').addEventListener('click', async () => {
  const water = parseInt(document.getElementById('water-interval').value) || 20;
  const brk   = parseInt(document.getElementById('break-interval').value) || 50;

  await chrome.storage.local.set({
    waterIntervalMin: water,
    breakIntervalMin: brk
  });
  chrome.runtime.sendMessage({ type: 'updateAlarms', water, break: brk });
  flashSaved();
});

// ─── Накопления ──────────────────────────────────────────────
document.getElementById('btn-save-savings').addEventListener('click', async () => {
  const goal  = parseFloat(document.getElementById('savings-goal').value)  || 0;
  const total = parseFloat(document.getElementById('savings-total').value) || 0;

  await chrome.storage.local.set({ savingsGoal: goal, savingsTotal: total });
  flashSaved();
});

// ─── Смена PIN ────────────────────────────────────────────────
document.getElementById('btn-change-pin').addEventListener('click', async () => {
  const oldPin  = document.getElementById('pin-old').value;
  const newPin  = document.getElementById('pin-new2').value;
  const confPin = document.getElementById('pin-conf2').value;
  const errEl   = document.getElementById('pin-change-error');

  errEl.textContent = '';

  const data = await chrome.storage.local.get('passwordHash');
  const oldHash = await hashPin(oldPin);

  if (oldHash !== data.passwordHash) {
    errEl.textContent = 'Текущий PIN неверный';
    return;
  }
  if (newPin.length < 6) {
    errEl.textContent = 'Новый PIN должен быть не менее 6 символов';
    return;
  }
  if (newPin !== confPin) {
    errEl.textContent = 'Новые PIN-коды не совпадают';
    return;
  }

  const newHash = await hashPin(newPin);
  await chrome.storage.local.set({ passwordHash: newHash });
  document.getElementById('pin-old').value  = '';
  document.getElementById('pin-new2').value = '';
  document.getElementById('pin-conf2').value = '';
  flashSaved();
});

// ─── Сброс статистики ─────────────────────────────────────────
document.getElementById('btn-reset-stats').addEventListener('click', async () => {
  const ok = confirm(
    'Вы уверены? Это сбросит:\n• Все привычки и стрики\n• Счётчик воды\n• Историю накоплений\n\nНастройки блокировки останутся.'
  );
  if (!ok) return;

  const fresh = {
    reading:    { done: false, minutes: 0 },
    meditation: { done: false, minutes: 0 },
    pushups:    { done: false, count: 0 },
    abs:        { done: false, sets: 0 }
  };
  await chrome.storage.local.set({
    dailyHabits: fresh,
    waterToday: 0,
    savingsTotal: 0,
    blockedToday: 0,
    streaks: {
      reading:    { count: 0, lastDate: null },
      meditation: { count: 0, lastDate: null },
      pushups:    { count: 0, lastDate: null },
      abs:        { count: 0, lastDate: null }
    }
  });
  flashSaved('✅ Статистика сброшена!');
});

// ─── Уведомление о сохранении ────────────────────────────────
function flashSaved(msg = '✅ Сохранено!') {
  const el = document.getElementById('save-success');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

// ─── Запуск ───────────────────────────────────────────────────
checkGate();
