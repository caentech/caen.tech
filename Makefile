.PHONY: run install update-program photos docs

run:
	npx astro dev --open

install:
	npm install

update-program:
	node scripts/convert-schedule.mjs "$(or $(INPUT),$(word 2,$(MAKECMDGOALS)))"

# Convert source photos from .local/photos/*.jpg into optimized WebP files
# in public/images/photos/ (see docs/images.md). Outputs are named
# photo-1.webp, photo-2.webp, ... so the gallery in src/pages/photos.astro
# auto-discovers them. The longest side is capped at 1600px, quality ~80.
# Then regenerate src/data/session-photos.json, which guesses (from EXIF
# capture times) which photos belong to each program session.
photos:
	@command -v cwebp >/dev/null 2>&1 || { echo "cwebp is required (brew install webp)"; exit 1; }
	@mkdir -p public/images/photos
	@rm -f public/images/photos/photo-*.webp
	@i=0; \
	for src in $$(ls .local/photos/*.jpg .local/photos/*.JPG .local/photos/*.jpeg 2>/dev/null | sort); do \
		i=$$((i + 1)); \
		w=$$(sips -g pixelWidth "$$src" | awk '/pixelWidth/{print $$2}'); \
		h=$$(sips -g pixelHeight "$$src" | awk '/pixelHeight/{print $$2}'); \
		if [ "$$w" -ge "$$h" ]; then rw=1600; rh=0; else rw=0; rh=1600; fi; \
		out="public/images/photos/photo-$$i.webp"; \
		cwebp -quiet -q 80 -metadata none -resize "$$rw" "$$rh" "$$src" -o "$$out"; \
		echo "$$src -> $$out"; \
	done; \
	echo "Converted $$i photo(s)."
	@python3 scripts/generate-session-photos.py

# Catch positional arguments passed after targets
%:
	@:
