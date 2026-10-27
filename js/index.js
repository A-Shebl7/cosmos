// ================= CONFIG =================
// غيّر الروابط/المفاتيح هنا حسب الـ Postman Docs
const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
const NASA_API_KEY = "Tjwrf7kjbHkf9PMjDHtpd6bmTM79WKDPtbjfwjQJ";
const LAUNCHES_URL = "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=10";
const PLANETS_URL = "https://api.le-systeme-solaire.net/rest/bodies/";
const PLANETS_TOKEN = "2db80998-ac1a-4065-af84-b85ee6f8291d";

const $ = (id) => document.getElementById(id);
const get = async (url, headers) => {
  const res = await fetch(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
};
const num = (n, d = 2) =>
  n === null || n === undefined || isNaN(n) ? "N/A" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const niceDate = (iso, opts) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", opts);

// ================= Navigation =================
const sidebar = $("sidebar");
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const name = link.dataset.section;
    document.querySelectorAll(".app-section").forEach((s) => s.classList.toggle("hidden", s.dataset.section !== name));
    document.querySelectorAll(".nav-link").forEach((l) => {
      const on = l === link;
      l.classList.toggle("bg-blue-500/10", on);
      l.classList.toggle("text-blue-400", on);
      l.classList.toggle("text-slate-300", !on);
      l.classList.toggle("hover:bg-slate-800", !on);
    });
    sidebar.classList.remove("sidebar-open");
    document.querySelector(".sidebar-overlay")?.remove();
  });
});
$("sidebar-toggle").addEventListener("click", () => {
  if (sidebar.classList.toggle("sidebar-open")) {
    const o = document.createElement("div");
    o.className = "sidebar-overlay";
    o.addEventListener("click", () => {
      sidebar.classList.remove("sidebar-open");
      o.remove();
    });
    document.body.appendChild(o);
  } else {
    document.querySelector(".sidebar-overlay")?.remove();
  }
});

// ================= 1) Today in Space (NASA APOD) =================
const dateInput = $("apod-date-input");
const dateLabel = dateInput.parentElement.querySelector("span");
const imgBox = $("apod-image-container");
let fullResUrl = "";

function showApodError() {
  $("apod-loading").classList.add("hidden");
  $("apod-image").classList.add("hidden");
  imgBox.querySelector("iframe")?.remove();
  if (!$("apod-error")) {
    const e = document.createElement("div");
    e.id = "apod-error";
    e.className = "text-center";
    e.innerHTML =
      '<i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i><p class="text-slate-400">Failed to load image</p>';
    imgBox.prepend(e);
  }
}

