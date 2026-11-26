// planner.js: a plain-text planner with a day view and a week view.
//
// Each day is one page of text, saved in this browser (localStorage) as
// "planner:2026-11-27". Nothing is sent anywhere. The week view shows the
// same pages, so what you write on a day in the week is also on that day.
//
// The bullets. To change one, change its symbol here.
const BULLETS = [
  { symbol: '•', name: 'task',  ctrl: '1', type: '.' },
  { symbol: '×', name: 'done',  ctrl: '2', type: 'x' },
  { symbol: '○', name: 'event', ctrl: '3', type: 'o' },
  { symbol: '–', name: 'note',  ctrl: '4', type: '-' },
  { symbol: '=', name: 'mood',  ctrl: '5', type: '=' }
];

const $ = (id) => document.getElementById(id);

let view = 'day';                  // day or week
let day = new Date();              // the day you are looking at
day.setHours(0, 0, 0, 0);

// ===== Dates =====

// 2026-11-27 (used as the save name)
function keyOf(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function format(date, options) {
  return date.toLocaleDateString('en-GB', options).toLowerCase();
}

// ===== Saving =====

function load(date) {
  try { return localStorage.getItem('planner:' + keyOf(date)) || ''; } catch (e) { return ''; }
}
function save(date, text) {
  try {
    if (text.trim()) localStorage.setItem('planner:' + keyOf(date), text);
    else localStorage.removeItem('planner:' + keyOf(date));
  } catch (e) {}
}

// ===== Draw the view =====

function render() {
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', button.dataset.view === view);
  }
  $('day-view').hidden = view !== 'day';
  $('week-view').hidden = view !== 'week';
  if (view === 'day') renderDay();
  if (view === 'week') renderWeek();
}

