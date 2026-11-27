// footer.js: the icons at the bottom left of every page, to move around po.wor.
// When there are more than fit, slide left and right with two fingers on the trackpad.
//
// To add a project: copy a line. name shows in the bubble, href is the page, icon is what you see.
const PROJECTS = [
  { name: 'home',     href: 'index.html',    icon: '<img class="logo" src="images/logo.png" alt="">' },
  { name: 'planner',  href: 'planner.html',  icon: '•' },
  { name: 'japanese', href: 'japanese.html', icon: 'あ' },
  { name: 'box',      href: 'box.html',      icon:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">' +
    '<path d="M4 7.5 L4 16.5 L12 21 L20 16.5 L20 7.5"/><path d="M4 7.5 L12 12 L20 7.5 M12 12 L12 21"/>' +
    '<path class="lid" d="M4 7.5 L12 3 L20 7.5 L12 12 Z"/></svg>' }
];

// The page you're on ("" is the home page)
const here = location.pathname.split('/').pop() || 'index.html';

for (const project of PROJECTS) {
  const link = document.createElement('a');
  link.className = 'nav-' + project.name; // nav-box gets the lid that opens
  link.href = project.href;
  link.dataset.tip = project.name;        // the bubble
  link.setAttribute('aria-label', project.name);
  if (project.href === here) link.setAttribute('aria-current', 'page');   // dark: you are here
  link.innerHTML = '<span>' + project.icon + '</span>';   // the span is what bounces
  document.getElementById('footer-nav').appendChild(link);
}
