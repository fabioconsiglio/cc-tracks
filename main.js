(function () {
  'use strict';

  var searchInput = document.getElementById('route-search');
  var filterBtns  = document.querySelectorAll('.filter-btn');
  var routesGrid  = document.querySelector('.routes');
  var countEl     = document.getElementById('route-count');
  var noResults   = document.querySelector('.no-results');

  var activeFilter = 'all';
  var cards = [];

  function apply() {
    var q = searchInput.value.trim().toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var regionMatch = activeFilter === 'all' || card.dataset.region === activeFilter;
      var searchMatch = !q || card.textContent.toLowerCase().includes(q);
      card.hidden = !(regionMatch && searchMatch);
      if (!card.hidden) visible++;
    });

    noResults.style.display = visible === 0 ? 'block' : 'none';
  }

  function buildCard(route, index) {
    var a = document.createElement('a');
    a.className = 'route';
    a.dataset.region = route.region;
    a.href = route.path;
    a.setAttribute('download', '');

    var num = String(index + 1).padStart(2, '0');

    a.innerHTML =
      '<div class="route-header">' +
        '<span class="route-number">No. ' + num + '</span>' +
        '<span class="route-region">' + route.region_label + '</span>' +
      '</div>' +
      '<h3 class="route-name">' + route.name + '</h3>' +
      '<div class="route-stats">' +
        '<div class="stat"><span class="stat-label">Distance</span><span class="stat-value">' + route.distance_km + ' km</span></div>' +
        '<div class="stat"><span class="stat-label">Elevation</span><span class="stat-value">' + route.elevation_gain_m + ' hm</span></div>' +
      '</div>' +
      '<div class="route-footer">' +
        '<span class="surface">' + route.region_label + '</span>' +
        '<span class="download">↓ GPX</span>' +
      '</div>';

    // Lock entrance animation after it plays
    a.addEventListener('animationend', function () {
      a.style.animation = 'none';
      a.style.opacity = '1';
    }, { once: true });

    return a;
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

  fetch('routes.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      data.routes.forEach(function (route, i) {
        var card = buildCard(route, i);
        routesGrid.insertBefore(card, noResults);
        cards.push(card);
      });

      if (countEl) {
        countEl.textContent = data.routes.length + ' routes · Updated ' + new Date(data.generated).toLocaleDateString('en', { month: 'long', year: 'numeric' });
      }

      apply();
    })
    .catch(function (err) {
      console.error('Failed to load routes.json', err);
      noResults.style.display = 'block';
    });
}());
