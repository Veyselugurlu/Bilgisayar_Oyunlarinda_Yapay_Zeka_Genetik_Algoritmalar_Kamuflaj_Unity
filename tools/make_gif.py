"""
Frames recorded by DemoRecorder -> README animation and a per-generation film strip for the report.
  GA-Kamuflaj.exe -autoHunter -timeScale 3 -recordFrames <dir> -recordEvery 5 -recordCount 260 ...
  python tools/make_gif.py <dir>
With these settings one generation (10 s) = 20 saved frames.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

FRAMES_PER_GENERATION = 20
src = sorted(Path(sys.argv[1]).glob("frame_*.png"))
out = Path("docs/week06/images")
out.mkdir(parents=True, exist_ok=True)

frames = [Image.open(p).convert("RGB") for p in src]
small = [f.resize((480, 270)) for f in frames]
small[0].save(out / "evolution.gif", save_all=True, append_images=small[1:], duration=70, loop=0, optimize=True)

gens = [1, 2, 4, 7, 10, 13]
w, h = 400, 225
strip = Image.new("RGB", (3 * w + 40, 2 * (h + 26) + 10), (255, 255, 255))
draw = ImageDraw.Draw(strip)
for k, g in enumerate(gens):
    i = min((g - 1) * FRAMES_PER_GENERATION + 1, len(frames) - 1)  # just after the generation spawned
    x, y = 10 + (k % 3) * (w + 10), 5 + (k // 3) * (h + 26)
    strip.paste(frames[i].resize((w, h)), (x, y))
    draw.text((x + 4, y + h + 5), f"Nesil {g}", fill=(30, 30, 30))
strip.save(out / "evolution_filmstrip.png")
print((out / "evolution.gif").stat().st_size // 1024, "KB")
