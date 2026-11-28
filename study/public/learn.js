// learn.js: the Learn tab. Plain-language pages about what each language is for,
// how they connect, and what clean code looks like.
//
// The pages come from data/learn.json. One page looks like this:
//   { "id": "python", "group": "Languages", "title": "Python: readable and everywhere",
//     "sections": [ { "h": "Its job", "p": ["..."], "code": "...", "bad": "...", "good": "...", "why": "..." } ],
//     "check": [ { "q": "a question", "a": "its answer" } ],
//     "sources": [ { "title": "PEP 8", "url": "https://..." } ],
//     "practise": "hardware" }   // optional: which lessons the Practise button opens (else the page id)
// Every part of a section except "h" is optional.

let pages = [];
let pageId = null;   // the page that is open

fetch('/api/learn').then((r) => r.json()).then((data) => { pages = data; });

// Make an element with some text in it. textContent, so the text is never run as HTML.
function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderLearn() {
  if (pages.length === 0) return;
  if (!pageId) pageId = pages.some((p) => p.id === current) ? current : pages[0].id;   // start on the open language
  const page = pages.find((p) => p.id === pageId);
  $('tab').textContent = page.id + '.learn';
  renderLearnExplorer();
  renderPage(page);
}

// The explorer lists the pages, in their groups (Start here, Languages, Tools)
function renderLearnExplorer() {
  $('languages').innerHTML = '';
  for (const group of new Set(pages.map((p) => p.group))) {
    $('languages').appendChild(el('li', group, 'side-title'));
    for (const page of pages.filter((p) => p.group === group)) {
      const button = el('button', page.title.split(':')[0]);   // "Python: readable…" → "Python"
      button.className = 'page-link';
      button.setAttribute('aria-current', page.id === pageId);
      button.addEventListener('click', () => {
        pageId = page.id;
        render();
        $('learn').scrollIntoView();
      });
      const li = el('li');
      li.appendChild(button);
      $('languages').appendChild(li);
    }
  }
}

function renderPage(page) {
  const learn = $('learn');
  learn.innerHTML = '';
  learn.appendChild(el('h1', page.title, 'page-title'));

  for (const section of page.sections) {
    learn.appendChild(el('h2', section.h, 'section-title'));
    for (const text of section.p) learn.appendChild(el('p', text));
    if (section.code) learn.appendChild(el('pre', section.code, 'code-block'));
    if (section.bad) {
      learn.appendChild(el('p', '✗ messy', 'label bad'));
      learn.appendChild(el('pre', section.bad, 'code-block'));
      learn.appendChild(el('p', '✓ clean', 'label good'));
      learn.appendChild(el('pre', section.good, 'code-block'));
    }
    if (section.why) learn.appendChild(el('p', 'Why: ' + section.why, 'why'));
  }

  // Feynman check: answer in your own words first, then open the answer
  learn.appendChild(el('h2', 'Explain it back', 'section-title'));
  learn.appendChild(el('p', 'Say your answer out loud, in plain words, before you open it.', 'muted'));
  for (const item of page.check) {
    const details = el('details');
    details.appendChild(el('summary', item.q));
    details.appendChild(el('p', item.a));
    learn.appendChild(details);
  }

  // A language page leads to its lessons. Other pages can name theirs: "practise": "hardware"
  const lessonLang = page.practise || page.id;
  const lang = langs.find((l) => l.id === lessonLang);
  if (lang) {
    const practice = el('button', '→ Practise it: open the ' + lang.name + ' lessons', 'btn');
    practice.addEventListener('click', () => {
      current = lessonLang;
      setMode('lessons');   // in app.js
    });
    learn.appendChild(practice);
  }

  learn.appendChild(el('h2', 'Sources', 'section-title'));
  const list = el('ul', '', 'sources');
  for (const source of page.sources) {
    const link = el('a', source.title);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    const li = el('li');
    li.appendChild(link);
    list.appendChild(li);
  }
  learn.appendChild(list);
}
