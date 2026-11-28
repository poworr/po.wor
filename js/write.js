// write.js: songs, lyrics and stories.
// The list shows every writing. "+ new" opens an empty page; the topic on top is optional.
// The address ends in #id while a writing is open, so the browser's back button goes back to the list.
// Saved in this browser only, under 'write': a list of { id, title, text }, newest on top.

const $ = (id) => document.getElementById(id);
const page = $('page');

let writings = load();
let open = null;   // the writing on the page, or null on the list
let picked = 0;    // the row j / k is on in the list

function load() {
  try { return JSON.parse(localStorage.getItem('write')) || []; }
  catch (e) { return []; }
}

function save() {
  try { localStorage.setItem('write', JSON.stringify(writings)); }
  catch (e) { $('note').textContent = 'not saved: this browser blocked saving'; }   // like a private window
}

// ===== Show the list or one writing, from the end of the address =====

function render() {
  // a writing left with no topic and no text goes away
  const id = location.hash.slice(1);
  const before = writings.length;
  writings = writings.filter((w) => w.id === id || w.title.trim() || w.text.trim());
  if (writings.length !== before) save();

  open = writings.find((w) => w.id === id) || null;
  $('list-view').hidden = !!open;
  $('write-view').hidden = !open;

  if (open) {
    $('title').value = open.title;
    page.value = open.text;
    count();
    if (open.title || open.text) page.focus();
    else $('title').focus();   // a new one: start on the topic (enter skips it)
  } else {
    drawList();
  }
}

function drawList() {
  $('list').innerHTML = '';
  picked = Math.max(0, Math.min(picked, writings.length - 1));
  writings.forEach((w, i) => {
    const row = document.createElement('li');
    row.textContent = w.title.trim() || 'untitled';
    if (!w.title.trim()) row.className = 'untitled';
    if (i === picked) row.classList.add('on');
    row.addEventListener('click', () => { location.hash = w.id; });
    $('list').appendChild(row);
  });
}

function newWriting() {
  const w = { id: Date.now().toString(36), title: '', text: '' };
  writings.unshift(w);
  picked = 0;
  location.hash = w.id;   // render() runs on hashchange
}

window.addEventListener('hashchange', render);
$('new').addEventListener('click', newWriting);
$('back').addEventListener('click', () => { location.hash = ''; });

// ===== Writing =====

// lines, words, and 字 (characters, for Japanese)
function count() {
  const text = page.value;
  const lines = text ? text.split('\n').length : 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = [...text.replace(/\s/g, '')].length;
  $('count').textContent = lines + ' lines  ' + words + ' words  ' + chars + '字';
}

$('title').addEventListener('input', () => { open.title = $('title').value; save(); });
page.addEventListener('input', () => { open.text = page.value; save(); count(); });

// enter on the topic goes down to the page
$('title').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); page.focus(); }
});

page.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    document.execCommand('insertText', false, '  ');   // two spaces; this way cmd+z still works
  }
});

// ===== Keys =====

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (open) {
    if (event.key === 'Escape') location.hash = '';   // back to the list
    return;
  }
  // on the list
  if (event.key === 'n') newWriting();
  else if ((event.key === 'j' || event.key === 'ArrowDown') && picked < writings.length - 1) picked++;
  else if ((event.key === 'k' || event.key === 'ArrowUp') && picked > 0) picked--;
  else if (event.key === 'Enter' && writings[picked]) location.hash = writings[picked].id;
  else return;
  event.preventDefault();
  drawList();
});

// ===== Hold control to see the keys =====

$('legend').textContent =
  'on the list\nn  new writing     j k  or  ↑ ↓  move     enter  open' +
  '\n\nwriting\nenter on the topic  go down to the page     tab  two spaces     esc  back to the list' +
  '\n\nthe topic is optional: leave it empty for untitled\na writing with nothing in it goes away';

document.addEventListener('keydown', (event) => { if (event.key === 'Control') $('legend').hidden = false; });
document.addEventListener('keyup', (event) => { if (event.key === 'Control') $('legend').hidden = true; });
window.addEventListener('blur', () => { $('legend').hidden = true; });

render();
