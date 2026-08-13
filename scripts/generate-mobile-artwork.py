"""Create deterministic native launcher and splash assets from the master icon."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "store-assets" / "app-icon-1024.png"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS_SPLASH = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
RESAMPLE = Image.Resampling.LANCZOS
SPLASH_GREEN = (6, 83, 42)


def rounded_mask(size: int, radius: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * scale - 1, size * scale - 1),
        radius=radius * scale,
        fill=255,
    )
    return mask.resize((size, size), RESAMPLE)


def circle_mask(size: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    return mask.resize((size, size), RESAMPLE)


def branded_splash(size: tuple[int, int], master: Image.Image) -> Image.Image:
    width, height = size
    short = min(width, height)
    canvas = Image.new("RGB", size, SPLASH_GREEN)

    # A gentle center glow keeps the launch screen calm without introducing text.
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    radius = int(short * 0.38)
    center_x, center_y = width // 2, height // 2
    ImageDraw.Draw(glow).ellipse(
        (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
        fill=(22, 129, 67, 95),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(max(8, int(short * 0.22))))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glow)

    tile_size = max(120, int(short * 0.36))
    tile = master.resize((tile_size, tile_size), RESAMPLE).convert("RGBA")
    tile.putalpha(rounded_mask(tile_size, max(18, tile_size // 6)))
    left = (width - tile_size) // 2
    top = (height - tile_size) // 2

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow_mask = rounded_mask(tile_size, max(18, tile_size // 6))
    shadow_tile = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 120))
    shadow_tile.putalpha(shadow_mask)
    shadow.alpha_composite(shadow_tile, (left, top + max(4, tile_size // 28)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(3, tile_size // 28)))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.alpha_composite(tile, (left, top))
    return canvas.convert("RGB")


def save_android_icons(master: Image.Image) -> None:
    legacy_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    foreground_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for density, size in legacy_sizes.items():
        folder = ANDROID_RES / f"mipmap-{density}"
        icon = master.resize((size, size), RESAMPLE).convert("RGBA")
        icon.save(folder / "ic_launcher.png", optimize=True)
        round_icon = icon.copy()
        round_icon.putalpha(circle_mask(size))
        round_icon.save(folder / "ic_launcher_round.png", optimize=True)
    for density, size in foreground_sizes.items():
        folder = ANDROID_RES / f"mipmap-{density}"
        master.resize((size, size), RESAMPLE).convert("RGBA").save(
            folder / "ic_launcher_foreground.png", optimize=True
        )


def save_splashes(master: Image.Image) -> None:
    for splash in sorted(ANDROID_RES.rglob("splash.png")):
        with Image.open(splash) as current:
            size = current.size
        branded_splash(size, master).save(splash, optimize=True)

    ios_image = branded_splash((2732, 2732), master)
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        ios_image.save(IOS_SPLASH / name, optimize=True)


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"Master icon is missing: {MASTER}")
    with Image.open(MASTER) as source:
        master = source.convert("RGB")
    if master.size != (1024, 1024):
        raise SystemExit(f"Master icon must be 1024 x 1024, received {master.size}")
    save_android_icons(master)
    save_splashes(master)
    print("Generated branded Android launcher icons and Android/iOS splash screens.")


if __name__ == "__main__":
    main()
