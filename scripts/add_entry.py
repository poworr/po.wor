#!/usr/bin/env python3
"""
po.wor — add an entry to any page of the site from a small window.

Run it from the project folder:
    python3 scripts/add_entry.py

Pick the page (Log, Pouvoir, Album, Cinematic or Creative), fill in the form and
click "Save & publish" (or "Save only"). The entry goes into that page's
JSON file (newest first); "Save & publish" also commits and pushes it to
GitHub, so the live site updates in a minute or two.
On the Log page an entry is a dated line. On Pouvoir, Album and Cinematic it
becomes a cover in the grid: the "Title" sits under the picture, the
"Subtitle" under the title, and the photo is the cover. Attached files
(one photo plus one audio or video file) are copied into the assets/
folder and linked from the entry.

You can add as many entries as you like for the same day. The newest one
you add shows first within that day.

Each entry can have one photo and one audio or video file; the site shows
them together when the entry is opened.
"""

import filecmp
import json
import re
import shutil
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except ImportError:  # some Python installs don't include tkinter
    tk = None

# The project root is one folder above this script.
ROOT = Path(__file__).resolve().parent.parent
LOG_JSON = ROOT / "log.json"

# The pages you can add to. "grid" pages show covers instead of a dated list.
PAGES = {
    "Log": {"file": LOG_JSON, "grid": False},
    "Pouvoir": {"file": ROOT / "pouvoir.json", "grid": True},
    "Album": {"file": ROOT / "albums.json", "grid": True},
    "Cinematic": {"file": ROOT / "cinematic.json", "grid": True},
    "Creative": {"file": ROOT / "creative.json", "grid": True},
}
ASSETS = ROOT / "assets"

# File types the site can show, grouped by the field name log.json uses.
MEDIA_TYPES = {
    "image": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".heic"},
    "audio": {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"},
    "video": {".mp4", ".mov", ".webm", ".m4v"},
}
WARN_MB = 50   # GitHub warns about files bigger than this
MAX_MB = 100   # GitHub refuses files bigger than this


# ---------- the data side (no window needed) ----------

def load_entries(path=None):
    """Read a JSON file (log.json by default) and return its list of entries."""
    path = path or LOG_JSON
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return []


def save_entries(entries, path=None):
    """Write entries to a JSON file (log.json by default), newest date first.

    Entries on the same date keep their order (sort is stable), so the one
    at the top of the list shows first on that day.
    """
    entries.sort(key=lambda e: e["date"], reverse=True)
    text = json.dumps(entries, indent=2, ensure_ascii=False) + "\n"
    (path or LOG_JSON).write_text(text, encoding="utf-8")


def current_streak(entries):
    """Count how many days in a row (ending today or yesterday) have an entry."""
    days = {e["date"] for e in entries}
    day = date.today()
    # If nothing today, the streak can still be alive from yesterday.
    if day.isoformat() not in days:
        day -= timedelta(days=1)
    streak = 0
    while day.isoformat() in days:
        streak += 1
        day -= timedelta(days=1)
    return streak


def media_kind(path):
    """Return 'image', 'audio' or 'video' for a file, or None if unsupported."""
    ext = Path(path).suffix.lower()
    for kind, extensions in MEDIA_TYPES.items():
        if ext in extensions:
            return kind
    return None


def validate(entry_date, text, link):
    """Return an error message, or None if the form is fine."""
    try:
        datetime.strptime(entry_date, "%Y-%m-%d")
    except ValueError:
        return "The date must look like 2026-10-19 (YYYY-MM-DD)."
    if not text:
        return "Write the one-line summary first."
    if link and not link.startswith(("http://", "https://")):
        return "The link should start with https://"
    return None


def copy_to_assets(source):
    """Copy a file into assets/ and return the path the site should use."""
    ASSETS.mkdir(exist_ok=True)
    # Clean the name so it works in a web address: "My Photo (1).JPG" -> "My-Photo-1.jpg"
    stem = re.sub(r"[^\w\-]+", "-", source.stem).strip("-") or "file"
    ext = source.suffix.lower()
    dest = ASSETS / f"{stem}{ext}"
    n = 1
    # Same name but different content? Add -1, -2, ... instead of overwriting.
    while dest.exists() and not filecmp.cmp(source, dest, shallow=False):
        dest = ASSETS / f"{stem}-{n}{ext}"
        n += 1
    if not dest.exists():
        shutil.copy2(source, dest)
    return f"assets/{dest.name}"


