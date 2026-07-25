import os
from pathlib import Path
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

LOGOS_DIR = Path(__file__).parent / "logos"

def convert_all():
    print(f"Membaca SVG dari: {LOGOS_DIR}")
    for file_name in os.listdir(LOGOS_DIR):
        if file_name.endswith(".svg"):
            svg_path = LOGOS_DIR / file_name
            png_name = file_name.replace(".svg", ".png")
            png_path = LOGOS_DIR / png_name
            
            print(f"Mengonversi {file_name} -> {png_name}...")
            try:
                drawing = svg2rlg(str(svg_path))
                renderPM.drawToFile(drawing, str(png_path), fmt="PNG")
                print("Berhasil!")
            except Exception as e:
                print(f"Gagal mengonversi {file_name}: {e}")

if __name__ == "__main__":
    convert_all()
