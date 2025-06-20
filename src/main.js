import * as turf from "@turf/turf";

// Define Nord Maroc projection
const nordMaroc = "+proj=lcc +lat_1=31.72786641202 +lat_2=34.8717272112 +lat_0=33.3 +lon_0=-5.4 +x_0=500000 +y_0=300000 +ellps=clrk80 +towgs84=-146.43,112.74,-292.73,0,0,0,0 +units=m +no_defs";
//proj4.defs("EPSG:26191", "+proj=lcc +lat_1=31.72786641202 +lat_2=34.8717272112 +lat_0=33.3 +lon_0=-5.4 +x_0=500000 +y_0=300000 +ellps=clrk80 +towgs84=-146.43,112.74,-292.73 +units=m +no_defs");

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([32.0, -4.0], 8);
  setTimeout(() => map.invalidateSize(), 500);

  L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  map.pm.addControls({
    position: 'topright',
    drawCircle: false,
    drawMarker: false,
    drawCircleMarker: false,
    drawPolyline: true,
    drawPolygon: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: true
  });

  map.on('pm:create', e => {
    if (e.shape === 'Line') {
      const coords = e.layer.getLatLngs();
      let total = 0;
      for (let i = 1; i < coords.length; i++) {
        total += coords[i - 1].distanceTo(coords[i]);
      }

      const km = (total / 1000).toFixed(2);
      e.layer.bindPopup(`📏 ${km} km`).openPopup();
    }
  });

  let geojsonData = null;
  let geoLayer = null;
  let bufferLayer = null;

  const greenIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
  });

  fetch("generators.geojson")
    .then(res => res.json())
    .then(data => {
      geojsonData = data;

      geoLayer = L.geoJSON(data, {
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const popupContent = `
            <strong>Site d'installation:</strong> ${props["Site d'installation"] || "N/A"}<br>
            <strong>Province:</strong> ${props["Province"] || "N/A"}<br>
            <strong>Commune rurale:</strong> ${props["Commune rurale"] || "N/A"}<br>
            <strong>Gestionnaire:</strong> ${props["Gestionnaire"] || "N/A"}<br>
            <strong>État de fonctionnement:</strong> ${props["Etat de fonctionnement"] || "N/A"}
          `;
          layer.bindPopup(popupContent);
        },
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: greenIcon })
      }).addTo(map);
    })
    .catch(err => console.error("Erreur chargement GeoJSON:", err));

  document.getElementById("bufferBtn").addEventListener("click", () => {
    if (!geojsonData) {
      alert("GeoJSON non chargé.");
      return;
    }

    const km = parseFloat(document.getElementById("bufferDistance").value);
    if (isNaN(km)) {
      alert("Veuillez entrer un nombre valide.");
      return;
    }

    if (bufferLayer) bufferLayer.remove();

    const buffered = turf.buffer(geojsonData, km, { units: "kilometers" });

    bufferLayer = L.geoJSON(buffered, {
      style: { color: "blue", weight: 2, fillOpacity: 0.3 }
    }).addTo(map);
  });

  document.getElementById("checkBtn").addEventListener("click", () => {
    const lat = parseFloat(document.getElementById("lat").value);
    const lng = parseFloat(document.getElementById("lng").value);
    const crs = document.getElementById("crsSelect").value;

    if (isNaN(lat) || isNaN(lng)) {
      alert("Coordonnées invalides.");
      return;
    }

    if (!bufferLayer) {
      alert("Veuillez d'abord générer les buffers.");
      return;
    }

    let wgsCoords;

    if (crs === "nordmaroc") {
      const projected = proj4(nordMaroc, 'WGS84', [lng, lat]);
      wgsCoords = projected;
    } else {
      wgsCoords = [lng, lat];
    }

    const userPoint = turf.point(wgsCoords);

    let found = false;
    bufferLayer.eachLayer(layer => {
      if (turf.booleanPointInPolygon(userPoint, layer.feature)) {
        found = true;
      }
    });

    const marker = L.marker([wgsCoords[1], wgsCoords[0]], { icon: redIcon })
      .addTo(map)
      .bindPopup(found ? "✅ À l'intérieur du buffer" : "❌ En dehors du buffer")
      .openPopup();

    setTimeout(() => {
      map.removeLayer(marker);
    }, 5000);
  });
});
