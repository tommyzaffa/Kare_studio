(function () {
  const DEFAULTS = {
    instances: []
  };

  /* ----------------------------------
     Debug (logs only)
  ---------------------------------- */
  let SNCC_LOG = false;
  const snccLog = (...args) => SNCC_LOG && console.log(...args);
  const snccWarn = (...args) => SNCC_LOG && console.warn(...args);

  /* ----------------------------------
     debug Utils
  ---------------------------------- */
  function observeDuplicateLoss(duplicateEl) {
    if (!duplicateEl) return;

    var cachedSlides = duplicateEl.innerHTML;

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          if (!duplicateEl.children.length) {
            snccWarn('[sn-cc] Duplicate lost all children', duplicateEl);
          }
        }
      });
    });

    observer.observe(duplicateEl, {
      childList: true,
      subtree: false
    });

    return observer;
  }

  function observeDuplicateWithCooldown(duplicateEl, { restore = false, maxRestores = 3, cooldownMs = 500 } = {}) {
    if (!duplicateEl) return;

    const cachedHTML = duplicateEl.innerHTML;
    let restores = 0;
    let lastRestore = 0;

    const observer = new MutationObserver(() => {
      if (duplicateEl.children.length) return;

      snccWarn('[sn-cc] Duplicate emptied', duplicateEl);

      if (!restore) return;

      const now = Date.now();
      if (now - lastRestore < cooldownMs) return;

      if (restores >= maxRestores) {
        observer.disconnect();
        return;
      }

      restores++;
      lastRestore = now;
      duplicateEl.innerHTML = cachedHTML;
      snccWarn('[sn-cc] Duplicate restored', { restores });
    });

    observer.observe(duplicateEl, { childList: true });
    return observer;
  }

  function logGlobalAnimationType() {
    if (Static.SQUARESPACE_CONTEXT.tweakJSON['tweak-global-animations-enabled'] === 'true') {
      const animationType =
        Static.SQUARESPACE_CONTEXT.tweakJSON['tweak-global-animations-animation-type'] + 'In';
      return animationType;
    }
  }

  function loadAllImages() {
    if (!window.ImageLoader) return;
    const images = document.querySelectorAll('img[data-src]');
    snccLog('[sn-cc][images] loading', images.length);
    for (let i = 0; i < images.length; i++) {
      ImageLoader.load(images[i], { load: true });
    }
  }

  function applyGapFromSettings(carousel, cfg = {}) {
    const value = carousel.dataset.spaceBetweenSlidesValue;
    const unit = carousel.dataset.spaceBetweenSlidesUnit || 'px';

    snccLog('[sn-cc][gap]', {
      value: value ? value + unit : '(none)',
      mobileGap: cfg.mobileGap != null ? cfg.mobileGap + 'px' : '(none)'
    });

    if (value) {
      carousel.style.setProperty('--gap', value + unit);
    }

    // Optional per-instance mobile override
    if (cfg.mobileGap != null) {
      carousel.style.setProperty('--sn-cc-mobile-gap', cfg.mobileGap + 'px');
    }
  }

  function normalizeCarouselSlides(carousel) {
    const slides = carousel.querySelectorAll('.user-items-list-carousel__slide');
    snccLog('[sn-cc][normalize] slides', slides.length);
    for (let i = 0; i < slides.length; i++) {
      slides[i].style.transform = '';
      slides[i].style.webkitTransform = '';
    }
  }

  function whenDomReady(fn) {
    if (document.readyState === 'loading') {
      snccLog('[sn-cc][dom] waiting DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      snccLog('[sn-cc][dom] ready:', document.readyState);
      fn();
    }
  }

  function computeLoopWidth(track) {
    const scrollWidth = track.scrollWidth;
    const w = scrollWidth / 2;

    snccLog('[sn-cc][measure] computeLoopWidth', {
      track,
      scrollWidth,
      loopWidth: w
    });

    return isFinite(w) && w > 0 ? w : 0;
  }

  // Runs fn at most once per animation frame (great for ResizeObserver)
function rafThrottle(fn) {
  let pending = false;
  let lastArgs = null;

  return function (...args) {
    lastArgs = args;
    if (pending) return;

    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fn.apply(this, lastArgs);
    });
  };
}

