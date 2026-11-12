#!/usr/bin/env python3
"""Fun, bouncy music bed for the promo, synthesized here so there is no third-party audio.
Usage: python3 music.py <out.wav> <seconds>
132 BPM in C major with only major chords (C - F - G - F): four-on-the-floor kick, handclaps,
shaker, a bouncy octave bass, off-beat ukulele-like chord stabs, a marimba arpeggio and a
playful whistle melody that answers itself every bar."""
import array, math, random, struct, sys, wave

RATE = 44100
BPM = 132
BEAT = 60 / BPM
STEP = BEAT / 4  # one 16th note

# (bass root, chord tones) per bar, as MIDI note numbers
PROGRESSION = [
    (48, [60, 64, 67, 72]),  # C
    (41, [60, 65, 69, 72]),  # F
    (43, [62, 67, 71, 74]),  # G
    (41, [60, 65, 69, 72]),  # F
]
ARP_PATTERN = [0, 2, 1, 3, 0, 2, 1, 3, 3, 1, 2, 0, 3, 1, 2, 0]
# whistle melody, two bars per phrase: (16th within the 2 bars, note, length in 16ths)
MELODY = [
    [(0, 76, 2), (2, 79, 2), (4, 84, 3), (8, 81, 1), (9, 79, 1), (10, 76, 2), (12, 79, 4),
     (16, 77, 2), (18, 81, 2), (20, 84, 2), (22, 81, 2), (24, 79, 6)],
    [(0, 79, 2), (2, 76, 1), (3, 79, 1), (4, 81, 2), (6, 79, 2), (8, 84, 4), (12, 83, 2), (14, 81, 2),
     (16, 79, 2), (18, 77, 2), (20, 76, 2), (22, 74, 2), (24, 72, 6)],
]


def freq(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def add(buf, start_s, samples, gain):
    i0 = int(start_s * RATE)
    n = min(len(samples), len(buf) - i0)
    for k in range(max(0, n)):
        buf[i0 + k] += samples[k] * gain


def tone(note, length, decay, harmonics=((1, 1.0),), attack=0.004, vibrato=0.0):
    f = freq(note)
    out, phase = [], 0.0
    for k in range(int(length * RATE)):
        t = k / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        fm = f * (1 + vibrato * math.sin(2 * math.pi * 5.5 * t) * min(1.0, t / 0.15))
        phase += 2 * math.pi * fm / RATE
        out.append(env * sum(a * math.sin(phase * h) for h, a in harmonics))
    return out


def kick():
    out, phase = [], 0.0
    for k in range(int(0.25 * RATE)):
        t = k / RATE
        phase += 2 * math.pi * (55 + 110 * math.exp(-t / 0.025)) / RATE
        out.append(math.sin(phase) * math.exp(-t / 0.08))
    return out


def noise_hit(length, decay, bright, seed=7, bursts=1):
    rnd = random.Random(seed)
    out, prev = [], 0.0
    for k in range(int(length * RATE)):
        t = k / RATE
        x = rnd.uniform(-1, 1)
        y = x - prev * bright  # crude high-pass: brighter for hats and shakers
        prev = x
        # a handclap is a few quick bursts
        env = max(math.exp(-((t - b * 0.011) if t >= b * 0.011 else 9) / decay) for b in range(bursts))
        out.append(y * env)
    return out


def render(seconds):
    buf = array.array('f', bytes(4 * int(seconds * RATE + RATE)))
    k_s = kick()
    clap_s = noise_hit(0.22, 0.045, 0.5, seed=3, bursts=3)
    shaker_s = noise_hit(0.06, 0.018, 0.98, seed=11)
    open_s = noise_hit(0.2, 0.07, 0.95, seed=5)
    cache = {}

    def cached(key, make):
        if key not in cache:
            cache[key] = make()
        return cache[key]

    bars = int(seconds / (4 * BEAT)) + 1
    for bar in range(bars):
        t0 = bar * 4 * BEAT
        root, chord = PROGRESSION[bar % 4]
        intro = bar < 2  # arpeggio and shaker first, then the groove drops in
        for s in range(16):
            ts = t0 + s * STEP
            add(buf, ts, shaker_s, 0.05 if s % 2 else 0.03)
        for beat in range(4):
            tb = t0 + beat * BEAT
            if intro:
                continue
            add(buf, tb, k_s, 0.4)
            if beat in (1, 3):
                add(buf, tb, clap_s, 0.3)
            add(buf, tb + BEAT / 2, open_s, 0.05)
            # bouncy octave bass with a pickup on the last 16th
            add(buf, tb, cached(('b', root), lambda: tone(root, BEAT / 2, 0.1, ((1, 1.0), (2, 0.4), (3, 0.2)))), 0.3)
            add(buf, tb + BEAT / 2, cached(('b', root + 12), lambda: tone(root + 12, BEAT / 4, 0.06, ((1, 1.0), (2, 0.3)))), 0.22)
            add(buf, tb + 3 * STEP, cached(('b', root + 7), lambda: tone(root + 7, BEAT / 4, 0.05, ((1, 1.0), (2, 0.3)))), 0.15)
            # off-beat ukulele-like stab
            for n in chord[:3]:
                add(buf, tb + BEAT / 2, cached(('u', n), lambda: tone(n, 0.25, 0.07, ((1, 1.0), (2, 0.5), (3, 0.25), (5, 0.1)), 0.002)), 0.07)
        for s, idx in enumerate(ARP_PATTERN):
            n = chord[idx] + 12
            add(buf, t0 + s * STEP, cached(('m', n), lambda: tone(n, 0.3, 0.07, ((1, 1.0), (4, 0.2), (10, 0.05)))), 0.09)
        if not intro and bar % 2 == 0:
            phrase = MELODY[(bar // 2) % 2]
            for s, n, ln in phrase:
                add(buf, t0 + s * STEP, cached(('w', n, ln), lambda: tone(n, ln * STEP + 0.08, 0.35, ((1, 1.0), (2, 0.06)), 0.015, 0.006)), 0.11)

    peak = max(abs(x) for x in buf) or 1.0
    return [x / peak * 0.85 for x in buf[:int(seconds * RATE)]]


def main():
    out, seconds = sys.argv[1], float(sys.argv[2])
    samples = render(seconds)
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x)) * 32767)) for x in samples))


if __name__ == '__main__':
    main()
