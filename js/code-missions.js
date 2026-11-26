// Missions for the code study page (code.html).
//
// Each mission is one { ... } block. To add one, copy a block, paste it at
// the end (with a comma between blocks), give it a new id, and change it.
//
//   id      a short unique name
//   lang    "html", "css" or "js"
//   level   "Beginner", "Intermediate", "Advanced" or "Master"
//   title   shown at the top
//   goal    what you are building, in one or two sentences
//   html    (CSS missions only) the HTML the CSS is applied to
//   lines   the answer, step by step. Each step has:
//             code     the code (can be more than one line, use \n)
//             explain  what it does, in plain words (one line, used as the
//                      hint in Recall mode, so don't put */ or --> in it)

const MISSIONS = [

  // ===== HTML =====
  {
    id: "html-first-page",
    lang: "html",
    level: "Beginner",
    title: "Your first web page",
    goal: "Every web page is built from tags. Write a heading and two paragraphs.",
    lines: [
      { code: "<h1>Hello, world</h1>", explain: "h1 is the biggest heading. Text goes between the opening <h1> and the closing </h1>." },
      { code: "<p>This is my first web page.</p>", explain: "p makes a paragraph of text." },
      { code: "<p>I am learning <strong>HTML</strong>.</p>", explain: "strong makes words bold. A tag can sit inside another tag." }
    ]
  },
  {
    id: "html-links-list",
    lang: "html",
    level: "Beginner",
    title: "Links and lists",
    goal: "Make a bulleted list of two websites. Each one is a link you can click.",
    lines: [
      { code: "<h2>My favorite sites</h2>", explain: "h2 is a smaller heading than h1." },
      { code: "<ul>", explain: "ul starts a bulleted (unordered) list." },
      { code: "  <li><a href=\"https://developer.mozilla.org\">MDN</a></li>", explain: "li is one item in the list. a is a link, and href is where the link goes." },
      { code: "  <li><a href=\"https://github.com\">GitHub</a></li>", explain: "A second item, written the same way." },
      { code: "</ul>", explain: "Close the list." }
    ]
  },
  {
    id: "html-form",
    lang: "html",
    level: "Beginner",
    title: "A simple form",
    goal: "Make a text box with a label and a button, like a sign-up form.",
    lines: [
      { code: "<label for=\"name\">Your name</label>", explain: "label is the text that describes a box. for= must match the box's id." },
      { code: "<input id=\"name\" type=\"text\" placeholder=\"Type here\">", explain: "input is a box you can type in. It has no closing tag. placeholder is the gray hint text." },
      { code: "<button>Send</button>", explain: "A button you can click." }
    ]
  },

  // ===== CSS =====
  {
    id: "css-colors",
    lang: "css",
    level: "Beginner",
    title: "Colors and fonts",
    goal: "Give the page a dark background, light text, and a big monospace heading.",
    html: "<h1>Hello</h1>\n<p>Styling text with CSS.</p>",
    lines: [
      { code: "body {\n  background: #111;\n  color: white;\n}", explain: "body is the whole page. background sets its color, color sets the text color. Each line is property: value;" },
      { code: "h1 {\n  font-family: monospace;\n  font-size: 48px;\n}", explain: "Pick every h1 and change its font and its size." },
      { code: "p {\n  color: gray;\n}", explain: "Make every paragraph gray." }
    ]
  },
  {
    id: "css-box",
    lang: "css",
    level: "Beginner",
    title: "The box model",
    goal: "Everything on a page is a box. Give one box a size, inner space, a border and outer space.",
    html: "<div class=\"box\">I am a box</div>",
    lines: [
      { code: ".box {", explain: "Pick elements with class=\"box\". A dot means class." },
      { code: "  width: 200px;", explain: "Make it 200 pixels wide." },
      { code: "  padding: 20px;", explain: "padding is space inside, between the text and the border." },
      { code: "  border: 2px solid black;", explain: "A 2 pixel solid black line around the box." },
      { code: "  margin: 40px;", explain: "margin is space outside, pushing other things away." },
      { code: "}", explain: "Close the rule." }
    ]
  },
  {
    id: "css-center",
    lang: "css",
    level: "Beginner",
    title: "Center anything with flexbox",
    goal: "Put a red circle in the exact middle of a box.",
    html: "<div class=\"stage\">\n  <div class=\"dot\"></div>\n</div>",
    lines: [
      { code: ".stage {", explain: "Pick the outer box." },
      { code: "  display: flex;", explain: "Turn on flexbox, so this box can arrange what is inside it." },
      { code: "  justify-content: center;", explain: "Center what is inside from left to right." },
      { code: "  align-items: center;", explain: "Center what is inside from top to bottom." },
      { code: "  height: 200px;", explain: "Give the box some height, so there is room to center in." },
      { code: "}", explain: "Close the rule." },
      { code: ".dot { width: 40px; height: 40px; background: tomato; border-radius: 50%; }", explain: "A 40 pixel square. border-radius: 50% rounds it into a circle." }
    ]
  },

  // ===== JavaScript =====
  {
    id: "js-variables",
    lang: "js",
    level: "Beginner",
    title: "Variables and printing",
    goal: "Store a name and an age, change the age, and print a sentence.",
    lines: [
      { code: "const name = \"Ada\";", explain: "const makes a variable that will not change. Text goes in quotes (a string)." },
      { code: "let age = 20;", explain: "let makes a variable that can change. Numbers need no quotes." },
      { code: "age = age + 1;", explain: "Change age: take the old value and add 1." },
      { code: "console.log(name + \" is \" + age);", explain: "console.log prints to the output. + joins pieces of text together." }
    ]
  },
  {
    id: "js-if",
    lang: "js",
    level: "Beginner",
    title: "Making decisions with if",
    goal: "Print a different message depending on a test score.",
    lines: [
      { code: "const score = 72;", explain: "The score we will check." },
      { code: "if (score >= 80) {", explain: "if runs the next block only when the check is true. >= means greater than or equal." },
      { code: "  console.log(\"Great!\");", explain: "Runs when score is 80 or more." },
      { code: "} else if (score >= 50) {", explain: "else if: when the first check was false, try another one." },
      { code: "  console.log(\"Pass\");", explain: "Runs when score is 50 to 79." },
      { code: "} else {", explain: "else runs when none of the checks above were true." },
      { code: "  console.log(\"Try again\");", explain: "Runs when score is under 50." },
      { code: "}", explain: "Close the last block." }
    ]
  },
  {
    id: "js-loop",
    lang: "js",
    level: "Beginner",
    title: "Repeating with a for loop",
    goal: "Print Line 1 to Line 5 without writing console.log five times.",
    lines: [
      { code: "for (let i = 1; i <= 5; i++) {", explain: "Start i at 1. Keep going while i <= 5. Add 1 to i after each round (i++)." },
      { code: "  console.log(\"Line \" + i);", explain: "This runs once per round, with the current i." },
      { code: "}", explain: "Close the loop." }
    ]
  },
  {
    id: "js-function",
    lang: "js",
    level: "Beginner",
    title: "Functions",
    goal: "Write a greet function once, then use it with different names.",
    lines: [
      { code: "function greet(name) {", explain: "function makes reusable code. name is a parameter: a value you hand in." },
      { code: "  return \"Hello, \" + name + \"!\";", explain: "return sends a value back to the code that called the function." },
      { code: "}", explain: "Close the function." },
      { code: "console.log(greet(\"Ada\"));", explain: "Call greet with Ada and print what it returns." },
      { code: "console.log(greet(\"Lin\"));", explain: "Same function, different name." }
    ]
  },
  {
    id: "js-array",
    lang: "js",
    level: "Beginner",
    title: "Lists (arrays)",
    goal: "Make a list of fruits, add one, count them, and print each one.",
    lines: [
      { code: "const fruits = [\"apple\", \"banana\", \"cherry\"];", explain: "An array is a list inside [ ], with items split by commas." },
      { code: "fruits.push(\"mango\");", explain: "push adds an item to the end of the list." },
      { code: "console.log(fruits.length);", explain: "length is how many items are in the list (now 4)." },
      { code: "for (const fruit of fruits) {", explain: "for...of goes through the list one item at a time." },
      { code: "  console.log(fruit);", explain: "Print the current item." },
      { code: "}", explain: "Close the loop." }
    ]
  }
];
