let map;
let userMarker;
let focusCircle;
let currentPosition = null;
let stations = [];
let routes = [];
let stationMarkers = new Map();
let appConfig = null;

const statusEl = document.getElementById('status');
const nearestStationEl = document.getElementById('nearestStation');
const summaryBoxEl = document.getElementById('summaryBox');
const heroStatsEl = document.getElementById('heroStats');
const quickActionsEl = document.getElementById('quickActions');
const routesGridEl = document.getElementById('routesGrid');
const routeSearchEl = document.getElementById('routeSearch');
const stationSearchEl = document.getElementById('stationSearch');
const searchStationBtn = document.getElementById('searchStationBtn');
const stationResultsEl = document.getElementById('stationResults');
const fromInputEl = document.getElementById('fromInput');
const toInputEl = document.getElementById('toInput');
const tripResultEl = document.getElementById('tripResult');
const planTripBtn = document.getElementById('planTripBtn');
const locateBtn = document.getElementById('locateBtn');
const centerBtn = document.getElementById('centerBtn');
const chatMessagesEl = document.getElementById('chatMessages');
const chatSuggestionsEl = document.getElementById('chatSuggestions');
const chatInputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gabim gjatë komunikimit me serverin.');
  return data;
}

function addMessage(text, role = 'bot', temp = false) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  if (temp) el.dataset.temp = '1';
  el.textContent = text;
  chatMessagesEl.appendChild(el);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  return el;
}

function renderHeroStats(stats) {
  heroStatsEl.innerHTML = stats.map(item => `
    <div class="stat-card">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function renderQuickActions(actions) {
  quickActionsEl.innerHTML = actions.map(action => `<span class="action-pill">${action}</span>`).join('');
}

function renderSummary(summary) {
  summaryBoxEl.innerHTML = `${summary.total_routes} linja • ${summary.total_stations} stacione<br>${summary.supported_cities} qytet • ${summary.first_bus} - ${summary.last_bus}`;
}

function routeMatchesQuery(route, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return route.name.toLowerCase().includes(q)
    || route.id.toLowerCase().includes(q)
    || route.stops.some(stop => stop.toLowerCase().includes(q));
}

function renderRoutes(query = '') {
  const filtered = routes.filter(route => routeMatchesQuery(route, query));
  routesGridEl.innerHTML = filtered.map(route => `
    <article class="route-card">
      <div class="route-top">
        <div>
          <strong>${route.name}</strong>
          <p>${route.schedule}</p>
        </div>
        <span class="route-id">${route.id}</span>
      </div>
      <p><strong>Stacionet:</strong> ${route.stops.join(' • ')}</p>
      <p><strong>Frekuenca:</strong> ${route.frequency}</p>
    </article>
  `).join('') || '<div class="empty-state">Nuk u gjet asnjë linjë për këtë kërkim.</div>';
}

function renderNearestStation(station) {
  nearestStationEl.innerHTML = `<strong>${station.name}</strong><br>${station.city} • ${station.distance_km} km larg<br>Linjat: ${station.routes.join(', ')}`;
}

function createStationIcon() {
  return L.divIcon({
    className: 'bus-stop-icon',
    html: '<div class="bus-stop-dot">🚌</div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -10]
  });
}

function createUserIcon() {
  return L.divIcon({
    className: 'user-location-icon',
    html: '<div class="user-location-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function initMap(center) {
  map = L.map('map', { zoomControl: true }).setView([center.lat, center.lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  stationMarkers.clear();

  stations.forEach(station => {
    const marker = L.marker([station.lat, station.lng], { icon: createStationIcon() }).addTo(map);
    marker.bindPopup(station.popup_html);
    marker.on('click', () => {
      nearestStationEl.innerHTML = `<strong>${station.name}</strong><br>${station.city} • ${station.area}<br>Linjat: ${station.routes.join(', ')}`;
    });
    stationMarkers.set(station.id, marker);
  });
}

function focusStation(stationId) {
  const station = stations.find(s => s.id === stationId);
  const marker = stationMarkers.get(stationId);

  if (!station || !marker || !map) return;

  map.setView([station.lat, station.lng], 13);
  marker.openPopup();

  if (focusCircle) focusCircle.remove();

  focusCircle = L.circle([station.lat, station.lng], {
    radius: 250,
    color: '#f6c453',
    fillColor: '#f6c453',
    fillOpacity: 0.12,
    weight: 2
  }).addTo(map);
}

function updateUserMarker(lat, lng) {
  const coords = [lat, lng];

  if (!userMarker) {
    userMarker = L.marker(coords, { icon: createUserIcon() }).addTo(map);
    userMarker.bindPopup('Vendndodhja juaj');
  } else {
    userMarker.setLatLng(coords);
  }

  map.setView(coords, 13);
}

async function updateNearestStation(lat, lng) {
  const station = await fetchJSON(`/api/nearest-station?lat=${lat}&lng=${lng}`);
  renderNearestStation(station);
  focusStation(station.id);
}

function locateUser() {
  if (!navigator.geolocation) {
    statusEl.textContent = 'Ky browser nuk mbështet vendndodhjen.';
    return;
  }

  statusEl.textContent = 'Po merret vendndodhja juaj...';

  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    currentPosition = { lat: coords.latitude, lng: coords.longitude };
    updateUserMarker(coords.latitude, coords.longitude);
    await updateNearestStation(coords.latitude, coords.longitude);
    statusEl.textContent = `Vendndodhja u gjet: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }, () => {
    statusEl.textContent = 'Vendndodhja nuk u lejua. Mund ta përdorësh aplikacionin edhe pa të.';
  });
}

