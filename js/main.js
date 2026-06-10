/* ============================================================
   KARE STUDIO — main.js
   Preloader, navigazione, lingua, animazioni, photo-loop, form.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     LINGUA (IT default, EN / FR / DE)
     ---------------------------------------------------------- */
  const LANGS = ["it", "en", "fr", "de"];
  const stored = (() => {
    try { return localStorage.getItem("kare-lang"); } catch (e) { return null; }
  })();
  let lang = LANGS.includes(stored) ? stored : "it";

  function t(key) {
    return (window.I18N[lang] && window.I18N[lang][key]) || window.I18N.it[key] || key;
  }

  function applyLang() {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPh));
    });

    document.querySelectorAll(".lang button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === lang);
    });

    // ricalcola le altezze delle FAQ aperte (il testo cambia lunghezza)
    document.querySelectorAll(".faq-item.is-open .faq-item__body").forEach((body) => {
      body.style.maxHeight = body.scrollHeight + "px";
    });
  }

  function setLang(next) {
    if (!LANGS.includes(next)) return;
    lang = next;
    try { localStorage.setItem("kare-lang", lang); } catch (e) { /* no-op */ }
    applyLang();
  }

  document.querySelectorAll(".lang button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  /* ----------------------------------------------------------
     PRELOADER
     ---------------------------------------------------------- */
  const preloader = document.querySelector(".preloader");
  if (preloader) {
    const word = preloader.querySelector(".preloader__word");
    if (word) {
      const text = word.textContent.trim();
      word.textContent = "";
      [...text].forEach((ch, i) => {
        const s = document.createElement("span");
        s.textContent = ch === " " ? "\u00A0" : ch;
        s.style.animationDelay = i * 0.045 + "s";
        word.appendChild(s);
      });
    }
    window.addEventListener("load", () => {
      setTimeout(() => preloader.classList.add("is-done"), 900);
    });
    // fallback se "load" tarda
    setTimeout(() => preloader.classList.add("is-done"), 3500);
  }

  /* ----------------------------------------------------------
     HEADER: sfondo allo scroll + hide/show
     ---------------------------------------------------------- */
  const header = document.querySelector(".header");
  let lastY = 0;

  function onScrollHeader() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 60);
      header.classList.toggle("is-hidden", y > 500 && y > lastY);
    }
    lastY = y;
  }

  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ----------------------------------------------------------
     MENU MOBILE
     ---------------------------------------------------------- */
  const burger = document.querySelector(".burger");
  const overlay = document.querySelector(".menu-overlay");

  if (burger && overlay) {
    const closeMenu = () => {
      overlay.classList.remove("is-open");
      burger.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
    };

    burger.addEventListener("click", () => {
      const open = overlay.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });

    const closeBtn = overlay.querySelector(".menu-overlay__close");
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);

    overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

    // chiusura anche con il tasto ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeMenu();
    });
  }

  /* ----------------------------------------------------------
     REVEAL ON SCROLL (IntersectionObserver)
     ---------------------------------------------------------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  document
    .querySelectorAll(".reveal, .reveal-img, .mask-lines")
    .forEach((el) => io.observe(el));

  /* ----------------------------------------------------------
     PARALLAX leggero su elementi [data-parallax]
     ---------------------------------------------------------- */
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;

  function parallax() {
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
    ticking = false;
  }

  if (parallaxEls.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(parallax);
          ticking = true;
        }
      },
      { passive: true }
    );
    parallax();
  }

  /* ----------------------------------------------------------
     PHOTO LOOP — foto che girano in loop come un video.
     <div class="ploop" data-frames="img/a.png, img/b.png, img/c.png"
          data-interval="1400"></div>
     ---------------------------------------------------------- */
  document.querySelectorAll(".ploop[data-frames]").forEach((loop) => {
    const frames = loop.dataset.frames.split(",").map((s) => s.trim()).filter(Boolean);
    if (!frames.length) return;

    const imgs = frames.map((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      if (i === 0) img.classList.add("is-current");
      loop.appendChild(img);
      return img;
    });

    if (imgs.length < 2) return;

    let idx = 0;
    const interval = parseInt(loop.dataset.interval, 10) || 1500;

    setInterval(() => {
      imgs[idx].classList.remove("is-current");
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add("is-current");
    }, interval);
  });

  /* ----------------------------------------------------------
     FAQ accordion
     ---------------------------------------------------------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector("button");
    const body = item.querySelector(".faq-item__body");
    if (!btn || !body) return;
    btn.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
    });
  });

  /* ----------------------------------------------------------
     SERVIZI → preseleziona il servizio nel form della pagina
     <a class="btn-pill" data-service="Nome servizio" href="#richiesta">
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-service]").forEach((el) => {
    el.addEventListener("click", () => {
      const select = document.querySelector('select[name="servizio"]');
      if (!select) return;
      const wanted = el.dataset.service;
      [...select.options].forEach((opt) => {
        if (opt.dataset.i18n === wanted || opt.value === wanted) select.value = opt.value;
      });
    });
  });

  /* ----------------------------------------------------------
     FORM via Formspree (richieste progetto + newsletter)
     Sostituire gli ID nei singoli action="https://formspree.io/f/..."
     ---------------------------------------------------------- */
  document.querySelectorAll("form[data-formspree]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = form.parentElement.querySelector(".form-status") || form.querySelector(".form-status");
      const okKey = form.dataset.okKey || "form.ok";
      const errKey = form.dataset.errKey || "form.err";
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("formspree");
        if (status) {
          status.textContent = t(okKey);
          status.classList.add("is-ok");
          status.classList.remove("is-err");
        }
        form.reset();
      } catch (err) {
        if (status) {
          status.textContent = t(errKey);
          status.classList.add("is-err");
          status.classList.remove("is-ok");
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });

  /* ----------------------------------------------------------
     Avvio
     ---------------------------------------------------------- */
  applyLang();
})();