def build_entry(entry_date, text, tag, detail, link, media_paths=()):
    """Make one entry dictionary. Optional fields are only added if filled in."""
    entry = {"date": entry_date}
    if tag:
        entry["tag"] = tag
    entry["text"] = text
    if detail:
        entry["detail"] = detail
    for media_path in media_paths:
        kind = media_kind(media_path)
        if kind is None:
            raise ValueError(f"{media_path.name} isn't an image, audio or video file.")
        entry[kind] = copy_to_assets(media_path)
    if link:
        entry["link"] = link
    return entry


def publish(message):
    """Commit the JSON files and assets/, then push to GitHub.

    Returns (ok, text). Pulls first so changes made elsewhere (another
    computer, GitHub's website) are merged instead of rejected.
    """
    def git(*args):
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)

    files = [str(info["file"].relative_to(ROOT)) for info in PAGES.values()] + ["assets"]
    steps = [
        ("add", ["add", "--", *files]),
        ("commit", ["commit", "-m", message, "--", *files]),
        ("pull", ["pull", "--no-rebase", "--no-edit"]),
        ("push", ["push"]),
    ]
    for name, args in steps:
        result = git(*args)
        if result.returncode != 0:
            out = (result.stdout + result.stderr).strip()
            if name == "commit" and "nothing" in out:
                continue  # nothing new to commit; still push anything waiting
            return False, f"git {name} failed:\n{out}"
    return True, "Published ✓  The live site updates in a minute or two."


# ---------- the window ----------

