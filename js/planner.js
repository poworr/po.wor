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
  shown = [];
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
  current = null;
  at = -1;
  makeDoc($('doc'), day, '• start writing…');
}

// Week: Monday to Sunday side by side, each date with its own column to write in
function renderWeek() {
  const monday = addDays(day, -((day.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);
  $('title').textContent = format(monday, { day: 'numeric', month: 'short' }) + ' – ' +
    format(sunday, { day: 'numeric', month: 'short', year: 'numeric' });

  current = null;
  at = -1;
  $('week').innerHTML = '';
  for (let n = 0; n < 7; n++) {
    const date = addDays(monday, n);
    const heading = document.createElement('p');
    heading.className = 'week-date';
    heading.textContent = format(date, { weekday: 'short', day: 'numeric' });
    heading.classList.toggle('today', keyOf(date) === keyOf(new Date()));   // today is bold

    const doc = document.createElement('div');   // the same rows as the day page
    doc.className = 'doc';

    const column = document.createElement('div');   // one column per day
    column.className = 'week-day';
    column.append(heading, doc);
    $('week').appendChild(column);
    makeDoc(doc, date, '');
  }
}

// Boxes get taller as you write
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
$('read').addEventListener('click', () => setReading(!reading));

// ===== View mode: read your notes without starting to type =====

let reading = false;
function setReading(on) {
  reading = on;
  $('read').setAttribute('aria-pressed', on);
  document.querySelector('.planner').classList.toggle('reading', on);
  if (on) page.blur();
}

// ===== Keys (when you're not typing) =====
//   v  view mode    d  day    w  week    t  today    ← →  back / forward
//   enter  start writing (today's page)    esc  stop writing
document.addEventListener('keydown', (event) => {
  if (event.target === page || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.matches('input, textarea, select')) return;
  if (event.key === 'Enter' && event.target.closest('button, a')) return;   // Enter on a button presses it
  const keys = {
    v: () => setReading(!reading),
    d: () => document.querySelector('[data-view="day"]').click(),
    w: () => document.querySelector('[data-view="week"]').click(),
    t: () => $('today').click(),
    ArrowLeft: () => $('prev').click(),
    ArrowRight: () => $('next').click(),
    Enter: () => startWriting()
  };
  if (!keys[event.key]) return;
  event.preventDefault();
  keys[event.key]();
});

// Enter: write at the end of today's page (or the first page on screen)
function startWriting() {
  if (reading) return;
  const doc = shown.find((d) => keyOf(d.date) === keyOf(new Date())) || shown[0];
  edit(doc, doc.lines.length - 1, doc.lines[doc.lines.length - 1].length);
}

// ===== Writing =====

let lastBox = null;   // the box you're writing in, for the phone bullet bar

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

// Bullets, shortcuts and saving for one box. store() saves it.
function writingBox(box, store) {
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
    store();
    grow(box);
  });

  box.addEventListener('keydown', (event) => {
    // Ctrl+1 to 5 puts that bullet on the line
    const bullet = BULLETS.find((b) => b.ctrl === event.key);
    if (event.ctrlKey && !event.metaKey && bullet) {
      event.preventDefault();
      setBullet(box, bullet.symbol);
    }
  });

  // Click a • or ○ to mark it done (see markDone)
  box.addEventListener('click', () => {
    const caret = box.selectionStart;
    if (caret !== box.selectionEnd) return;
    const start = box.value.lastIndexOf('\n', caret - 1) + 1;
    let end = box.value.indexOf('\n', start);
    if (end === -1) end = box.value.length;
    const changed = caret - start <= 1 && markDone(box.value.slice(start, end));
    if (!changed) return;
    box.value = box.value.slice(0, start) + changed + box.value.slice(end);
    box.selectionStart = box.selectionEnd = caret;
    box.dispatchEvent(new Event('input'));   // save it
  });

  phoneBar(box);
}

// Click a • and the task is done (×). Click a ○ once: done (⊗). Twice: cancelled (crossed out).
// Clicking again goes back to the start. Gives back the changed line, or null.
function markDone(line) {
  const symbol = line[0];
  let text = line.slice(2);
  if (line[1] !== ' ') return null;
  if (symbol === '•') return '× ' + text;
  if (symbol === '×') return '• ' + text;
  if (symbol === '○' && text.includes('\u0336')) return '○ ' + text.replace(/\u0336/g, '');
  if (symbol === '○') return '⊗ ' + text;
  if (symbol === '⊗') return '○ ' + text.replace(/[^\u0336]/g, '$&\u0336');   // cross out every letter
  return null;
}