// Runs fn after a quiet period (great if you want fewer measurements overall)
function debounce(fn, wait = 150) {
  let t = null;

  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

  /* ----------------------------------
     RAF HUB (single global ticker)
  ---------------------------------- */

  const RAF_HUB = {
    items: new Set(),
    running: false,

    add(fn) {
      this.items.add(fn);
      if (!this.running) this.start();
    },

    remove(fn) {
      this.items.delete(fn);
    },

    start() {
      if (this.running) return;
      this.running = true;

      snccLog('[sn-cc][raf] hub start');

      const tick = () => {
        this.items.forEach(fn => fn());
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }
  };

  /* ----------------------------------
     Instance discovery
  ---------------------------------- */

  function findAndMarkInstances(instancesCfg) {
    const results = [];

    snccLog('[sn-cc][instances] config count', instancesCfg.length);

    instancesCfg.forEach(cfg => {
      if (!cfg || !cfg.sectionSelector) return;

      let section;
      try {
        section = document.querySelector(cfg.sectionSelector);
      } catch {
        snccWarn('[sn-cc][instances] bad selector', cfg.sectionSelector);
        return;
      }
      if (!section) {
        snccWarn('[sn-cc][instances] section not found', cfg.sectionSelector);
        return;
      }
      if (section.classList.contains('sn-cc-initialized')) {
        snccLog('[sn-cc][instances] already initialized', cfg.sectionSelector);
        return;
      }

      const carousel = section.querySelector('.user-items-list-carousel');
      if (!carousel) {
        snccWarn('[sn-cc][instances] carousel not found', cfg.sectionSelector);
        return;
      }

      section.classList.add('sn-cc-instance');
      carousel.classList.add('sn-cc-original');

      results.push({ section, carousel, cfg });
      snccLog('[sn-cc][instances] found', cfg.sectionSelector, carousel);
    });

    snccLog('[sn-cc][instances] total found', results.length);
    return results;
  }

  /* ----------------------------------
     Duplication
  ---------------------------------- */

  function duplicateSlides(slidesEl) {
    if (!slidesEl) return;

    snccLog('[sn-cc][dupe] enter', {
      slidesEl,
      children: slidesEl.children.length
    });

    // If no slides yet, wait
    if (!slidesEl.children.length) {
      snccLog('[sn-cc][dupe] waiting for children via MutationObserver');

      const observer = new MutationObserver(() => {
        snccLog('[sn-cc][dupe] mutation', { children: slidesEl.children.length });

        if (slidesEl.children.length) {
          observer.disconnect();
          snccLog('[sn-cc][dupe] children present, continuing');
          duplicateSlides(slidesEl);
        }
      });

      observer.observe(slidesEl, { childList: true });
      return;
    }

    const next = slidesEl.nextElementSibling;

    if (next && next.classList.contains('sn-cc-slides-duplicate')) {
      snccLog('[sn-cc][dupe] already exists, skip', next);
      return;
    }

    slidesEl.classList.add('sn-cc-slides');

    const clone = slidesEl.cloneNode(true);
    clone.classList.add('sn-cc-slides-duplicate');
    clone.setAttribute('aria-hidden', 'true');

    slidesEl.after(clone);

    snccLog('[sn-cc][dupe] created', {
      clone,
      cloneChildren: clone.children.length
    });

    if (self !== top) {
      snccLog('[sn-cc][dupe] iframe detected, enable restore observer');
      observeDuplicateWithCooldown(clone, {
        restore: true,
        maxRestores: 1,
        cooldownMs: 500
      });
    }
  }

  function processCarousels(instances) {
    snccLog('[sn-cc][process] start', instances.length);

    instances.forEach((instance, i) => {
      const carousel = instance.carousel;
      const id = instance.cfg?.sectionSelector || '(unknown)';

      snccLog(`[sn-cc][process][${i}]`, id);

      const slidesA = carousel.querySelector('.user-items-list-carousel__slides');

      snccLog(`[sn-cc][process][${i}] slides`, {
        slidesA,
        children: slidesA ? slidesA.children.length : '(missing)'
      });

      duplicateSlides(slidesA);
      normalizeCarouselSlides(carousel);
      applyGapFromSettings(carousel, instance.cfg);
    });
  }

  function markInitialized(instances) {
    instances.forEach(({ section, cfg }, i) => {
      section.classList.add('sn-cc-initialized');
      snccLog('[sn-cc][init] marked initialized', i, cfg?.sectionSelector || '(unknown)');
    });
  }

  function createRafEngine({ carousel, track, cfg }) {
    const speed = cfg.speed ?? 0.5;
    const dir = cfg.direction ?? -1;
    const pauseOnHover = cfg.pauseOnHover === true;

    let x = 0;
    let loopWidth = 0;
    let active = false;

    // log label only (no behavior impact)
    const label = cfg?.sectionSelector || '(unknown)';

    snccLog('[sn-cc][engine] create', {
      label,
      speed,
      dir,
      pauseOnHover,
      track
    });

    snccLog('[sn-cc][engine] first engine measure trigger = init', label);
    loopWidth = computeLoopWidth(track);

    requestAnimationFrame(() => {
      snccLog('[sn-cc][engine] raf 2nd measure trigger = rAF', label);
      loopWidth = computeLoopWidth(track);
    });

    if (window.ResizeObserver) {
  const onResize = debounce(() => {
    snccLog('[sn-cc][engine] throttled measure trigger = ResizeObserver (util)', label);
    loopWidth = computeLoopWidth(track);
  }, 200);

  const ro = new ResizeObserver(onResize);
  ro.observe(track);
}

    let loggedFirstMove = false;

    function update() {
      if (!active || !loopWidth) {
        return;
      }

      x += speed * dir;

      if (!loggedFirstMove) {
        loggedFirstMove = true;
        snccLog('[sn-cc][engine] first move', {
          label,
          x,
          loopWidth,
          trackScrollWidth: track.scrollWidth
        });
      }

      if (dir < 0 && x <= -loopWidth) x += loopWidth;
      if (dir > 0 && x >= 0) x -= loopWidth;

      // Safari stability
      x = Math.round(x * 10) / 10;

      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    }

    function start() {
      if (active) return;
      active = true;
      snccLog('[sn-cc][engine] start', label);
      RAF_HUB.add(update);
    }

    function stop() {
      active = false;
      snccLog('[sn-cc][engine] stop', label);
      RAF_HUB.remove(update);
    }

    if (pauseOnHover) {
      carousel.addEventListener('mouseenter', () => snccLog('[sn-cc][hover] enter', label), { passive: true });
      carousel.addEventListener('mouseleave', () => snccLog('[sn-cc][hover] leave', label), { passive: true });

      carousel.addEventListener('mouseenter', stop, { passive: true });
      carousel.addEventListener('mouseleave', start, { passive: true });
    }

    const io = new IntersectionObserver(entries => {
      const isOnscreen = !!(entries[0] && entries[0].isIntersecting);
      snccLog('[sn-cc][io]', { label, isOnscreen });
      isOnscreen ? start() : stop();
    }, { threshold: 0.01 });

    io.observe(carousel);

    return { start, stop };
  }

  function startMovement(instances) {
    snccLog('[sn-cc][movement] start', instances.length);

    instances.forEach((instance, i) => {
      const carousel = instance.carousel;
      const id = instance.cfg?.sectionSelector || '(unknown)';

      const track = carousel.querySelector('.user-items-list-carousel__slides-revealer');

      snccLog(`[sn-cc][movement][${i}] track`, {
        id,
        track
      });

      if (!track) return;

      instance._engine = createRafEngine({
        carousel,
        track,
        cfg: instance.cfg
      });
    });
  }

  /* ----------------------------------
     Public API
  ---------------------------------- */

  function normalizeOptions(options) {
    const fromGlobal = window.SN_CONTINUOUS_SLIDER || {};
    const opt = options && typeof options === 'object' ? options : null;

    const merged = {
      ...DEFAULTS,
      ...(fromGlobal || {}),
      ...(opt || {})
    };

    merged.instances = Array.isArray(merged.instances) ? merged.instances : [];

    if (merged.debug === true) SNCC_LOG = true;

    snccLog('[sn-cc][options] instances', merged.instances.length);
    return merged;
  }

  function snContinuousSlider(options) {
    const CFG = normalizeOptions(options);
    if (!CFG.instances.length) return;

    whenDomReady(() => {
      snccLog('[sn-cc] start', {
        globalAnimations: logGlobalAnimationType()
      });

      const instances = findAndMarkInstances(CFG.instances);
      if (!instances.length) return;

      processCarousels(instances);
      loadAllImages();
      markInitialized(instances);
      startMovement(instances);

      snccLog('[sn-cc] done', instances.length);
    });
  }

  // expose
  window.snContinuousSlider = snContinuousSlider;
})();