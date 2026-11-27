// terminal.js: a pretend Mac terminal for practicing commands.
//
// Nothing here touches your real Mac. The "files" are just an object in this
// page, remembered in this browser. Type `reset` to start over.
//
// How files are stored: a folder is an object, a file is a string.
//   { Users: { you: { Desktop: {}, "notes.txt": "hello" } } }

const HOME = ['Users', 'you'];

function freshState() {
  return {
    cwd: HOME.slice(),   // where you are, as a list of folder names
    files: { Users: { you: {
      Desktop: { 'todo.txt': 'buy milk\nTODO: learn grep\n' },
      Documents: {},
      'notes.txt': 'Hello from notes.txt\n',
      '.zshrc': '# hidden file: your shell settings\n'
    } } },
    brew: ['git', 'node', 'python']   // pretend installed Homebrew packages
  };
}

let state = loadState();
const typed = [];         // commands you typed, for the ↑ key
let historyIndex = 0;

function loadState() {
  try { return JSON.parse(localStorage.getItem('study-terminal')) || freshState(); }
  catch (e) { return freshState(); }
}
function saveState() {
  try { localStorage.setItem('study-terminal', JSON.stringify(state)); } catch (e) {}
}

// ===== Paths =====

// Turn a path like "../Desktop" or "~/notes.txt" into a list of names
function resolve(path) {
  let parts;
  if (path.startsWith('/')) parts = [];
  else if (path.startsWith('~')) parts = HOME.slice();
  else parts = state.cwd.slice();

  for (const name of path.replace(/^~/, '').split('/')) {
    if (name === '' || name === '.') continue;
    if (name === '..') parts.pop();
    else parts.push(name);
  }
  return parts;
}

// Find what is at a path: an object (folder), a string (file), or undefined
function find(parts) {
  let node = state.files;
  for (const name of parts) {
    if (typeof node !== 'object' || !(name in node)) return undefined;
    node = node[name];
  }
  return node;
}

const isFolder = (node) => typeof node === 'object';
const last = (parts) => parts[parts.length - 1];

// The prompt, like zsh: "you@mac Desktop %"
function prompt() {
  const here = state.cwd.join('/') === HOME.join('/') ? '~' : last(state.cwd) || '/';
  return 'you@mac ' + here + ' %';
}

// ===== The commands =====
// Each one gets the words after the command name, and returns text to print.

