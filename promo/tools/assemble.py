#!/usr/bin/env python3
"""Assemble recorded parts + voice-over + subtitles + music bed into the final MP4."""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
REC, VO, BUILD = f'{ROOT}/rec', f'{ROOT}/' + os.environ.get('VO_DIR', 'vo'), f'{ROOT}/build'
os.makedirs(BUILD, exist_ok=True)
FPS, XF_PART, XF_SCENE, LEAD, TAIL, EXTRA = 30, 0.35, 0.5, 0.35, 0.65, 1.0
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{ROOT}/promo.mp4'

SCENES = [
    ('s01', ['s01a', 's01b'], 'fade'), ('s02', ['s02'], 'fade'), ('s03', ['s03'], 'smoothleft'),
    ('s04', ['s04'], 'fade'), ('s05', ['s05a', 's05b'], 'smoothleft'), ('s06', ['s06'], 'smoothleft'),
    ('s07', ['s07'], 'smoothleft'), ('s08', ['s08'], 'smoothleft'), ('s09', ['s09'], 'fade'),
    ('s10', ['s10'], 'fade'), ('s11', ['s11a', 's11b'], 'smoothleft'), ('s12', ['s11c'], 'fade'),
    # admin
    ('s13', ['a01', 'a02'], 'fadeblack'), ('s14', ['a03'], 'smoothleft'), ('s15', ['a04'], 'smoothleft'),
    ('s16', ['a05a', 'a05b'], 'smoothleft'), ('s17', ['a06a', 'a06b'], 'smoothleft'), ('s18', ['outro'], 'fade'),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd)[:600]); print(r.stderr[-2500:]); sys.exit(1)
    return r.stdout

def dur(f):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))

vod = json.load(open(f'{VO}/durations.json'))

# 1) each part -> CFR mp4
def part_mp4(p):
    out = f'{BUILD}/{p}.mp4'
    if not os.path.exists(f'{REC}/{p}/list.txt'):
        return out if os.path.exists(out) else None
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(f'{REC}/{p}/list.txt'):
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{REC}/{p}/list.txt',
             '-vf', f'fps={FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', out])
    return out

# 2) each scene: join parts with xfade, then fit to VO length
scene_files, scene_lens = [], []
for sid, parts, _ in SCENES:
    files = [f for f in (part_mp4(p) for p in parts) if f]
    target_min = vod[sid] + LEAD + TAIL
    if len(files) == 1:
        joined = files[0]
    else:
        joined = f'{BUILD}/{sid}_joined.mp4'
        inputs, fc, prev, off = [], [], '[0:v]', 0.0
        for i, f in enumerate(files):
            inputs += ['-i', f]
        for i in range(1, len(files)):
            off += dur(files[i - 1]) - XF_PART
            lab = f'[x{i}]'
            fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={XF_PART}:offset={off:.3f}{lab}')
            prev = lab
        run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', prev,
             '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-r', str(FPS), joined])
    L = dur(joined)
    target = max(target_min, min(L, target_min + EXTRA), L / 1.5)
    speed = L / target if L > target else 1.0
    pad = max(0.0, target - L / speed)
    out = f'{BUILD}/scene_{sid}.mp4'
    vf = f'setpts=PTS/{speed:.4f},fps={FPS}'
    if pad > 0.01:
        vf += f',tpad=stop_mode=clone:stop_duration={pad:.3f}'
    vf += f',trim=duration={target:.3f},setpts=PTS-STARTPTS,format=yuv420p'
    run(['ffmpeg', '-v', 'error', '-y', '-i', joined, '-vf', vf, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', out])
    scene_files.append(out); scene_lens.append(target)
    print(f'{sid}: video {L:.1f}s -> {target:.1f}s (speed {speed:.2f}, pad {pad:.1f}, vo {vod[sid]:.1f})')

# 3) chain scenes with transitions; compute scene starts
starts, t = [], 0.0
for i, L in enumerate(scene_lens):
    starts.append(t); t += L - XF_SCENE
total = starts[-1] + scene_lens[-1]
inputs, fc, prev = [], [], '[0:v]'
for f in scene_files:
    inputs += ['-i', f]
for i in range(1, len(scene_files)):
    tr = SCENES[i][2]
    lab = f'[v{i}]'
    fc.append(f'{prev}[{i}:v]xfade=transition={tr}:duration={XF_SCENE}:offset={starts[i]:.3f}{lab}')
    prev = lab
video = f'{BUILD}/video.mp4'
run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', prev,
     '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-r', str(FPS), video])

