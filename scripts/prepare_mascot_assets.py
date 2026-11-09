"""Cut the mascot out of the generated full-body images.

Usage: python scripts/prepare_mascot_assets.py  (needs Pillow + numpy)

Matting steps: estimate a smooth background colour map, flood-fill the
background (floor shadow included) from the image border, open up gaps that
are walled in by outline strokes (e.g. hair loops), then compute a soft alpha
band and remove the white background colour from edge pixels so no halo is
left on dark pages.
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "mascot"
OUTPUT = SOURCE / "cutout"
POSES = ("idle", "thinking", "investigate", "unimpressed")

def shift(a, dy, dx, fill):
    out = np.full_like(a, fill)
    H, W = a.shape[:2]
    ys = slice(max(dy,0), H+min(dy,0)); yd = slice(max(-dy,0), H+min(-dy,0))
    xs = slice(max(dx,0), W+min(dx,0)); xd = slice(max(-dx,0), W+min(-dx,0))
    out[ys, xs] = a[yd, xd]
    return out

N4 = ((-1,0),(1,0),(0,-1),(0,1))
N8 = N4 + ((-1,-1),(-1,1),(1,-1),(1,1))

def dilate(m, r=1):
    for _ in range(r):
        o = m.copy()
        for dy, dx in N8: o |= shift(m, dy, dx, False)
        m = o
    return m

def flood(cand, seeds):
    H, W = cand.shape
    out = np.zeros_like(cand)
    q = deque()
    for y, x in zip(*np.where(seeds & cand)):
        out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in N4:
            ny, nx = y+dy, x+dx
            if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True; q.append((ny, nx))
    return out

def components(mask):
    H, W = mask.shape
    seen = np.zeros_like(mask); res = []
    for y, x in zip(*np.where(mask)):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy, dx in N4:
                ny, nx = cy+dy, cx+dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        res.append(np.array(pts))
    return res

def matte(img):
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    H, W, _ = rgb.shape
    lum = rgb.mean(2); chroma = rgb.max(2) - rgb.min(2)
    border = np.zeros((H, W), bool); border[0]=border[-1]=True; border[:,0]=border[:,-1]=True

    # 1. rough background -> smooth background colour map
    rough = flood((lum > 222) & (chroma < 22), border)
    w = Image.fromarray((rough*255).astype(np.uint8))
    acc = np.dstack([Image.fromarray((rgb[:,:,c]*rough).astype(np.uint8)) for c in range(3)])
    blur = lambda a: np.asarray(Image.fromarray(a).filter(ImageFilter.BoxBlur(60)), np.float32)
    wb = blur(np.asarray(w)) + 1e-3
    bg = np.dstack([blur(np.ascontiguousarray(acc[:,:,c])) for c in range(3)]) * 255 / wb[...,None]
    bg[wb < 2] = np.median(rgb[rough], 0)
    dist = np.sqrt(((rgb - bg)**2).sum(2))

    # 2. background = border flood over near-bg pixels; floor shadow counts as bg
    near = dist < 26
    shadow = np.zeros((H, W), bool)
    shadow[int(H*0.9):] = True
    near |= shadow & (lum > 125) & (rgb[:,:,2] >= rgb[:,:,0] - 4)
    back = flood(near, border)

    # 3. enclosed gaps (between hair strands, legs...) that are plainly background
    # only accept gaps that are walled in by dark outline strokes (hair loops),
    # not white highlights sitting on skin / glasses
    outer = back.copy()
    for comp in components((dist < 20) & (chroma < 18) & ~back):
        if len(comp) < 25: continue
        m = np.zeros((H, W), bool); m[comp[:,0], comp[:,1]] = True
        y0, y1 = comp[:,0].min()-4, comp[:,0].max()+5; x0, x1 = comp[:,1].min()-4, comp[:,1].max()+5
        sub = m[max(y0,0):y1, max(x0,0):x1]
        ring = dilate(sub, 3) & ~sub
        dark = (lum[max(y0,0):y1, max(x0,0):x1][ring] < 175).mean()
        if dark > 0.55 or (len(comp) > 400 and dark > 0.3):
            back |= m
    # eat the 1-2px pale fringe left between the outer background and line art
    fringe = (dist < 36) & (chroma < 20)
    grown = outer
    for _ in range(2):
        grown = grown | (dilate(grown, 1) & fringe)
    back |= grown

    # 4. keep the body, drop watermark / specks
    fg = ~back
    comps = components(fg)
    keep = np.zeros_like(fg)
    for c in comps:
        if len(c) > 4000: keep[c[:,0], c[:,1]] = True
    for c in comps:  # small islands that are dark-ish (e.g. isolated hair tips) stay too
        if len(c) <= 4000 and len(c) > 30 and lum[c[:,0], c[:,1]].mean() < 200 and c[:,0].mean() < H*0.9:
            keep[c[:,0], c[:,1]] = True
    fg = keep

    # 5. soft edge: estimate fg colour by propagating interior colours outward
    interior = fg.copy()
    for _ in range(3):
        e = interior.copy()
        for dy, dx in N4: e &= shift(interior, dy, dx, False)
        interior = e
    F = np.where(interior[...,None], rgb, 0); Fw = interior.astype(np.float32)
    known = interior.copy()
    for _ in range(7):
        s = np.zeros_like(rgb); n = np.zeros((H, W), np.float32)
        for dy, dx in N8:
            s += shift(F*known[...,None], dy, dx, 0); n += shift(known.astype(np.float32), dy, dx, 0)
        new = ~known & (n > 0)
        F[new] = s[new] / n[new][:,None]; known |= new

    band = dilate(fg, 2) & ~interior
    FB = F - bg; CB = rgb - bg
    denom = (FB**2).sum(2)
    a = np.clip((CB*FB).sum(2) / np.maximum(denom, 1), 0, 1)
    a = np.where(denom < 30**2, fg.astype(np.float32), a)  # fg too close to bg: keep hard mask
    alpha = fg.astype(np.float32)
    alpha[band] = a[band]
    alpha[~dilate(fg, 2)] = 0
    alpha[fg & ~dilate(~fg, 1)] = 1
    # pixels on the bg side of the cut only get partial alpha if they are darker than bg
    alpha[back & band] = np.minimum(alpha[back & band], np.clip((dist[back & band]-8)/60, 0, 1))
    alpha[alpha < 0.04] = 0

    # 6. colour decontamination
    am = np.maximum(alpha, 0.05)[...,None]
    out = np.clip((rgb - (1-am)*bg) / am, 0, 255)
    out = np.where((band & (alpha > 0))[...,None], out, rgb)
    return Image.fromarray(np.dstack((out, alpha*255)).round().astype(np.uint8), "RGBA")


def crop_subject(image, pad=24):
    bounds = image.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bounds:
        raise ValueError("No foreground pixels found")
    left, top, right, bottom = bounds
    return image.crop((
        max(0, left - pad), max(0, top - pad),
        min(image.width, right + pad), min(image.height, bottom + pad),
    ))


def normalize_fullbody(image):
    canvas = Image.new("RGBA", (1200, 2300))
    canvas.alpha_composite(image, ((1200 - image.width) // 2, 2300 - image.height - 20))
    return canvas


def preview(source, destination):
    canvas = Image.new("RGB", (1400, 860), (20, 21, 27))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 700, 430), fill=(28, 30, 40))
    draw.rectangle((700, 430, 1400, 860), fill=(36, 39, 53))
    for index, pose in enumerate(POSES):
        image = Image.open(source / f"fullbody_{pose}.png")
        image.thumbnail((300, 390), Image.Resampling.LANCZOS)
        x = (index % 2) * 700 + 200 - image.width // 2
        y = (index // 2) * 430 + 430 - image.height - 12
        canvas.paste(image, (x, y), image)
    canvas.save(destination)


def save_portrait(expression, fullbody):
    rgba = np.asarray(fullbody)
    solid = rgba[:, :, 3] > 180
    rows = np.where(solid.any(axis=1))[0]
    if not len(rows):
        raise ValueError("No character found for portrait")
    top = int(rows[0])
    upper = fullbody.crop((0, top, fullbody.width, min(top + 570, fullbody.height)))
    bounds = upper.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bounds:
        raise ValueError("No portrait found")
    crop = upper.crop(bounds)
    crop.thumbnail((480, 480), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512))
    canvas.alpha_composite(crop, ((512 - crop.width) // 2, 512 - crop.height))
    canvas.save(OUTPUT / f"portrait_{expression}.png", optimize=True)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for pose in POSES:
        source = Image.open(SOURCE / f"fullbody_{pose}.png")
        result = matte(source)
        result = crop_subject(result)
        result = normalize_fullbody(result)
        result.save(OUTPUT / f"fullbody_{pose}.png", optimize=True)
        save_portrait(pose, result)
        alpha = np.asarray(result.getchannel("A"))
        print(pose, result.size, "transparent", f"{float((alpha == 0).mean()) * 100:.1f}%")
    preview(OUTPUT, SOURCE / "_archive" / "preview_fullbodies.jpg")


if __name__ == "__main__":
    main()
