#!/usr/bin/env python3
"""Génère les images du bandeau défilant de la page d'accueil.

Reprend une sélection de photos de `public/images/photos/` et les ré-encode à la
hauteur d'affichage du bandeau × 2 (retina), conformément à docs/images.md.
Le composant qui les consomme est `src/components/PhotoBand.astro` : la liste
PICKS doit rester alignée avec celle qu'il déclare.

Usage : python3 scripts/generate-band-photos.py
"""

import os

from PIL import Image

PICKS = [2, 6, 11, 16, 25, 29, 34, 36, 44, 48, 53, 67, 71, 76]
SOURCE_DIR = "public/images/photos"
OUTPUT_DIR = "public/images/band"
HEIGHT = 440  # bandeau affiché à 220 px de haut, × 2 pour le retina
QUALITY = 80


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for number in PICKS:
        image = Image.open(f"{SOURCE_DIR}/photo-{number}.webp").convert("RGB")
        width = round(image.width * HEIGHT / image.height)
        image = image.resize((width, HEIGHT), Image.LANCZOS)
        path = f"{OUTPUT_DIR}/photo-{number}.webp"
        image.save(path, "WEBP", quality=QUALITY)
        print(f"{path} — {width}×{HEIGHT}, {os.path.getsize(path) // 1024} Ko")


if __name__ == "__main__":
    main()
