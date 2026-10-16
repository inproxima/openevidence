# /// script
# requires-python = ">=3.11"
# dependencies = ["resvg-py", "fonttools[woff]", "uharfbuzz", "pillow"]
# ///
"""Brand files for Clinical Evidence CA, drawn once here and exported.

The mark is a teal C holding three source lines, the middle one lime: the highlighted
passage. Navy lines, black wordmark. AppMark.jsx draws the same path in theme tokens.

    uv run scripts/brand_assets.py      (after `npm ci` in frontend/: the wordmark font)

Writes to frontend/public/ (served at the site root, so Auth0 can fetch the logo):
favicon.svg, favicon.ico, apple-touch-icon.png, and brand/ with the mark and the
horizontal logo as SVG masters and PNGs.
"""

import io
from pathlib import Path

import resvg_py
import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "frontend" / "public"
FONT = (
    ROOT / "frontend/node_modules/@fontsource-variable/atkinson-hyperlegible-next/files"
    / "atkinson-hyperlegible-next-latin-wght-normal.woff2"
)

TEAL, NAVY, LIME = "#099B94", "#102D46", "#C4E64B"
INK = "#18181B"  # the app's text colour (zinc-900)
NAVY_DARK = "#E4E4E7"  # navy lines on a dark ground (zinc-200), as in the dark theme

# On a 48-unit grid: the C is a circle (r 24) with an elliptical counter, straight arms
# and rounded, swept terminals; the bars are 5 high on a 7.25 pitch, centred on the C.
W, H = 48.25, 48
C_PATH = (
    "M24 0H38C42.06 0 48.25 4.95 48.25 8.2A1.55 1.55 0 0 1 46.7 9.75H23.25"
    "A13 14.25 0 0 0 10.25 24A13 14.25 0 0 0 23.25 38.25H46.7"
    "A1.55 1.55 0 0 1 48.25 39.8C48.25 43.05 42.06 48 38 48H24"
    "A24 24 0 0 1 0 24A24 24 0 0 1 24 0Z"
)
BARS = [  # (x, y, width, colour role)
    (17, 14.25, 21.5, "ink"),
    (17, 21.5, 30.75, "hl"),
    (17, 28.75, 21.5, "ink"),
]


def mark_shapes(ink=NAVY):
    fills = {"ink": ink, "hl": LIME}
    bars = "".join(
        f'<rect x="{x}" y="{y}" width="{w}" height="5" rx="2.5" fill="{fills[role]}"/>'
        for x, y, w, role in BARS
    )
    return f'<path d="{C_PATH}" fill="{TEAL}"/>{bars}'


def svg(view_box, body, extra=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">{extra}{body}</svg>\n'


def square_mark(pad):
    """The mark centred on a square canvas with `pad` units of clear space."""
    side = max(W, H) + 2 * pad
    return svg(f"{-(side - W) / 2:g} {-(side - H) / 2:g} {side:g} {side:g}", mark_shapes())


def favicon():
    # Browsers apply prefers-color-scheme inside SVG favicons; navy would vanish on a dark tab.
    style = f"<style>.i{{fill:{NAVY}}}@media (prefers-color-scheme:dark){{.i{{fill:{NAVY_DARK}}}}}</style>"
    body = mark_shapes().replace(f'fill="{NAVY}"', 'class="i"')
    return svg(f"0 0 {W:g} {H:g}", body, style)


def instance(font, weight):
    static = instancer.instantiateVariableFont(TTFont(font), {"wght": weight})
    static.flavor = None  # plain sfnt: HarfBuzz doesn't read WOFF2
    buf = io.BytesIO()
    static.save(buf)
    data = buf.getvalue()
    return TTFont(io.BytesIO(data)), hb.Font(hb.Face(data))


def shape(runs, cap_height):
    """Text runs [(text, weight)] as one SVG path, scaled to `cap_height` units, baseline at
    y=0, ink starting at x=0. Returns (path data, ink width)."""
    pieces, pen_x, scale = [], 0.0, None
    for text, weight in runs:
        tt, font = instance(FONT, weight)
        scale = scale or cap_height / tt["OS/2"].sCapHeight
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf, {"kern": True, "liga": True})
        glyphs = tt.getGlyphSet()
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            name = tt.getGlyphName(info.codepoint)
            pieces.append((glyphs, name, pen_x + pos.x_offset, pos.y_offset))
            pen_x += pos.x_advance
    # Ink bounds in font units, to start the ink (not the side bearing) at x=0.
    xmin = xmax = None
    for glyphs, name, gx, gy in pieces:
        bp = BoundsPen(glyphs)
        glyphs[name].draw(bp)
        if bp.bounds:
            x0, _, x1, _ = bp.bounds
            xmin = gx + x0 if xmin is None else min(xmin, gx + x0)
            xmax = gx + x1 if xmax is None else max(xmax, gx + x1)
    d = []
    for glyphs, name, gx, gy in pieces:
        sp = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        glyphs[name].draw(TransformPen(sp, (scale, 0, 0, -scale, (gx - xmin) * scale, -gy * scale)))
        d.append(sp.getCommands())
    return "".join(d), (xmax - xmin) * scale


def lockup(pad=4):
    """Mark, then the wordmark in black: caps 20 high, centred on the mark; CA one step quieter."""
    cap, gap = 20, 6.5
    words, width = shape([("Clinical Evidence ", 600), ("CA", 400)], cap)
    x0, baseline = W + gap, H / 2 + cap / 2
    body = mark_shapes() + f'<path transform="translate({x0:g} {baseline:g})" d="{words}" fill="{INK}"/>'
    total = x0 + width
    return svg(f"{-pad:g} {-pad:g} {total + 2 * pad:.2f} {H + 2 * pad:g}", body)


def png(svg_text, path, width=None, height=None, background=None):
    data = resvg_py.svg_to_bytes(svg_string=svg_text, width=width, height=height, background=background)
    Path(path).write_bytes(bytes(data))
    return bytes(data)


def main():
    brand = PUBLIC / "brand"
    brand.mkdir(parents=True, exist_ok=True)

    (PUBLIC / "favicon.svg").write_text(favicon())
    full = png(square_mark(0), brand / ".favicon-256.png", width=256, height=256)
    Image.open(io.BytesIO(full)).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (brand / ".favicon-256.png").unlink()
    # iOS fills transparency with black, so the home-screen icon carries its own white ground.
    png(square_mark(9), PUBLIC / "apple-touch-icon.png", width=180, height=180, background="#FFFFFF")

    mark = square_mark(5)
    (brand / "clinical-evidence-ca-mark.svg").write_text(mark)
    png(mark, brand / "clinical-evidence-ca-mark.png", width=512, height=512)

    logo = lockup()
    (brand / "clinical-evidence-ca-logo.svg").write_text(logo)
    png(logo, brand / "clinical-evidence-ca-logo.png", height=224)

    for f in sorted([*PUBLIC.glob("*.*"), *brand.glob("*.*")]):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
