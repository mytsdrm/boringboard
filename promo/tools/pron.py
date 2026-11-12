"""Spoken form for the Bahasa Indonesia voice: English and IT terms are respelled the Indonesian way
so the voice pronounces them in English (AI -> "Ei Ai", dashboard -> "desbor").
Subtitles keep the written text from vo.json. A respelling must not add or remove . ? or !,
because subtitle sentences are matched to the audio one by one."""
import re

# Longer phrases first, so "task board" wins over "task" and "board".
PRON = [
    ("BoringBoard", "Boring Bord"),
    ("project dot creativework dot asia", "projek, dot, kriyetif werk, dot, eisya"),
    ("project management", "projek menejmen"), ("project tasks", "projek tesks"), ("project", "projek"),
    ("task board", "tesk bord"), ("taskbar", "teskbar"), ("tasks", "tesks"), ("task", "tesk"),
    ("dashboard", "desbor"), ("board", "bord"),
    ("recent activity", "risen aktiviti"), ("Activity logs", "Aktiviti logs"),
    ("update", "apdet"), ("login", "log-in"),
    ("Backlog", "Beklog"), ("Done", "Dan"), ("drag and drop", "dreg en drop"),
    ("priority", "praioriti"), ("label", "leibel"), ("assignee", "esaini"), ("reviewer", "rivyuer"),
    ("due date", "diu deit"), ("checklist", "ceklis"),
    ("spreadsheet", "spredsyit"), ("table view", "teibel vyu"), ("Calendar view", "Kelender vyu"),
    ("Gallery view", "Geleri vyu"), ("view", "vyu"), ("preview", "privyu"), ("sort", "sort"),
    ("urgent", "erjen"), ("high", "hai"), ("deadline", "dedlain"),
    ("developer", "divelopper"), ("repository", "ripositori"), ("dev branch", "dev brenc"),
    ("prod branch", "prod brenc"), ("URL", "Yu Ar El"), ("environment", "envairenmen"), ("header", "heder"),
    ("Share", "Syer"), ("role", "rol"), ("copy link", "kopi link"),
    ("template", "templet"), ("Sprint planner", "Sprin plener"), ("roadmap", "rodmep"),
    ("Appearance", "Apirens"), ("Midnight", "Midnait"), ("Classic", "Klesik"), ("Sand", "Send"),
    ("accent color", "eksen kaler"), ("layout", "leiaut"), ("macOS", "Mek O Es"), ("Windows", "Windos"),
    ("Users", "Yusers"), ("user", "yuser"), ("group", "grup"), ("admin", "edmin"),
    ("System Settings", "Sistem Setings"), ("timezone", "taimzon"), ("AI provider", "Ei Ai provaider"),
    ("AI", "Ei Ai"), ("module", "modyul"), ("reminder", "rimainder"), ("announcement", "enaunsmen"),
    ("plugin", "plagin"), ("workspace", "werkspeis"), ("logo", "logo"),
]
# One pass over the text, so a respelling is never respelled again ("Ei Ai" must not match "AI").
_LOOKUP = {a.lower(): b for a, b in PRON}
_PATTERN = re.compile(r'(?<![\w])(' + '|'.join(re.escape(a) for a, _ in PRON) + r')(?![\w])', re.I)


def spoken(text):
    return _PATTERN.sub(lambda m: _LOOKUP[m.group(1).lower()], text)


if __name__ == '__main__':
    import json
    for key, text in json.load(open('vo.json')):
        print(key, spoken(text))
