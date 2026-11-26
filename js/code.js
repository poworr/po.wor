// Code study page.
// Missions come from MISSIONS in js/code-missions.js.
// The editor is Monaco (the editor inside VS Code), loaded from a CDN.
//
// Three modes:
//   learn   the answer, with an explanation for each step
//   recall  each step is a comment hint; you write the code under it
//   free    an empty editor for your own experiments

const $ = function (id) { return document.getElementById(id); };

let editor;          // the Monaco editor
let mission;         // the mission on screen
let mode = load('code-mode') || 'learn';

// ===== Saving (localStorage can fail in private mode, so ignore errors) =====
function save(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// ===== Per language: how to write a comment, and Monaco's name for it =====
const COMMENT = {
  html: function (text) { return '<!-- ' + text + ' -->'; },
  css:  function (text) { return '/* ' + text + ' */'; },
  js:   function (text) { return '// ' + text; }
};
const EDITOR_LANG = { html: 'html', css: 'css', js: 'javascript' };

// The full answer of a mission
function answer(m) {
  return m.lines.map(function (step) { return step.code; }).join('\n');
}

// The hint comment for step number i, e.g. "// 1. Start i at 1 ..."
function hint(m, i) {
  return COMMENT[m.lang]((i + 1) + '. ' + m.lines[i].explain);
}

// ===== Open a mission =====
function openMission(id) {
  mission = MISSIONS.find(function (m) { return m.id === id; }) || MISSIONS[0];
  save('code-mission', mission.id);
  $('lang').textContent = mission.lang;
  $('title').textContent = mission.title;
  $('goal').textContent = mission.goal;
  setMode(mode);
}

function nextMission() {
  const i = MISSIONS.indexOf(mission);
  openMission(MISSIONS[(i + 1) % MISSIONS.length].id);
}

// ===== Switch mode: put the right code in the editor =====
function setMode(newMode) {
  mode = newMode;
  save('code-mode', mode);
  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.mode === mode);
  });

  let code;
  if (mode === 'learn') {
    code = answer(mission);
  } else if (mode === 'recall') {
    code = load('code-recall-' + mission.id) ||
      mission.lines.map(function (step, i) { return hint(mission, i) + '\n'; }).join('\n');
  } else {
    code = load('code-free-' + mission.lang) || '';
  }

  monaco.editor.setModelLanguage(editor.getModel(), EDITOR_LANG[mission.lang]);
  editor.updateOptions({ readOnly: mode === 'learn' });
  editor.setValue(code);

  showNotes();
  $('console').textContent = 'Press ⌘↵ (or Run) to see the result.';
  $('preview').hidden = mission.lang === 'js';
  $('preview').srcdoc = '';
}

// Save what you type (Recall and Free only)
function autosave() {
  if (mode === 'recall') save('code-recall-' + mission.id, editor.getValue());
  if (mode === 'free') save('code-free-' + mission.lang, editor.getValue());
}

// ===== Notes under the result =====
function showNotes() {
  const notes = $('notes');
  notes.innerHTML = '';

  if (mode === 'learn') {
    notes.innerHTML = '<p class="label">Line by line</p>';
    notes.appendChild(stepList(mission.lines.map(function (step) {
      return { code: step.code, text: step.explain };
    })));
  } else if (mode === 'recall') {
    notes.innerHTML = '<p class="muted">Write the code under each comment, from memory. ⌘↵ checks it and runs it.</p>';
  } else {
    notes.innerHTML = '<p class="muted">Free practice. Anything you write here is saved.</p>';
  }
}

// A numbered list: each item shows some code and a line of text
function stepList(items) {
  const ol = document.createElement('ol');
  ol.className = 'steps';
  items.forEach(function (item) {
    const li = document.createElement('li');
    const pre = document.createElement('pre');
    pre.textContent = item.code;
    const p = document.createElement('p');
    p.textContent = item.text;
    li.appendChild(pre);
    li.appendChild(p);
    ol.appendChild(li);
  });
  return ol;
}

// ===== Recall: check each step =====
// The code you typed for step i is whatever sits between hint i and hint i+1.
// Spaces and line breaks don't matter.
function check() {
  const text = editor.getValue();
  const squash = function (s) { return s.replace(/\s+/g, ''); };
  let right = 0;

  const items = mission.lines.map(function (step, i) {
    const start = text.indexOf(hint(mission, i));
    const end = i + 1 < mission.lines.length ? text.indexOf(hint(mission, i + 1)) : text.length;
    let typed = '';
    if (start !== -1 && end !== -1) typed = text.slice(start + hint(mission, i).length, end);

    const ok = squash(typed) === squash(step.code);
    if (ok) right++;
    return { code: step.code, text: (ok ? '✓ Right' : '✗ Not yet. This is the answer.') + ' (step ' + (i + 1) + ')' };
  });

  $('notes').innerHTML = '<p class="label">' + right + ' of ' + mission.lines.length + ' steps right</p>';
  $('notes').appendChild(stepList(items));

  // Remember finished missions (they get a ✓ in the ⌘P list)
  if (right === mission.lines.length) {
    const done = JSON.parse(load('code-done') || '[]');
    if (!done.includes(mission.id)) done.push(mission.id);
    save('code-done', JSON.stringify(done));
  }
}

