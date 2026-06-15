// Visionneuse plein écran (lightbox) partagée par les galeries de la page.
// Le clic sur une vignette ouvre l'image en grand sans quitter le site ;
// les flèches gauche/droite (clavier ou boutons) naviguent au sein de la
// galerie cliquée. Chaque conteneur `[data-photo-gallery]` (photos de la
// journée, illustrations…) constitue son propre ensemble de navigation.

interface Photo {
  src: string;
  alt: string;
}

const lightbox = document.getElementById("photo-lightbox");
const image = document.getElementById("lightbox-image") as HTMLImageElement | null;
const counter = document.getElementById("lightbox-counter");

if (lightbox && image) {
  const closeBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-close]");

  // Ensemble de photos actuellement affiché (celui de la galerie cliquée).
  let photos: Photo[] = [];
  let current = 0;
  let lastFocused: HTMLElement | null = null;

  function preload(index: number) {
    const photo = photos[(index + photos.length) % photos.length];
    if (photo) new Image().src = photo.src;
  }

  function show(index: number) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image!.src = photo.src;
    image!.alt = photo.alt;
    if (counter) counter.textContent = `${current + 1} / ${photos.length}`;
    // Précharge les voisines pour une navigation fluide
    preload(current + 1);
    preload(current - 1);
  }

  function open(galleryPhotos: Photo[], index: number) {
    photos = galleryPhotos;
    lastFocused = document.activeElement as HTMLElement;
    show(index);
    lightbox!.classList.add("open");
    lightbox!.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function close() {
    lightbox!.classList.remove("open");
    lightbox!.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    image!.src = "";
    lastFocused?.focus();
    lastFocused = null;
  }

  const isOpen = () => lightbox!.classList.contains("open");

  // Chaque galerie est indépendante : ses vignettes ouvrent la visionneuse
  // sur son propre ensemble de photos.
  const galleries = Array.from(
    document.querySelectorAll<HTMLElement>("[data-photo-gallery]")
  );

  galleries.forEach((gallery) => {
    const triggers = Array.from(
      gallery.querySelectorAll<HTMLAnchorElement>("[data-photo-trigger]")
    );
    const galleryPhotos: Photo[] = triggers.map((trigger) => ({
      src: trigger.getAttribute("href") || "",
      alt: trigger.querySelector("img")?.getAttribute("alt") || "",
    }));

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        open(galleryPhotos, index);
      });
    });
  });

  lightbox.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-lightbox-next]")) show(current + 1);
    else if (target.closest("[data-lightbox-prev]")) show(current - 1);
    else if (target.closest("[data-lightbox-close]")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(current + 1);
    else if (e.key === "ArrowLeft") show(current - 1);
  });
}