// ===== Pages: one row per line (the day page and each day in the week) =====
// The line you're on is a text box and shows what you type.
// Every other line shows the result:
//   # to ######   or  <h1> to <h6>   heading
//   ---           or  <hr>           divider
//   > quote       or  <blockquote>   quote
//   <p> <div>                         plain line
//   **bold**  *italic*  ~~crossed~~  ==highlight==  `code`
//   * ** or *** at the end of a line   priority (highlighted, *** is the most)

// A page is { el, date, lines, placeholder }: lines is its text, one line each.
let current = null;   // the page you're typing on
let at = -1;          // the line you're typing on (-1: none)

const page = document.createElement('textarea');
page.id = 'page';
page.rows = 1;
page.spellcheck = false;
page.placeholder = '• start writing…';

// Show one day's text in el
let shown = [];   // the pages on screen right now
function makeDoc(el, date, placeholder) {
  const doc = { el, date, lines: load(date).split('\n'), placeholder };
  shown.push(doc);
  draw(doc);
}

function draw(doc) {
  doc.el.innerHTML = '';
  doc.lines.forEach((line, i) => {
    const typing = () => doc === current && i === at;
    const row = document.createElement('div');
    row.className = 'row';
    row.append(typing() ? page : show(line));
    row.addEventListener('click', (event) => {
      if (typing() || reading) return;
      if (String(getSelection())) return;   // you selected text (to copy it): don't start typing
      if (event.target.classList.contains('bullet')) {   // click a • or ○: done
        doc.lines[i] = markDone(doc.lines[i]);
        saveDoc(doc);
        draw(doc);
      } else {
        edit(doc, i, doc.lines[i].length);
      }
    });
    doc.el.appendChild(row);
  });
  if (doc !== current && doc.lines.join('') === '' && doc.placeholder) {
    doc.el.firstChild.firstChild.replaceWith(Object.assign(document.createElement('p'), { className: 'placeholder', textContent: doc.placeholder }));
  }

  // Click under the last line: keep writing at the end
  doc.el.onmousedown = (event) => { if (event.target === doc.el) event.preventDefault(); };
  doc.el.onclick = (event) => {
    const last = doc.lines.length - 1;
    if (event.target === doc.el && !String(getSelection()) && !reading) edit(doc, last, doc.lines[last].length);
  };
}

// Start typing on line i of a page, with the cursor at caret
function edit(doc, i, caret) {
  const before = current;
  current = doc;
  at = i;
  page.value = doc.lines[i];
  page.setAttribute('aria-label', format(doc.date, { weekday: 'long', day: 'numeric', month: 'long' }));
  draw(doc);
  if (before && before !== doc) draw(before);   // the page you left shows its results again
  grow(page);
  page.focus();
  page.setSelectionRange(caret, caret);
}

function saveDoc(doc) {
  save(doc.date, doc.lines.join('\n'));
}

