'use strict';

const MONTHS = ['января','февраля','марта','апреля','мая','июня',
                'июля','августа','сентября','октября','ноября','декабря'];

async function send(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

async function init() {
  // Дата в шапке
  const now = new Date();
  document.getElementById('today-date').textContent =
    `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Загружаем данные
  const data = await send({ type: 'getStatus' });

  renderStreaks(data.streaks || {});
  renderWater(data.waterToday || 0);
  renderHabits(data.dailyHabits || {});
  renderSavings(data.savingsGoal || 0, data.savingsTotal || 0);
  renderProtection(data);
}

// ─── Стрики ─────────────────────────────────────────────────
function renderStreaks(streaks) {
  const keys = ['reading', 'meditation', 'pushups', 'abs'];
  for (const k of keys) {
    const el = document.querySelector(`#streak-${k} .streak-num`);
    if (el) el.textContent = (streaks[k] || {}).count || 0;
  }
}

// ─── Вода ────────────────────────────────────────────────────
function renderWater(count) {
  const container = document.getElementById('water-glasses');
  container.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const g = document.createElement('div');
    g.className = 'glass' + (i < count ? ' filled' : '');
    g.title = i < count ? 'Выпито' : 'Нажмите, чтобы отметить';
    g.addEventListener('click', onWaterClick);
    container.appendChild(g);
  }
  document.getElementById('water-count').textContent = Math.min(count, 8);
}

async function onWaterClick() {
  const resp = await send({ type: 'addWater' });
  renderWater(resp.count || 0);
}

document.getElementById('water-add').addEventListener('click', onWaterClick);

// ─── Привычки ────────────────────────────────────────────────
function renderHabits(dailyHabits) {
  const habits = ['reading', 'meditation', 'pushups', 'abs'];
  const fieldMap = { reading: 'minutes', meditation: 'minutes', pushups: 'count', abs: 'sets' };

  for (const h of habits) {
    const hData = dailyHabits[h] || {};
    const row = document.getElementById(`h-${h}`);
    const check = row.querySelector(`.habit-check[data-habit="${h}"]`);
    const num = row.querySelector(`.habit-num[data-habit="${h}"]`);
    const field = fieldMap[h];

    check.checked = !!hData.done;
    num.value = hData[field] || '';
    if (hData.done) row.classList.add('done');
    else row.classList.remove('done');
  }

  // Слушатели
  document.querySelectorAll('.habit-check').forEach(cb => {
    cb.addEventListener('change', onHabitChange);
  });
  document.querySelectorAll('.habit-num').forEach(inp => {
    inp.addEventListener('change', onHabitNumChange);
  });
}

async function onHabitChange(e) {
  const h = e.target.dataset.habit;
  const row = document.getElementById(`h-${h}`);
  const numInp = row.querySelector('.habit-num');
  const fieldMap = { reading: 'minutes', meditation: 'minutes', pushups: 'count', abs: 'sets' };
  const field = fieldMap[h];

  const value = { done: e.target.checked, [field]: parseInt(numInp.value) || 0 };
  await send({ type: 'saveHabit', habit: h, value });
  row.classList.toggle('done', e.target.checked);

  // Обновим стрики после сохранения
  const data = await send({ type: 'getStatus' });
  renderStreaks(data.streaks || {});
}

async function onHabitNumChange(e) {
  const h = e.target.dataset.habit;
  const row = document.getElementById(`h-${h}`);
  const check = row.querySelector('.habit-check');
  const fieldMap = { reading: 'minutes', meditation: 'minutes', pushups: 'count', abs: 'sets' };
  const field = fieldMap[h];

  const val = parseInt(e.target.value) || 0;
  if (val > 0 && !check.checked) {
    check.checked = true;
    row.classList.add('done');
  }
  const value = { done: check.checked, [field]: val };
  await send({ type: 'saveHabit', habit: h, value });
}

// ─── Накопления ──────────────────────────────────────────────
function renderSavings(goal, total) {
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  document.getElementById('savings-fill').style.width = pct + '%';
  document.getElementById('savings-current').textContent = formatMoney(total);
  document.getElementById('savings-goal').textContent = 'из ' + formatMoney(goal);
}

function formatMoney(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

document.getElementById('savings-add').addEventListener('click', async () => {
  const inp = document.getElementById('savings-amount');
  const amount = parseFloat(inp.value);
  if (!amount || amount <= 0) return;
  const resp = await send({ type: 'addSavings', amount });
  const data = await send({ type: 'getStatus' });
  renderSavings(data.savingsGoal || 0, resp.total || 0);
  inp.value = '';
});

// ─── Защита ──────────────────────────────────────────────────
function renderProtection(data) {
  const pills = {
    'pill-adult':    data.blockAdult !== false,
    'pill-gambling': data.blockGambling !== false,
    'pill-incognito': data.blockIncognito !== false
  };
  for (const [id, active] of Object.entries(pills)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.className = 'pill ' + (active ? 'pill-green' : 'pill-red');
  }
}

init().catch(console.error);