async function loadAPOD(date) {
  $("apod-error")?.remove();
  $("apod-image").classList.add("hidden");
  $("apod-loading").classList.remove("hidden");
  imgBox.querySelector("iframe")?.remove();
  try {
    const q = new URLSearchParams({ api_key: NASA_API_KEY });
    if (date) q.set("date", date);
    const d = await get(`${NASA_APOD_URL}?${q}`);

    $("apod-date").textContent =
      "Astronomy Picture of the Day - " + niceDate(d.date, { year: "numeric", month: "long", day: "numeric" });
    $("apod-title").textContent = d.title;
    $("apod-explanation").textContent = d.explanation;
    $("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${d.date}`;
    $("apod-date-info").textContent = d.date;
    $("apod-media-type").textContent = d.media_type === "video" ? "Video" : "Image";
    $("apod-copyright").innerHTML = d.copyright ? "&copy; " + d.copyright.replace(/\s+/g, " ").trim() : "";
    dateInput.value = d.date;
    dateLabel.textContent = niceDate(d.date, { year: "numeric", month: "short", day: "numeric" });

    if (d.media_type === "video") {
      $("apod-loading").classList.add("hidden");
      const f = document.createElement("iframe");
      f.src = d.url;
      f.className = "w-full h-full";
      f.allowFullscreen = true;
      imgBox.prepend(f);
      fullResUrl = d.url;
    } else {
      fullResUrl = d.hdurl || d.url;
      const img = $("apod-image");
      img.onload = () => {
        $("apod-loading").classList.add("hidden");
        img.classList.remove("hidden");
      };
      img.onerror = showApodError;
      img.alt = d.title;
      img.src = d.url;
    }
  } catch (err) {
    console.error("APOD error:", err);
    $("apod-title").textContent = "";
    $("apod-explanation").textContent = "";
    showApodError();
  }
}

imgBox.querySelector("button").addEventListener("click", () => fullResUrl && window.open(fullResUrl, "_blank"));
dateInput.max = todayISO();
dateInput.addEventListener("change", () => {
  if (dateInput.value) dateLabel.textContent = niceDate(dateInput.value, { year: "numeric", month: "short", day: "numeric" });
});
$("load-date-btn").addEventListener("click", () => dateInput.value && loadAPOD(dateInput.value));
$("today-apod-btn").addEventListener("click", () => {
  const t = todayISO();
  dateInput.value = t;
  dateLabel.textContent = niceDate(t, { year: "numeric", month: "short", day: "numeric" });
  loadAPOD(t);
});

// ================= 2) Launches (SpaceDevs) =================
const launchStatus = (s) => s?.abbrev || s?.name || "TBD";
const launchTime = (net) => {
  if (!net) return "TBD";
  const d = new Date(net);
  let h = d.getUTCHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ap} UTC`;
};
const launchImg = (l) => (typeof l.image === "string" ? l.image : l.image?.image_url) || "";
const launchCountry = (l) => l.pad?.country?.name || l.pad?.location?.country?.name || l.pad?.location?.country_code || "N/A";
const launchLocation = (l) => l.pad?.location?.name || l.pad?.name || "N/A";

function featuredHTML(l) {
  const net = l.net ? new Date(l.net) : null;
  const days = net ? Math.ceil((net - new Date()) / 86400000) : 0;
  const img = launchImg(l);
  return `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i>
                Featured Launch
              </span>
              <span class="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">${launchStatus(l.status)}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${l.name}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${l.launch_service_provider?.name || "N/A"}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${l.rocket?.configuration?.name || "N/A"}</span></div>
            </div>
            ${
              days > 0
                ? `<div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
              <i class="fas fa-clock text-2xl text-blue-400"></i>
              <div>
                <p class="text-2xl font-bold text-blue-400">${days}</p>
                <p class="text-xs text-slate-400">Days Until Launch</p>
              </div>
            </div>`
                : ""
            }
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i>Launch Date</p>
                <p class="font-semibold">${net ? net.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "TBD"}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i>Launch Time</p>
                <p class="font-semibold">${launchTime(l.net)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i>Location</p>
                <p class="font-semibold text-sm">${launchLocation(l)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i>Country</p>
                <p class="font-semibold">${launchCountry(l)}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${l.mission?.description || ""}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button class="flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i>
              View Full Details
            </button>
            <div class="icons self-end md:self-center">
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
              <button class="px-4 py-3 bg-slate-700 rounded-xl hover:bg-slate-600 transition-colors"><i class="fas fa-bell"></i></button>
            </div>
          </div>
        </div>
        <div class="relative">
          <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
            ${
              img
                ? `<img src="${img}" alt="${l.name}" class="absolute inset-0 w-full h-full object-cover" />`
                : `<div class="flex items-center justify-center h-full min-h-[400px] bg-slate-800"><i class="fas fa-rocket text-9xl text-slate-700/50"></i></div>`
            }
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function cardHTML(l) {
  const net = l.net ? new Date(l.net) : null;
  const img = launchImg(l);
  return `
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
        ${img ? `<img src="${img}" alt="${l.name}" class="w-full h-full object-cover" />` : `<i class="fas fa-rocket text-5xl text-slate-700"></i>`}
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 bg-green-500/90 text-white backdrop-blur-sm rounded-full text-xs font-semibold">${launchStatus(l.status)}</span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${l.name}</h4>
          <p class="text-sm text-slate-400 flex items-center gap-2"><i class="fas fa-building text-xs"></i>${l.launch_service_provider?.name || "N/A"}</p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${net ? net.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "TBD"}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${launchTime(l.net)}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300">${l.rocket?.configuration?.name || "N/A"}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${launchLocation(l)}</span></div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
          <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
        </div>
      </div>
    </div>`;
}

async function loadLaunches() {
  try {
    const data = await get(LAUNCHES_URL);
    const list = data.results || [];
    $("launches-count").textContent = `${list.length} Launches`;
    $("launches-count-mobile").textContent = list.length;
    if (!list.length) return;
    $("featured-launch").innerHTML = featuredHTML(list[0]);
    $("launches-grid").innerHTML = list.map(cardHTML).join("");
  } catch (err) {
    console.error("Launches error:", err);
  }
}

// ================= 3) Planets (Solar System OpenData) =================
// template planet ids -> API ids
const API_ID = { mercury: "mercure", venus: "venus", earth: "terre", mars: "mars", jupiter: "jupiter", saturn: "saturne", uranus: "uranus", neptune: "neptune" };
// ألوان/أنواع الجدول زي ما هي في الـ template
const ROW = {
  mercury: ["#eab308", "bg-orange-500/50 text-orange-200", "Terrestrial"],
  venus: ["#f97316", "bg-orange-500/50 text-orange-200", "Terrestrial"],
  earth: ["#3b82f6", "bg-blue-500/50 text-blue-200", "Terrestrial"],
  mars: ["#ef4444", "bg-red-500/50 text-red-200", "Terrestrial"],
  jupiter: ["#fb923c", "bg-purple-500/50 text-purple-200", "Gas Giant"],
  saturn: ["#facc15", "bg-yellow-500/50 text-yellow-200", "Gas Giant"],
  uranus: ["#06b6d4", "bg-cyan-500/50 text-cyan-200", "Ice Giant"],
  neptune: ["#2563eb", "bg-blue-500/50 text-blue-200", "Ice Giant"],
};
const AU = 149597870.7;
const EARTH_MASS = 5.972e24;
const cache = {};
const planetFetch = (key) =>
  (cache[key] ||= get(PLANETS_URL + API_ID[key], PLANETS_TOKEN ? { Authorization: "Bearer " + PLANETS_TOKEN } : undefined));

const sup = (n) => String(n).replace(/[-0-9]/g, (c) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)]);
const km = (v) => (v >= 1e6 ? num(v / 1e6, 1) + "M km" : num(v, 0) + " km");
const period = (d) => (d >= 730 ? num(d / 365.25, 1) + " years" : num(d, 2) + " days");
const rotation = (h) => (Math.abs(h) >= 48 ? num(Math.abs(h) / 24, 1) + " days" : num(Math.abs(h), 1) + " hours");
const massStr = (m) => (m ? `${num(m.massValue, 2)} × 10${sup(m.massExponent)} kg` : "N/A");
const volStr = (v) => (v ? `${num(v.volValue, 2)} × 10${sup(v.volExponent)} km³` : "N/A");

async function showPlanet(key) {
  try {
    const p = await planetFetch(key);
    const name = p.englishName || key;
    $("planet-detail-image").src = `./images/${key}.png`;
    $("planet-detail-name").textContent = name;
    $("planet-detail-description").textContent =
      `${name} orbits the Sun every ${period(p.sideralOrbit)} at an average distance of ${num(p.semimajorAxis / AU, 2)} AU, ` +
      `with a mean radius of ${num(p.meanRadius, 1)} km and ${p.moons ? p.moons.length : 0} known moon${p.moons?.length === 1 ? "" : "s"}.`;
    $("planet-distance").textContent = km(p.semimajorAxis);
    $("planet-radius").textContent = num(p.meanRadius, 1) + " km";
    $("planet-mass").textContent = massStr(p.mass);
    $("planet-density").textContent = num(p.density, 2) + " g/cm³";
    $("planet-orbital-period").textContent = period(p.sideralOrbit);
    $("planet-rotation").textContent = rotation(p.sideralRotation);
    $("planet-moons").textContent = p.moons ? p.moons.length : 0;
    $("planet-gravity").textContent = num(p.gravity, 2) + " m/s²";
    $("planet-discoverer").textContent = p.discoveredBy || "Known since antiquity";
    $("planet-discovery-date").textContent = p.discoveryDate || "Ancient";
    $("planet-body-type").textContent = p.bodyType || "Planet";
    $("planet-volume").textContent = volStr(p.vol);
    $("planet-facts").innerHTML = [
      `Orbital period: ${period(p.sideralOrbit)}`,
      `Surface gravity: ${num(p.gravity, 2)} m/s²`,
      `Escape velocity: ${num(p.escape / 1000, 1)} km/s`,
      `Axial tilt: ${num(p.axialTilt, 2)}°`,
    ]
      .map((t) => `<li class="flex items-start"><i class="fas fa-check text-green-400 mt-1 mr-2"></i><span class="text-slate-300">${t}</span></li>`)
      .join("");
    $("planet-perihelion").textContent = km(p.perihelion);
    $("planet-aphelion").textContent = km(p.aphelion);
    $("planet-eccentricity").textContent = num(p.eccentricity, 4);
    $("planet-inclination").textContent = num(p.inclination, 2) + "°";
    $("planet-axial-tilt").textContent = num(p.axialTilt, 2) + "°";
    $("planet-temp").textContent = p.avgTemp ? num(p.avgTemp - 273.15, 0) + "°C" : "N/A";
    $("planet-escape").textContent = num(p.escape / 1000, 1) + " km/s";
  } catch (err) {
    console.error("Planet error:", err);
  }
}

async function loadComparison() {
  const keys = Object.keys(API_ID);
  const rows = await Promise.all(keys.map((k) => planetFetch(k).catch(() => null)));
  if (rows.some((r) => !r)) return; // لو الـ API فشل سيب جدول الـ template زي ما هو
  const td = "px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap";
  $("planet-comparison-tbody").innerHTML = keys
    .map((k, i) => {
      const p = rows[i];
      if (!p) return "";
      const [color, badge, type] = ROW[k];
      return `
      <tr class="hover:bg-slate-800/30 transition-colors ${k === "earth" ? "bg-blue-500/5" : ""}">
        <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
            <span class="font-semibold text-sm md:text-base whitespace-nowrap">${p.englishName}</span>
          </div>
        </td>
        <td class="${td}">${num(p.semimajorAxis / AU, 2)}</td>
        <td class="${td}">${num(p.meanRadius * 2, 0)}</td>
        <td class="${td}">${num((p.mass.massValue * Math.pow(10, p.mass.massExponent)) / EARTH_MASS, 3)}</td>
        <td class="${td}">${period(p.sideralOrbit)}</td>
        <td class="${td}">${p.moons ? p.moons.length : 0}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap"><span class="px-2 py-1 rounded text-xs ${badge}">${type}</span></td>
      </tr>`;
    })
    .join("");
}

document.querySelectorAll(".planet-card").forEach((c) => c.addEventListener("click", () => showPlanet(c.dataset.planetId)));

// ================= Init =================
loadAPOD();
loadLaunches();
loadComparison();
showPlanet("earth");
