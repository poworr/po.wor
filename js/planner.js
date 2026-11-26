// planner.js: a plain-text bullet journal.
//
// Each day is one page of text, saved in this browser (localStorage) as
// "planner:2026-11-27". Nothing is sent anywhere.
//
// Events are lines that start with ○. With a time ("○ 14:00 dentist") they go
// in that hour on the week; without one ("○ birthday") they go in the all-day row.
// The week and month views only show and change these lines in the day pages,
// so everything lives in one place.
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

let view = 'day';                  // day, week or month
let day = new Date();              // the day you are looking at
day.setHours(0, 0, 0, 0);

// ===== Dates =====

// 2026-11-27 (used as the save name)
function keyOf(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function dateOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function isToday(date) {
  return keyOf(date) === keyOf(new Date());
}
// The Monday of the week that date is in
function mondayOf(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}
function format(date, options) {
  return date.toLocaleDateString('en-GB', options).toLowerCase();
}
const pad = (n) => String(n).padStart(2, '0');

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

// ===== Events (the ○ lines) =====

// All ○ lines of a day: { line, hour, minute, text }. hour is null for all-day events.
function eventsOf(date) {
  return load(date).split('\n').map((line) => {
    const m = line.match(/^○\s*(?:(\d{1,2})[:.](\d{2})\s*)?(.*)$/);
    if (!m) return null;
    return { line, hour: m[1] ? Number(m[1]) : null, minute: m[2] || '00', text: m[3] };
  }).filter(Boolean);
}

// Add one line to the end of a day's page
function addLine(date, line) {
  const text = load(date);
  save(date, text.trim() ? text.replace(/\n*$/, '\n') + line : line);
}

// Remove one line from a day's page
function removeLine(date, line) {
  const lines = load(date).split('\n');
  lines.splice(lines.indexOf(line), 1);
  save(date, lines.join('\n'));
}

// "○ 14:00 dentist", or "○ dentist" when hour is null
function eventLine(hour, minute, text) {
  return '○ ' + (hour === null ? '' : pad(hour) + ':' + minute + ' ') + text;
}

// ===== Draw the view =====

function render() {
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', button.dataset.view === view);
  }
  $('day-view').hidden = view !== 'day';
  $('week-view').hidden = view !== 'week';
  $('month-view').hidden = view !== 'month';

  if (view === 'day') renderDay();
  if (view === 'week') renderWeek();
  if (view === 'month') renderMonth();
}

function openDay(date) {
  day = date;
  view = 'day';
  render();
}

// Day: the date on top, then blank space to write
function renderDay() {
  $('title').textContent = format(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('page').value = load(day);
}

// Week: 7 columns, an all-day row, then one row per hour
function renderWeek() {
  const monday = mondayOf(day);
  const days = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(monday, n));
  $('title').textContent = format(monday, { day: 'numeric', month: 'short' }) + ' – ' +
    format(days[6], { day: 'numeric', month: 'short', year: 'numeric' });

  const week = $('week');
  week.innerHTML = '';
  const cell = (className, text) => {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = text || '';
    week.appendChild(div);
    return div;
  };

  // Top row: the 7 days. Click one to open it.
  cell('week-head', '');
  for (const date of days) {
    const button = document.createElement('button');
    button.innerHTML = '<span></span> <span class="num"></span>';
    button.children[0].textContent = format(date, { weekday: 'short' });
    button.children[1].textContent = date.getDate();
    button.children[1].classList.toggle('circle', isToday(date));
    button.addEventListener('click', () => openDay(date));
    cell('week-head', '').appendChild(button);
  }

  // The all-day row, then 24 hour rows
  const events = days.map(eventsOf);
  for (const hour of [null, ...Array(24).keys()]) {
    const allDay = hour === null ? ' week-allday' : '';   // the all-day row stays on top, under the day names
    cell('week-time' + allDay, hour === null ? 'all-day' : pad(hour) + ':00');
    days.forEach((date, d) => {
      const slot = cell('week-slot' + allDay, '');
      for (const event of events[d].filter((e) => e.hour === hour)) {
        slot.appendChild(eventChip(date, event, event.hour === null ? event.text : pad(event.hour) + ':' + event.minute + ' ' + event.text));
      }
      // Click empty space to add an event at this hour
      slot.addEventListener('click', (e) => {
        if (e.target !== slot) return;
        typeHere(slot, (text) => addLine(date, eventLine(hour, '00', text)));
      });
      // Drop an event here to move it to this day and hour (it keeps its minutes)
      dropZone(slot, (from, event) => {
        removeLine(from, event.line);
        addLine(date, eventLine(hour, event.minute, event.text));
      });
    });
  }

  // The all-day row sticks just under the day names
  const headHeight = week.querySelector('.week-head').offsetHeight;
  for (const div of week.querySelectorAll('.week-allday')) div.style.top = headHeight + 'px';

  // Start the view at 08:00, like a calendar app
  const eight = week.querySelectorAll('.week-time')[9];
  const allDayHeight = week.querySelector('.week-allday').offsetHeight;
  $('week-scroll').scrollTop = eight.offsetTop - headHeight - allDayHeight;
}

