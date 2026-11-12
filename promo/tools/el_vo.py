#!/usr/bin/env python3
"""Voice-over with ElevenLabs: vo/<scene>.mp3 + sentence .srt (from character timestamps) + durations.json.
Usage: python3 el_vo.py [voice_id] [model_id] [outdir] [only,these,scenes]
The API key is read from promo/.elevenlabs_key (or ELEVENLABS_KEY_FILE); keep it out of git."""
import base64, json, os, re, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
KEY = open(os.path.expanduser(os.environ.get('ELEVENLABS_KEY_FILE', os.path.join(HERE, '..', '.elevenlabs_key')))).read().strip()
# Putri Maharani - Neutral and Witty (Bahasa Indonesia)
voice = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '-' else 'I7sakys8pBZ1Z5f0UhT9'
model = sys.argv[2] if len(sys.argv) > 2 else 'eleven_multilingual_v2'
out = sys.argv[3] if len(sys.argv) > 3 else 'vo'
only = sys.argv[4].split(',') if len(sys.argv) > 4 else None
os.makedirs(out, exist_ok=True)
lines = json.load(open('vo.json'))
from pron import spoken
# The voice gets the text from pron.spoken (only acronyms change); subtitles keep the written text.
texts = [spoken(t) for _, t in lines]

def written_sentences(text):
    return [m.strip() for m in re.findall(r'[^.?!]*[.?!]+|[^.?!]+$', text) if m.strip()]

def srt_t(x):
    ms = int(round(x * 1000)); return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'

durs = json.load(open(f'{out}/durations.json')) if os.path.exists(f'{out}/durations.json') else {}
for i, (k, text) in enumerate(lines):
    if only and k not in only:
        continue
    # Putri Maharani's settings from the ERP promo, with a little more style for a livelier read.
    body = {'text': texts[i], 'model_id': model,
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True, 'speed': 1.05}}
    if model != 'eleven_v3':
        body['previous_text'] = texts[i - 1] if i else ''
        body['next_text'] = texts[i + 1] if i + 1 < len(texts) else ''
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                                 data=json.dumps(body).encode(), headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open(f'{out}/{k}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    al = d.get('normalized_alignment') or d['alignment']
    chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    # sentence blocks
    blocks, cur, a = [], '', None
    for c, s, e in zip(chars, st, en):
        if a is None and c.strip():
            a = s
        cur += c
        if c in '.?!' :
            if cur.strip(): blocks.append((a, e, cur.strip()))
            cur, a = '', None
    if cur.strip(): blocks.append((a if a is not None else st[0], en[-1], cur.strip()))
    shown = written_sentences(text)
    if len(shown) == len(blocks):
        blocks = [(a, z, w) for (a, z, _), w in zip(blocks, shown)]
    else:
        print(k, 'WARNING: sentence count differs, subtitles show the spoken spelling')
    with open(f'{out}/{k}.srt', 'w') as f:
        for n, (a, z, t) in enumerate(blocks, 1):
            f.write(f'{n}\n{srt_t(a)} --> {srt_t(z)}\n{t}\n\n')
    durs[k] = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{out}/{k}.mp3']))
    print(k, round(durs[k], 2))
json.dump(durs, open(f'{out}/durations.json', 'w'), indent=1)
print('total', round(sum(durs.values()), 1))
