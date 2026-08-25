#!/usr/bin/env python3
"""Synthesise the reel's audio bed.

Everything here is generated from scratch (sine partials + envelopes), so the
clip ships with no third-party music licence attached. Deliberately quiet and
unobtrusive: a slow four-chord pad, a low pulse under the "pressure" beat, and
soft marker pings on the copy changes.
"""

import math
import struct
import wave

import numpy as np

SR = 44100


def env(n, attack, release, sustain_level=1.0):
    e = np.ones(n) * sustain_level
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    a = min(a, n)
    r = min(r, n - a) if n > a else 0
    e[:a] = np.linspace(0, sustain_level, a)
    if r:
        e[n - r:] = np.linspace(sustain_level, 0, r)
    return e


def voice(freq, dur, t0, total_n, gain, attack=1.2, release=1.6, detune=0.4):
    """One soft pad note: fundamental plus two quiet partials, gently detuned."""
    n = int(dur * SR)
    start = int(t0 * SR)
    n = min(n, total_n - start)
    if n <= 0:
        return np.zeros(total_n)
    t = np.arange(n) / SR
    sig = np.sin(2 * math.pi * freq * t)
    sig += 0.45 * np.sin(2 * math.pi * (freq + detune) * t)
    sig += 0.22 * np.sin(2 * math.pi * freq * 2 * t)
    sig += 0.09 * np.sin(2 * math.pi * freq * 3 * t)
    sig *= 1 + 0.035 * np.sin(2 * math.pi * 0.18 * t)  # slow breathing
    out = np.zeros(total_n)
    out[start:start + n] = sig * env(n, attack, release) * gain
    return out


def ping(freq, t0, total_n, gain, dur=1.1):
    n = min(int(dur * SR), total_n - int(t0 * SR))
    if n <= 0:
        return np.zeros(total_n)
    t = np.arange(n) / SR
    sig = (np.sin(2 * math.pi * freq * t) + 0.3 * np.sin(2 * math.pi * freq * 2.01 * t))
    sig *= np.exp(-t * 4.2)
    out = np.zeros(total_n)
    out[int(t0 * SR):int(t0 * SR) + n] = sig * gain
    return out


def pulse(t0, t1, total_n, gain, rate=1.35, freq=62.0):
    n = min(int((t1 - t0) * SR), total_n - int(t0 * SR))
    if n <= 0:
        return np.zeros(total_n)
    t = np.arange(n) / SR
    beat = (0.5 + 0.5 * np.sin(2 * math.pi * rate * t - math.pi / 2)) ** 3
    sig = np.sin(2 * math.pi * freq * t) * beat
    sig *= env(n, 0.6, 1.0)
    out = np.zeros(total_n)
    out[int(t0 * SR):int(t0 * SR) + n] = sig * gain
    return out


def echo(sig, delay=0.34, decay=0.3, taps=3):
    out = sig.copy()
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = decay ** k
        out[k * d:] += sig[: len(sig) - k * d] * g
    return out


CHORDS = [
    # (start, duration, [frequencies])  — Am7 / Fmaj7 / Cmaj / Gsus-ish
    (0.0, 5.2, [220.00, 261.63, 329.63, 392.00]),
    (3.6, 4.4, [174.61, 220.00, 261.63, 349.23]),
    (7.4, 3.6, [130.81, 196.00, 261.63, 329.63]),
    (10.2, 4.0, [196.00, 246.94, 293.66, 392.00]),
    (13.4, 3.4, [174.61, 261.63, 349.23, 440.00]),
]


def build(duration=16.0, path="score.wav"):
    total_n = int(duration * SR)
    mix = np.zeros(total_n)

    for t0, dur, freqs in CHORDS:
        for i, f in enumerate(freqs):
            mix += voice(f, dur, t0, total_n, gain=0.115 / (1 + 0.35 * i), attack=1.1, release=1.5)

    mix = echo(mix, delay=0.36, decay=0.26, taps=3)

    # Low heartbeat under the impaction beats.
    mix += pulse(3.8, 10.0, total_n, gain=0.16)

    # Soft markers on each copy change and the outro.
    for t0, f, g in [(0.7, 880, 0.055), (3.7, 987.77, 0.05), (6.6, 1174.66, 0.05),
                     (10.1, 1318.51, 0.05), (13.45, 1567.98, 0.075)]:
        mix += echo(ping(f, t0, total_n, g), delay=0.28, decay=0.22, taps=2)

    # Global fade in/out so nothing clicks.
    mix *= env(total_n, 0.9, 1.6)

    peak = np.max(np.abs(mix))
    if peak > 0:
        mix *= 0.62 / peak          # leave headroom; this is a bed, not a track

    stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)
    stereo[:, 1] *= 0.94
    data = np.clip(stereo, -1, 1)
    pcm = (data * 32767).astype("<i2")

    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return path


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="score.wav")
    ap.add_argument("--duration", type=float, default=16.0)
    a = ap.parse_args()
    print("wrote", build(a.duration, a.out))
