// server.js: the small Node.js server for the syntax study app.
//
// Start it:  cd study  then  npm start
// Open it:   http://localhost:3000
//
// What it does:
//   1. Serves the web page (the files in /public).
//   2. Reads and saves your syntax notes (the JSON files in /data).
//   3. Sends the lessons (data/lessons.json) and the Learn pages (data/learn.json).
//   4. Runs Python, Node.js, C and C++ code on your Mac (/api/run).
//      Terminal, Homebrew and Git use the practice terminal in the page (terminal.js),
//      so nothing you type there touches your real Mac.

const express = require('express');               // the web server library
const fs = require('fs');                         // read and write files
const os = require('os');                         // temp folder, home folder
const path = require('path');                     // build file paths safely
const { execFile } = require('child_process');    // run programs (python3, node, gcc...)

const app = express();
const PORT = 3000;
const DATA = path.join(__dirname, 'data');

// The 11 sidebar entries. "id" is also the JSON file name in /data.
// "runs" says where code runs: in the browser, on the server, or in the practice terminal.
// Shortcuts are keys to remember, not code, so they don't run ("none").
const LANGS = [
  { id: 'html',       name: 'HTML',         runs: 'browser' },
  { id: 'css',        name: 'CSS',          runs: 'browser' },
  { id: 'javascript', name: 'JavaScript',   runs: 'browser' },
  { id: 'node',       name: 'Node.js',      runs: 'server' },
  { id: 'python',     name: 'Python',       runs: 'server' },
  { id: 'c',          name: 'C',            runs: 'server' },
  { id: 'cpp',        name: 'C++',          runs: 'server' },
  { id: 'terminal',   name: 'Mac Terminal', runs: 'terminal' },
  { id: 'homebrew',   name: 'Homebrew',     runs: 'terminal' },
  { id: 'git',        name: 'Git',          runs: 'terminal' },
  { id: 'shortcuts',  name: 'Shortcuts',    runs: 'none' }
];

app.use(express.json());                                    // read JSON sent by the page
app.use(express.static(path.join(__dirname, 'public')));    // serve index.html, styles.css, app.js
app.use('/vs', express.static(path.join(__dirname, 'node_modules/monaco-editor/min/vs')));   // the VS Code editor
app.use('/emmet', express.static(path.join(__dirname, 'node_modules/emmet-monaco-es/dist')));   // Emmet for it
app.get('/logo.png', function (req, res) {                  // reuse the site's logo
  res.sendFile(path.join(__dirname, '..', 'images', 'logo.png'));
});

// ===== Safety: only this app may use the API =====
// Other websites you visit could try to send code to localhost:3000.
// So we only accept requests addressed to localhost, coming from this page.
app.use('/api', function (req, res, next) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  const okHost = host === 'localhost:' + PORT || host === '127.0.0.1:' + PORT;
  const okOrigin = !origin || origin === 'http://' + host;
  if (!okHost || !okOrigin) return res.status(403).send('Forbidden');
  next();
});

// ===== Notes: read and save the JSON files =====
function readItems(langId) {
  return JSON.parse(fs.readFileSync(path.join(DATA, langId + '.json'), 'utf8'));
}
function writeItems(langId, items) {
  fs.writeFileSync(path.join(DATA, langId + '.json'), JSON.stringify(items, null, 2) + '\n');
}

// GET /api/syntax: every language with its items
app.get('/api/syntax', function (req, res) {
  res.json(LANGS.map(function (lang) {
    return { ...lang, items: readItems(lang.id) };
  }));
});

// POST /api/syntax/python (for example): add a new item, or save changes to one
app.post('/api/syntax/:lang', function (req, res) {
  const lang = LANGS.find(function (l) { return l.id === req.params.lang; });
  if (!lang) return res.status(404).send('Unknown language');
  if (!req.body.syntax) return res.status(400).send('Syntax is required');

  const item = {
    id: req.body.id || Date.now().toString(),   // new items get an id from the clock
    category: req.body.category || 'General',
    syntax: req.body.syntax,
    explain: req.body.explain || '',
    example: req.body.example || '',
    remember: req.body.remember || '',     // a tip or memory hook
    builtFrom: req.body.builtFrom || '',   // which core blocks it is made of
    mastered: Boolean(req.body.mastered)
  };

  const items = readItems(lang.id);
  const index = items.findIndex(function (i) { return i.id === item.id; });
  if (index === -1) items.push(item);   // new
  else items[index] = item;             // edited
  writeItems(lang.id, items);
  res.json(item);
});

// GET /api/lessons: every lesson (task, solution, and what the answer must print)
app.get('/api/lessons', function (req, res) {
  res.json(readItems('lessons'));
});

// GET /api/learn: the Learn pages (what each language is for, clean code, the web)
app.get('/api/learn', function (req, res) {
  res.json(readItems('learn'));
});

// ===== Playground: run code on this Mac =====

// Run one program and wait for it. Always resolves with { ok, text }.
function run(command, args, cwd, seconds) {
  return new Promise(function (resolve) {
    execFile(command, args, { cwd: cwd, timeout: seconds * 1000, maxBuffer: 1024 * 1024 },
      function (error, stdout, stderr) {
        let text = stdout + stderr;
        if (error && error.killed) text += '\n(stopped: it ran longer than ' + seconds + ' seconds)';
        else if (error && !text) text = error.message;
        resolve({ ok: !error, text: text || '(no output)' });
      });
  });
}

async function runCode(lang, code, dir) {
  if (lang === 'python') {
    fs.writeFileSync(path.join(dir, 'main.py'), code);
    return (await run('python3', ['main.py'], dir, 10)).text;
  }
  if (lang === 'node') {
    fs.writeFileSync(path.join(dir, 'main.js'), code);
    return (await run('node', ['main.js'], dir, 10)).text;
  }
  if (lang === 'c' || lang === 'cpp') {
    // Compile first, then run the program it made
    const file = lang === 'c' ? 'main.c' : 'main.cpp';
    const compiler = lang === 'c' ? 'gcc' : 'g++';
    const flags = lang === 'cpp' ? ['-std=c++17'] : [];
    fs.writeFileSync(path.join(dir, file), code);
    const build = await run(compiler, flags.concat([file, '-o', 'main']), dir, 20);
    if (!build.ok) return build.text;
    return (await run(path.join(dir, 'main'), [], dir, 10)).text;
  }
  return 'This one runs in the browser, not on the server.';
}

// POST /api/run  { lang, code }  →  { output }
app.post('/api/run', async function (req, res) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-'));   // a fresh, empty folder per run
  try {
    const output = await runCode(req.body.lang, String(req.body.code || ''), dir);
    res.json({ output: output });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });             // clean up afterwards
  }
});

// Only listen on this Mac (127.0.0.1), never on the network.
app.listen(PORT, '127.0.0.1', function () {
  console.log('Syntax study is running: http://localhost:' + PORT);
});
