// Japanese Writing Practice
// Questions and model writings come from SAMPLES in js/japanese-data.js.

const $ = function (id) { return document.getElementById(id); };
let current = null;   // the sample the current question comes from

// ===== Tabs =====
document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
  });
});

// ===== Saving (localStorage can fail in private mode, so ignore errors) =====
function save(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// ===== Picking questions: shuffle all, use each once, then reshuffle =====
function shuffledIds() {
  const ids = SAMPLES.map(function (s) { return s.id; });
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function nextQuestion() {
  let queue = JSON.parse(load('jp-queue') || '[]')
    .filter(function (id) { return SAMPLES.some(function (s) { return s.id === id; }); });
  if (queue.length === 0) {
    queue = shuffledIds();
    if (current && queue[0] === current.id) queue.push(queue.shift()); // no repeat across a reshuffle
  }
  const id = queue.shift();
  save('jp-queue', JSON.stringify(queue));
  show(id);
}

// ===== Show one question =====
function show(id) {
  current = SAMPLES.find(function (s) { return s.id === id; });
  save('jp-current', id);

  $('q-level').textContent = current.level;
  $('q-text').textContent = current.question_ja;

  $('q-points').innerHTML = '';
  current.points.forEach(function (point) {
    const li = document.createElement('li');
    li.textContent = point;
    $('q-points').appendChild(li);
  });

  // Hide the example again
  $('example').hidden = true;
  $('example').innerHTML = '';
  $('example').appendChild(sampleCard(current));
  $('show-example').textContent = 'お手本を見る';
  $('show-example').setAttribute('aria-expanded', 'false');
}

// ===== Buttons =====
$('next').addEventListener('click', nextQuestion);

$('show-example').addEventListener('click', function () {
  const box = $('example');
  box.hidden = !box.hidden;
  this.textContent = box.hidden ? 'お手本を見る' : 'お手本を閉じる';
  this.setAttribute('aria-expanded', !box.hidden);
});

// ===== Model writing card (used by the example and the gallery) =====
function sampleCard(s) {
  const card = document.createElement('article');
  card.innerHTML =
    '<span class="tag"></span>' +
    '<h2 class="sample-title"></h2>' +
    '<p class="label"></p>' +
    '<p class="sample-text"></p>' +
    '<p class="label">ここがいい</p>' +
    '<ul class="why"></ul>';
  card.querySelector('.tag').textContent = s.level;
  card.querySelector('.sample-title').textContent = s.title;
  // How many characters (line breaks don't count), the plain paragraph, then the same on 原稿用紙
  card.querySelector('.label').textContent = '文字数：' + [...s.text_ja.replace(/\n/g, '')].length + '字';
  card.querySelector('.sample-text').textContent = s.text_ja;
  card.querySelector('.sample-text').after(genko(s.title, s.text_ja));
  s.why_good.forEach(function (point) {
    const li = document.createElement('li');
    li.textContent = point;
    card.querySelector('.why').appendChild(li);
  });

  // Credit where the paragraph came from (only if source is filled in)
  if (s.source) {
    const credit = document.createElement('p');
    credit.className = 'source';
    credit.textContent = '出典：';
    const link = document.createElement('a');
    link.textContent = s.source;
    link.href = s.source_url;
    credit.appendChild(link);
    card.appendChild(credit);
  }
  return card;
}

// ===== 原稿用紙: the paragraph written in squares, 20 per row =====
// The usual rules for horizontal 原稿用紙:
//   - the title starts after 2 empty squares; each paragraph starts after 1
//   - one character per square, punctuation and small kana too
//   - 。、」 can't start a row: they squeeze into the last square of the row above
//   - 「 can't end a row: it moves to the next row
//   - 。」 share one square; numbers and small letters go 2 per square
//   - ？ and ！ are followed by an empty square
const COLS = 20;
const NO_ROW_START = '。、」』）';
const NO_ROW_END = '「『（';

// Split text into what goes in each square
function squares(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1] || '';
    if (/[0-9a-z]/.test(c) && /[0-9a-z]/.test(next)) { out.push(c + next); i++; continue; }
    if ('。、'.includes(c) && '」』'.includes(next) && next) { out.push(c + next); i++; continue; }
    out.push(c);
    if ('？！'.includes(c) && next && !'」』'.includes(next)) out.push('');
  }
  return out;
}

// Put the squares into rows of 20
function genkoRows(title, text) {
  const rows = [];
  let row = [];
  function endRow() {
    if (row.length) {
      while (row.length < COLS) row.push('');
      rows.push(row);
    }
    row = [];
  }
  function put(square) {
    if (row.length === COLS) endRow();
    if (row.length === 0 && rows.length && square && NO_ROW_START.includes(square[0])) {
      rows[rows.length - 1][COLS - 1] += square;   // squeeze into the row above
      return;
    }
    if (row.length === COLS - 1 && NO_ROW_END.includes(square)) endRow();
    row.push(square);
  }

  ['', ''].concat(squares(title)).forEach(put);
  endRow();
  text.split('\n').forEach(function (paragraph) {
    [''].concat(squares(paragraph)).forEach(put);
    endRow();
  });
  while (rows.length % 5) { row = ['']; endRow(); }   // finish the block of 5 rows (100 squares)
  return rows;
}

function genko(title, text) {
  const paper = document.createElement('div');
  paper.className = 'genko';
  genkoRows(title, text).forEach(function (cells, r) {
    const line = document.createElement('div');
    line.className = 'genko-row';
    cells.forEach(function (text) {
      const cell = document.createElement('span');
      cell.textContent = text;
      if ([...text].length === 2) cell.className = 'two';            // 2 in one square
      else if ('。、'.includes(text) && text) cell.className = 'mark'; // sits low, like on paper
      line.appendChild(cell);
    });
    if ((r + 1) % 5 === 0) line.dataset.count = (r + 1) * COLS;       // 100, 200, ... at the side
    paper.appendChild(line);
  });
  return paper;
}

// ===== Good Writing tab: one card per sample =====
SAMPLES.forEach(function (s) {
  const card = sampleCard(s);
  card.className = 'panel';
  $('gallery').appendChild(card);
});

// ===== Start: reopen the last question, or pick a new one =====
const last = load('jp-current');
if (SAMPLES.some(function (s) { return s.id === last; })) show(last);
else nextQuestion();
