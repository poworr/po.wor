# po.wor

A one-page site: the P logo top-left, a box icon top-right.
Click the box and the lid opens with a small panel underneath.
No JavaScript: the box is an HTML `<details>` element, which opens and closes by itself.

## Files

```
po.wor/
  index.html        the page. Add links inside <nav class="panel"> to fill the box.
  css/style.css     the look: colors, font, the box animation
  images/logo.png   the logo and browser-tab icon
```

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
If you change `css/style.css`, bump the `?v=` number in `index.html`
so browsers load the new version. The year in the footer is typed in `index.html`.
