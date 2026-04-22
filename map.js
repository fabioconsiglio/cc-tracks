(function () {
  'use strict';

  var mapEl = document.getElementById('route-map');
  if (!mapEl) return;

  var COLORS = {
    allgau:  '#4a5d3a',
    toscana: '#039e1d',
    japan:   '#2a6e9e',
    norway:  '#03609e'
  };

  var SELECTED_COLORS = {
    allgau:  '#77ae4a',
    toscana: '#039e1d',
    japan:   '#2488d0',
    norway:  '#068ce5'
  };

  var infoPanel  = document.getElementById('route-info');
  var infoName   = document.getElementById('route-info-name');
  var infoRegion = document.getElementById('route-info-region');
  var infoDist   = document.getElementById('route-info-distance');
  var infoEle    = document.getElementById('route-info-elevation');
  var infoLink   = document.getElementById('route-info-download');
  var infoClose  = document.getElementById('route-info-close');

  var mapBooted     = false;
  var layerMap      = {};
  var pendingPath   = null;
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

  document.addEventListener('route:preview', function (e) {
    pendingPath = e.detail.path;
    if (!mapBooted) {
      mapBooted = true;
      boot();
    } else {
      selectLayer(layerMap[pendingPath]);
      pendingPath = null;
    }
  });

  function initMap(routes) {
    var map = L.map('route-map', { scrollWheelZoom: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', deselect);

    if (infoClose) {
      infoClose.addEventListener('click', function (e) {
        e.stopPropagation();
        deselect();
      });
    }

    var combinedBounds = null;

    routes.forEach(function (meta) {
      if (!meta.polyline || meta.polyline.length === 0) return;

      var layer = L.polyline(meta.polyline, {
        color:   COLORS[meta.region] || '#888',
        weight:  2.5,
        opacity: 0.85,
      });

      layer._routeMeta = meta;
      layerMap[meta.path] = layer;

      layer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        selectLayer(layer);
      });

      layer.addTo(map);

      if (meta.bbox) {
        var b = meta.bbox; // [min_lat, min_lon, max_lat, max_lon]
        var bounds = L.latLngBounds([b[0], b[1]], [b[2], b[3]]);
        combinedBounds = combinedBounds ? combinedBounds.extend(bounds) : bounds;
      }
    });

    if (combinedBounds) {
      map.fitBounds(combinedBounds, { padding: [40, 40] });
    } else {
      map.setView([25, 50], 2);
    }

    mapEl.classList.remove('is-loading');

    if (pendingPath) {
      selectLayer(layerMap[pendingPath]);
      pendingPath = null;
    }
  }

  function boot() {
    var p = window.routesPromise || fetch('routes.json').then(function (r) { return r.json(); });
    p.then(function (data) { initMap(data.routes); })
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
