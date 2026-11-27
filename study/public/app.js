// app.js: everything the study page does in the browser.
//
// The data comes from the server (server.js), which reads the JSON files in /data:
//   GET  /api/syntax          all languages and their items
//   POST /api/syntax/<lang>   save one item (new or edited)
//   POST /api/run             run code on the Mac, get the output back
//
// The Lessons and Test tabs live in practice.js. The practice terminal is terminal.js.

const $ = (id) => document.getElementById(id);   // a short way to find an element by id

let langs = [];            // [{ id, name, runs, items: [...] }, ...]
let current = 'all';       // the language shown in the sidebar ('all' = every language)
let mode = 'syntax';       // which tab is open: syntax, lessons or test
let playLang = 'html';     // the language the playground runs
const lessonList = $('lesson-list');   // practice.js fills it; the explorer shows it under the open language
let playOpen = false;      // is the playground panel open at the bottom?

// ===== Start: load the data, then draw the page =====
async function start() {
  const response = await fetch('/api/syntax');
  langs = await response.json();
  render();
}

// ===== Draw everything =====
function render() {
  renderSidebar();
  $('tab').textContent = current + '.' + mode;   // like a file name: javascript.syntax
  $('syntax').hidden = mode !== 'syntax';
  $('lessons').hidden = mode !== 'lessons';
  $('test').hidden = mode !== 'test';
  const lang = langs.find((l) => l.id === current);
  if (lang && lang.runs !== 'none') playLang = current;   // shortcuts don't run, so keep the last language

  // The playground panel: only on the Syntax tab, and only when it's open
  $('playground').hidden = mode !== 'syntax' || !playOpen;
  $('toggle-playground').setAttribute('aria-pressed', playOpen);

  if (mode === 'syntax') { renderCards(); updatePlayground(); }
  if (mode === 'lessons') renderLessons();   // in practice.js
  if (mode === 'test') startTest();          // in practice.js
}

// The Syntax / Lessons / Test buttons
for (const button of document.querySelectorAll('#modes .btn')) {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    for (const b of document.querySelectorAll('#modes .btn')) b.setAttribute('aria-pressed', b === button);
    render();
  });
}

// Sidebar: "All" at the top, then one button per language, with "mastered / total"
function renderSidebar() {
  $('languages').innerHTML = '';
  const all = { id: 'all', name: 'All', items: langs.flatMap((l) => l.items) };
  for (const lang of [all].concat(langs)) {
    const done = lang.items.filter((item) => item.mastered).length;
    const button = document.createElement('button');
    button.innerHTML = '<span></span><span class="count"></span>';
    button.children[0].textContent = lang.name;
    button.children[1].textContent = done + '/' + lang.items.length;
    button.setAttribute('aria-current', lang.id === current);
    button.addEventListener('click', () => {
      current = lang.id;
      $('search').value = '';
      render();
    });
    const li = document.createElement('li');
    li.appendChild(button);
    $('languages').appendChild(li);
    if (lang.id === current && lang.id !== 'all' && mode === 'syntax') li.appendChild(categoryList(lang));
    if (lang.id === current && mode === 'lessons') li.appendChild(lessonList);
  }
}

// Under the open language: its categories. Click one to scroll to its first card.
function categoryList(lang) {
  const ul = document.createElement('ul');
  for (const category of new Set(lang.items.map((item) => item.category))) {
    const button = document.createElement('button');
    button.className = 'category-link';
    button.textContent = category;
    button.addEventListener('click', () => {
      const card = [...document.querySelectorAll('#cards .category')].find((el) => el.textContent === category);
      if (card) card.closest('.card').scrollIntoView({ behavior: 'smooth' });
    });
    const li = document.createElement('li');
    li.appendChild(button);
    ul.appendChild(li);
  }
  return ul;
}