// Day: the date on top, then blank space to write
function renderDay() {
  $('title').textContent = format(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('page').value = load(day);
}

// Week: Monday to Sunday side by side, each date with its own column to write in
function renderWeek() {
  const monday = addDays(day, -((day.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  $('title').textContent = format(monday, { day: 'numeric', month: 'short' }) + ' – ' +
    format(sunday, { day: 'numeric', month: 'short', year: 'numeric' });

  $('week').innerHTML = '';
  for (let n = 0; n < 7; n++) {
    const date = addDays(monday, n);
    const heading = document.createElement('p');
    heading.className = 'week-date';
    heading.textContent = format(date, { weekday: 'short', day: 'numeric' });
    heading.classList.toggle('today', keyOf(date) === keyOf(new Date()));   // today is bold

    const box = document.createElement('textarea');
    box.spellcheck = false;
    box.rows = 2;
    box.setAttribute('aria-label', format(date, { weekday: 'long', day: 'numeric', month: 'long' }));
    box.value = load(date);
    writingBox(box, () => date);

    const column = document.createElement('div');   // one column per day
    column.className = 'week-day';
    column.append(heading, box);
    $('week').appendChild(column);
    grow(box);
  }
}

// Week boxes get taller as you write
function grow(box) {
  box.style.height = 'auto';
  box.style.height = box.scrollHeight + 'px';
}

// ===== Buttons =====

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => { view = button.dataset.view; render(); });
}
$('today').addEventListener('click', () => { day = new Date(); day.setHours(0, 0, 0, 0); render(); });
$('prev').addEventListener('click', () => { day = addDays(day, view === 'week' ? -7 : -1); render(); });
$('next').addEventListener('click', () => { day = addDays(day, view === 'week' ? 7 : 1); render(); });

// ===== Writing (the day page and every box in the week) =====

let lastBox = $('page');   // the box you're writing in, for the phone bullet bar

// Put a bullet at the start of the line the cursor is on (replacing any bullet already there)
function setBullet(box, symbol) {
  const caret = box.selectionStart;
  const start = box.value.lastIndexOf('\n', caret - 1) + 1;
  const hasBullet = BULLETS.some((b) => box.value.startsWith(b.symbol + ' ', start)) || box.value.startsWith('⊗ ', start);
  const end = hasBullet ? start + 2 : start;
  box.value = box.value.slice(0, start) + symbol + ' ' + box.value.slice(end);
  box.selectionStart = box.selectionEnd = caret + (hasBullet ? 0 : 2);
  box.dispatchEvent(new Event('input'));   // save it
}

// Bullets, shortcuts and saving for one box. dateOf() says which day it belongs to.
function writingBox(box, dateOf) {
  box.addEventListener('focus', () => { lastBox = box; });

  box.addEventListener('input', () => {
    // A line starting with ". " "x " "o " "- " or "= " turns into that bullet
    const caret = box.selectionStart;
    const start = box.value.lastIndexOf('\n', caret - 1) + 1;
    const bullet = BULLETS.find((b) => box.value.startsWith(b.type + ' ', start));
    if (bullet) {
      box.value = box.value.slice(0, start) + bullet.symbol + box.value.slice(start + 1);
      box.selectionStart = box.selectionEnd = caret;   // the bullet is one character, like the letter it replaced
    }
    save(dateOf(), box.value);
    if (box !== $('page')) grow(box);
  });

  box.addEventListener('keydown', (event) => {
    // Ctrl+1 to 5 puts that bullet on the line
    const bullet = BULLETS.find((b) => b.ctrl === event.key);
    if (event.ctrlKey && !event.metaKey && bullet) {
      event.preventDefault();
      setBullet(box, bullet.symbol);
    }
  });

  // Click a • and the task is done (×). Click a ○ once: done (⊗). Twice: cancelled (crossed out).
  // Clicking again goes back to the start.
  box.addEventListener('click', () => {
    const caret = box.selectionStart;
    if (caret !== box.selectionEnd) return;
    const start = box.value.lastIndexOf('\n', caret - 1) + 1;
    let end = box.value.indexOf('\n', start);
    if (end === -1) end = box.value.length;
    const symbol = box.value[start];
    if (caret - start > 1 || box.value[start + 1] !== ' ') return;

    let text = box.value.slice(start + 2, end);
    const cancelled = text.includes('\u0336');
    let next;
    if (symbol === '•') next = '×';
    else if (symbol === '×') next = '•';
    else if (symbol === '○' && cancelled) { next = '○'; text = text.replace(/\u0336/g, ''); }
    else if (symbol === '○') next = '⊗';
    else if (symbol === '⊗') { next = '○'; text = text.replace(/[^\u0336]/g, '$&\u0336'); }   // cross out every letter
    else return;

    box.value = box.value.slice(0, start) + next + ' ' + text + box.value.slice(end);
    box.selectionStart = box.selectionEnd = caret;
    box.dispatchEvent(new Event('input'));   // save it
  });

  phoneBar(box);
}

// ===== Hold ⌘ to see the bullets =====

$('legend').textContent = BULLETS.map((b) =>
  b.symbol + '  ' + b.name.padEnd(6) + '  ctrl+' + b.ctrl + '   or type ' + b.type + ' and space').join('\n') +
  '\n\nclick •  done\nclick ○  done, click again  cancelled';

document.addEventListener('keydown', (event) => { if (event.key === 'Meta') $('legend').hidden = false; });
document.addEventListener('keyup', (event) => { if (event.key === 'Meta') $('legend').hidden = true; });
window.addEventListener('blur', () => { $('legend').hidden = true; });

// ===== Phone: a bullet bar just above the keyboard =====

const bar = $('bullet-bar');
const phone = matchMedia('(hover: none)').matches && window.visualViewport;
for (const b of BULLETS) {
  const button = document.createElement('button');
  button.textContent = b.symbol;
  button.setAttribute('aria-label', b.name);
  // pointerdown + preventDefault keeps the keyboard open
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); setBullet(lastBox, b.symbol); });
  bar.appendChild(button);
}

// Keep the bar on top of the keyboard (the keyboard shrinks the "visual viewport")
function placeBar() {
  bar.style.top = (visualViewport.offsetTop + visualViewport.height - bar.offsetHeight) + 'px';
}
function phoneBar(box) {
  if (!phone) return;
  box.addEventListener('focus', () => { bar.hidden = false; placeBar(); });
  box.addEventListener('blur', () => { bar.hidden = true; });
}
if (phone) {
  visualViewport.addEventListener('resize', placeBar);
  visualViewport.addEventListener('scroll', placeBar);
}

writingBox($('page'), () => day);
render();
