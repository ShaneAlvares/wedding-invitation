(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const preloader = document.getElementById("preloader");
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  function finishIntro() {
    preloader.classList.add("hidden");
    document.body.classList.add("intro-done");
  }

  if (reduced) {
    finishIntro();
  } else {
    window.addEventListener("load", function () {
      window.setTimeout(finishIntro, 1600);
    });
  }

  function scatter(root, count, build) {
    for (let i = 0; i < count; i += 1) build(root, i);
  }

  scatter(document.getElementById("petals"), reduced ? 0 : window.innerWidth < 700 ? 7 : 14, function (root) {
    const petal = document.createElement("div");
    petal.className = "petal";
    petal.style.left = Math.random() * 100 + "%";
    petal.style.fontSize = 0.45 + Math.random() * 0.55 + "rem";
    petal.style.animationDuration = 11 + Math.random() * 9 + "s";
    petal.style.animationDelay = -Math.random() * 14 + "s";
    petal.style.setProperty("--drift", Math.random() * 140 - 70 + "px");
    root.appendChild(petal);
  });

  scatter(document.getElementById("heroSparkles"), reduced ? 0 : 22, function (root) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    const size = 2 + Math.random() * 3;
    sparkle.style.left = Math.random() * 100 + "%";
    sparkle.style.top = Math.random() * 100 + "%";
    sparkle.style.width = size + "px";
    sparkle.style.height = size + "px";
    sparkle.style.setProperty("--sd", 3 + Math.random() * 4 + "s");
    sparkle.style.setProperty("--sdel", Math.random() * 4 + "s");
    sparkle.style.setProperty("--so", 0.45 + Math.random() * 0.5);
    root.appendChild(sparkle);
  });

  scatter(document.getElementById("footerHearts"), reduced ? 0 : 10, function (root) {
    const heart = document.createElement("span");
    heart.className = "floating-heart";
    heart.textContent = "♥";
    heart.style.left = Math.random() * 100 + "%";
    heart.style.fontSize = 0.7 + Math.random() * 0.9 + "rem";
    heart.style.setProperty("--hfd", 7 + Math.random() * 6 + "s");
    heart.style.setProperty("--hfdel", Math.random() * 8 + "s");
    root.appendChild(heart);
  });

  navToggle.addEventListener("click", function () {
    const open = navbar.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      navbar.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  const sections = Array.from(document.querySelectorAll("header[id], section[id]"));
  const links = Array.from(navLinks.querySelectorAll("a"));

  function onScroll() {
    const y = window.scrollY;
    navbar.classList.toggle("scrolled", y > 40);
    document.getElementById("backToTop").classList.toggle("show", y > 500);

    const height = document.documentElement.scrollHeight - window.innerHeight;
    document.getElementById("scrollProgress").style.width = (height > 0 ? (y / height) * 100 : 0) + "%";

    const timeline = document.querySelector(".timeline");
    const progress = document.getElementById("timelineProgress");
    const rect = timeline.getBoundingClientRect();
    const traveled = Math.min(Math.max(window.innerHeight * 0.55 - rect.top, 0), rect.height);
    progress.style.height = traveled + "px";

    let current = "home";
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top < 140) current = section.id;
    });
    links.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.getElementById("backToTop").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  });

  if ("IntersectionObserver" in window && !reduced) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    document.querySelectorAll("[data-animate]").forEach(function (node) {
      observer.observe(node);
    });
  } else {
    document.querySelectorAll("[data-animate]").forEach(function (node) {
      node.classList.add("in");
    });
  }

  const countdown = document.getElementById("countdown");
  const start = new Date(countdown.dataset.start);
  const end = new Date(countdown.dataset.end);

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function renderCountdown() {
    const now = new Date();
    if (now >= end) {
      countdown.innerHTML = '<div class="countdown-item countdown-message">Just Married!</div>';
      return;
    }
    if (now >= start) {
      countdown.innerHTML = '<div class="countdown-item countdown-message">Today we marry</div>';
      return;
    }
    const diff = start - now;
    const parts = [
      [Math.floor(diff / 86400000), "Days"],
      [Math.floor((diff / 3600000) % 24), "Hours"],
      [Math.floor((diff / 60000) % 60), "Mins"],
      [Math.floor((diff / 1000) % 60), "Secs"],
    ];
    countdown.innerHTML = parts
      .map(function (part) {
        return (
          '<div class="countdown-item"><span class="countdown-number">' +
          pad(part[0]) +
          '</span><span class="countdown-label">' +
          part[1] +
          "</span></div>"
        );
      })
      .join("");
  }

  renderCountdown();
  window.setInterval(renderCountdown, 1000);

  const slides = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxCounter = document.getElementById("lightboxCounter");
  let index = 0;
  let lastFocus = null;

  function showSlide(next) {
    index = (next + slides.length) % slides.length;
    const img = slides[index].querySelector("img");
    const caption = slides[index].querySelector("figcaption p");
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = caption.textContent;
    lightboxCounter.textContent = index + 1 + " / " + slides.length;
  }

  function openLightbox(next) {
    lastFocus = document.activeElement;
    showSlide(next);
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("lightboxClose").focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  slides.forEach(function (slide, slideIndex) {
    slide.addEventListener("click", function () {
      openLightbox(slideIndex);
    });
  });

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", function () {
    showSlide(index - 1);
  });
  document.getElementById("lightboxNext").addEventListener("click", function () {
    showSlide(index + 1);
  });
  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (event) {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showSlide(index - 1);
    if (event.key === "ArrowRight") showSlide(index + 1);
  });

  const form = document.getElementById("rsvpForm");
  const toast = document.getElementById("toast");
  let toastTimer = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 3200);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const entry = {
      name: form.name.value.trim(),
      attending: form.attending.value,
      message: form.message.value.trim(),
      createdAt: new Date().toISOString(),
    };
    const key = "si-invitation-rsvps";
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(items)) items = [];
    } catch (error) {
      items = [];
    }
    items.push(entry);
    localStorage.setItem(key, JSON.stringify(items));
    form.reset();
    showToast(
      entry.attending === "yes"
        ? "Thank you, " + entry.name + ". We cannot wait to celebrate with you."
        : "Thank you, " + entry.name + ". We will miss you on the day."
    );
  });
})();
