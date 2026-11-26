// app.js: everything the study page does in the browser.
//
// The data comes from the server (server.js), which reads the JSON files in /data:
//   GET  /api/syntax          all languages and their items
//   POST /api/syntax/<lang>   save one item (new or edited)
//   POST /api/run             run code on the Mac, get the output back

const $ = (id) => document.getElementById(id);   // a short way to find an element by id

let langs = [];            // [{ id, name, runs, items: [...] }, ...]
let current = 'html';      // the language shown in the sidebar

// ===== Start: load the data, then draw the page =====
async function start() {
  const response = await fetch('/api/syntax');
  langs = await response.json();
  render();
}

// ===== Draw everything =====
function render() {
  renderSidebar();
  renderCards();
  updatePlayground();
}

// Sidebar: one button per language, with "mastered / total"
function renderSidebar() {
  $('languages').innerHTML = '';
  for (const lang of langs) {
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
  }
}

// Cards: while searching, look in all 9 languages; otherwise show the current one
function renderCards() {
  const search = $('search').value.trim().toLowerCase();
  const filter = $('filter').value;
  const shown = search ? langs : langs.filter((l) => l.id === current);
  $('cards').innerHTML = '';

  for (const lang of shown) {
    const items = lang.items.filter((item) => {
      if (filter === 'mastered' && !item.mastered) return false;
      if (filter === 'learning' && item.mastered) return false;
      const text = (lang.name + ' ' + item.category + ' ' + item.syntax + ' ' + item.explain + ' ' + item.example).toLowerCase();
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

  // Put the syntax in the playground
  card.querySelector('.try').addEventListener('click', () => {
    current = lang.id;
    render();
    $('code').value = item.syntax;
    $('code').scrollIntoView({ behavior: 'smooth' });
    $('code').focus();
  });

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
  }
  $('form-dialog').showModal();
}

$('add').addEventListener('click', () => openForm(current, null));
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
  const lang = langs.find((l) => l.id === current);
  const preview = $('preview');
  $('output').textContent = '';

  // HTML, CSS and browser JavaScript run in the sealed-off frame
  if (lang.id === 'html') {
    preview.srcdoc = code;
  } else if (lang.id === 'css') {
    preview.srcdoc = CSS_SAMPLE + '<style>' + code + '</style>';
  } else if (lang.id === 'javascript') {
    preview.srcdoc = CATCH_CONSOLE + '<script>' + code + '<\/script>';
  } else {
    // Everything else runs on the Mac, through server.js
    $('output').textContent = 'Running…';
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: lang.id, code: code })
    });
    const result = await response.json();
    $('output').textContent = result.output;
  }
}

// Printed lines coming back from the frame
window.addEventListener('message', (event) => {
  if (event.source !== $('preview').contentWindow) return;
  $('output').textContent += event.data + '\n';
});

// Show the frame only for HTML, CSS and browser JavaScript, and say where code runs
function updatePlayground() {
  const lang = langs.find((l) => l.id === current);
  $('playground-title').textContent = 'Playground · ' + lang.name;
  $('preview').hidden = lang.runs !== 'browser';
  $('run-note').textContent = lang.runs === 'browser'
    ? 'Runs in the page.'
    : lang.id === 'terminal' || lang.id === 'homebrew'
      ? 'Runs on your Mac. Only read-only commands (like ls, pwd, brew list, brew info).'
      : 'Runs on your Mac.';
}

$('run').addEventListener('click', runCode);

$('code').addEventListener('keydown', (event) => {
  // ⌘↵ (or Ctrl+Enter) runs the code
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    runCode();
  }
  // Tab types two spaces instead of leaving the box
  if (event.key === 'Tab') {
    event.preventDefault();
    const box = event.target;
    const at = box.selectionStart;
    box.value = box.value.slice(0, at) + '  ' + box.value.slice(box.selectionEnd);
    box.selectionStart = box.selectionEnd = at + 2;
  }
});

start();
