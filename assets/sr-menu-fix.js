/* sr-menu-fix.js — mobile menu folder navigation (added 2026-06-18)
   The interactive Squarespace runtime is not included in this static export,
   so the mobile menu's folder dropdowns (e.g. "Services") had no JS to open
   them. This binds the folder-open / back behaviour using the same CSS state
   classes Squarespace uses (header-menu-nav-folder--active / --open).
   NOTE: it deliberately does NOT touch the burger toggle (sr-nav-open),
   which is already handled inline on every page — re-binding it would
   double-toggle and prevent the menu from opening. */
(function () {
  function activeRoot(menu) {
    return menu.querySelector('.header-menu-nav-folder[data-folder="root"]');
  }

  function resetToRoot(menu) {
    menu.querySelectorAll('.header-menu-nav-folder').forEach(function (f) {
      if (f.getAttribute('data-folder') === 'root') {
        f.classList.add('header-menu-nav-folder--active');
        f.classList.remove('header-menu-nav-folder--open');
      } else {
        f.classList.remove('header-menu-nav-folder--active');
        f.classList.remove('header-menu-nav-folder--open');
      }
    });
  }

  function openFolder(menu, id) {
    var target = menu.querySelector(
      '.header-menu-nav-folder[data-folder="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'
    );
    if (!target) {
      // fall back to attribute-equals without CSS.escape (ids contain a slash)
      var all = menu.querySelectorAll('.header-menu-nav-folder');
      for (var i = 0; i < all.length; i++) {
        if (all[i].getAttribute('data-folder') === id) { target = all[i]; break; }
      }
    }
    if (!target) return;
    var root = activeRoot(menu);
    if (root) {
      root.classList.add('header-menu-nav-folder--open');
      root.classList.remove('header-menu-nav-folder--active');
    }
    target.classList.add('header-menu-nav-folder--active');
    target.classList.remove('header-menu-nav-folder--open');
  }

  // The inner pages were exported with the sub-folders NESTED inside the root
  // folder, instead of as siblings (the way index — captured after the runtime
  // ran — has them). When nested, opening a sub-folder slides root to
  // translateX(-100%) and the child sub-folder inherits that shift, sliding
  // off-screen too — so the submenu showed up blank/white. Hoist every
  // sub-folder up to be a sibling of root so the slide transforms are
  // independent (matching index). No-op when already siblings.
  function normalizeFolders(menu) {
    var root = activeRoot(menu);
    if (!root || !root.parentNode) return;
    var parent = root.parentNode;
    menu.querySelectorAll('.header-menu-nav-folder').forEach(function (f) {
      if (f !== root && f.parentNode !== parent) {
        parent.appendChild(f);
      }
    });
  }

  // Some inner-page folder links are missing the dropdown arrow markup that
  // index carries (.header-dropdown-icon + svg). Inject a self-contained chevron
  // so the arrow shows next to "Services". Skips links that already have one, so
  // index is untouched.
  function ensureArrow(a) {
    var content = a.querySelector('.header-menu-nav-item-content') || a;
    if (content.querySelector('.header-dropdown-icon')) return;
    var span = document.createElement('span');
    span.className = 'header-dropdown-icon sr-injected-arrow';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" focusable="false">' +
      '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    content.appendChild(span);
  }

  function init() {
    var menus = document.querySelectorAll('.header-menu');
    Array.prototype.forEach.call(menus, function (menu) {
      // Fix the exported DOM before wiring behaviour.
      normalizeFolders(menu);
      // Open a sub-folder when its title is tapped.
      menu.querySelectorAll('a[data-folder-id]').forEach(function (a) {
        ensureArrow(a);
        a.addEventListener('click', function (e) {
          e.preventDefault();
          openFolder(menu, a.getAttribute('data-folder-id'));
        });
      });
      // "Back" returns to the parent (root).
      menu.querySelectorAll('[data-action="back"]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          resetToRoot(menu);
        });
      });
      // Start collapsed at root.
      resetToRoot(menu);
    });

    // Open/close controller for the mobile overlay.
    // The overlay (.header-menu) is hidden by Squarespace (opacity:0;
    // visibility:hidden) and is only revealed by the `header--menu-open` body
    // class. IMPORTANT: this export contains TWO .header-burger elements (a
    // duplicated header), but the page's inline handler only wires the FIRST
    // one — so tapping the *visible* burger frequently did nothing. We wire
    // EVERY .header-burger and drive `header--menu-open` ourselves, which is the
    // single source of truth for visibility (see custom CSS). We bind only to
    // the outer .header-burger containers (not the inner .burger) so a click
    // never double-fires and cancels itself.
    function toggleMenu(e) {
      if (e) { e.preventDefault(); }
      var open = document.body.classList.toggle('header--menu-open');
      if (open) {
        document.querySelectorAll('.header-menu').forEach(resetToRoot);
      }
    }
    // Bind exactly ONE element per burger. The clickable <button> (class
    // .burger / [data-test="header-burger"]) lives INSIDE the .header-burger
    // container, so a tap on the button already bubbles up to the container.
    // Binding both would run toggleMenu twice for one tap and cancel itself,
    // which is why the menu never opened. Prefer the outer container; only fall
    // back to the inner button if no container exists.
    var burgers = document.querySelectorAll('.header-burger');
    if (!burgers.length) {
      burgers = document.querySelectorAll('[data-test="header-burger"], .burger');
    }
    Array.prototype.forEach.call(burgers, function (b) {
      b.addEventListener('click', toggleMenu);
    });

    // Tapping a real navigation link (not a folder-open or Back control) closes
    // the overlay, matching native behaviour.
    document.querySelectorAll('.header-menu a[href]:not([data-folder-id]):not([data-action])').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('header--menu-open');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