class App:
    def __init__(self, root):
        self.root = root
        self.media_paths = {"photo": None, "sound": None}

        root.title("po.wor — new entry")
        root.resizable(False, False)
        frame = ttk.Frame(root, padding=16)
        frame.grid()

        # Variables that hold what you type.
        self.page_var = tk.StringVar(value="Log")
        self.date_var = tk.StringVar(value=date.today().isoformat())
        self.tag_var = tk.StringVar()
        self.text_var = tk.StringVar()
        self.link_var = tk.StringVar()
        self.media_vars = {"photo": tk.StringVar(value="no file"), "sound": tk.StringVar(value="no file")}
        self.status_var = tk.StringVar()

        def label(row, text):
            lab = ttk.Label(frame, text=text)
            lab.grid(row=row, column=0, sticky="ne", padx=(0, 10), pady=4)
            return lab

        label(0, "Page")
        self.page_box = ttk.Combobox(
            frame, textvariable=self.page_var, values=list(PAGES), width=14, state="readonly")
        self.page_box.grid(row=0, column=1, sticky="w", pady=4)
        self.page_box.bind("<<ComboboxSelected>>", lambda event: self.on_page_change())

        label(1, "Date")
        ttk.Entry(frame, textvariable=self.date_var, width=14).grid(row=1, column=1, sticky="w", pady=4)

        self.tag_label = label(2, "Tag")
        self.tag_box = ttk.Combobox(frame, textvariable=self.tag_var, width=30)
        self.tag_box.grid(row=2, column=1, sticky="w", pady=4)

        self.text_label = label(3, "One line")
        self.text_entry = ttk.Entry(frame, textvariable=self.text_var, width=52)
        self.text_entry.grid(row=3, column=1, columnspan=2, sticky="we", pady=4)

        label(4, "Detail")
        self.detail_box = tk.Text(frame, width=52, height=5, wrap="word")
        self.detail_box.grid(row=4, column=1, columnspan=2, pady=4)

        label(5, "Link")
        ttk.Entry(frame, textvariable=self.link_var, width=52).grid(row=5, column=1, columnspan=2, sticky="we", pady=4)

        self.media_label = label(6, "Photo")
        label(7, "Audio / video")
        for row, slot in ((6, "photo"), (7, "sound")):
            media_row = ttk.Frame(frame)
            media_row.grid(row=row, column=1, columnspan=2, sticky="w", pady=4)
            ttk.Button(media_row, text="Choose file…", command=lambda s=slot: self.choose_media(s)).pack(side="left")
            ttk.Button(media_row, text="Clear", command=lambda s=slot: self.clear_media(s)).pack(side="left", padx=6)
            ttk.Label(media_row, textvariable=self.media_vars[slot]).pack(side="left", padx=6)

        ttk.Label(frame, textvariable=self.status_var, wraplength=420).grid(
            row=8, column=0, columnspan=3, sticky="w", pady=(8, 0))

        buttons = ttk.Frame(frame)
        buttons.grid(row=9, column=0, columnspan=3, sticky="e", pady=(12, 0))
        ttk.Button(buttons, text="Close", command=root.destroy).pack(side="right")
        ttk.Button(buttons, text="Save only", command=lambda: self.save(push=False)).pack(side="right", padx=8)
        ttk.Button(buttons, text="Save & publish", command=self.save).pack(side="right")

        # Ctrl+Enter (or Cmd+Enter on a Mac) saves and publishes too.
        root.bind("<Control-Return>", lambda event: self.save())
        try:
            root.bind("<Command-Return>", lambda event: self.save())
        except tk.TclError:
            pass

        # On a Mac the window can open behind the terminal, so bring it to the front.
        root.lift()
        root.attributes("-topmost", True)
        root.after(300, lambda: root.attributes("-topmost", False))
        self.on_page_change()
        self.text_entry.focus_set()

    def page(self):
        return PAGES[self.page_var.get()]

    def on_page_change(self):
        """Relabel the form and refresh the tag list for the chosen page."""
        page = self.page()
        if page["grid"]:
            self.text_label.config(text="Title")
            self.tag_label.config(text="Subtitle")
            self.media_label.config(text="Cover photo")
        else:
            self.text_label.config(text="One line")
            self.tag_label.config(text="Tag")
            self.media_label.config(text="Photo")
        tags = sorted({e["tag"] for e in load_entries(page["file"]) if e.get("tag")})
        self.tag_box.config(values=tags)
        self.status_var.set("")

    def choose_media(self, slot):
        if slot == "photo":
            allowed = MEDIA_TYPES["image"]
            title = "Choose a photo"
        else:
            allowed = MEDIA_TYPES["audio"] | MEDIA_TYPES["video"]
            title = "Choose an audio or video file"
        chosen = filedialog.askopenfilename(
            title=title,
            filetypes=[("Allowed files", " ".join(sorted(allowed))), ("All files", "*.*")],
        )
        if not chosen:
            return
        path = Path(chosen)
        if path.suffix.lower() not in allowed:
            messagebox.showerror("Unsupported file", f"{path.suffix or 'That file'} doesn't fit here.")
            return
        size_mb = path.stat().st_size / 1024 / 1024
        self.media_paths[slot] = path
        self.media_vars[slot].set(f"{path.name} ({size_mb:.1f} MB)")

    def clear_media(self, slot=None):
        for s in ([slot] if slot else list(self.media_paths)):
            self.media_paths[s] = None
            self.media_vars[s].set("no file")

    def clear_form(self):
        self.date_var.set(date.today().isoformat())
        self.tag_var.set("")
        self.text_var.set("")
        self.link_var.set("")
        self.detail_box.delete("1.0", "end")
        self.clear_media()
        self.on_page_change_keep_status()
        self.text_entry.focus_set()

    def on_page_change_keep_status(self):
        status = self.status_var.get()
        self.on_page_change()
        self.status_var.set(status)

    def save(self, push=True):
        entry_date = self.date_var.get().strip()
        text = self.text_var.get().strip()
        tag = self.tag_var.get().strip()
        detail = self.detail_box.get("1.0", "end").strip()
        link = self.link_var.get().strip()

        error = validate(entry_date, text, link)
        if error:
            messagebox.showerror("Can't save yet", error)
            return

        page = self.page()
        entries = load_entries(page["file"])

        media = [p for p in self.media_paths.values() if p]
        for path in media:
            size_mb = path.stat().st_size / 1024 / 1024
            if size_mb > MAX_MB:
                messagebox.showerror(
                    "File too big",
                    f"{size_mb:.0f} MB is over GitHub's {MAX_MB} MB limit. "
                    "Compress it, or host it somewhere else and paste the link instead.",
                )
                return
            if size_mb > WARN_MB and not messagebox.askokcancel(
                "Big file",
                f"{size_mb:.0f} MB will make pushing slow, and GitHub warns about files over {WARN_MB} MB. Add it anyway?",
            ):
                return

        try:
            entry = build_entry(entry_date, text, tag, detail, link, media)
        except (OSError, ValueError) as err:
            messagebox.showerror("Couldn't save", str(err))
            return

        entries.insert(0, entry)  # newest on top, also among entries of the same day
        save_entries(entries, page["file"])

        if page["grid"]:
            done = f"Saved ✓  {len(entries)} on {self.page_var.get()}."
        else:
            done = f"Saved ✓  {len(entries)} entries, streak {current_streak(entries)} day(s)."
        self.clear_form()
        if not push:
            self.status_var.set(done + " Not published yet.")
            return
        self.status_var.set(done + " Publishing…")
        self.root.update()
        ok, message = publish(f"add {self.page_var.get()} entry: {text}")
        self.status_var.set(done + " " + message if ok else done + " Not published.")
        if not ok:
            messagebox.showerror("Couldn't publish", message + "\n\nYour entry is saved; try Save & publish again later.")


def main():
    if tk is None:
        print("This script needs tkinter, and your Python install doesn't include it.")
        print("If you installed Python with Homebrew, install the matching package,")
        print("for example:  brew install python-tk@3.13")
        print("Or install Python from https://www.python.org/downloads/ (it includes tkinter).")
        sys.exit(1)
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
