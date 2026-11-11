#!/usr/bin/env python3
"""Upbeat music bed for the promo, synthesized here so there is no third-party audio.
Usage: python3 music.py <out.wav> <seconds>
124 BPM pop groove in C major (C - G - Am - F): kick, clap, hi-hats, bouncy bass,
a marimba-like 16th-note arpeggio and a short whistle-ish hook every other phrase."""
import array, math, random, struct, sys, wave

RATE = 44100
BPM = 124
BEAT = 60 / BPM
STEP = BEAT / 4  # one 16th note

# chord per bar (4 beats), as MIDI note numbers
PROGRESSION = [
    (48, [60, 64, 67, 72]),  # C
    (43, [59, 62, 67, 71]),  # G
    (45, [60, 64, 69, 72]),  # Am
    (41, [60, 65, 69, 72]),  # F
]
ARP_PATTERN = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 1, 0, 1, 2, 3]
HOOK = [(0, 76, 2), (2, 79, 2), (4, 81, 1), (5, 79, 1), (6, 76, 2), (10, 74, 2), (12, 72, 4)]  # (16th, note, length)


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def add(buf, start_s, samples, gain):
    i0 = int(start_s * RATE)
    n = min(len(samples), len(buf) - i0)
    for k in range(max(0, n)):
        buf[i0 + k] += samples[k] * gain


def tone(note, length, decay, harmonics=((1, 1.0),), attack=0.004):
    f = freq(note)
    n = int(length * RATE)
    out = []
    for k in range(n):
        t = k / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        out.append(env * sum(a * math.sin(2 * math.pi * f * h * t) for h, a in harmonics))
    return out


def kick():
    out, phase = [], 0.0
    for k in range(int(0.28 * RATE)):
        t = k / RATE
        phase += 2 * math.pi * (50 + 90 * math.exp(-t / 0.03)) / RATE
        out.append(math.sin(phase) * math.exp(-t / 0.09))
    return out


def noise_hit(length, decay, bright):
    rnd = random.Random(7)
    out, prev = [], 0.0
    for k in range(int(length * RATE)):
        x = rnd.uniform(-1, 1)
        y = x - prev * bright  # crude high-pass: brighter for hats
        prev = x
        out.append(y * math.exp(-(k / RATE) / decay))
    return out


def render(seconds):
    buf = array.array('f', bytes(4 * int(seconds * RATE + RATE)))
    k_s, clap_s, hat_s, open_s = kick(), noise_hit(0.2, 0.05, 0.3), noise_hit(0.05, 0.012, 0.95), noise_hit(0.18, 0.06, 0.95)
    cache = {}

    def cached(key, make):
        if key not in cache:
            cache[key] = make()
        return cache[key]

    bars = int(seconds / (4 * BEAT)) + 1
    for bar in range(bars):
        t0 = bar * 4 * BEAT
        root, chord = PROGRESSION[bar % 4]
        intro = bar < 2  # first two bars: arpeggio and hats only, so the groove builds in
        for beat in range(4):
            tb = t0 + beat * BEAT
            if not intro:
                add(buf, tb, k_s, 0.35)
                if beat in (1, 3):
                    add(buf, tb, clap_s, 0.22)
            for e in range(2):
                add(buf, tb + e * BEAT / 2, open_s if (e == 1 and beat == 3) else hat_s, 0.07 if e else 0.05)
            if not intro:
                # bouncy bass: root on the beat, octave on the off-beat
                add(buf, tb, cached(('b', root), lambda: tone(root, BEAT / 2, 0.12, ((1, 1.0), (2, 0.35), (3, 0.15)))), 0.32)
                add(buf, tb + BEAT / 2, cached(('b', root + 12), lambda: tone(root + 12, BEAT / 2, 0.08, ((1, 1.0), (2, 0.3)))), 0.2)
        for s, idx in enumerate(ARP_PATTERN):
            n = chord[idx]
            add(buf, t0 + s * STEP, cached(('m', n), lambda: tone(n, 0.35, 0.09, ((1, 1.0), (4, 0.18), (10, 0.04)))), 0.18)
        if not intro and bar % 8 in (4, 5):
            for s, n, ln in HOOK:
                add(buf, t0 + s * STEP, cached(('h', n, ln), lambda: tone(n, ln * STEP + 0.1, 0.25, ((1, 1.0), (2, 0.08)), 0.02)), 0.09)

    peak = max(abs(x) for x in buf) or 1.0
    return [x / peak * 0.8 for x in buf[:int(seconds * RATE)]]


def main():
    out, seconds = sys.argv[1], float(sys.argv[2])
    samples = render(seconds)
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x)) * 32767)) for x in samples))


if __name__ == '__main__':
    main()
