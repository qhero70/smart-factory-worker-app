from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

來源 = Path("docs/line/richmenu-supervisor-v189.png")
輸出 = Path("docs/line/richmenu-supervisor-v190.png")

圖片 = Image.open(來源).convert("RGB")
圖片 = 圖片.resize((1200, 810), Image.Resampling.LANCZOS)
畫筆 = ImageDraw.Draw(圖片)

字型路徑 = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
中文字型 = ImageFont.truetype(字型路徑, 54)
英文字型 = ImageFont.truetype(字型路徑, 23)
版本字型 = ImageFont.truetype(字型路徑, 26)

深藍 = "#18324A"
深灰 = "#425466"

上排 = [
    ("主管戰情", "Supervisor Dashboard"),
    ("今日戰情", "Today Dashboard"),
    ("指令中心", "Command Center"),
]

下排 = [
    ("製造工廠", "Manufacturing"),
    ("我的狀態", "My Status"),
    ("製造工具", "Manufacturing Tools"),
]

def 置中文字(左, 右, y, 文字, 字型, 顏色):
    框 = 畫筆.textbbox((0, 0), 文字, font=字型)
    寬 = 框[2] - 框[0]
    x = (左 + 右 - 寬) / 2
    畫筆.text((x, y), 文字, font=字型, fill=顏色)

for 欄 in range(3):
    x0 = 欄 * 400
    畫筆.rectangle([x0 + 8, 245, x0 + 392, 342], fill="white")
    畫筆.rectangle([x0 + 8, 625, x0 + 392, 747], fill="white")

for 索引, (中文, 英文) in enumerate(上排):
    左 = 索引 * 400
    右 = (索引 + 1) * 400
    置中文字(左, 右, 250, 中文, 中文字型, 深藍)
    置中文字(左, 右, 310, 英文, 英文字型, 深灰)

for 索引, (中文, 英文) in enumerate(下排):
    左 = 索引 * 400
    右 = (索引 + 1) * 400
    置中文字(左, 右, 638, 中文, 中文字型, 深藍)
    置中文字(左, 右, 699, 英文, 英文字型, 深灰)

# 更新右下版本徽章，避免仍顯示 v1.8.8
徽章框 = [1088, 402, 1190, 448]
畫筆.rounded_rectangle(徽章框, radius=22, fill="#285C34", outline="#153D20", width=3)
置中文字(1088, 1190, 409, "v1.9.0", 版本字型, "white")

圖片.save(輸出, format="PNG", optimize=True)

大小 = 輸出.stat().st_size
if 大小 > 1024 * 1024:
    raise RuntimeError(f"輸出圖片超過 LINE 1MB 限制：{大小} bytes")

print(f"完成：{輸出} / {大小} bytes")
