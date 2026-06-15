#!/usr/bin/env python3
"""Convertit les nouvelles photos sources en WebP et met à jour le mapping des
photos par session — de façon ADDITIVE.

`make photos` est additif : il n'écrase jamais les photos déjà générées ni le
fichier `session-photos.json`. À chaque exécution, seules les photos sources
*nouvelles* (jamais converties) de `.local/photos/` sont :

  1. converties en `public/images/photos/photo-N.webp` (N = index stable,
     attribué une fois pour toutes, jamais réutilisé ni renuméroté) ;
  2. rattachées aux sessions du programme dont le créneau horaire contient leur
     instant de prise de vue (EXIF `DateTimeOriginal`), puis ajoutées à
     `src/data/session-photos.json`.

Identité stable : un manifeste local (`.local/photos/.manifest.json`) associe
chaque nom de fichier source à son index `photo-N`. Les indices déjà utilisés
sont aussi déduits des `photo-N.webp` présents dans `public/`, de sorte qu'un
clone sans manifeste ne réattribue jamais un index déjà publié — les nouvelles
photos sont simplement ajoutées à la suite.

Notes :
- L'EXIF `DateTimeOriginal` n'a pas de fuseau : on le lit comme une heure
  locale (Europe/Paris) et on la compare à l'heure murale des sessions.
- Plusieurs sessions peuvent tourner en parallèle (salles différentes) ; l'EXIF
  ne permet pas de connaître la salle, donc une photo peut être rattachée à
  toutes les sessions concomitantes. C'est une supposition assumée.
- Retirer une photo source du dossier ne supprime RIEN (ni le `.webp`, ni le
  mapping) : l'opération est strictement additive.
- Si `.local/photos/` est absent (clone sans les sources), on ne touche à rien.
"""

import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime

from PIL import ExifTags, Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, ".local", "photos")
PUBLIC_DIR = os.path.join(ROOT, "public", "images", "photos")
PROGRAM = os.path.join(ROOT, "src", "data", "program.json")
OUT = os.path.join(ROOT, "src", "data", "session-photos.json")
MANIFEST = os.path.join(SRC_DIR, ".manifest.json")
PUBLIC_PREFIX = "/images/photos"

# Nombre maximum de photos affichées par session (réparties uniformément sur le
# créneau pour éviter une galerie surchargée).
MAX_PER_SESSION = 6

# Optimisation WebP : plus grand côté plafonné, qualité ~80 (voir docs/images.md).
MAX_SIDE = 1600
QUALITY = 80

SRC_EXTS = (".jpg", ".jpeg")


def source_basenames():
    """Noms des photos sources (triés), hors fichiers cachés (.DS_Store…)."""
    if not os.path.isdir(SRC_DIR):
        return []
    names = [
        name
        for name in os.listdir(SRC_DIR)
        if not name.startswith(".")
        and os.path.splitext(name)[1].lower() in SRC_EXTS
    ]
    return sorted(names)


def load_manifest():
    """Manifeste {nom de fichier source -> index photo-N}."""
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_manifest(manifest):
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def published_indices():
    """Indices N déjà publiés comme `photo-N.webp` dans `public/`."""
    indices = set()
    if os.path.isdir(PUBLIC_DIR):
        for name in os.listdir(PUBLIC_DIR):
            m = re.fullmatch(r"photo-(\d+)\.webp", name)
            if m:
                indices.add(int(m.group(1)))
    return indices


def exif_datetime(path):
    """Renvoie le datetime EXIF DateTimeOriginal (naïf, heure locale) ou None."""
    with Image.open(path) as img:
        exif = img.getexif()
        ifd = exif.get_ifd(ExifTags.IFD.Exif)
        raw = ifd.get(ExifTags.Base.DateTimeOriginal.value)
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None


