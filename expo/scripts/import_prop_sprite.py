#!/usr/bin/env python3
"""Normalize a supplied prop image into Vismay's two-tone sprite contract.

The script writes a canonical preview plus independent body/highlight alpha
masks. Runtime recoloring uses the masks, so no per-pixel work happens in the
app. Pillow is an authoring-time dependency only; it is not shipped with Expo.
"""

from __future__ import annotations

import argparse
import colorsys
from pathlib import Path

from PIL import Image


BODY = (0x3E, 0x4E, 0x34, 0xFF)
HIGHLIGHT = (0xA8, 0xAC, 0x79, 0xFF)
TRANSPARENT = (0, 0, 0, 0)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("name")
    parser.add_argument("--output", type=Path, default=Path("assets/world/props"))
    parser.add_argument(
        "--key-saturation",
        action="store_true",
        help="Recover foreground from an opaque, low-saturation background.",
    )
    parser.add_argument("--alpha-threshold", type=int, default=72)
    parser.add_argument("--saturation-threshold", type=float, default=0.105)
    parser.add_argument("--padding", type=int, default=4)
    return parser.parse_args()


def foreground_alpha(
    image: Image.Image,
    *,
    key_saturation: bool,
    alpha_threshold: int,
    saturation_threshold: float,
) -> Image.Image:
    rgba = image.convert("RGBA")
    output = Image.new("L", rgba.size, 0)
    source = rgba.load()
    target = output.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = source[x, y]
            if key_saturation:
                saturation = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)[1]
                visible = saturation >= saturation_threshold and alpha >= alpha_threshold
            else:
                visible = alpha >= alpha_threshold
            target[x, y] = 255 if visible else 0

    return output


def luminance(red: int, green: int, blue: int) -> float:
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def two_means(values: list[float]) -> tuple[float, float]:
    low = min(values)
    high = max(values)
    for _ in range(20):
        low_values: list[float] = []
        high_values: list[float] = []
        midpoint = (low + high) / 2
        for value in values:
            (low_values if value <= midpoint else high_values).append(value)
        next_low = sum(low_values) / len(low_values) if low_values else low
        next_high = sum(high_values) / len(high_values) if high_values else high
        if abs(next_low - low) + abs(next_high - high) < 0.01:
            break
        low, high = next_low, next_high
    return low, high


def crop_with_padding(image: Image.Image, box: tuple[int, int, int, int], padding: int) -> Image.Image:
    left, top, right, bottom = box
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def import_sprite(args: argparse.Namespace) -> None:
    source = Image.open(args.source).convert("RGBA")
    alpha = foreground_alpha(
        source,
        key_saturation=args.key_saturation,
        alpha_threshold=args.alpha_threshold,
        saturation_threshold=args.saturation_threshold,
    )
    box = alpha.getbbox()
    if box is None:
        raise SystemExit("No foreground survived the requested key.")

    source = crop_with_padding(source, box, args.padding)
    alpha = crop_with_padding(alpha, box, args.padding)
    pixels = source.load()
    mask = alpha.load()
    visible_luminance = [
        luminance(*pixels[x, y][:3])
        for y in range(source.height)
        for x in range(source.width)
        if mask[x, y]
    ]
    low, high = two_means(visible_luminance)
    split = (low + high) / 2

    preview = Image.new("RGBA", source.size, TRANSPARENT)
    body_mask = Image.new("RGBA", source.size, TRANSPARENT)
    highlight_mask = Image.new("RGBA", source.size, TRANSPARENT)
    preview_pixels = preview.load()
    body_pixels = body_mask.load()
    highlight_pixels = highlight_mask.load()
    body_count = 0
    highlight_count = 0

    for y in range(source.height):
        for x in range(source.width):
            if not mask[x, y]:
                continue
            red, green, blue, _ = pixels[x, y]
            if luminance(red, green, blue) <= split:
                preview_pixels[x, y] = BODY
                body_pixels[x, y] = (255, 255, 255, 255)
                body_count += 1
            else:
                preview_pixels[x, y] = HIGHLIGHT
                highlight_pixels[x, y] = (255, 255, 255, 255)
                highlight_count += 1

    args.output.mkdir(parents=True, exist_ok=True)
    preview.save(args.output / f"{args.name}.png", optimize=True)
    body_mask.save(args.output / f"{args.name}_body.png", optimize=True)
    highlight_mask.save(args.output / f"{args.name}_highlight.png", optimize=True)

    total = body_count + highlight_count
    print(
        f"{args.name}: {source.width}x{source.height}; "
        f"body={body_count / total:.1%}; highlight={highlight_count / total:.1%}; "
        f"luminance split={split:.1f}"
    )


if __name__ == "__main__":
    import_sprite(parse_args())
