#!/usr/bin/env python3
"""Render the impacted-wisdom-tooth explainer reel (9:16, 720x1280, 24fps).

Builds an animated social clip from a single still of an impacted lower
wisdom tooth. Beats: establish -> pressure -> consequences -> assessment
-> Celestial Dental outro.

Usage:  python3 render.py --source <image.jpg> --out <video.mp4>
"""

import argparse
import math
import os
import shutil
import subprocess
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 720, 1280
FPS = 24

# Brand palette (mirrors src/index.css @theme tokens)
TEAL_950 = (4, 42, 38)
TEAL_900 = (17, 72, 64)
TEAL_500 = (20, 165, 140)
TEAL_300 = (91, 220, 195)
TEAL_100 = (201, 247, 236)
GOLD_400 = (246, 179, 40)
INK_900 = (12, 26, 26)
WHITE = (255, 255, 255)
ALERT = (255, 86, 74)

# Stage geometry (the image card)
ST_X, ST_Y, ST_W, ST_H = 40, 372, 640, 453
ST_R = 28

FONT_URLS = {
    "Nunito-Black.ttf": "https://fonts.gstatic.com/s/nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDBImRTM.ttf",
    "Nunito-ExtraBold.ttf": "https://fonts.gstatic.com/s/nunito/v32/XRXI3I6Li01BKofiOc5wtlZ2di8HDDsmRTM.ttf",
    "Jakarta-SemiBold.ttf": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_d0nNSg.ttf",
    "Jakarta-Bold.ttf": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_TknNSg.ttf",
}
FALLBACK = {
    "Nunito-Black.ttf": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "Nunito-ExtraBold.ttf": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "Jakarta-SemiBold.ttf": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "Jakarta-Bold.ttf": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
}


def font_path(name, cache_dir):
    dest = os.path.join(cache_dir, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 20000:
        return dest
    os.makedirs(cache_dir, exist_ok=True)
    try:
        urllib.request.urlretrieve(FONT_URLS[name], dest)
        if os.path.getsize(dest) > 20000:
            return dest
    except Exception:
        pass
    return FALLBACK[name]


# ---------------------------------------------------------------- easing
def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else hi if v > hi else v


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ramp(t, a, b):
    """Normalised 0..1 progress of t across [a, b]."""
    return 0.0 if b <= a else clamp((t - a) / (b - a))


def ease_out(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_box(a, b, t):
    return tuple(lerp(a[i], b[i], t) for i in range(4))


def mix(c1, c2, t):
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


# ---------------------------------------------------------------- helpers
def vgradient(size, top, bottom):
    w, h = size
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        px[0, y] = mix(top, bottom, y / max(1, h - 1))
    return strip.resize((w, h), Image.BILINEAR)


def radial_sprite(radius, color, power=2.0):
    """RGBA sprite with a soft radial falloff, fully opaque at the centre."""
    d = radius * 2
    small = 64
    mask = Image.new("L", (small, small), 0)
    mp = mask.load()
    c = (small - 1) / 2
    for y in range(small):
        for x in range(small):
            dist = math.hypot(x - c, y - c) / c
            mp[x, y] = int(255 * max(0.0, 1 - dist) ** power)
    mask = mask.resize((d, d), Image.BICUBIC)
    sprite = Image.new("RGBA", (d, d), color + (0,))
    sprite.putalpha(mask)
    return sprite


def paste_alpha(base, sprite, center, alpha, scale=1.0):
    if alpha <= 0.004:
        return
    s = sprite
    if abs(scale - 1.0) > 0.01:
        nw = max(2, int(sprite.width * scale))
        s = sprite.resize((nw, nw), Image.BILINEAR)
    if alpha < 0.999:
        a = s.getchannel("A").point(lambda v: int(v * alpha))
        s = s.copy()
        s.putalpha(a)
    base.alpha_composite(s, (int(center[0] - s.width / 2), int(center[1] - s.height / 2)))


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_block(base, text, font, color, cx, top, max_w, leading, alpha, rise=0.0, align="center"):
    """Draw wrapped text with a fade+rise transition. Returns bottom y."""
    if alpha <= 0.004:
        scratch = ImageDraw.Draw(Image.new("L", (1, 1)))
        return top + len(wrap(scratch, text, font, max_w)) * leading
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    lines = wrap(d, text, font, max_w)
    y = top + rise
    for line in lines:
        if align == "center":
            x = cx - d.textlength(line, font=font) / 2
        else:
            x = cx
        d.text((x, y), line, font=font, fill=color + (int(255 * clamp(alpha)),))
        y += leading
    base.alpha_composite(layer)
    return top + len(lines) * leading


def pill(base, text, font, cx, cy, alpha, fg=WHITE, bg=(255, 255, 255, 26), border=None, pad=(22, 12), rise=0.0):
    if alpha <= 0.004:
        return
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tw = d.textlength(text, font=font)
    th = font.size * 1.25
    w = tw + pad[0] * 2
    h = th + pad[1] * 2
    x0, y0 = cx - w / 2, cy - h / 2 + rise
    a = clamp(alpha)
    fill = (bg[0], bg[1], bg[2], int(bg[3] * a))
    outline = None if border is None else (border[0], border[1], border[2], int(border[3] * a))
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], h / 2, fill=fill, outline=outline, width=2)
    d.text((cx - tw / 2, y0 + pad[1] - font.size * 0.06), text, font=font, fill=fg + (int(255 * a),))
    base.alpha_composite(layer)