// Month: plain calendar, Monday first. Today has a circle. Events show in their day.
function renderMonth() {
  const first = new Date(day.getFullYear(), day.getMonth(), 1);
  $('title').textContent = format(first, { month: 'long', year: 'numeric' });

  const month = $('month');
  month.innerHTML = '';
  for (const name of ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']) {
    const head = document.createElement('div');
    head.className = 'month-head muted';
    head.textContent = name;
    month.appendChild(head);
  }
  // Empty spaces before the 1st
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) month.appendChild(document.createElement('div'));

  for (let date = first; date.getMonth() === first.getMonth(); date = addDays(date, 1)) {
    const box = document.createElement('div');
    box.className = 'month-day';

    // The date number opens the day
    const button = document.createElement('button');
    button.className = 'num';
    button.textContent = date.getDate();
    button.classList.toggle('circle', isToday(date));
    const picked = date;
    button.addEventListener('click', () => openDay(picked));
    box.appendChild(button);

    for (const event of eventsOf(date)) {
      box.appendChild(eventChip(date, event, (event.hour === null ? '' : pad(event.hour) + ':' + event.minute + ' ') + event.text));
    }

    // Click empty space to add an event that day
    box.addEventListener('click', (e) => {
      if (e.target !== box) return;
      typeHere(box, (text) => addLine(picked, eventLine(null, '00', text)));
    });
    // Drop an event here to move it to this day (same time)
    dropZone(box, (from, event) => {
      removeLine(from, event.line);
      addLine(picked, event.line);
    });
    month.appendChild(box);
  }
}

// ===== Adding and dragging on the week and month =====

// One event on the grid. Drag it to move it; click it to open its day.
function eventChip(date, event, label) {
  const chip = document.createElement('div');
  chip.className = 'event';
  chip.textContent = label;
  chip.draggable = true;
  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: keyOf(date), event }));
  });
  chip.addEventListener('click', () => openDay(date));
  return chip;
}

// Let events be dropped on a slot or day
function dropZone(element, onDrop) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    element.classList.add('over');
  });
  element.addEventListener('dragleave', () => element.classList.remove('over'));
  element.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    onDrop(dateOf(data.from), data.event);
    render();
  });
}

// A small box to type in. Enter saves, Esc (or clicking away) cancels.
function typeHere(element, onSave) {
  const input = document.createElement('input');
  input.className = 'type-here';
  input.placeholder = 'new event';
  element.appendChild(input);
  input.focus();
  let done = false;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      done = true;
      onSave(input.value.trim());
      render();
    }
    if (e.key === 'Escape') {
      done = true;
      render();
    }
  });
  input.addEventListener('blur', () => { if (!done) input.remove(); });
}

// ===== Buttons =====

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => { view = button.dataset.view; render(); });
}
$('today').addEventListener('click', () => { day = new Date(); day.setHours(0, 0, 0, 0); render(); });
$('prev').addEventListener('click', () => move(-1));
$('next').addEventListener('click', () => move(1));

// < and > go back or forward one day, week or month
function move(step) {
  if (view === 'day') day = addDays(day, step);
  if (view === 'week') day = addDays(day, step * 7);
  if (view === 'month') day = new Date(day.getFullYear(), day.getMonth() + step, 1);
  render();
}

// ===== Writing =====

const page = $('page');

// Put a bullet at the start of the line the cursor is on (replacing any bullet already there)
function setBullet(symbol) {
  const caret = page.selectionStart;
  const start = page.value.lastIndexOf('\n', caret - 1) + 1;
  const hasBullet = BULLETS.some((b) => page.value.startsWith(b.symbol + ' ', start));
  const end = hasBullet ? start + 2 : start;
  page.value = page.value.slice(0, start) + symbol + ' ' + page.value.slice(end);
  page.selectionStart = page.selectionEnd = caret + (hasBullet ? 0 : 2);
  save(day, page.value);
}

page.addEventListener('input', () => {
  // A line starting with ". " "x " "o " "- " or "= " turns into that bullet
  const caret = page.selectionStart;
  const start = page.value.lastIndexOf('\n', caret - 1) + 1;
  const bullet = BULLETS.find((b) => page.value.startsWith(b.type + ' ', start));
  if (bullet) {
    page.value = page.value.slice(0, start) + bullet.symbol + page.value.slice(start + 1);
    page.selectionStart = page.selectionEnd = caret;   // the bullet is one character, like the letter it replaced
  }
  save(day, page.value);
});

page.addEventListener('keydown', (event) => {
  // Ctrl+1 to 5 puts that bullet on the line
  const bullet = BULLETS.find((b) => b.ctrl === event.key);
  if (event.ctrlKey && !event.metaKey && bullet) {
    event.preventDefault();
    setBullet(bullet.symbol);
  }
});

// ===== Hold ⌘ to see the bullets =====

$('legend').textContent = BULLETS.map((b) =>
  b.symbol + '  ' + b.name.padEnd(6) + '  ctrl+' + b.ctrl + '   or type ' + b.type + ' and space').join('\n') +
  '\n\n○ 14:00 text  shows on the week at 14:00';

document.addEventListener('keydown', (event) => { if (event.key === 'Meta') $('legend').hidden = false; });
document.addEventListener('keyup', (event) => { if (event.key === 'Meta') $('legend').hidden = true; });
window.addEventListener('blur', () => { $('legend').hidden = true; });

// ===== Phone: a bullet bar just above the keyboard =====

const bar = $('bullet-bar');
for (const b of BULLETS) {
  const button = document.createElement('button');
  button.textContent = b.symbol;
  button.setAttribute('aria-label', b.name);
  // pointerdown + preventDefault keeps the keyboard open
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); setBullet(b.symbol); });
  bar.appendChild(button);
}

// Keep the bar on top of the keyboard (the keyboard shrinks the "visual viewport")
function placeBar() {
  const screen = window.visualViewport;
  bar.style.top = (screen.offsetTop + screen.height - bar.offsetHeight) + 'px';
}
if (matchMedia('(hover: none)').matches && window.visualViewport) {
  page.addEventListener('focus', () => { bar.hidden = false; placeBar(); });
  page.addEventListener('blur', () => { bar.hidden = true; });
  visualViewport.addEventListener('resize', placeBar);
  visualViewport.addEventListener('scroll', placeBar);
}

render();
