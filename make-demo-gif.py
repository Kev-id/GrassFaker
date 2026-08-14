#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 GrassFaker 演示 GIF（demo.gif）和一张预览图（preview.png）。"""
import os
import random
from PIL import Image, ImageDraw, ImageFont

# ---------- 配色（GitHub 浅色主题经典绿） ----------
LEVELS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
BG = '#ffffff'
INK = '#24292f'
MUTED = '#6e7781'

# ---------- 网格参数 ----------
COLS, ROWS = 53, 7
CELL, GAP, PAD = 10, 3, 18
STEP = CELL + GAP
CAP_H = 26  # 标题区高度
W = PAD * 2 + COLS * STEP - GAP
H = PAD + CAP_H + ROWS * STEP - GAP + PAD
GRID_Y = PAD + CAP_H

# ---------- 字体 ----------
def load_font(size, bold=False):
    if bold:
        cands = ['C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/simhei.ttf',
                 'C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf']
    else:
        cands = ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf',
                 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']
    for p in cands:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

TITLE_F = load_font(17, bold=True)
SCENE_F = load_font(13)

# ---------- 5×7 字体（只留演示需要的字母） ----------
GLYPHS = {
    'L': ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
    'O': [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
    'V': ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
    'E': ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
}
HEART = [' ## ## ', '#######', '#######', '#######', ' ##### ', '  ###  ', '   #   ']


def render_text(s):
    rows = [''] * 7
    for i, ch in enumerate(s):
        g = GLYPHS.get(ch, ['     '] * 7)
        for r in range(7):
            rows[r] += ('' if i == 0 else ' ') + g[r]
    return rows


def empty():
    return [[0] * COLS for _ in range(ROWS)]


def stamp(grid, pattern, start_col, level=4):
    for r in range(7):
        row = pattern[r]
        for c, ch in enumerate(row):
            if ch == '#':
                grid[r][start_col + c] = level


def draw_frame(grid, scene):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((PAD, 6), 'GrassFaker', font=TITLE_F, fill=INK)
    d.text((W - PAD, 9), scene, font=SCENE_F, fill=MUTED, anchor='ra')
    for r in range(ROWS):
        for c in range(COLS):
            x = PAD + c * STEP
            y = GRID_Y + r * STEP
            d.rounded_rectangle([x, y, x + CELL, y + CELL], radius=2,
                                fill=LEVELS[grid[r][c]])
    return img


def push(frames, durs, grid, scene, ms, copies=1):
    for _ in range(copies):
        frames.append(draw_frame(grid, scene))
        durs.append(ms)


# ---------- 动画序列 ----------
frames, durs = [], []

# 1. 开场
push(frames, durs, empty(), '把贡献图涂成你想要的样子', 1200)

# 2. 一键全绿（从左到右扫过去）
grid = empty()
push(frames, durs, grid, '一键全绿', 400)
for c in range(COLS):
    for r in range(ROWS):
        grid[r][c] = 4
    push(frames, durs, grid, '一键全绿', 35)
push(frames, durs, grid, '一键全绿', 700)

# 3. 清空
push(frames, durs, empty(), '清空', 300)

# 4. 打印文字 LOVE（逐字母）
love = render_text('LOVE')
start = (COLS - len(love[0])) // 2
for n in range(1, 5):
    g = empty()
    w = n * 6 - 1  # 每字母 5 列 + 1 间隔，最后一个无间隔
    for r in range(7):
        for c in range(w):
            if love[r][c] == '#':
                g[r][start + c] = 4
    push(frames, durs, g, '打印文字 · LOVE', 240)
push(frames, durs, g, '打印文字 · LOVE', 900)

# 5. 清空
push(frames, durs, empty(), '清空', 300)

# 6. 像素模板 ❤
g = empty()
stamp(g, HEART, (COLS - len(HEART[0])) // 2, 4)
push(frames, durs, g, '像素模板 · 爱心', 700)
push(frames, durs, g, '像素模板 · 爱心', 900)

# 7. 随机深浅
random.seed(20260814)
for _ in range(4):
    g = [[random.randint(0, 4) for _ in range(COLS)] for _ in range(ROWS)]
    push(frames, durs, g, '随机深浅', 220)
push(frames, durs, g, '随机深浅', 600)

# 8. 还原 / 清空
push(frames, durs, empty(), '一键清空 / 还原', 1200)

# ---------- 输出 ----------
frames[0].save('demo.gif', save_all=True, append_images=frames[1:],
               duration=durs, loop=0, disposal=2)
# 存一张 LOVE 帧作为预览图，方便肉眼检查
preview = draw_frame(
    (lambda: (lambda gg: (stamp(gg, love, start, 4), gg)[1])(empty()))(),
    '打印文字 · LOVE')
preview.save('preview.png')
print(f'done: {len(frames)} frames, {W}x{H}, demo.gif + preview.png')