def convert(src_path, out_path):
    """Convertit une photo source en WebP optimisé (plus grand côté ≤ 1600)."""
    with Image.open(src_path) as img:
        width, height = img.size
    if width >= height:
        resize = [str(MAX_SIDE), "0"]
    else:
        resize = ["0", str(MAX_SIDE)]
    subprocess.run(
        [
            "cwebp", "-quiet", "-q", str(QUALITY), "-metadata", "none",
            "-resize", *resize, src_path, "-o", out_path,
        ],
        check=True,
    )


def local_wall_clock(iso):
    """Convertit une date ISO du programme en heure murale locale (sans fuseau)."""
    return datetime.fromisoformat(iso).replace(tzinfo=None)


def even_sample(items, limit):
    """Échantillonne `limit` éléments répartis uniformément dans `items`."""
    if len(items) <= limit:
        return items
    step = len(items) / limit
    return [items[int(k * step)] for k in range(limit)]


def convert_new_photos():
    """Convertit les sources non encore converties. Renvoie (new, manifest).

    `new` est une liste (index, datetime EXIF) dans l'ordre des index.
    """
    sources = source_basenames()
    if not sources:
        return [], None

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    manifest = load_manifest()
    used = published_indices() | set(manifest.values())
    next_index = max(used) + 1 if used else 1

    new = []
    for name in sources:
        if name in manifest:
            index = manifest[name]
            out_path = os.path.join(PUBLIC_DIR, f"photo-{index}.webp")
            if os.path.exists(out_path):
                continue  # déjà converti : on ne refait rien (additif)
        else:
            index = next_index
            next_index += 1
            manifest[name] = index
            out_path = os.path.join(PUBLIC_DIR, f"photo-{index}.webp")
        convert(os.path.join(SRC_DIR, name), out_path)
        new.append((index, exif_datetime(os.path.join(SRC_DIR, name))))
        print(f"{name} -> photo-{index}.webp")

    new.sort(key=lambda item: item[0])
    return new, manifest


def merge_session_mapping(new):
    """Ajoute les nouvelles photos au mapping session->photos existant."""
    mapping = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            mapping = json.load(f)

    with open(PROGRAM, encoding="utf-8") as f:
        program = json.load(f)

    # Nouvelles photos par session, dans l'ordre chronologique (= ordre d'index).
    new_by_session = {}
    for index, taken in new:
        if not taken:
            continue
        path = f"{PUBLIC_PREFIX}/photo-{index}.webp"
        for session in program:
            start = local_wall_clock(session["startTime"])
            end = local_wall_clock(session["endTime"])
            if start <= taken < end:
                new_by_session.setdefault(session["id"], []).append(path)

    for sid, paths in new_by_session.items():
        existing = mapping.get(sid, [])
        if existing:
            # On complète la galerie existante sans dépasser le plafond.
            room = MAX_PER_SESSION - len(existing)
            additions = [p for p in paths if p not in existing][:max(room, 0)]
            mapping[sid] = existing + additions
        else:
            # Session encore vide : on répartit uniformément les nouvelles.
            mapping[sid] = even_sample(paths, MAX_PER_SESSION)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total = sum(len(v) for v in mapping.values())
    print(
        f"{os.path.relpath(OUT, ROOT)} : {total} photo(s) réparties "
        f"sur {len(mapping)} session(s)."
    )


def main():
    if not shutil.which("cwebp"):
        print("cwebp is required (brew install webp)", file=sys.stderr)
        return 1

    if not os.path.isdir(SRC_DIR):
        print(
            f"Aucun dossier source {os.path.relpath(SRC_DIR, ROOT)} — "
            f"rien à faire.",
            file=sys.stderr,
        )
        return 0

    new, manifest = convert_new_photos()
    if manifest is not None:
        save_manifest(manifest)

    if not new:
        print("Aucune nouvelle photo à convertir — rien d'ajouté.")
        return 0

    merge_session_mapping(new)
    return 0


if __name__ == "__main__":
    sys.exit(main())