# 4) voice track: each VO at scene start + LEAD (+ half the incoming transition)
vo_inputs, vo_fc, labs = [], [], []
for i, (sid, _, _) in enumerate(SCENES):
    vo_inputs += ['-i', f'{VO}/{sid}.mp3']
    ms = int((starts[i] + LEAD + (XF_SCENE / 2 if i else 0)) * 1000)
    vo_fc.append(f'[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]'); labs.append(f'[a{i}]')
vo_fc.append(''.join(labs) + f'amix=inputs={len(labs)}:normalize=0,apad=whole_dur={total:.3f}[vo]')
voice = f'{BUILD}/voice.wav'
run(['ffmpeg', '-v', 'error', '-y', *vo_inputs, '-filter_complex', ';'.join(vo_fc), '-map', '[vo]', '-ac', '2', voice])

# 5) upbeat music bed, synthesized by music.py (no third-party audio)
music_raw, music = f'{BUILD}/music_raw.wav', f'{BUILD}/music.wav'
run([sys.executable, f'{ROOT}/music.py', music_raw, f'{total:.3f}'])
run(['ffmpeg', '-v', 'error', '-y', '-i', music_raw,
     '-af', f'aresample=48000,aecho=0.8:0.6:90|170:0.18|0.1,volume=0.4,afade=t=in:d=1.5,afade=t=out:st={total-3:.3f}:d=3',
     '-ac', '2', music])

# 6) subtitles (ASS) from per-scene sentence timings, split into short chunks
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f'{h}:{m:02d}:{s:05.2f}'
def srt_time(s):
    h, m, rest = s.split(':'); sec, ms = rest.split(','); return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000
events = []
for i, (sid, _, _) in enumerate(SCENES):
    base = starts[i] + LEAD + (XF_SCENE / 2 if i else 0)
    blocks = open(f'{VO}/{sid}.srt').read().strip().split('\n\n')
    for b in blocks:
        lines = b.strip().split('\n')
        a, z = [srt_time(x.strip()) for x in lines[1].split('-->')]
        text = ' '.join(lines[2:]).strip().replace('project dot creativework dot asia', 'project.creativework.asia')
        words = text.split(); chunks, cur = [], ''
        for w in words:
            if len(cur) + len(w) + 1 > 52 and cur:
                chunks.append(cur); cur = w
            else:
                cur = (cur + ' ' + w).strip()
        if cur: chunks.append(cur)
        totc = sum(len(c) for c in chunks); t0 = a
        for c in chunks:
            t1 = t0 + (z - a) * len(c) / totc
            events.append((base + t0, base + t1, c)); t0 = t1
ass = f'{BUILD}/subs.ass'
with open(ass, 'w') as f:
    f.write('[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n'
            '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
            'Style: Sub,Noto Sans,46,&H00FFFFFF,&H00FFFFFF,&H64101828,&H64101828,1,0,0,0,100,100,0,0,3,14,0,2,80,80,58,1\n\n'
            '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
    for a, z, c in events:
        f.write(f'Dialogue: 0,{ts(a)},{ts(z)},Sub,,0,0,0,,{c}\n')

# 7) final mux: video + subs, voice + ducked music
run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', voice, '-i', music, '-filter_complex',
     f"[0:v]ass={ass}[v];[2:a][1:a]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[m];[1:a][m]amix=inputs=2:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=11[a]",
     '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
     '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', f'{total:.3f}', OUT])
nosub = OUT.replace('.mp4', '_nosub.mp4')
run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', OUT, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
     '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', nosub])
print(f'total {total:.1f}s -> {OUT}')
