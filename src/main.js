import * as turf from "@turf/turf";
import L from "leaflet";

// Initialize map
const map = L.map("map").setView([32.0, -4.0], 8);
L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geojsonData = null;
let geoLayer = null;
let bufferLayer = null;

// Custom marker icons
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

// Load GeoJSON from public/
fetch("/generators.geojson")
  .then(res => res.json())
  .then(data => {
    geojsonData = data;

    geoLayer = L.geoJSON(data, {
      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        const popupContent = `
          <strong>Site d'installation:</strong> ${props["Site d'installation"] || "N/A"}<br>
          <strong>Province:</strong> ${props["Province"] || "N/A"}<br>
          <strong>Commune rurale:</strong> ${props["Commune rurale"] || "N/A"}<br>
          <strong>Gestionnaire:</strong> ${props["Gestionnaire"] || "N/A"}<br>
          <strong>État de fonctionnement:</strong> ${props["Etat de fonctionnement"] || "N/A"}
        `;
        layer.bindPopup(popupContent);
      }
    }).addTo(map);
  })
  .catch(err => console.error("Failed to load GeoJSON:", err));

// Buffer generation
document.getElementById("bufferBtn").addEventListener("click", () => {
  if (!geojsonData) {
    alert("GeoJSON data not loaded.");
    return;
  }

  const km = parseFloat(document.getElementById("bufferDistance").value);
  if (isNaN(km)) {
    alert("Please enter a valid number.");
    return;
  }

  if (bufferLayer) {
    bufferLayer.remove();
  }

  const buffered = turf.buffer(geojsonData, km, { units: "kilometers" });

  bufferLayer = L.geoJSON(buffered, {
    style: { color: "blue", fillOpacity: 0.3 }
  }).addTo(map);
});

// Check point intersection with buffer
document.getElementById("checkBtn").addEventListener("click", () => {
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (isNaN(lat) || isNaN(lng)) {
    alert("Please enter valid coordinates.");
    return;
  }

  const userPoint = turf.point([lng, lat]);

  if (!bufferLayer) {
    alert("Please generate a buffer first.");
    return;
  }

  let found = false;

  bufferLayer.eachLayer(layer => {
    const turfFeature = layer.feature;
    if (turf.booleanPointInPolygon(userPoint, turfFeature)) {
      found = true;
    }
  });

  L.marker([lat, lng], {
  icon: redIcon
})
  .addTo(map)
  .bindPopup(found ? "✅ À l'intérieur du buffer" : "❌ En dehors du buffer")
  .openPopup();

});
