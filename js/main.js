/* ============================================================
   KARE STUDIO — main.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Intro veil (solo home, una volta per sessione) ---------- */
  const veil = document.querySelector('.intro-veil');
  if (veil) {
    try {
      if (sessionStorage.getItem('kare-intro')) veil.classList.add('is-skipped');
      else sessionStorage.setItem('kare-intro', '1');
    } catch (e) { /* storage non disponibile: mostra comunque */ }
    veil.addEventListener('animationend', e => {
      if (e.animationName === 'veil-up') veil.remove();
    });
  }

  /* ---------- Header shadow on scroll ---------- */
  const header = document.querySelector('.site-header');
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Mobile menu ---------- */
  const burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
    });
    document.querySelectorAll('.mobile-menu a').forEach(a =>
      a.addEventListener('click', () => document.body.classList.remove('menu-open'))
    );
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Background color switch ----------
     Sections carry data-bg="dark" | "cream".
     When a section crosses the middle of the viewport,
     the body background transitions. */
  const bgSections = document.querySelectorAll('[data-bg]');
  if (bgSections.length) {
    const updateBg = () => {
      const mid = window.innerHeight * 0.55;
      let current = 'cream';
      bgSections.forEach(sec => {
        const r = sec.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid * 0.4) current = sec.dataset.bg;
      });
      document.body.classList.toggle('bg-dark', current === 'dark');
    };
    window.addEventListener('scroll', updateBg, { passive: true });
    window.addEventListener('resize', updateBg);
    updateBg();
  }

  /* ---------- Marquee: duplicate content for seamless loop ---------- */
  document.querySelectorAll('.marquee').forEach(m => {
    m.innerHTML += m.innerHTML;
  });
  /* carosello brand stampa: duplica due volte per un loop senza stacchi */
  document.querySelectorAll('.press-marquee').forEach(m => {
    m.innerHTML += m.innerHTML;
    m.innerHTML += m.innerHTML;
  });

  /* Scorrimento marquee via JS: così la pausa al passaggio del mouse si
     ferma esattamente dov'è (l'animation-play-state CSS salta su Safari). */
  function animateMarquee(el, pxPerSec) {
    el.style.animation = 'none';
    let x = 0;
    let paused = false;
    let last = performance.now();
    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!paused) {
        x -= pxPerSec * dt;
        const half = el.scrollWidth / 2;
        if (half > 0 && -x >= half) x += half;
        el.style.transform = 'translateX(' + x + 'px)';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('.marquee').forEach(m => animateMarquee(m, 60));
  document.querySelectorAll('.press-marquee').forEach(m => animateMarquee(m, 70));

  /* ---------- Image loops (stop-motion) ----------
     <div class="img-loop" data-interval="700"><img ...><img ...></div> */
  document.querySelectorAll('.img-loop').forEach(loop => {
    const frames = loop.querySelectorAll('img');
    if (frames[0]) {
      /* Il contenitore prende le proporzioni del PRIMO frame (se non già
         definite via CSS): le foto sono in position absolute, quindi i
         formati diversi vengono ritagliati senza spostare il layout. */
      const setRatio = () => {
        if (getComputedStyle(loop).aspectRatio === 'auto' && frames[0].naturalWidth) {
          loop.style.aspectRatio = frames[0].naturalWidth + ' / ' + frames[0].naturalHeight;
        }
      };
      if (frames[0].complete) setRatio();
      else frames[0].addEventListener('load', setRatio, { once: true });
    }
    if (frames.length < 2) { if (frames[0]) frames[0].classList.add('is-on'); return; }
    let i = 0;
    frames[0].classList.add('is-on');
    const interval = parseInt(loop.dataset.interval || '700', 10);
    setInterval(() => {
      frames[i].classList.remove('is-on');
      i = (i + 1) % frames.length;
      frames[i].classList.add('is-on');
    }, interval);
  });

  /* ---------- Testimonial carousel ---------- */
  document.querySelectorAll('.t-carousel').forEach(car => {
    const track = car.querySelector('.t-track');
    const cards = track.children;
    const prev = car.querySelector('.t-arrow.prev');
    const next = car.querySelector('.t-arrow.next');
    let index = 0;

    const perView = () => (window.innerWidth <= 980 ? 1 : 3);
    const maxIndex = () => Math.max(0, cards.length - perView());

    function go(i) {
      index = Math.min(Math.max(i, 0), maxIndex());
      const card = cards[0];
      if (!card) return;
      const gap = 22;
      const w = card.getBoundingClientRect().width + gap;
      track.style.transform = `translateX(${-index * w}px)`;
      /* la freccia sparisce quando si raggiunge il limite */
      if (prev) prev.classList.toggle('is-hidden', index === 0);
      if (next) next.classList.toggle('is-hidden', index >= maxIndex());
    }
    if (prev) prev.addEventListener('click', () => go(index - 1));
    if (next) next.addEventListener('click', () => go(index + 1));
    window.addEventListener('resize', () => go(index));
    go(0);
  });

  /* ---------- Ricerca blog ----------
     Filtra le card del blog in tempo reale in base al testo digitato
     (titolo, categoria ed estratto). */
  const blogSearchInput = document.querySelector('.blog-search input');
  const blogGrid = document.querySelector('.blog-grid');
  if (blogSearchInput && blogGrid) {
    const cards = blogGrid.querySelectorAll('.post-card');
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'search-empty';
    emptyMsg.textContent = 'Nessun articolo trovato. Prova con un\u2019altra parola.';
    emptyMsg.style.display = 'none';
    blogGrid.parentElement.appendChild(emptyMsg);

    blogSearchInput.addEventListener('input', () => {
      const q = blogSearchInput.value.toLowerCase().trim();
      let visible = 0;
      cards.forEach(card => {
        const match = !q || card.textContent.toLowerCase().includes(q);
        card.style.display = match ? '' : 'none';
        if (match) {
          visible++;
          /* le card sono .reveal: se non sono ancora state rivelate
             dallo scroll, forziamo la visibilità per non mostrarle vuote */
          card.classList.add('is-visible');
        }
      });
      emptyMsg.style.display = visible === 0 ? '' : 'none';
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      // close siblings within same faq
      item.parentElement.querySelectorAll('.faq-item.is-open').forEach(o => {
        o.classList.remove('is-open');
        o.querySelector('.faq-a').style.maxHeight = '0px';
      });
      if (!open) {
        item.classList.add('is-open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Forms (Formspree) ----------
     Sostituisci FORMSPREE_ID qui sotto con l'ID del tuo form
     (es. "mqkrvzyz") creato su https://formspree.io  */
  const FORMSPREE_ID = 'YOUR_FORM_ID';

  document.querySelectorAll('form[data-formspree]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = form.querySelector('.form-msg, .nl-msg');
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.reset();
          if (msg) msg.textContent = msg.dataset.ok || 'Messaggio inviato. Grazie!';
        } else {
          if (msg) msg.textContent = msg.dataset.err || 'Si è verificato un errore. Riprova.';
        }
      } catch (err) {
        if (msg) msg.textContent = msg.dataset.err || 'Si è verificato un errore. Riprova.';
      }
      if (btn) btn.disabled = false;
    });
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll('.js-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Cursore custom a pallino ----------
     Segue il mouse con un leggero inseguimento (lerp). Il colore si
     adatta da solo grazie a mix-blend-mode: difference nel CSS
     (nero su sfondo chiaro, bianco su sfondo scuro). Si allarga
     sugli elementi interattivi, diventa una barretta sui campi testo. */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);

    let mx = -100, my = -100;   // posizione reale del mouse
    let dx = -100, dy = -100;   // posizione del pallino (inseguimento)
    let shown = false;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { dx = mx; dy = my; shown = true; dot.classList.add('is-visible'); }
      const t = e.target;
      const interactive = t.closest && t.closest('a, button, [role="button"], select, label, .t-arrow, .lang-switch');
      const textField = t.closest && t.closest('input[type="text"], input[type="email"], input:not([type]), textarea');
      dot.classList.toggle('is-link', !!interactive && !textField);
      dot.classList.toggle('is-text', !!textField);
    });
    document.addEventListener('mousedown', () => dot.classList.add('is-down'));
    document.addEventListener('mouseup', () => dot.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => dot.classList.remove('is-visible'));
    document.addEventListener('mouseenter', () => { if (shown) dot.classList.add('is-visible'); });

    (function follow() {
      dx += (mx - dx) * 0.22;
      dy += (my - dy) * 0.22;
      dot.style.transform = 'translate(' + (dx - 0) + 'px,' + (dy - 0) + 'px) translate(-50%,-50%)';
      requestAnimationFrame(follow);
    })();
  }
})();
