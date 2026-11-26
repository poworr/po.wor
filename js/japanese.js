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

  $('q-keywords').innerHTML = '';
  current.keywords.forEach(function (k) {
    const li = document.createElement('li');
    li.textContent = k.ja;
    if (k.reading !== k.ja) {
      const small = document.createElement('small');
      small.textContent = k.reading;
      li.appendChild(small);
    }
    $('q-keywords').appendChild(li);
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
    '<p class="level"></p>' +
    '<h2 class="sample-title"></h2>' +
    '<p class="sample-text"></p>' +
    '<p class="label">ここがいい</p>' +
    '<ul class="why"></ul>';
  card.querySelector('.level').textContent = s.level;
  card.querySelector('.sample-title').textContent = s.title;
  card.querySelector('.sample-text').textContent = s.text_ja;
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

// ===== Good Writing tab: one card per sample =====
SAMPLES.forEach(function (s) {
  const card = sampleCard(s);
  card.className = 'card';
  $('gallery').appendChild(card);
});

// ===== Start: reopen the last question, or pick a new one =====
const last = load('jp-current');
if (SAMPLES.some(function (s) { return s.id === last; })) show(last);
else nextQuestion();
