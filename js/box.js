// When you click the box: the lid opens, the P logo flies into the box,
// the lid closes, then the projects page opens.

const box = document.querySelector('.box');
const logo = document.querySelector('.logo');

box.addEventListener('click', function (event) {
  event.preventDefault(); // don't open the page yet, play the animation first

  // How far the logo has to travel to reach the middle of the box
  const from = logo.getBoundingClientRect();
  const to = box.getBoundingClientRect();
  const x = (to.left + to.width / 2) - (from.left + from.width / 2);
  const y = (to.top + to.height / 2) - (from.top + from.height / 2);

  box.classList.add('open');                                        // 1. lid opens
  logo.classList.add('flying');
  logo.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(0.2)'; // 2. P flies in

  setTimeout(function () { box.classList.add('shut'); }, 750);      // 3. lid closes
  setTimeout(function () { location.href = box.href; }, 1050);      // 4. open the page
});

// If you come back with the browser's Back button, put everything back.
window.addEventListener('pageshow', function () {
  box.classList.remove('open', 'shut');
  logo.classList.remove('flying');
  logo.style.transform = '';
});
