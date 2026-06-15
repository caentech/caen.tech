.PHONY: run install update-program photos docs

run:
	npx astro dev --open

install:
	npm install

update-program:
	node scripts/convert-schedule.mjs "$(or $(INPUT),$(word 2,$(MAKECMDGOALS)))"

# Additive photo pipeline. Drops new source photos into .local/photos/*.jpg,
# then `make photos` converts only the NEW ones into optimized WebP files in
# public/images/photos/ (see docs/images.md), named photo-N.webp with a stable
# index that is never reused or renumbered, so the gallery in
# src/pages/photos.astro auto-discovers them. The longest side is capped at
# 1600px, quality ~80. Existing photos and src/data/session-photos.json are
# never wiped: new photos are appended to the sessions whose time slot matches
# their EXIF capture time. Removing a source removes nothing.
photos:
	@python3 scripts/generate-session-photos.py

# Catch positional arguments passed after targets
%:
	@:
