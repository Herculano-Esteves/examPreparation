#!/usr/bin/env python3
"""
download_assets.py
------------------
Downloads open-source fonts (Inter, JetBrains Mono) and vendor libraries
(FontAwesome Free 6.4, KaTeX 0.16.8) to make the application 100% self-hosted
and compliant with EU privacy laws (zero runtime external CDN calls).
"""

import os
import urllib.request
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(BASE_DIR, 'static', 'fonts')
VENDOR_DIR = os.path.join(BASE_DIR, 'static', 'vendor')

FA_CSS_DIR = os.path.join(VENDOR_DIR, 'fontawesome', 'css')
FA_FONTS_DIR = os.path.join(VENDOR_DIR, 'fontawesome', 'webfonts')
KATEX_DIR = os.path.join(VENDOR_DIR, 'katex')
KATEX_FONTS_DIR = os.path.join(KATEX_DIR, 'fonts')

for d in [FONTS_DIR, FA_CSS_DIR, FA_FONTS_DIR, KATEX_DIR, KATEX_FONTS_DIR]:
    os.makedirs(d, exist_ok=True)

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def download_file(url, dest_path):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"  [OK] Already exists: {os.path.basename(dest_path)}")
        return
    print(f"  Downloading: {url} -> {os.path.basename(dest_path)}...")
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req) as resp, open(dest_path, 'wb') as out:
        out.write(resp.read())
    print(f"  -> Done ({os.path.getsize(dest_path)} bytes)")

print("\n--- 1. Downloading Inter and JetBrains Mono (SIL OFL) ---")
font_files = {
    'inter-latin-400.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff2',
    'inter-latin-500.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.woff2',
    'inter-latin-600.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.woff2',
    'inter-latin-700.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff2',
    'jetbrains-mono-latin-400.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.woff2',
    'jetbrains-mono-latin-500.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-500-normal.woff2',
    'jetbrains-mono-latin-600.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-600-normal.woff2',
    'jetbrains-mono-latin-700.woff2': 'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-700-normal.woff2',
}

for name, url in font_files.items():
    download_file(url, os.path.join(FONTS_DIR, name))

print("\n--- 2. Downloading FontAwesome Free 6.4 (SIL OFL / MIT) ---")
fa_files = {
    os.path.join(FA_CSS_DIR, 'all.min.css'): 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    os.path.join(FA_FONTS_DIR, 'fa-solid-900.woff2'): 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    os.path.join(FA_FONTS_DIR, 'fa-regular-400.woff2'): 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    os.path.join(FA_FONTS_DIR, 'fa-brands-400.woff2'): 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    os.path.join(FA_FONTS_DIR, 'fa-v4compatibility.woff2'): 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compatibility.woff2',
}

for path, url in fa_files.items():
    download_file(url, path)

print("\n--- 3. Downloading KaTeX 0.16.8 (MIT / SIL OFL) ---")
katex_files = {
    os.path.join(KATEX_DIR, 'katex.min.css'): 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
    os.path.join(KATEX_DIR, 'katex.min.js'): 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js',
    os.path.join(KATEX_DIR, 'auto-render.min.js'): 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js',
}

for path, url in katex_files.items():
    download_file(url, path)

# Download KaTeX fonts referenced in katex.min.css
with open(os.path.join(KATEX_DIR, 'katex.min.css'), 'r', encoding='utf-8') as f:
    css_content = f.read()

katex_font_matches = set(re.findall(r'fonts/(KaTeX_[^)]+\.woff2)', css_content))
print(f"  Found {len(katex_font_matches)} KaTeX WOFF2 fonts to download.")
for font_name in sorted(katex_font_matches):
    url = f'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/{font_name}'
    download_file(url, os.path.join(KATEX_FONTS_DIR, font_name))

print("\nAll assets downloaded successfully and saved locally in static/fonts/ and static/vendor/!")
