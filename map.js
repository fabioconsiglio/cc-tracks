(function () {
  'use strict';

  var mapEl = document.getElementById('route-map');
  if (!mapEl) return;

  var COLORS = {
    allgau:  '#4a5d3a',
    toscana: '#b84a28',
    japan:   '#2a6e9e',
  };

  var SELECTED_COLORS = {
    allgau:  '#6b8f54',
    toscana: '#e05e30',
    japan:   '#3a9ed8',
  };

  var infoPanel  = document.getElementById('route-info');
  var infoName   = document.getElementById('route-info-name');
  var infoRegion = document.getElementById('route-info-region');
  var infoDist   = document.getElementById('route-info-distance');
  var infoEle    = document.getElementById('route-info-elevation');
  var infoLink   = document.getElementById('route-info-download');
  var infoClose  = document.getElementById('route-info-close');

  var mapBooted     = false;
  var layerMap      = {};   // path → gpxLayer, populated as each GPX loads
  var pendingPath   = null; // path requested before layer was ready
  var selectedLayer = null;

  function showPanel(meta) {
    infoName.textContent   = meta.name;
    infoRegion.textContent = meta.region_label;
    infoDist.textContent   = meta.distance_km + ' km';
    infoEle.textContent    = meta.elevation_gain_m + ' hm';
    infoLink.href          = meta.path;
    infoLink.setAttribute('download', '');
    infoPanel.hidden = false;
  }

  function hidePanel() {
    infoPanel.hidden = true;
  }

  function deselect() {
    if (!selectedLayer) return;
    var r = selectedLayer._routeMeta.region;
    selectedLayer.setStyle({ color: COLORS[r], weight: 2.5, opacity: 0.85 });
    selectedLayer = null;
    hidePanel();
  }

  function selectLayer(layer) {
    if (!layer) return;
    if (selectedLayer === layer) { deselect(); return; }
    deselect();
    selectedLayer = layer;
    var r = layer._routeMeta.region;
    layer.setStyle({ color: SELECTED_COLORS[r] || '#fff', weight: 4.5, opacity: 1 });
    showPanel(layer._routeMeta);
  }

  // Called by route cards to preview a specific track
  document.addEventListener('route:preview', function (e) {
    pendingPath = e.detail.path;
    if (!mapBooted) {
      mapBooted = true;
      boot();
    } else {
      var layer = layerMap[pendingPath];
      if (layer) {
        selectLayer(layer);
        pendingPath = null;
      }
      // else: layer still loading, handled in 'loaded' callback below
    }
  });

  function initMap(routes) {
    var map = L.map('route-map', { scrollWheelZoom: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    map.setView([25, 50], 2);

    var loadedCount  = 0;
    var loadedBounds = [];

    map.on('click', deselect);

    if (infoClose) {
      infoClose.addEventListener('click', function (e) {
        e.stopPropagation();
        deselect();
      });
    }

    routes.forEach(function (meta) {
      var gpxLayer = new L.GPX(meta.path, {
        async: true,
        polyline_options: {
          color:   COLORS[meta.region] || '#888',
          weight:  2.5,
          opacity: 0.85,
        },
        marker_options: {
          startIconUrl: null,
          endIconUrl:   null,
          shadowUrl:    null,
        },
      });

      gpxLayer._routeMeta = meta;

      gpxLayer.on('loaded', function (e) {
        layerMap[meta.path] = gpxLayer;

        loadedBounds.push(e.target.getBounds());
        loadedCount++;
        if (loadedCount === routes.length) {
          var combined = loadedBounds.reduce(function (acc, b) {
            return acc.extend(b);
          });
          map.fitBounds(combined, { padding: [40, 40] });
          mapEl.classList.remove('is-loading');
        }

        // Card was clicked before this layer finished loading
        if (pendingPath === meta.path) {
          selectLayer(gpxLayer);
          pendingPath = null;
        }
      });

      gpxLayer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        selectLayer(gpxLayer);
      });

      gpxLayer.addTo(map);
    });
  }

  function boot() {
    fetch('routes.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { initMap(data.routes); })
      .catch(function (err) {
        console.error('Failed to load routes.json', err);
        mapEl.classList.remove('is-loading');
      });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        if (!mapBooted) {
          mapBooted = true;
          boot();
        }
      }
    }, { threshold: 0.1 });
    observer.observe(mapEl);
  } else {
    if (!mapBooted) {
      mapBooted = true;
      boot();
    }
  }
}());
