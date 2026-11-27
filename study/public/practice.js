// practice.js: the Lessons and Test tabs.
//
// Lessons come from data/lessons.json. Each lesson is one block like this:
//   { "id": "python-1", "lang": "python", "level": "Beginner", "title": "Say hello",
//     "task": "Print Hello, world!", "solution": "print(\"Hello, world!\")",
//     "expected": "Hello, world!", "remember": "a tip for remembering it (optional)",
//     "walkthrough": "how the solution works, line by line, then a common mistake" }
// "expected" is what your code must print. HTML, CSS, Terminal, Homebrew and Git can't be
// checked by output, so they use "mustInclude": the pieces your code must contain.

let lessons = [];
let lessonId = null;      // the lesson that is open
const drafts = {};        // what you typed in each lesson, so switching doesn't lose it

fetch('/api/lessons').then((r) => r.json()).then((data) => { lessons = data; });

// Lessons you solved, remembered in this browser.
// If storage is blocked (a private window), the ✓ marks just aren't kept: nothing else breaks.
let solved = [];
try { solved = JSON.parse(localStorage.getItem('study-solved')) || []; } catch (e) {}
function saveSolved() {
  try { localStorage.setItem('study-solved', JSON.stringify(solved)); } catch (e) {}
}

// C and C++ start with the part every program needs
const STARTERS = {
  c: '#include <stdio.h>\n\nint main(void) {\n    \n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    \n    return 0;\n}\n'
};

// ===== Lessons =====

function renderLessons() {
  const list = lessons.filter((l) => current === 'all' || l.lang === current);
  if (!list.some((l) => l.id === lessonId)) {
    lessonId = (list.find((l) => !solved.includes(l.id)) || list[0] || {}).id;   // first unsolved one
  }

  // One button per lesson; ✓ for solved ones
  lessonList.innerHTML = '';
  list.forEach((l) => {
    const number = lessons.filter((x) => x.lang === l.lang).indexOf(l) + 1;   // its number within its language
    const name = current === 'all' ? langs.find((x) => x.id === l.lang).name + ' ' : '';
    const button = document.createElement('button');
    button.className = 'btn small';
    button.textContent = name + number + '. ' + l.title + (solved.includes(l.id) ? ' ✓' : '');
    button.setAttribute('aria-pressed', l.id === lessonId);
    button.addEventListener('click', () => { lessonId = l.id; renderLessons(); });
    lessonList.appendChild(button);
  });

  const lesson = list.find((l) => l.id === lessonId);
  if (!lesson) {
    $('lesson-title').textContent = 'No lessons here yet.';
    return;
  }
  $('lesson-level').textContent = lesson.level;
  $('lesson-title').textContent = lesson.title;
  $('lesson-task').textContent = lesson.task;
  $('lesson-remember').textContent = lesson.remember ? 'Remember: ' + lesson.remember : '';
  $('lesson-remember').hidden = !lesson.remember;
  setEditorLanguage($('lesson-code'), lesson.lang);   // in editor.js
  $('lesson-code').value = drafts[lesson.id] !== undefined ? drafts[lesson.id] : STARTERS[lesson.lang] || '';
  $('lesson-solution').textContent = lesson.solution;
  $('lesson-solution').hidden = true;
  $('lesson-walkthrough').textContent = lesson.walkthrough || '';
  $('lesson-explain').hidden = true;
  $('lesson-output').textContent = '';
  $('lesson-result').textContent = '';
  $('lesson-preview').hidden = lesson.lang !== 'html' && lesson.lang !== 'css';
  $('lesson-preview').srcdoc = framePage('');   // empty, in the app's colours (framePage is in app.js)
}

function openLesson() {
  return lessons.find((l) => l.id === lessonId);
}

// Run the code and return what it printed
async function runLesson() {
  const lesson = openLesson();
  const code = $('lesson-code').value;
  let output = '';

  if (lesson.lang === 'html') {
    $('lesson-preview').srcdoc = framePage(code);
  } else if (lesson.lang === 'css') {
    $('lesson-preview').srcdoc = framePage(CSS_SAMPLE) + '<style>' + code + '</style>';   // CSS_SAMPLE is in app.js
  } else if (langs.find((l) => l.id === lesson.lang).runs === 'terminal') {   // Terminal, Homebrew, Git
    // Each line goes through the practice terminal (terminal.js)
    output = code.split('\n').filter((line) => line.trim()).map((line) => {
      const result = runCommand(line);
      return prompt() + ' ' + line + (result ? '\n' + result : '');
    }).join('\n');
  } else {
    $('lesson-output').textContent = 'Running…';
    // JavaScript lessons print with console.log, so Node.js can run them
    output = await runOnServer(lesson.lang === 'javascript' ? 'node' : lesson.lang, code);
  }
  $('lesson-output').textContent = output;
  return output;
}