# ---------------------------------------------------------------- storyboard
# Crop windows in *source* pixel coordinates (aspect locked to the stage).
def window(cx, cy, zoom, src_w, src_h):
    w = src_w / zoom
    h = w * ST_H / ST_W
    x = clamp(cx - w / 2, 0, src_w - w)
    y = clamp(cy - h / 2, 0, src_h - h)
    return (x, y, w, h)


def build(source_path, out_path, poster_path, cache_dir, duration=16.0, score_path=None):
    src = Image.open(source_path).convert("RGB")
    sw, sh = src.size
    # Work at 3x so the zoomed beats resample from more pixels.
    hi = src.resize((sw * 3, sh * 3), Image.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3)
    )

    f_head = ImageFont.truetype(font_path("Nunito-Black.ttf", cache_dir), 54)
    f_head_sm = ImageFont.truetype(font_path("Nunito-Black.ttf", cache_dir), 44)
    f_body = ImageFont.truetype(font_path("Jakarta-SemiBold.ttf", cache_dir), 27)
    f_chip = ImageFont.truetype(font_path("Jakarta-Bold.ttf", cache_dir), 24)
    f_kicker = ImageFont.truetype(font_path("Jakarta-Bold.ttf", cache_dir), 21)
    f_cta = ImageFont.truetype(font_path("Nunito-ExtraBold.ttf", cache_dir), 36)

    bg = vgradient((W, H), TEAL_950, INK_900).convert("RGBA")
    aura = radial_sprite(430, TEAL_500, power=1.7)
    bg.alpha_composite(
        Image.blend(Image.new("RGBA", aura.size, (0, 0, 0, 0)), aura, 0.20), (W // 2 - 430, 120)
    )

    glow_red = radial_sprite(110, ALERT, power=1.6)
    glow_teal = radial_sprite(120, TEAL_300, power=1.6)

    logo = None
    logo_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "brand", "celestial-logo.png")
    if os.path.exists(logo_file):
        lg = Image.open(logo_file).convert("RGBA")
        logo = lg.resize((int(lg.width * 54 / lg.height), 54), Image.LANCZOS)

    stage_mask = rounded_mask((ST_W, ST_H), ST_R)

    # Anatomy anchors, in source pixels.
    P_CONTACT = (466, 258)     # wisdom-tooth crown against the second molar
    P_WISDOM = (538, 266)      # body of the impacted third molar
    P_MOLAR = (410, 250)       # the molar taking the pressure

    W_WIDE = (0.0, 0.0, float(sw), float(sw) * ST_H / ST_W)
    W_WIDE = (0.0, max(0.0, (sh - W_WIDE[3]) / 2), W_WIDE[2], W_WIDE[3])
    W_PUSH = window(370, 230, 1.18, sw, sh)
    W_TIGHT = window(482, 252, 2.25, sw, sh)
    W_HOLD = window(470, 250, 2.05, sw, sh)
    W_OUT = window(340, 235, 1.30, sw, sh)

    total = int(round(duration * FPS))

    ff = shutil.which("ffmpeg")
    if not ff:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()

    cmd = [
        ff, "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
    ]
    if score_path:
        cmd += ["-i", score_path]
    cmd += [
        "-c:v", "libx264", "-preset", "slow", "-crf", "19",
        "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    ]
    cmd += (["-c:a", "aac", "-b:a", "128k", "-shortest"] if score_path else ["-an"])
    cmd += [out_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    for i in range(total):
        t = i / FPS
        frame = compose(
            t, duration, hi, sw, sh, bg, stage_mask, logo,
            glow_red, glow_teal,
            (f_head, f_head_sm, f_body, f_chip, f_kicker, f_cta),
            (W_WIDE, W_PUSH, W_TIGHT, W_HOLD, W_OUT),
            (P_CONTACT, P_WISDOM, P_MOLAR),
        )
        rgb = frame.convert("RGB")
        if i == int(4.6 * FPS) and poster_path:
            rgb.save(poster_path, quality=92)
        proc.stdin.write(rgb.tobytes())

    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg failed")


def compose(t, dur, hi, sw, sh, bg, stage_mask, logo, glow_red, glow_teal, fonts, windows, anchors):
    f_head, f_head_sm, f_body, f_chip, f_kicker, f_cta = fonts
    W_WIDE, W_PUSH, W_TIGHT, W_HOLD, W_OUT = windows
    P_CONTACT, P_WISDOM, P_MOLAR = anchors

    frame = bg.copy()

    # ---- camera -------------------------------------------------------
    if t < 3.2:
        win = lerp_box(W_WIDE, W_PUSH, smooth(ramp(t, 0.2, 3.2)))
    elif t < 4.4:
        win = lerp_box(W_PUSH, W_TIGHT, smooth(ramp(t, 3.2, 4.4)))
    elif t < 9.6:
        win = lerp_box(W_TIGHT, W_HOLD, smooth(ramp(t, 4.4, 9.6)))
    elif t < 11.2:
        win = lerp_box(W_HOLD, W_OUT, smooth(ramp(t, 9.6, 11.2)))
    else:
        win = lerp_box(W_OUT, W_WIDE, smooth(ramp(t, 11.2, 13.4)))

    # A tiny tremor while the tooth is "pushing".
    strain = smooth(ramp(t, 4.2, 4.9)) * (1 - smooth(ramp(t, 8.6, 9.4)))
    shake_x = math.sin(t * 27.0) * 1.9 * strain
    shake_y = math.cos(t * 23.0) * 1.4 * strain

    cx, cy, cw, ch = win
    box = ((cx + shake_x) * 3, (cy + shake_y) * 3, (cx + shake_x + cw) * 3, (cy + shake_y + ch) * 3)
    view = hi.resize((ST_W, ST_H), Image.LANCZOS, box=box).convert("RGBA")

    def to_stage(pt):
        return (
            ST_X + (pt[0] - cx - shake_x) / cw * ST_W,
            ST_Y + (pt[1] - cy - shake_y) / ch * ST_H,
        )

    scale_px = ST_W / cw  # stage pixels per source pixel

    # ---- markers drawn inside the stage -------------------------------
    over = Image.new("RGBA", (ST_W, ST_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)

    pressure = smooth(ramp(t, 3.6, 4.6)) * (1 - smooth(ramp(t, 9.4, 10.4)))
    relief = smooth(ramp(t, 10.2, 11.4))
    pulse = 0.55 + 0.45 * (0.5 + 0.5 * math.sin(t * 5.4))

    if pressure > 0.004:
        gx, gy = to_stage(P_CONTACT)
        paste_alpha(
            over, glow_red, (gx - ST_X, gy - ST_Y),
            0.34 * pressure, scale=(1.05 + 0.16 * pulse) * scale_px,
        )
        paste_alpha(
            over, glow_red, (gx - ST_X, gy - ST_Y),
            0.85 * pressure * pulse, scale=(0.46 + 0.09 * pulse) * scale_px,
        )
        # Impaction outline around the third molar.
        wx, wy = to_stage(P_WISDOM)
        rw, rh = 76 * scale_px, 71 * scale_px
        od.ellipse(
            [wx - ST_X - rw, wy - ST_Y - rh, wx - ST_X + rw, wy - ST_Y + rh],
            outline=ALERT + (int(215 * pressure),), width=max(2, int(2.2 * scale_px)),
        )
        # Pressure chevrons travelling from the wisdom tooth into the molar.
        chv = Image.new("RGBA", (ST_W, ST_H), (0, 0, 0, 0))
        cd = ImageDraw.Draw(chv)
        for k in range(3):
            ph = (t * 1.05 + k * 0.33) % 1.0
            ax = lerp(wx - 34 * scale_px, gx - 22 * scale_px, ph) - ST_X
            ay = lerp(wy, gy, ph) - ST_Y
            fade = math.sin(math.pi * ph) * pressure
            s = 19 * scale_px
            cd.line(
                [(ax + s, ay - s * 0.85), (ax, ay), (ax + s, ay + s * 0.85)],
                fill=ALERT + (int(255 * fade),), width=max(2, int(3.8 * scale_px)), joint="curve",
            )
        over.alpha_composite(chv.filter(ImageFilter.GaussianBlur(7)))
        over.alpha_composite(chv)

    if relief > 0.004:
        mx, my = to_stage(P_MOLAR)
        paste_alpha(over, glow_teal, (mx - ST_X, my - ST_Y), 0.42 * relief, scale=0.62 * scale_px)
        # Assessment sweep across the arch.
        sweep = ramp(t, 10.4, 12.6)
        if 0 < sweep < 1:
            sx = ST_W * sweep
            band = Image.new("RGBA", (ST_W, ST_H), (0, 0, 0, 0))
            bd = ImageDraw.Draw(band)
            span = 70
            for k in range(span):
                a = int(78 * (1 - k / span) ** 2.1 * math.sin(math.pi * sweep))
                bd.line([(sx - k, 0), (sx - k, ST_H)], fill=TEAL_300 + (a,))
            bd.line([(sx, 0), (sx, ST_H)], fill=TEAL_100 + (int(160 * math.sin(math.pi * sweep)),), width=3)
            over.alpha_composite(band)

    view.alpha_composite(over)
    view.putalpha(stage_mask)

    # ---- stage in place, with lift-in and a glow rim -------------------
    intro = ease_out(ramp(t, 0.05, 0.9))
    outro = smooth(ramp(t, 13.3, 14.2))
    stage_a = intro * (1 - 0.9 * outro)
    if stage_a > 0.004:
        s = lerp(0.955, 1.0, intro) * lerp(1.0, 0.9, outro)
        sw_, sh_ = int(ST_W * s), int(ST_H * s)
        sv = view.resize((sw_, sh_), Image.LANCZOS)
        if outro > 0.01:
            sv = sv.filter(ImageFilter.GaussianBlur(9 * outro))
        ox = ST_X + (ST_W - sw_) // 2
        oy = ST_Y + (ST_H - sh_) // 2 + int(26 * (1 - intro)) + int(30 * outro)

        halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        rim = mix(TEAL_500, ALERT, clamp(pressure))
        hd.rounded_rectangle([ox - 10, oy - 10, ox + sw_ + 10, oy + sh_ + 10], ST_R + 10, fill=rim + (int(86 * (1 - outro)),))
        halo = halo.filter(ImageFilter.GaussianBlur(20))
        frame.alpha_composite(Image.blend(Image.new("RGBA", (W, H), (0, 0, 0, 0)), halo, stage_a))

        if stage_a < 0.999:
            a = sv.getchannel("A").point(lambda v: int(v * stage_a))
            sv = sv.copy()
            sv.putalpha(a)
        frame.alpha_composite(sv, (ox, oy))

        edge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(edge).rounded_rectangle(
            [ox, oy, ox + sw_ - 1, oy + sh_ - 1], int(ST_R * s),
            outline=TEAL_300 + (int(70 * stage_a),), width=2,
        )
        frame.alpha_composite(edge)

    # ---- logo lockup --------------------------------------------------
    logo_a = ease_out(ramp(t, 0.25, 1.1))
    if logo is not None and logo_a > 0.004:
        big = smooth(ramp(t, 13.4, 14.3))
        ls = lerp(1.0, 1.5, big)
        lw, lh = int(logo.width * ls), int(logo.height * ls)
        lg = logo.resize((lw, lh), Image.LANCZOS)
        a = lg.getchannel("A").point(lambda v: int(v * logo_a))
        lg = lg.copy()
        lg.putalpha(a)
        ly = int(lerp(74, 300, big))
        frame.alpha_composite(lg, ((W - lw) // 2, ly))

    # ---- copy ---------------------------------------------------------
    if t < 13.3:
        pill(
            frame, "WISDOM TEETH · EXPLAINED", f_kicker, W // 2, 172,
            ease_out(ramp(t, 0.5, 1.3)) * (1 - smooth(ramp(t, 12.9, 13.3))),
            fg=TEAL_100, bg=(20, 165, 140, 46), border=TEAL_500 + (150,), pad=(20, 9),
        )

    beats = [
        (0.7, 3.5, "Impacted wisdom tooth?", "The third molar that never found room to come through."),
        (3.7, 6.4, "No room to erupt.", "So it grows sideways and presses into the molar next door."),
        (6.6, 9.9, "The neighbours feel it.", "Aching, crowding, food traps, and gums that keep flaring up."),
        (10.1, 13.1, "Some stay. Some go.", "A quick exam and an X-ray show which one yours is."),
    ]
    for start, end, head, body in beats:
        a_in = ease_out(ramp(t, start, start + 0.55))
        a_out = 1 - smooth(ramp(t, end - 0.35, end))
        a = a_in * a_out
        if a <= 0.004:
            continue
        rise = 22 * (1 - a_in) - 14 * (1 - a_out)
        font = f_head if len(head) <= 24 else f_head_sm
        draw_block(frame, head, font, WHITE, W // 2, 218, 600, font.size * 1.18, a, rise)
        draw_block(frame, body, f_body, TEAL_100, W // 2, 880, 592, 40, a, rise * 1.25)

    chips = [
        (7.0, "Pressure and dull aching"),
        (7.9, "Crowding and shifting teeth"),
        (8.8, "Decay and gum infection"),
    ]
    for start, label in chips:
        a = ease_out(ramp(t, start, start + 0.4)) * (1 - smooth(ramp(t, 9.9, 10.25)))
        if a <= 0.004:
            continue
        idx = chips.index((start, label))
        pill(
            frame, label, f_chip, W // 2, 1002 + idx * 58, a,
            fg=WHITE, bg=(255, 86, 74, 40), border=ALERT + (120,), rise=16 * (1 - ease_out(ramp(t, start, start + 0.4))),
        )

    # ---- outro --------------------------------------------------------
    o = smooth(ramp(t, 13.4, 14.2))
    if o > 0.004:
        veil = Image.new("RGBA", (W, H), TEAL_950 + (int(200 * o),))
        frame.alpha_composite(veil)
        if logo is not None:
            big = smooth(ramp(t, 13.4, 14.3))
            ls = lerp(1.0, 1.5, big)
            lw, lh = int(logo.width * ls), int(logo.height * ls)
            lg = logo.resize((lw, lh), Image.LANCZOS)
            frame.alpha_composite(lg, ((W - lw) // 2, int(lerp(74, 300, big))))
        draw_block(frame, "Book a wisdom tooth assessment", f_cta, WHITE, W // 2, 430, 600, 46, o,
                   18 * (1 - o))
        draw_block(frame, "Celestial Dental Centre · Kasarani · Kamakis · Eldoret",
                   f_body, TEAL_100, W // 2, 560, 600, 38, smooth(ramp(t, 13.9, 14.6)),
                   16 * (1 - smooth(ramp(t, 13.9, 14.6))))
        pill(frame, "+254 707 535 000", f_cta, W // 2, 700, smooth(ramp(t, 14.2, 14.9)),
             fg=TEAL_950, bg=GOLD_400 + (255,), pad=(34, 16),
             rise=18 * (1 - smooth(ramp(t, 14.2, 14.9))))
        draw_block(frame, "Mon – Sun · 07:00 – 20:00", f_body, TEAL_300, W // 2, 800, 600, 38,
                   smooth(ramp(t, 14.5, 15.2)))

    handle_a = (ease_out(ramp(t, 1.4, 2.2)) * (1 - smooth(ramp(t, 12.9, 13.3)))
                * (1 - smooth(ramp(t, 6.5, 6.9))) if t < 10.3 else
                ease_out(ramp(t, 10.3, 10.7)) * (1 - smooth(ramp(t, 12.9, 13.3))))
    draw_block(frame, "celestialdental.org", f_kicker, (93, 140, 132), W // 2, 1150, 600, 30, handle_a)

    # ---- progress rail -------------------------------------------------
    rail = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rail)
    rd.rounded_rectangle([60, 1216, W - 60, 1222], 3, fill=(255, 255, 255, 34))
    p = clamp(t / dur)
    if p > 0:
        rd.rounded_rectangle([60, 1216, 60 + (W - 120) * p, 1222], 3, fill=TEAL_300 + (215,))
    frame.alpha_composite(rail)

    return frame


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--poster", default="")
    ap.add_argument("--cache", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".fonts"))
    ap.add_argument("--duration", type=float, default=16.0)
    ap.add_argument("--silent", action="store_true", help="skip the generated audio bed")
    a = ap.parse_args()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    score_path = None
    if not a.silent:
        import score as score_mod
        score_path = os.path.join(a.cache, "score.wav")
        os.makedirs(a.cache, exist_ok=True)
        score_mod.build(a.duration, score_path)
    build(a.source, a.out, a.poster or None, a.cache, a.duration, score_path)
    print("wrote", a.out)


if __name__ == "__main__":
    sys.exit(main())
