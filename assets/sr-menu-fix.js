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

  function init() {
    var menus = document.querySelectorAll('.header-menu');
    Array.prototype.forEach.call(menus, function (menu) {
      // Open a sub-folder when its title is tapped.
      menu.querySelectorAll('a[data-folder-id]').forEach(function (a) {
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

    // When the burger is tapped, reset the menu to its root view so reopening
    // never shows a previously-opened sub-folder. This only resets folder
    // state; it never toggles sr-nav-open (handled elsewhere).
    var burger = document.querySelector('.header-burger, .burger, [data-test="header-burger"]');
    if (burger) {
      burger.addEventListener('click', function () {
        document.querySelectorAll('.header-menu').forEach(function (menu) { resetToRoot(menu); });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