// What one line looks like when you're not typing on it
function show(line) {
  let m;
  if ((m = line.match(/^(#{1,6}) (.*)/))) return element('h' + m[1].length, m[2]);
  if (/^(---|<hr\s*\/?>)\s*$/i.test(line)) return document.createElement('hr');
  if ((m = line.match(/^<(h[1-6]|p|div|blockquote)>(.*?)(<\/\1>)?$/i))) return element(m[1].toLowerCase().replace(/^p$/, 'div'), m[2]);
  if ((m = line.match(/^> ?(.*)/))) return element('blockquote', m[1]);

  // * ** or *** at the end: priority. The stars go, the line gets highlighted.
  const stars = line.match(/\s(\*{1,3})$/);
  if (stars) line = line.slice(0, -stars[0].length);

  // a div, not a p: copied text gets no blank line between lines
  const p = element('div', line || ' ');   // an empty line keeps its height
  if (stars) p.className = 'priority-' + stars[1].length;
  if (/^[•×○⊗] /.test(line)) {           // a bullet you can click
    p.firstChild.textContent = p.firstChild.textContent.slice(1);
    p.prepend(Object.assign(document.createElement('span'), { className: 'bullet', textContent: line[0] }));
  }
  return p;
}

// An element with **bold**, *italic*, ~~crossed~~, ==highlight== and `code` inside
const INLINE = { '**': 'strong', '*': 'em', '~~': 's', '==': 'mark', '`': 'code' };
function element(tag, text) {
  const el = document.createElement(tag);
  for (const part of text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|~~[^~]+~~|==[^=]+==|`[^`]+`)/)) {
    if (!part) continue;
    const mark = Object.keys(INLINE).find((k) => part.length > 2 * k.length && part.startsWith(k) && part.endsWith(k));
    if (mark) {
      const inner = document.createElement(INLINE[mark]);
      inner.textContent = part.slice(mark.length, -mark.length);
      el.appendChild(inner);
    } else {
      el.append(part);
    }
  }
  return el;
}

page.addEventListener('input', () => {
  // Enter (or pasting several lines) splits the line into new rows
  if (page.value.includes('\n')) {
    const parts = page.value.split('\n');
    const caret = page.selectionStart - page.value.lastIndexOf('\n') - 1;
    current.lines.splice(at, 1, ...parts);
    edit(current, at + parts.length - 1, Math.max(caret, 0));
  }
  suggest();
});

// Moving between lines with the keyboard
page.addEventListener('keydown', (event) => {
  if (!$('suggest').hidden) return;   // the < list is using the keys
  const caret = page.selectionStart;
  const nothingSelected = caret === page.selectionEnd;
  const oneRow = page.scrollHeight < parseFloat(getComputedStyle(page).lineHeight) * 1.5;

  const lines = current.lines;
  let go = null;

  if (event.key === 'Backspace' && nothingSelected && caret === 0 && at > 0) {
    // join with the line above
    const before = lines[at - 1].length;
    lines.splice(at - 1, 2, lines[at - 1] + page.value);
    at--;
    saveDoc(current);
    go = [at, before];
  } else if (event.key === 'Delete' && nothingSelected && caret === page.value.length && at < lines.length - 1) {
    // join with the line below
    lines.splice(at, 2, page.value + lines[at + 1]);
    saveDoc(current);
    go = [at, caret];
  } else if (event.key === 'ArrowUp' && at > 0 && (oneRow || caret === 0)) {
    go = [at - 1, Math.min(caret, lines[at - 1].length)];
  } else if (event.key === 'ArrowDown' && at < lines.length - 1 && (oneRow || caret === page.value.length)) {
    go = [at + 1, Math.min(caret, lines[at + 1].length)];
  } else if (event.key === 'Escape') {
    page.blur();
  }
  if (go) {
    event.preventDefault();
    edit(current, go[0], go[1]);
  }
});

// Click away: every line shows its result
page.addEventListener('blur', () => {
  $('suggest').hidden = true;
  setTimeout(() => {
    if (document.activeElement !== page && current) {
      const doc = current;
      const line = doc.lines[at];
      const row = page.parentElement;
      current = null;
      at = -1;
      // Only the line you left changes, so a click or a text selection on another line still works
      if (doc.lines.join('') === '') draw(doc);   // empty page: show the placeholder
      else if (row) row.replaceChildren(show(line));
    }
  });
});

// ===== Suggestions while you type, like VS Code =====
// Type a word like h1, hr, quote or bold (or < and a tag name) and a list pops up.
// Each syntax has two rows: the short Markdown way (md) and the HTML way (html).
//   Tab           use the highlighted row
//   ↑ ↓ + Enter   pick another row and use it
//   Esc           close the list (or just keep typing)
// To add one: copy a line. | is where the cursor goes. Leave md or html empty if there isn't one.
const SNIPPETS = [
  { name: 'h1',         md: '# |',      html: '<h1>|</h1>' },
  { name: 'h2',         md: '## |',     html: '<h2>|</h2>' },
  { name: 'h3',         md: '### |',    html: '<h3>|</h3>' },
  { name: 'h4',         md: '#### |',   html: '<h4>|</h4>' },
  { name: 'h5',         md: '##### |',  html: '<h5>|</h5>' },
  { name: 'h6',         md: '###### |', html: '<h6>|</h6>' },
  { name: 'hr',         md: '---|',     html: '<hr>|' },
  { name: 'divider',    md: '---|',     html: '<hr>|' },
  { name: 'quote',      md: '> |',      html: '<blockquote>|</blockquote>' },
  { name: 'blockquote', md: '> |',      html: '<blockquote>|</blockquote>' },
  { name: 'p',          md: '',         html: '<p>|</p>' },
  { name: 'div',        md: '',         html: '<div>|</div>' },
  { name: 'bold',       md: '**|**',    html: '' },
  { name: 'italic',     md: '*|*',      html: '' },
  { name: 'crossed',    md: '~~|~~',    html: '' },
  { name: 'highlight',  md: '==|==',    html: '' },
  { name: 'code',       md: '`|`',      html: '' }
];

let picks = [];        // the rows in the list right now: { name, text, kind }
let picked = 0;        // which row is highlighted
let from = 0;          // where the word you're typing starts
let moved = false;     // did you use ↑ ↓ (then Enter picks too)
let tagMode = false;   // started with <

function suggest() {
  const caret = page.selectionStart;
  const before = page.value.slice(0, caret);
  const tag = before.match(/<([a-z0-9]*)$/i);             // "<" "<h" "<bl" ...
  const word = before.match(/(?:^|[^a-z0-9])([a-z0-9]{2,})$/i);   // "h1" "bo" "quo" ...
  const typed = tag ? tag[1] : word ? word[1] : null;
  tagMode = Boolean(tag);

  picks = [];
  if (typed !== null && caret === page.selectionEnd) {
    for (const s of SNIPPETS) {
      if (!s.name.startsWith(typed.toLowerCase())) continue;
      if (s.md && !tagMode) picks.push({ name: s.name, text: s.md, kind: 'md' });
      if (s.html) picks.push({ name: s.name, text: s.html, kind: 'html' });
    }
  }
  $('suggest').hidden = picks.length === 0;
  if (!picks.length) return;

  from = caret - (tag ? tag[0].length : typed.length);
  picked = 0;
  moved = false;
  $('suggest').innerHTML = '';
  picks.forEach((pick) => {
    const li = document.createElement('li');
    li.textContent = pick.name.padEnd(12) + pick.text.replace('|', '').padEnd(28) + pick.kind;
    li.addEventListener('mousedown', (event) => { event.preventDefault(); usePick(pick); });
    $('suggest').appendChild(li);
  });
  showPicked();

  // Put the list just under the word  (one letter of Menlo is 0.6 of the font size wide)
  const letter = parseFloat(getComputedStyle(page).fontSize) * 0.6;
  const spot = page.getBoundingClientRect();
  const where = $('suggest').parentElement.getBoundingClientRect();
  $('suggest').style.left = (spot.left - where.left + from * letter) + 'px';
  $('suggest').style.top = (spot.bottom - where.top) + 'px';
}

function showPicked() {
  [...$('suggest').children].forEach((li, i) => li.setAttribute('aria-selected', i === picked));
}

// Swap the word for the syntax and put the cursor where the | is
function usePick(pick) {
  const text = pick.text.replace('|', '');
  page.value = page.value.slice(0, from) + text + page.value.slice(page.selectionStart);
  page.selectionStart = page.selectionEnd = from + pick.text.indexOf('|');
  page.dispatchEvent(new Event('input'));   // save it, close the list
}

page.addEventListener('keydown', (event) => {
  if ($('suggest').hidden) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    picked = (picked + (event.key === 'ArrowDown' ? 1 : -1) + picks.length) % picks.length;
    moved = true;
    showPicked();
  } else if (event.key === 'Tab' || (event.key === 'Enter' && (moved || tagMode))) {
    usePick(picks[picked]);
  } else if (event.key === 'Escape' || event.key === 'Enter') {
    $('suggest').hidden = true;   // Enter without picking: just a new line
    if (event.key === 'Enter') return;
  } else {
    return;
  }
  event.preventDefault();
});

// ===== Hold ⌘ to see the bullets and keys =====

$('legend').textContent = BULLETS.map((b) =>
  b.symbol + '  ' + b.name.padEnd(6) + '  ctrl+' + b.ctrl + '   or type ' + b.type + ' and space').join('\n') +
  '\n\nclick •  done\nclick ○  done, click again  cancelled' +
  '\n\n# to ######  heading     ---  divider     >  quote\n**bold**  *italic*  ~~crossed~~  ==highlight==  `code`\n* ** *** at the end of a line  priority\n\ntype h1, hr, quote, bold, code ...  a list pops up\ntab uses it     ↑ ↓ + enter picks another     esc closes' +
  '\n\nkeys when you are not typing\nv  view mode   d  day   w  week   t  today   ← →  back / forward\nenter  start writing   esc  stop writing';

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

// The line you're typing on: bullets, shortcuts and saving
writingBox(page, () => {
  current.lines[at] = page.value;
  saveDoc(current);
});

render();