// Cards: with "All" or while searching, show all 9 languages; otherwise the current one
function renderCards() {
  const search = $('search').value.trim().toLowerCase();
  const filter = $('filter').value;
  const shown = search || current === 'all' ? langs : langs.filter((l) => l.id === current);
  $('cards').innerHTML = '';

  for (const lang of shown) {
    const items = lang.items.filter((item) => {
      if (filter === 'mastered' && !item.mastered) return false;
      if (filter === 'learning' && item.mastered) return false;
      const text = (lang.name + ' ' + item.category + ' ' + item.syntax + ' ' + item.explain + ' ' + item.example + ' ' + (item.remember || '') + ' ' + (item.builtFrom || '')).toLowerCase();
      return text.includes(search);
    });
    if (items.length === 0) continue;

    // A heading with the language name (useful when searching all of them)
    const title = document.createElement('h2');
    title.className = 'group-title';
    title.textContent = lang.name;
    $('cards').appendChild(title);

    for (const item of items) {
      $('cards').appendChild(makeCard(lang, item));
    }
  }

  if ($('cards').children.length === 0) {
    $('cards').innerHTML = '<p class="muted">Nothing found.</p>';
  }
}

// Make one card from the <template> in index.html
function makeCard(lang, item) {
  const card = $('card-template').content.firstElementChild.cloneNode(true);
  card.querySelector('.category').textContent = item.category;
  card.querySelector('.syntax').textContent = item.syntax;
  card.querySelector('.explain').textContent = item.explain;
  card.querySelector('.example').textContent = item.example ? 'Used for: ' + item.example : '';
  card.querySelector('.remember').textContent = item.remember ? 'Remember: ' + item.remember : '';
  card.querySelector('.remember').hidden = !item.remember;
  card.querySelector('.built').textContent = item.builtFrom ? 'Built from: ' + item.builtFrom : '';
  card.querySelector('.built').hidden = !item.builtFrom;
  card.querySelector('.mastered').checked = item.mastered;
  card.classList.toggle('done', item.mastered);

  // Copy the syntax to the clipboard
  card.querySelector('.copy').addEventListener('click', async (event) => {
    await navigator.clipboard.writeText(item.syntax);
    event.target.textContent = 'Copied';
    setTimeout(() => { event.target.textContent = 'Copy'; }, 1500);
  });

  // Mark as mastered (saved to the JSON file)
  card.querySelector('.mastered').addEventListener('change', async (event) => {
    item.mastered = event.target.checked;
    await save(lang.id, item);
    render();
  });

  // Put the syntax in the playground (for Terminal and Homebrew: the first line, in the terminal)
  card.querySelector('.try').addEventListener('click', () => {
    if (current !== 'all') current = lang.id;
    playLang = lang.id;
    playOpen = true;
    render();
    const box = lang.runs === 'terminal' ? $('term-input') : $('code');
    box.value = lang.runs === 'terminal' ? item.syntax.split('\n')[0] : item.syntax;
    box.scrollIntoView({ behavior: 'smooth' });
    box.focus();
  });

  card.querySelector('.try').hidden = lang.runs === 'none';   // nothing to try for shortcuts
  card.querySelector('.edit').addEventListener('click', () => openForm(lang.id, item));
  return card;
}

