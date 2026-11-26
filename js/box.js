// When you click the box: a small P pops up next to the box,
// gets tossed into it like a hand throwing it, the lid closes,
// then the projects page opens. The logo on the left doesn't move.

const box = document.querySelector('.box');
const logo = document.querySelector('.logo');

box.addEventListener('click', function (event) {
  event.preventDefault(); // don't open the page yet, play the animation first

  // Where the box is on the screen
  const b = box.getBoundingClientRect();
  const size = 28;   // size of the popped-up P
  const gap = 48;    // how far left of the box it appears

  // Make a small copy of the logo, just left of the box
  const p = logo.cloneNode();
  p.style.position = 'fixed';
  p.style.width = size + 'px';
  p.style.height = size + 'px';
  p.style.left = (b.left + b.width / 2 - size / 2 - gap) + 'px';
  p.style.top = (b.top + b.height / 2 - size / 2) + 'px';
  document.body.appendChild(p);

  box.classList.add('open', 'tapped'); // lid opens, bubble shows (for phones)

  p.animate([
    { transform: 'scale(0)', opacity: 0 },                                        // nothing
    { transform: 'scale(1.2)', opacity: 1, offset: 0.2 },                         // pop up
    { transform: 'scale(1)', offset: 0.3 },                                       // settle
    { transform: 'translate(-8px, 6px) rotate(-25deg)', offset: 0.5 },            // wind up (pull back)
    { transform: 'translate(' + gap * 0.6 + 'px, -36px) rotate(120deg) scale(0.8)', offset: 0.75 }, // toss up and over
    { transform: 'translate(' + gap + 'px, 0) rotate(220deg) scale(0.2)', opacity: 0 } // drop into the box
  ], { duration: 1100, easing: 'ease-in-out', fill: 'forwards' });

  setTimeout(function () { box.classList.add('shut'); }, 1100);  // lid closes
  setTimeout(function () { location.href = box.href; }, 1400);   // open the page
});

// Phones have no hover, so tapping the logo or あ shows its bubble
// and bounce first, then opens the page a moment later.
const phone = matchMedia('(hover: none)').matches;
document.querySelectorAll('.home, .write').forEach(function (link) {
  link.addEventListener('click', function (event) {
    if (!phone) return; // computers already saw the bubble on hover
    event.preventDefault();
    link.classList.add('tapped');
    setTimeout(function () { location.href = link.href; }, 900);
  });
});

// If you come back with the browser's Back button, reset everything and remove the copy.
window.addEventListener('pageshow', function () {
  box.classList.remove('open', 'shut');
  document.querySelectorAll('.tapped').forEach(function (link) { link.classList.remove('tapped'); });
  document.querySelectorAll('body > .logo').forEach(function (copy) { copy.remove(); });
});
