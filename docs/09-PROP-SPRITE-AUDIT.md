# Prop sprite audit

Work Order 6 trial assets were normalized with `expo/scripts/import_prop_sprite.py`.
The committed PNGs contain only hard alpha plus the two reserved source tones:
body `#3e4e34` and highlight `#a8ac79`. Runtime recoloring stacks the two
derived alpha masks and uses native `Image.tintColor`; no pixel conversion runs
in the app.

| Asset | Source condition | Normalized crop | Body / highlight | Verdict |
|---|---|---:|---:|---|
| Willow | 256 alpha levels | 781×769 | 52.1% / 47.9% | Pass. Soft fringe and baked low-alpha shadow are removed. |
| Wagon | Fully opaque; checkerboard painted into RGB | 891×522 | 67.0% / 33.0% | Pass. Foreground recovered by saturation key. |
| Palm | Real alpha; 137,418 RGB colors | 705×1133 | 59.7% / 40.3% | Pass. Trunk edge and internal highlight remain legible at the four QA sizes; no redraw requested. |

The wagon keeps its native 1.71:1 aspect ratio. In-world rendering caps its
width to 1.25 requested heights by reducing its effective height; it is never
stretched or cropped and does not dominate the character.

Example reproduction commands, run from `expo/` with Pillow available:

```bash
python3 scripts/import_prop_sprite.py source.png willow
python3 scripts/import_prop_sprite.py source.png wagon --key-saturation
python3 scripts/import_prop_sprite.py source.png palm
```