async function searchStations() {
  const q = stationSearchEl.value.trim();

  if (!q) {
    stationResultsEl.innerHTML = '<div class="empty-state">Shkruaj emrin e një stacioni ose zone.</div>';
    return;
  }

  try {
    const results = await fetchJSON(`/api/search-stations?q=${encodeURIComponent(q)}`);

    stationResultsEl.innerHTML = results.length ? results.map(station => `
      <button class="station-result" data-id="${station.id}">
        <strong>${station.name}</strong>
        <span>${station.city} • ${station.area}</span>
      </button>
    `).join('') : '<div class="empty-state">Nuk u gjet asnjë stacion.</div>';

    stationResultsEl.querySelectorAll('.station-result').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const station = stations.find(s => s.id === id);
        if (station) {
          nearestStationEl.innerHTML = `<strong>${station.name}</strong><br>${station.city} • ${station.area}<br>Linjat: ${station.routes.join(', ')}`;
          focusStation(id);
        }
      });
    });
  } catch (error) {
    stationResultsEl.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

async function planTrip() {
  const from = fromInputEl.value.trim();
  const to = toInputEl.value.trim();

  if (!from || !to) {
    tripResultEl.textContent = 'Plotëso të dy fushat për të marrë sugjerim.';
    return;
  }

  try {
    const result = await fetchJSON(`/api/plan-trip?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (result.found) {
      tripResultEl.innerHTML = `<strong>${result.route.id} • ${result.route.name}</strong><br>${result.message}<br>Stacionet: ${result.route.stops.join(' • ')}`;
    } else {
      tripResultEl.textContent = result.message;
    }
  } catch (error) {
    tripResultEl.textContent = error.message;
  }
}

function renderChatSuggestions(suggestions = []) {
  chatSuggestionsEl.innerHTML = suggestions.map(text => `<button class="prompt-chip">${text}</button>`).join('');
  chatSuggestionsEl.querySelectorAll('.prompt-chip').forEach(btn => {
    btn.addEventListener('click', () => sendChat(btn.textContent));
  });
}

async function sendChat(messageOverride = null) {
  const text = (messageOverride || chatInputEl.value).trim();
  if (!text) return;

  addMessage(text, 'user');
  chatInputEl.value = '';

  const typing = addMessage('BusMap AI po mendon...', 'bot', true);

  try {
    const payload = { message: text };
    if (currentPosition) Object.assign(payload, currentPosition);

    const res = await fetchJSON('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    typing.remove();
    addMessage(res.reply, 'bot');
    renderChatSuggestions(res.suggestions || []);

    if (res.focus_station_id) {
      focusStation(res.focus_station_id);
    }
  } catch (error) {
    typing.remove();
    addMessage(error.message, 'bot');
  }
}

async function initApp() {
  const [config, summary, loadedStations, loadedRoutes] = await Promise.all([
    fetchJSON('/api/config'),
    fetchJSON('/api/summary'),
    fetchJSON('/api/stations'),
    fetchJSON('/api/routes')
  ]);

  appConfig = config;
  stations = loadedStations;
  routes = loadedRoutes;

  renderHeroStats(config.hero_stats);
  renderQuickActions(config.quick_actions);
  renderSummary(summary);
  renderRoutes();

  renderChatSuggestions([
    'Cili është stacioni më i afërt?',
    'Kur kalon L1?',
    'Cilat stacione kalon L2?',
    'Si të shkoj nga Qendra Shkodër në Zogaj?'
  ]);

  initMap(config.city_center);

  statusEl.textContent = `Aplikacioni u ngarkua me sukses me ${summary.total_stations} stacione në Shkodër.`;
}

routeSearchEl.addEventListener('input', (e) => renderRoutes(e.target.value));
searchStationBtn.addEventListener('click', searchStations);
stationSearchEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchStations();
});
planTripBtn.addEventListener('click', planTrip);
locateBtn.addEventListener('click', locateUser);

centerBtn.addEventListener('click', () => {
  if (map && appConfig) {
    map.setView([appConfig.city_center.lat, appConfig.city_center.lng], 13);
  }
});

sendBtn.addEventListener('click', () => sendChat());
chatInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChat();
});

initApp().catch(error => {
  console.error(error);
  statusEl.textContent = 'Ndodhi një gabim gjatë ngarkimit të aplikacionit.';
});
