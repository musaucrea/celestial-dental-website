# Impacted wisdom tooth reel

Turns the single still `source-impacted-wisdom-tooth.jpg` into a 9:16 vertical
explainer clip (720×1280, 24 fps, 16 s) for social and for the site.

Output committed at:

- `public/media/impacted-wisdom-tooth.mp4`
- `public/media/impacted-wisdom-tooth-poster.jpg`

## Beats

| Time | Camera | Copy |
| --- | --- | --- |
| 0.0–3.5 s | wide arch, slow push-in | *Impacted wisdom tooth?* |
| 3.5–6.4 s | zoom onto the third molar, red pressure pulse + chevrons | *No room to erupt.* |
| 6.4–9.9 s | held close-up, symptom chips stack in | *The neighbours feel it.* |
| 9.9–13.1 s | pull back, red resolves to teal, assessment sweep | *Some stay. Some go.* |
| 13.1–16.0 s | stage blurs back, brand lockup | booking CTA, phone, branches |

Palette and type follow `src/index.css` (`--color-brand-*`, `--color-gold-*`,
Nunito + Plus Jakarta Sans).

## Rebuilding

```bash
pip install pillow numpy imageio-ffmpeg
cd tools/wisdom-tooth-video
python3 render.py \
  --source source-impacted-wisdom-tooth.jpg \
  --out ../../public/media/impacted-wisdom-tooth.mp4 \
  --poster ../../public/media/impacted-wisdom-tooth-poster.jpg
```

`render.py` draws every frame with Pillow and pipes raw RGB into ffmpeg
(system `ffmpeg` if present, otherwise the `imageio-ffmpeg` binary). Brand fonts
are fetched from Google Fonts into `.fonts/` on first run and fall back to
DejaVu when there is no network. Pass `--silent` to skip the audio.

`score.py` synthesises the audio bed from sine partials and envelopes — a slow
four-chord pad, a low pulse under the pressure beats, and soft markers on each
copy change. It is generated from scratch, so no third-party music licence is
attached to the clip.

## Editing the copy

Headlines and body lines live in the `beats` list in `render.py:compose`; the
symptom chips are the `chips` list just below it. Anatomy anchor points
(`P_CONTACT`, `P_WISDOM`, `P_MOLAR`) and the camera windows (`W_WIDE` …
`W_OUT`) are in source-image pixel coordinates, so swapping in a different
still means retargeting those.