// Send one item to the server, which writes it into data/<lang>.json
async function save(langId, item) {
  const response = await fetch('/api/syntax/' + langId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  return response.json();
}

// ===== Search and filter: redraw on every keystroke =====
$('search').addEventListener('input', renderCards);
$('filter').addEventListener('change', renderCards);

// ===== Add / edit form =====
function openForm(langId, item) {
  const form = $('form');
  form.reset();
  $('form-lang').innerHTML = langs.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
  form.lang.value = langId;
  $('form-title').textContent = item ? 'Edit syntax' : 'Add syntax';
  if (item) {
    form.id.value = item.id;
    form.category.value = item.category;
    form.syntax.value = item.syntax;
    form.explain.value = item.explain;
    form.example.value = item.example;
    form.remember.value = item.remember || '';
    form.builtFrom.value = item.builtFrom || '';
  }
  $('form-dialog').showModal();
}

$('add').addEventListener('click', () => openForm(current === 'all' ? 'html' : current, null));
$('toggle-playground').addEventListener('click', () => { playOpen = !playOpen; render(); });
$('cancel').addEventListener('click', () => $('form-dialog').close());

$('form').addEventListener('submit', async (event) => {
  event.preventDefault();                       // don't reload the page
  const form = $('form');
  const lang = langs.find((l) => l.id === form.lang.value);
  const old = lang.items.find((i) => i.id === form.id.value);

  const saved = await save(lang.id, {
    id: form.id.value,                          // empty for a new item; the server makes one
    category: form.category.value,
    syntax: form.syntax.value,
    explain: form.explain.value,
    example: form.example.value,
    remember: form.remember.value,
    builtFrom: form.builtFrom.value,
    mastered: old ? old.mastered : false
  });

  // Update our copy of the data, then redraw
  if (old) Object.assign(old, saved);
  else lang.items.push(saved);
  current = lang.id;
  $('form-dialog').close();
  render();
});

// ===== Playground =====

// For browser JavaScript: send console.log and errors from the frame back to this page
const CATCH_CONSOLE = `<script>
  function send(text) { parent.postMessage(text, "*"); }
  console.log = (...values) => send(values.map((v) => typeof v === "object" ? JSON.stringify(v) : String(v)).join(" "));
  window.onerror = (message) => send("Error: " + message);
<\/script>`;

// Some HTML for CSS to style
const CSS_SAMPLE = `<h1>Heading</h1>
<p>A paragraph with a <a href="#">link</a>.</p>
<div class="box parent">A box <span class="badge">3</span></div>
<button class="button">Button</button>
<div class="row grid"><div>1</div><div>2</div><div>3</div></div>`;

async function runCode() {
  const code = $('code').value;
  const lang = langs.find((l) => l.id === playLang);
  const preview = $('preview');
  $('output').textContent = '';

  // HTML, CSS and browser JavaScript run in the sealed-off frame
  if (lang.id === 'html') {
    preview.srcdoc = code;
  } else if (lang.id === 'css') {
    preview.srcdoc = CSS_SAMPLE + '<style>' + code + '</style>';
  } else if (lang.id === 'javascript') {
    preview.srcdoc = '<body>' + CATCH_CONSOLE + '<script>' + code + '<\/script>';   // <body> first, so document.body exists
  } else {
    // Python, Node.js, C and C++ run on the Mac, through server.js
    $('output').textContent = 'Running…';
    $('output').textContent = await runOnServer(lang.id, code);
  }
}

// Send code to server.js, get back what it printed
async function runOnServer(langId, code) {
  const response = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: langId, code: code })
  });
  return (await response.json()).output;
}

// Printed lines coming back from the frame
window.addEventListener('message', (event) => {
  if (event.source !== $('preview').contentWindow) return;
  $('output').textContent += event.data + '\n';
});

// Terminal and Homebrew get the practice terminal; the rest get the code box.
// The frame is only for HTML, CSS and browser JavaScript.
function updatePlayground() {
  const lang = langs.find((l) => l.id === playLang);
  $('playground-title').textContent = 'Playground · ' + lang.name;
  $('editor').hidden = lang.runs === 'terminal';
  $('terminal').hidden = lang.runs !== 'terminal';
  $('preview').hidden = lang.runs !== 'browser';
  $('run-note').textContent = lang.runs === 'browser' ? 'Runs in the page.' : 'Runs on your Mac.';
}

$('run').addEventListener('click', runCode);

// Keys for any code box: ⌘↵ (or Ctrl+Enter) runs, Tab types two spaces instead of leaving the box
function codeKeys(box, run) {
  box.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      run();
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const at = box.selectionStart;
      box.value = box.value.slice(0, at) + '  ' + box.value.slice(box.selectionEnd);
      box.selectionStart = box.selectionEnd = at + 2;
    }
  });
}
codeKeys($('code'), runCode);

start();
