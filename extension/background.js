// ============================================================
// МойЩит — Service Worker (фоновый скрипт)
// ============================================================

const WATER_ALARM = 'waterReminder';
const BREAK_ALARM = 'breakReminder';
const HABIT_CHECK_ALARM = 'habitCheck';
const DEFAULT_WATER_INTERVAL = 20;   // минут
const DEFAULT_BREAK_INTERVAL = 50;   // минут

// ─── Инициализация ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initDefaultSettings();
  }
  await setupAlarms();
  await checkAndResetDaily();
});

// При запуске service worker — восстанавливаем alarm'ы
chrome.runtime.onStartup.addListener(async () => {
  await setupAlarms();
  await checkAndResetDaily();
});

async function initDefaultSettings() {
  const defaults = {
    passwordHash: null,           // SHA-256 хеш пароля (null = ещё не установлен)
    waterIntervalMin: DEFAULT_WATER_INTERVAL,
    breakIntervalMin: DEFAULT_BREAK_INTERVAL,
    savingsGoal: 0,
    savingsTotal: 0,
    blockIncognito: true,
    blockAdult: true,
    blockGambling: true,
    installDate: new Date().toISOString().split('T')[0],
    streaks: {
      reading: { count: 0, lastDate: null },
      meditation: { count: 0, lastDate: null },
      pushups: { count: 0, lastDate: null },
      abs: { count: 0, lastDate: null }
    }
  };
  await chrome.storage.local.set(defaults);
}

async function setupAlarms() {
  const settings = await chrome.storage.local.get(['waterIntervalMin', 'breakIntervalMin']);
  const waterMin = settings.waterIntervalMin || DEFAULT_WATER_INTERVAL;
  const breakMin = settings.breakIntervalMin || DEFAULT_BREAK_INTERVAL;

  const waterAlarm = await chrome.alarms.get(WATER_ALARM);
  if (!waterAlarm) {
    chrome.alarms.create(WATER_ALARM, { periodInMinutes: waterMin });
  }

  const breakAlarm = await chrome.alarms.get(BREAK_ALARM);
  if (!breakAlarm) {
    chrome.alarms.create(BREAK_ALARM, { periodInMinutes: breakMin });
  }

  const habitAlarm = await chrome.alarms.get(HABIT_CHECK_ALARM);
  if (!habitAlarm) {
    // Проверка привычек каждые 24 часа (для сброса)
    chrome.alarms.create(HABIT_CHECK_ALARM, { periodInMinutes: 60 });
  }
}

// ─── Обработка alarm'ов ──────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === WATER_ALARM) {
    showNotification(
      'water',
      '💧 Время выпить воды!',
      'Сделайте паузу и выпейте стакан воды. Ваш организм скажет спасибо!'
    );
  } else if (alarm.name === BREAK_ALARM) {
    showNotification(
      'break',
      '🧘 Время отдохнуть!',
      'Встаньте, потянитесь, дайте глазам отдохнуть 5 минут. Вы продуктивнее после перерыва!'
    );
  } else if (alarm.name === HABIT_CHECK_ALARM) {
    await checkAndResetDaily();
  }
});

function showNotification(id, title, message) {
  chrome.notifications.create(id + '_' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2,
    requireInteraction: false
  });
}

// ─── Блокировка инкогнито ────────────────────────────────────
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.incognito) return;

  const settings = await chrome.storage.local.get('blockIncognito');
  if (!settings.blockIncognito) return;

  // Закрываем вкладку инкогнито
  try {
    await chrome.tabs.remove(tab.id);
  } catch (_) {}

  // Если открылось новое окно инкогнито — закрываем его
  if (tab.windowId) {
    try {
      const win = await chrome.windows.get(tab.windowId);
      if (win && win.incognito) {
        chrome.windows.remove(tab.windowId);
      }
    } catch (_) {}
  }
});

chrome.windows.onCreated.addListener(async (win) => {
  if (!win.incognito) return;

  const settings = await chrome.storage.local.get('blockIncognito');
  if (!settings.blockIncognito) return;

  try {
    await chrome.windows.remove(win.id);
  } catch (_) {}
});

// ─── Сброс привычек в новый день ────────────────────────────
async function checkAndResetDaily() {
  const today = new Date().toISOString().split('T')[0];
  const data = await chrome.storage.local.get(['dailyHabits', 'lastDate', 'streaks']);

  if (data.lastDate === today) return; // Уже сегодня сбросили

  // Обновляем стрики перед сбросом
  if (data.dailyHabits && data.lastDate) {
    const streaks = data.streaks || {};
    const habits = ['reading', 'meditation', 'pushups', 'abs'];
    for (const h of habits) {
      const done = data.dailyHabits[h]?.done || false;
      const streak = streaks[h] || { count: 0, lastDate: null };
      if (done) {
        streak.count = (streak.lastDate === data.lastDate ? streak.count : 0) + 1;
        streak.lastDate = data.lastDate;
      } else {
        streak.count = 0;
      }
      streaks[h] = streak;
    }
    await chrome.storage.local.set({ streaks });
  }

  // Сбрасываем ежедневные данные
  const fresh = {
    reading:    { done: false, minutes: 0 },
    meditation: { done: false, minutes: 0 },
    pushups:    { done: false, count: 0 },
    abs:        { done: false, sets: 0 }
  };
  await chrome.storage.local.set({
    dailyHabits: fresh,
    lastDate: today,
    waterToday: 0
  });
}

// ─── Сообщения от popup/options ──────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse);
  return true; // async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'updateAlarms': {
      await chrome.alarms.clear(WATER_ALARM);
      await chrome.alarms.clear(BREAK_ALARM);
      chrome.alarms.create(WATER_ALARM, { periodInMinutes: msg.water || DEFAULT_WATER_INTERVAL });
      chrome.alarms.create(BREAK_ALARM, { periodInMinutes: msg.break || DEFAULT_BREAK_INTERVAL });
      return { ok: true };
    }
    case 'getStatus': {
      const data = await chrome.storage.local.get([
        'dailyHabits', 'waterToday', 'lastDate', 'streaks',
        'savingsGoal', 'savingsTotal', 'blockIncognito'
      ]);
      await checkAndResetDaily();
      return data;
    }
    case 'saveHabit': {
      const cur = await chrome.storage.local.get('dailyHabits');
      const habits = cur.dailyHabits || {};
      habits[msg.habit] = msg.value;
      await chrome.storage.local.set({ dailyHabits: habits });
      return { ok: true };
    }
    case 'addWater': {
      const cur = await chrome.storage.local.get('waterToday');
      const count = Math.min((cur.waterToday || 0) + 1, 12);
      await chrome.storage.local.set({ waterToday: count });
      return { count };
    }
    case 'addSavings': {
      const cur = await chrome.storage.local.get(['savingsTotal']);
      const total = (cur.savingsTotal || 0) + (msg.amount || 0);
      await chrome.storage.local.set({ savingsTotal: total });
      return { total };
    }
    default:
      return { error: 'unknown message type' };
  }
}
