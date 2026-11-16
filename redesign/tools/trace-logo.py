# Trace the blue mark of the Mladá vlna logo into polygons (outer outlines and holes) for a three.js extrusion.
import sys, json, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGBA')).astype(float)
crop = im[30:370, 80:420]                                   # the round mark, not the wordmark under it
r, g, b, a = [crop[..., i] for i in range(4)]
mask = (a > 128) & (b > r + 40) & (b > 90)                 # the logo blue
S = 3                                                       # upsample for smoother edges
m = np.kron(mask.astype(np.uint8), np.ones((S, S), np.uint8))
m = np.pad(m, 1)
H, W = m.shape
# marching squares on cell corners; edges between in/out pixels, chained into closed loops
edges = {}
def add(p, q): edges.setdefault(p, []).append(q)
for y in range(H - 1):
    row0, row1 = m[y], m[y + 1]
    for x in range(W - 1):
        c = (row0[x] << 3) | (row0[x + 1] << 2) | (row1[x + 1] << 1) | row1[x]
        if c in (0, 15): continue
        T, R, B, L = (x + .5, y), (x + 1, y + .5), (x + .5, y + 1), (x, y + .5)
        segs = {1: [(L, B)], 2: [(B, R)], 3: [(L, R)], 4: [(R, T)], 5: [(L, T), (R, B)], 6: [(B, T)], 7: [(L, T)],
                8: [(T, L)], 9: [(T, B)], 10: [(T, R), (B, L)], 11: [(T, R)], 12: [(R, L)], 13: [(R, B)], 14: [(B, L)]}[c]
        for p, q in segs: add(p, q)
loops = []
while edges:
    start = next(iter(edges)); loop = [start]; cur = start
    while True:
        nxt = edges[cur].pop()
        if not edges[cur]: del edges[cur]
        if nxt == start: break
        loop.append(nxt); cur = nxt
    if len(loop) > 40: loops.append(np.array(loop))
def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab) or 1
    d = np.abs(np.cross(ab, pts - a)) / n
    i = int(np.argmax(d))
    if d[i] > eps: return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])
def simplify(loop, eps):
    k = len(loop) // 2
    return np.vstack([rdp(loop[:k + 1], eps)[:-1], rdp(loop[k:], eps)[:-1]])
def area(p): x, y = p[:, 0], p[:, 1]; return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)
def inside(pt, poly):
    x, y = pt; c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
def chaikin(p, n):
    for _ in range(n):
        q = np.roll(p, -1, axis=0); p = np.empty((len(p) * 2, 2)); 
        p0 = None
    return p
def smooth(p, n=3):
    for _ in range(n):
        q = np.roll(p, -1, axis=0)
        a = 0.75 * p + 0.25 * q; b = 0.25 * p + 0.75 * q
        p = np.empty((len(a) * 2, 2)); p[0::2] = a; p[1::2] = b
    return p
def blur(p, k=5):                                          # average neighbours to iron out pixel steps
    acc = np.zeros_like(p)
    for s in range(-k, k + 1): acc += np.roll(p, s, axis=0)
    return acc / (2 * k + 1)
loops = [simplify(smooth(blur(l.astype(float), 4), 1), 0.7) for l in loops]
loops.sort(key=lambda p: -abs(area(p)))
cx, cy, sc = W / 2, H / 2, max(W, H) / 2
info = []
for i, p in enumerate(loops):
    parents = [j for j in range(i) if inside(p[0], loops[j])]
    info.append({'depth': len(parents), 'parent': parents[-1] if parents else None})
shapes = []
for i, p in enumerate(loops):
    if info[i]['depth'] % 2: continue
    q = (p - [cx, cy]) / sc * [1, -1]                      # y up, roughly -1..1
    holes = [((loops[j] - [cx, cy]) / sc * [1, -1]).round(4).tolist() for j in range(len(loops)) if info[j]['parent'] == i and info[j]['depth'] % 2]
    shapes.append({'outer': q.round(4).tolist(), 'holes': holes})
json.dump(shapes, open(out, 'w'), separators=(',', ':'))
print(len(loops), 'loops ->', len(shapes), 'shapes', [ (len(s['outer']), [len(h) for h in s['holes']]) for s in shapes])
