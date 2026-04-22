(function () {
  const searchInput = document.getElementById('route-search');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const routes      = document.querySelectorAll('.route[data-region]');
  const noResults   = document.querySelector('.no-results');

  let activeFilter = 'all';

  // Lock entrance animation after it plays so filter toggles don't re-trigger it
  routes.forEach(function (r) {
    r.addEventListener('animationend', function () {
      r.style.animation = 'none';
      r.style.opacity   = '1';
    }, { once: true });
  });

  function apply() {
    const q = searchInput.value.trim().toLowerCase();
    let visible = 0;

    routes.forEach(function (r) {
      const regionMatch = activeFilter === 'all' || r.dataset.region === activeFilter;
      const searchMatch = !q || r.textContent.toLowerCase().includes(q);
      r.hidden = !(regionMatch && searchMatch);
      if (!r.hidden) visible++;
    });

    noResults.style.display = visible === 0 ? 'block' : 'none';
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      apply();
    });
  });

  searchInput.addEventListener('input', apply);
}());
