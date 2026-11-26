// po.wor — the only JavaScript on the site.

// Footer year.
document.getElementById('year').textContent = new Date().getFullYear();

// The box: click to open/close. Clicking elsewhere or pressing Esc closes it.
const box = document.querySelector('.box-menu');
const boxButton = document.getElementById('box-toggle');

function setBoxOpen(open) {
  box.classList.toggle('open', open);
  boxButton.setAttribute('aria-expanded', String(open));
}

boxButton.addEventListener('click', () => setBoxOpen(!box.classList.contains('open')));
document.addEventListener('click', (e) => { if (!box.contains(e.target)) setBoxOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setBoxOpen(false); });
