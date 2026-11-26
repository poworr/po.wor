# po.wor

A one-page site: the P logo top-left, a box icon top-right.
Click the box and the lid opens with a small panel underneath.

## Files

- `index.html`: the page. Add links inside `<nav class="box-panel">` to fill the box.
- `style.css`: the look. Colors and font are at the top.
- `script.js`: opens and closes the box.
- `P-logo-small.png`: the logo and browser-tab icon.

## Preview on your Mac

```
python3 -m http.server 8000
```

Then open http://localhost:8000

## Publish

```
git add -A
git commit -m "your message"
git push
```

GitHub Pages updates https://poworr.github.io/po.wor/ in a minute or two.
If you change `style.css` or `script.js`, bump the `?v=` number in `index.html`
so browsers load the new version.