// ===== Run the code in a sealed-off frame =====
// For JavaScript, this little script goes in first. It sends console.log
// and errors back to this page, so they show in the result box.
const CATCH_CONSOLE = '<script>' +
  'function send(type, values) { parent.postMessage({ type: type, text: values.map(function (v) { return typeof v === "object" ? JSON.stringify(v) : String(v); }).join(" ") }, "*"); }' +
  'console.log = function () { send("log", Array.from(arguments)); };' +
  'window.onerror = function (message, file, line) { send("error", [message + " (line " + line + ")"]); };' +
  '<\/script>';

function run() {
  const code = editor.getValue();
  $('console').textContent = '';

  if (mission.lang === 'html') $('preview').srcdoc = code;
  if (mission.lang === 'css') $('preview').srcdoc = mission.html + '<style>' + code + '</style>';
  if (mission.lang === 'js') {
    $('preview').srcdoc = CATCH_CONSOLE + '<script>' + code + '<\/script>';
    $('console').textContent = '(nothing printed yet)';
  }
  if (mission.lang !== 'js') $('console').textContent = 'The page above is your result.';
}

// Printed lines and errors coming back from the frame
let firstLine = true;
window.addEventListener('message', function (event) {
  if (event.source !== $('preview').contentWindow) return;
  if (firstLine) { $('console').textContent = ''; firstLine = false; }
  const line = document.createElement('div');
  line.textContent = event.data.text;
  if (event.data.type === 'error') line.className = 'error';
  $('console').appendChild(line);
});

function runOrCheck() {
  firstLine = true;
  if (mode === 'recall') check();
  run();
}

// ===== ⌘P mission picker =====
function openPicker() {
  $('picker-search').value = '';
  fillPicker();
  $('picker').showModal();
}

function fillPicker() {
  const search = $('picker-search').value.toLowerCase();
  const done = JSON.parse(load('code-done') || '[]');
  $('picker-list').innerHTML = '';

  MISSIONS.forEach(function (m) {
    const name = m.lang.toUpperCase() + '  ' + m.title + '  (' + m.level + ')';
    if (!name.toLowerCase().includes(search)) return;
    const button = document.createElement('button');
    button.textContent = (done.includes(m.id) ? '✓ ' : '· ') + name;
    button.addEventListener('click', function () {
      $('picker').close();
      openMission(m.id);
      editor.focus();
    });
    const li = document.createElement('li');
    li.appendChild(button);
    $('picker-list').appendChild(li);
  });
}

$('picker-search').addEventListener('input', fillPicker);
$('picker-search').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    const first = $('picker-list').querySelector('button');
    if (first) first.click();
  }
});

// ===== Buttons =====
$('open-picker').addEventListener('click', openPicker);
$('next').addEventListener('click', nextMission);
$('run').addEventListener('click', runOrCheck);
document.querySelectorAll('[data-mode]').forEach(function (b) {
  b.addEventListener('click', function () { setMode(b.dataset.mode); });
});

// Shortcuts when the editor is not focused (the editor has its own, below)
document.addEventListener('keydown', function (event) {
  if (!(event.metaKey || event.ctrlKey) || (editor && editor.hasTextFocus())) return;
  if (event.key === 'p' && !event.shiftKey) { event.preventDefault(); openPicker(); }
  if (event.key === 'Enter') { event.preventDefault(); runOrCheck(); }
});

// ===== Start Monaco =====
const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min';
require.config({ paths: { vs: MONACO + '/vs' } });

// Monaco does some work in the background ("workers"). This lets them load from the CDN.
window.MonacoEnvironment = {
  getWorkerUrl: function () {
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
      'self.MonacoEnvironment = { baseUrl: "' + MONACO + '/" };' +
      'importScripts("' + MONACO + '/vs/base/worker/workerMain.js");');
  }
};

require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create($('editor'), {
    theme: 'vs',
    fontSize: 14,
    minimap: { enabled: false },
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true
  });

  // Our own commands. They also show up in the ⌘⇧P / F1 command list.
  const key = monaco.KeyMod.CtrlCmd;
  editor.addAction({ id: 'run', label: 'Run code', keybindings: [key | monaco.KeyCode.Enter], run: runOrCheck });
  editor.addAction({ id: 'missions', label: 'Open a mission', keybindings: [key | monaco.KeyCode.KeyP], run: openPicker });
  editor.addAction({ id: 'next', label: 'Next mission', run: nextMission });
  editor.addAction({ id: 'learn', label: 'Mode: Learn', run: function () { setMode('learn'); } });
  editor.addAction({ id: 'recall', label: 'Mode: Recall', run: function () { setMode('recall'); } });
  editor.addAction({ id: 'free', label: 'Mode: Free', run: function () { setMode('free'); } });
  editor.addAction({ id: 'reset', label: 'Start this mission over', run: function () {
    try { localStorage.removeItem('code-recall-' + mission.id); } catch (e) {}
    setMode(mode);
  } });

  // ⌘⇧P opens the command list, like in VS Code
  editor.addCommand(key | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, function () {
    editor.trigger('keyboard', 'editor.action.quickCommand');
  });

  editor.onDidChangeModelContent(autosave);
  openMission(load('code-mission'));
});
