(function () {
  'use strict';

  var mapEl = document.getElementById('route-map');
  if (!mapEl) return;

  var COLORS = {
    allgau:  '#4a5d3a',
    toscana: '#b84a28',
    japan:   '#2a6e9e',
  };

  var FILES = [
    { path: 'routes/allg%C3%A4u/65k-magma.gpx',                           region: 'allgau'  },
    { path: 'routes/allg%C3%A4u/80k-kisslegg.gpx',                        region: 'allgau'  },
    { path: 'routes/allg%C3%A4u/80k-radr-ochsenhausen.gpx',               region: 'allgau'  },
    { path: 'routes/toscana/tl-2025/Toskana_1.gpx',                       region: 'toscana' },
    { path: 'routes/toscana/tl-2025/Toskana_2.gpx',                       region: 'toscana' },
    { path: 'routes/toscana/tl-2025/Toskana_3.gpx',                       region: 'toscana' },
    { path: 'routes/toscana/tl-2025/Toskana_4.gpx',                       region: 'toscana' },
    { path: 'routes/toscana/tl-2025/Toskana_5.gpx',                       region: 'toscana' },
    { path: 'routes/toscana/tl-2025/Toskana_6.gpx',                       region: 'toscana' },
    { path: 'routes/international/japan_2025/Konnichiwa_1.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_2.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_3.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_4.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_5.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_6.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_7_Part_I.gpx',   region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_7_Part_II.gpx',  region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_8.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_9.gpx',           region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_10.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_11.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_12.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_13_Part_I.gpx',  region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_13_Part_II.gpx', region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_14.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_15.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_16.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_17.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_18_Part_I.gpx',  region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_18_Part_II.gpx', region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_19.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_20.gpx',          region: 'japan'   },
    { path: 'routes/international/japan_2025/Konnichiwa_21.gpx',          region: 'japan'   },
  ];

  function initMap() {
    var map = L.map('route-map', { scrollWheelZoom: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    map.setView([25, 50], 2);

    var loadedBounds = [];

    FILES.forEach(function (file) {
      new L.GPX(file.path, {
        async: true,
        polyline_options: {
          color:   COLORS[file.region],
          weight:  2.5,
          opacity: 0.85,
        },
        marker_options: {
          startIconUrl: null,
          endIconUrl:   null,
          shadowUrl:    null,
        },
      }).on('loaded', function (e) {
        loadedBounds.push(e.target.getBounds());
        if (loadedBounds.length === FILES.length) {
          var combined = loadedBounds.reduce(function (acc, b) {
            return acc.extend(b);
          });
          map.fitBounds(combined, { padding: [40, 40] });
          mapEl.classList.remove('is-loading');
        }
      }).addTo(map);
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        initMap();
      }
    }, { threshold: 0.1 });
    observer.observe(mapEl);
  } else {
    initMap();
  }
}());
