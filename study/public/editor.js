// editor.js: turns the Playground and Lesson code boxes into Monaco, the editor inside VS Code.
// You get Emmet (type ul>li*3 or ! then Tab), auto-closing tags and brackets, suggestions,
// colours and line numbers. The Test box stays plain, so you still type from memory there.
//
// The rest of the app keeps using the <textarea>: box.value still reads and writes the code,
// because below we make .value talk to the editor. If Monaco can't load, the plain box still works.

// Our language ids → Monaco's language ids
const MONACO_LANGS = {
  html: 'html', css: 'css', javascript: 'javascript', node: 'javascript',
  python: 'python', c: 'c', cpp: 'cpp', terminal: 'shell', homebrew: 'shell', git: 'shell'
};

// app.js and practice.js call this when the language changes
function setEditorLanguage(box, langId) {
  box.dataset.lang = langId;   // remembered, in case the editor isn't ready yet
  if (box.editor) monaco.editor.setModelLanguage(box.editor.getModel(), MONACO_LANGS[langId] || 'plaintext');
}

// Light or dark, like the Mac
const dark = window.matchMedia('(prefers-color-scheme: dark)');
const themeName = () => (dark.matches ? 'vs-dark' : 'vs');

// Swap one <textarea> for an editor. run is what ⌘↵ does.
function makeEditor(box, run) {
  const holder = document.createElement('div');
  holder.className = 'monaco-box';
  box.after(holder);
  box.style.display = 'none';   // the old box stays, hidden

  const editor = monaco.editor.create(holder, {
    value: box.value,
    language: MONACO_LANGS[box.dataset.lang] || 'plaintext',
    theme: themeName(),
    fontFamily: 'Menlo, Monaco, monospace',
    fontSize: 13,
    tabSize: 2,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true   // follows the box when it is resized or shown
  });
  box.editor = editor;

  // box.value now reads and writes the editor
  Object.defineProperty(box, 'value', {
    get: () => editor.getValue(),
    set: (text) => editor.setValue(text)
  });
  box.focus = () => editor.focus();

  // Typing still fires 'input' on the box (practice.js saves drafts with it)
  editor.onDidChangeModelContent((event) => {
    box.dispatchEvent(new Event('input'));
    closeTag(editor, event);
  });

  // ⌘↵ (Ctrl+Enter) runs, like before
  // (an action, so it wins over Monaco's own ⌘↵ "insert line below"; it is also in the F1 list)
  editor.addAction({
    id: 'run-code',
    label: 'Run code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter],
    run: () => run()
  });
}

// HTML: when you type the > of <p>, add </p> after the cursor (VS Code does this too).
// Not for void elements like <img>, which have no closing tag.
const VOID = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];
function closeTag(editor, event) {
  const model = editor.getModel();
  if (model.getLanguageId() !== 'html' || event.isUndoing || event.isRedoing) return;
  const change = event.changes[0];
  if (event.changes.length !== 1 || change.text !== '>') return;   // only when you typed a >
  const line = change.range.startLineNumber;
  const end = change.range.startColumn + 1;                        // just after the >
  const before = model.getLineContent(line).slice(0, end - 1);
  const tag = before.match(/<([a-zA-Z][\w-]*)(?:\s[^<>]*)?>$/);   // <tag ...> right before the cursor
  if (!tag || VOID.includes(tag[1].toLowerCase()) || before.endsWith('/>')) return;
  // Wait until Monaco has finished typing the >, then add the closing tag
  queueMicrotask(() => {
    editor.executeEdits('close-tag', [{ range: new monaco.Range(line, end, line, end), text: '</' + tag[1] + '>' }]);
    editor.setPosition({ lineNumber: line, column: end });        // the cursor stays between the tags
  });
}

// Load Monaco from the server (server.js serves node_modules/monaco-editor at /vs),
// once app.js and practice.js have loaded (they come after this file)
window.addEventListener('DOMContentLoaded', () => {
  require.config({ paths: { vs: '/vs' } });
  require(['vs/editor/editor.main'], () => {
    emmetMonaco.emmetHTML(monaco, ['html']);   // Emmet in HTML…
    emmetMonaco.emmetCSS(monaco, ['css']);     // …and in CSS
    makeEditor($('code'), runCode);
    makeEditor($('lesson-code'), runLesson);
    dark.addEventListener('change', () => monaco.editor.setTheme(themeName()));
  });
});