// Compare ignoring spaces at the ends of lines
const tidy = (text) => text.split('\n').map((line) => line.trimEnd()).join('\n').trim();
// Compare ignoring all spaces and upper/lower case
const squash = (text) => text.toLowerCase().replace(/\s+/g, '');

async function checkLesson() {
  const lesson = openLesson();
  const output = await runLesson();
  let right;

  if (lesson.expected !== undefined) {
    right = tidy(output) === tidy(lesson.expected);
    if (!right) $('lesson-output').textContent = 'Your output:\n' + output + '\n\nIt should print:\n' + lesson.expected;
  } else {
    const missing = lesson.mustInclude.filter((piece) => !squash($('lesson-code').value).includes(squash(piece)));
    right = missing.length === 0;
    if (!right) $('lesson-output').textContent += (output ? '\n\n' : '') + 'Still missing: ' + missing.join('   ');
  }

  $('lesson-result').textContent = right ? '✓ Correct!' : 'Not yet, try again.';
  if (right) $('lesson-explain').hidden = !lesson.walkthrough;   // now see why it works
  if (right && !solved.includes(lesson.id)) {
    solved.push(lesson.id);
    saveSolved();
    lessonList.querySelector('[aria-pressed="true"]').textContent += ' ✓';
  }
}

$('lesson-code').addEventListener('input', () => { drafts[lessonId] = $('lesson-code').value; });
$('lesson-run').addEventListener('click', runLesson);
$('lesson-check').addEventListener('click', checkLesson);
$('lesson-show').addEventListener('click', () => {
  const show = $('lesson-solution').hidden;
  $('lesson-solution').hidden = !show;
  $('lesson-explain').hidden = !show || !openLesson().walkthrough;   // the solution comes with how it works
});
codeKeys($('lesson-code'), runLesson);   // codeKeys is in app.js

// ===== Test: 10 random syntax cards of this language. Type each from memory. =====

let test = { items: [], index: 0, missed: [] };

function startTest() {
  // Every card, with its language name; with "All" picked, from every language
  const cards = langs.filter((l) => current === 'all' || l.id === current)
    .flatMap((l) => l.items.map((item) => ({ ...item, langName: l.name })));
  const shuffled = cards.sort(() => Math.random() - 0.5);
  test = { items: shuffled.slice(0, 10), index: 0, missed: [] };
  $('test-done').hidden = true;
  showQuestion();
}

function showQuestion() {
  const done = test.index >= test.items.length;
  $('test-done').hidden = !done;
  $('test-ask').hidden = done;
  $('test-check').hidden = true;
  $('test-answer').hidden = done;
  $('test-category').hidden = done;
  $('test-question').hidden = done;

  if (done) {
    const right = test.items.length - test.missed.length;
    $('test-progress').textContent = '';
    $('test-score').textContent = 'You got ' + right + ' of ' + test.items.length + '.' +
      (test.missed.length ? ' Look again at: ' + test.missed.map((i) => i.category).join(', ') + '.' : ' Perfect!');
    return;
  }

  const item = test.items[test.index];
  $('test-progress').textContent = 'Question ' + (test.index + 1) + ' of ' + test.items.length;
  $('test-category').textContent = (current === 'all' ? item.langName + ' · ' : '') + item.category;
  $('test-question').textContent = item.explain;
  $('test-answer').value = '';
  $('test-answer').focus();
}

function revealAnswer() {
  const item = test.items[test.index];
  $('test-solution').textContent = item.syntax;
  $('test-remember').textContent = item.remember ? 'Remember: ' + item.remember : '';
  $('test-remember').hidden = !item.remember;
  $('test-ask').hidden = true;
  $('test-check').hidden = false;
}

function nextQuestion(gotIt) {
  if (!gotIt) test.missed.push(test.items[test.index]);
  test.index++;
  showQuestion();
}

$('test-reveal').addEventListener('click', revealAnswer);
$('test-right').addEventListener('click', () => nextQuestion(true));
$('test-wrong').addEventListener('click', () => nextQuestion(false));
$('test-again').addEventListener('click', startTest);
codeKeys($('test-answer'), revealAnswer);   // ⌘↵ shows the answer