const COMMANDS = {
  help: () => 'Try: pwd  ls  ls -la  cd  mkdir  touch  echo  cat  head  tail  wc  cp  mv  rm  chmod  grep  whoami  date  clear  git  brew  reset',

  whoami: () => 'you',
  date: () => new Date().toString(),

  // head / tail show the first or last lines of a file (-n 3 picks how many)
  head: (args) => firstOrLast(args, 'head'),
  tail: (args) => firstOrLast(args, 'tail'),

  // wc -l counts lines
  wc: (args) => {
    const path = args.find((a) => !a.startsWith('-'));
    const file = find(resolve(path || ''));
    if (typeof file !== 'string') return 'wc: ' + path + ': No such file';
    return '  ' + file.split('\n').filter(Boolean).length + ' ' + path;
  },

  pwd: () => '/' + state.cwd.join('/'),

  ls: (args) => {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const path = args.find((a) => !a.startsWith('-')) || '.';
    const folder = find(resolve(path));
    if (folder === undefined) return 'ls: ' + path + ': No such file or directory';
    if (!isFolder(folder)) return path;

    let names = Object.keys(folder).sort();
    if (!flags.includes('a')) names = names.filter((n) => !n.startsWith('.'));   // hide dot-files
    if (!flags.includes('l')) return names.join('  ');
    return names.map((n) => (isFolder(folder[n]) ? 'drwxr-xr-x  ' : '-rw-r--r--  ') + n).join('\n');
  },

  cd: (args) => {
    const parts = resolve(args[0] || '~');
    if (!isFolder(find(parts))) return 'cd: no such file or directory: ' + args[0];
    state.cwd = parts;
    return '';
  },

  mkdir: (args) => args.map((path) => {
    const parts = resolve(path);
    const parent = find(parts.slice(0, -1));
    if (!isFolder(parent)) return 'mkdir: ' + path + ': No such file or directory';
    if (last(parts) in parent) return 'mkdir: ' + path + ': File exists';
    parent[last(parts)] = {};
    return '';
  }).join('\n').trim(),

  touch: (args) => args.map((path) => {
    const parts = resolve(path);
    const parent = find(parts.slice(0, -1));
    if (!isFolder(parent)) return 'touch: ' + path + ': No such file or directory';
    if (!(last(parts) in parent)) parent[last(parts)] = '';
    return '';
  }).join('\n').trim(),

  // echo hello            prints hello
  // echo hello > a.txt    writes hello into a.txt   (>> adds to the end)
  echo: (args) => {
    const arrow = args.findIndex((a) => a === '>' || a === '>>');
    const text = (arrow === -1 ? args : args.slice(0, arrow)).join(' ');
    if (arrow === -1) return text;

    const parts = resolve(args[arrow + 1] || '');
    const parent = find(parts.slice(0, -1));
    if (!isFolder(parent) || !last(parts)) return 'zsh: no such file or directory';
    const before = args[arrow] === '>>' && typeof parent[last(parts)] === 'string' ? parent[last(parts)] : '';
    parent[last(parts)] = before + text + '\n';
    return '';
  },

  cat: (args) => args.map((path) => {
    const file = find(resolve(path));
    if (file === undefined) return 'cat: ' + path + ': No such file or directory';
    if (isFolder(file)) return 'cat: ' + path + ': Is a directory';
    return file.replace(/\n$/, '');
  }).join('\n'),

  cp: (args) => copyOrMove(args, 'cp'),
  mv: (args) => copyOrMove(args, 'mv'),

  rm: (args) => {
    const recursive = args.some((a) => a.startsWith('-') && a.includes('r'));
    return args.filter((a) => !a.startsWith('-')).map((path) => {
      const parts = resolve(path);
      const node = find(parts);
      if (node === undefined) return 'rm: ' + path + ': No such file or directory';
      if (isFolder(node) && !recursive) return 'rm: ' + path + ': is a directory (use rm -r)';
      delete find(parts.slice(0, -1))[last(parts)];
      return '';
    }).join('\n').trim();
  },

  chmod: (args) => {
    const path = args[1];
    if (!path || find(resolve(path)) === undefined) return 'chmod: ' + (path || '') + ': No such file or directory';
    return '';   // real chmod prints nothing when it works
  },

  // grep text file      or      grep -rn text folder
  grep: (args) => {
    const words = args.filter((a) => !a.startsWith('-'));
    const showLine = args.some((a) => a.startsWith('-') && a.includes('n'));
    const search = words[0];
    const start = words[1] || '.';
    const found = [];

    function look(node, name) {
      if (isFolder(node)) {
        for (const child in node) look(node[child], name === '.' ? child : name + '/' + child);
        return;
      }
      node.split('\n').forEach((line, i) => {
        if (search && line.includes(search)) found.push(name + ':' + (showLine ? (i + 1) + ':' : '') + line);
      });
    }
    look(find(resolve(start)) || '', start);
    return found.join('\n');
  },

  git: (args) => {
    const answers = {
      status: 'On branch main\nnothing to commit, working tree clean',
      add: '',
      commit: '[main 1a2b3c4] ' + (args.slice(2).join(' ').replace(/"/g, '') || 'your message') + '\n 1 file changed',
      push: 'To github.com:you/project.git\n   0a1b2c3..1a2b3c4  main -> main',
      log: 'commit 1a2b3c4 (HEAD -> main)\n    Add notes',
      init: 'Initialized empty Git repository in /Users/you/.git/',
      clone: "Cloning into 'repo'...\ndone.",
      config: '',
      diff: '-old line\n+new line',
      show: 'commit 1a2b3c4\n    Add notes\n+Hello from notes.txt',
      remote: 'origin  https://github.com/you/project.git (fetch)\norigin  https://github.com/you/project.git (push)',
      pull: 'Already up to date.',
      fetch: '',
      branch: '* main\n  new-feature',
      switch: "Switched to branch '" + (args[args.length - 1] || 'main') + "'",
      merge: 'Fast-forward\n 1 file changed',
      restore: '',
      revert: '[main 2b3c4d5] Revert "Add notes"',
      stash: args[1] === 'pop' ? 'Your stashed changes are back.' : 'Saved working directory and index state WIP on main'
    };
    return args[0] in answers ? answers[args[0]] : 'git: try status, add, commit, push, pull, log, branch or switch';
  },

  brew: (args) => {
    const sub = args[0];
    const name = args[args.length - 1];
    if (sub === 'list') return state.brew.join('  ');
    if (sub === 'install') {
      if (!state.brew.includes(name)) state.brew.push(name);
      return '==> Downloading ' + name + '\n==> Installing ' + name + '\n' + name + ' is installed (practice, nothing was really installed)';
    }
    if (sub === 'uninstall') {
      state.brew = state.brew.filter((p) => p !== name);
      return 'Uninstalling ' + name + '... done';
    }
    const answers = {
      update: 'Already up-to-date.',
      upgrade: '==> Upgrading ' + (args[1] || 'all outdated packages') + '\nDone.',
      search: '==> Formulae\n' + name + '\n' + name + '-utils',
      info: name + ': stable 1.0 (practice)\nInstalled: ' + (state.brew.includes(name) ? 'yes' : 'no'),
      doctor: 'Your system is ready to brew.',
      cleanup: 'Removing old downloads... freed 120MB',
      services: (args[1] === 'stop' ? 'Stopped ' : 'Started ') + (args[2] || 'service') + ' (practice)',
      '--version': 'Homebrew 4.4.0 (practice)'
    };
    return sub in answers ? answers[sub] : 'brew: try install, list, info, search, update, upgrade, uninstall, doctor, cleanup or services';
  },

  reset: () => {
    state = freshState();
    return 'Terminal reset.';
  }
};

function firstOrLast(args, name) {
  const n = args.includes('-n') ? Number(args[args.indexOf('-n') + 1]) : 10;
  const path = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '-n')[0];
  const file = find(resolve(path || ''));
  if (typeof file !== 'string') return name + ': ' + path + ': No such file or directory';
  const lines = file.replace(/\n$/, '').split('\n');
  return (name === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n');
}

// cp and mv work the same way, except mv removes the original
function copyOrMove(args, name) {
  const [from, to] = args.filter((a) => !a.startsWith('-'));
  if (!from || !to) return name + ': needs two names, like: ' + name + ' a.txt b.txt';
  const fromParts = resolve(from);
  const node = find(fromParts);
  if (node === undefined) return name + ': ' + from + ': No such file or directory';

  // Into a folder keeps the name; otherwise it is the new name
  let toParts = resolve(to);
  if (isFolder(find(toParts))) toParts = toParts.concat(last(fromParts));
  const parent = find(toParts.slice(0, -1));
  if (!isFolder(parent)) return name + ': ' + to + ': No such file or directory';

  parent[last(toParts)] = JSON.parse(JSON.stringify(node));   // a copy
  if (name === 'mv') delete find(fromParts.slice(0, -1))[last(fromParts)];
  return '';
}

// ===== Run one line =====
function runCommand(line) {
  // Split into words; "quoted text" stays one word
  const words = (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((w) => w.replace(/^["']|["']$/g, ''));
  const [command, ...args] = words;
  if (!command) return '';
  if (!(command in COMMANDS)) return 'zsh: command not found: ' + command + '  (not in the practice terminal; type help to see what is)';
  const output = COMMANDS[command](args);
  saveState();
  return output;
}

// ===== The terminal on the page =====
const termOutput = document.getElementById('term-output');
const termInput = document.getElementById('term-input');
const termPrompt = document.getElementById('term-prompt');

function print(text) {
  termOutput.textContent += text + '\n';
  termOutput.scrollTop = termOutput.scrollHeight;
}

function typeCommand(line) {
  print(prompt() + ' ' + line);
  if (line.trim() === 'clear') termOutput.textContent = '';
  else {
    const output = runCommand(line);
    if (output) print(output);
  }
  termPrompt.textContent = prompt();
}

termInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const line = termInput.value;
    if (line.trim()) typed.push(line);
    historyIndex = typed.length;
    termInput.value = '';
    typeCommand(line);
  }
  // ↑ and ↓ go through the commands you typed before
  if (event.key === 'ArrowUp' && historyIndex > 0) {
    historyIndex--;
    termInput.value = typed[historyIndex];
    event.preventDefault();
  }
  if (event.key === 'ArrowDown' && historyIndex < typed.length) {
    historyIndex++;
    termInput.value = typed[historyIndex] || '';
  }
});

// Clicking anywhere in the terminal puts the cursor in the input
document.getElementById('terminal').addEventListener('click', () => termInput.focus());

termPrompt.textContent = prompt();
print('Practice terminal. Nothing here touches your real Mac. Type help to see the commands.');
