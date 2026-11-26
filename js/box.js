// When you click the box: the lid opens, a copy of the P logo pops up,
// gets thrown in an arc into the box, the lid closes, then the projects page opens.
// The logo on the left stays where it is.

const box = document.querySelector('.box');
const logo = document.querySelector('.logo');

box.addEventListener('click', function (event) {
  event.preventDefault(); // don't open the page yet, play the animation first

  // Make a copy of the logo, placed exactly on top of the real one
  const start = logo.getBoundingClientRect();
  const copy = logo.cloneNode();
  copy.style.position = 'fixed';
  copy.style.left = start.left + 'px';
  copy.style.top = start.top + 'px';
  copy.style.margin = '0';
  document.body.appendChild(copy);

  // How far the copy has to travel to reach the middle of the box
  const end = box.getBoundingClientRect();
  const x = (end.left + end.width / 2) - (start.left + start.width / 2);
  const y = (end.top + end.height / 2) - (start.top + start.height / 2);

  box.classList.add('open'); // 1. lid opens

  // 2. pop up, fly in an arc, drop into the box
  copy.animate([
    { transform: 'translate(0, 0) scale(1)' },                                  // start on the logo
    { transform: 'translate(0, -16px) scale(1.4)', offset: 0.2 },               // pop up
    { transform: 'translate(' + x / 2 + 'px, -80px) scale(0.9) rotate(180deg)' }, // top of the arc
    { transform: 'translate(' + x + 'px, ' + y + 'px) scale(0.2) rotate(360deg)', opacity: 0 } // into the box
  ], { duration: 900, easing: 'ease-in', fill: 'forwards' });

  setTimeout(function () { box.classList.add('shut'); }, 900);   // 3. lid closes
  setTimeout(function () { location.href = box.href; }, 1200);   // 4. open the page
});

// If you come back with the browser's Back button, reset the box and remove the copy.
window.addEventListener('pageshow', function () {
  box.classList.remove('open', 'shut');
  document.querySelectorAll('body > .logo').forEach(function (copy) { copy.remove(); });
});
