"""Spoken form for the Bahasa Indonesia voice. English terms stay as written; only acronyms the voice
would read the Indonesian way are respelled (AI -> "Ei Ai").
Subtitles keep the written text from vo.json. A respelling must not add or remove . ? or !,
because subtitle sentences are matched to the audio one by one."""
import re

# English words go to the voice exactly as written: the multilingual model says them in English.
# Only acronyms that the Indonesian voice would spell out letter by letter in Indonesian are listed here.
PRON = [
    ("AI", "Ei Ai"),
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
