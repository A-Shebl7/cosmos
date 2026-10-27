/* =========================================================
   COSMOS - Space Dashboard
   1) Today in Space  -> NASA APOD API
   2) Launches        -> The Space Devs (Launch Library 2)
   3) Planets         -> Solar System OpenData
   ========================================================= */

// ---------- CONFIG (غيّر الروابط هنا لو الـ Postman Docs بتاعتك مختلفة) ----------
const CONFIG = {
  NASA_APOD_URL: "https://api.nasa.gov/planetary/apod",
  NASA_API_KEY: "DEMO_KEY", // حط مفتاحك من https://api.nasa.gov لو DEMO_KEY خلص
  LAUNCHES_URL: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/",
  LAUNCHES_LIMIT: 10,
  PLANETS_URL: "https://api.le-systeme-solaire.net/rest/bodies/",
};

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const AU_KM = 149597870.7;

const fmtNum = (n, d = 2) =>
  n === null || n === undefined || isNaN(n)
    ? "N/A"
    : Number(n).toLocaleString("en-US", { maximumFractionDigits: d });

const fmtDate = (iso, opts) =>
  new Date(iso).toLocaleDateString("en-US", opts || { year: "numeric", month: "short", day: "numeric" });

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// =========================================================
// Navigation (sidebar + sections)
// =========================================================
const sidebar = $("sidebar");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".app-section");

const ACTIVE = ["bg-blue-500/10", "text-blue-400"];
const INACTIVE = ["text-slate-300", "hover:bg-slate-800"];

let overlay = null;
function closeSidebar() {
  sidebar.classList.remove("sidebar-open");
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}
function openSidebar() {
  sidebar.classList.add("sidebar-open");
  overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  overlay.addEventListener("click", closeSidebar);
  document.body.appendChild(overlay);
}

function showSection(name) {
  sections.forEach((s) => s.classList.toggle("hidden", s.dataset.section !== name));
  navLinks.forEach((l) => {
    const on = l.dataset.section === name;
    ACTIVE.forEach((c) => l.classList.toggle(c, on));
    INACTIVE.forEach((c) => l.classList.toggle(c, !on));
  });
  window.scrollTo({ top: 0 });
  closeSidebar();
}

navLinks.forEach((l) =>
  l.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(l.dataset.section);
  })
);
$("sidebar-toggle").addEventListener("click", () =>
  sidebar.classList.contains("sidebar-open") ? closeSidebar() : openSidebar()
);

// =========================================================
// 1) Today in Space (APOD)
// =========================================================
const apodInput = $("apod-date-input");
const apodLabel = apodInput.parentElement.querySelector("span");
let apodFullUrl = "";

function setApodLoading(on) {
  $("apod-loading").classList.toggle("hidden", !on);
  $("apod-image").classList.toggle("hidden", on);
}

async function loadAPOD(date) {
  setApodLoading(true);
  $("apod-title").textContent = "Loading...";
  $("apod-explanation").textContent = "Loading description...";
  try {
    const q = new URLSearchParams({ api_key: CONFIG.NASA_API_KEY });
    if (date) q.set("date", date);
    const data = await getJSON(`${CONFIG.NASA_APOD_URL}?${q}`);

    const niceDate = fmtDate(data.date + "T00:00:00", { year: "numeric", month: "long", day: "numeric" });
    $("apod-date").textContent = `Astronomy Picture of the Day - ${niceDate}`;
    $("apod-title").textContent = data.title;
    $("apod-explanation").textContent = data.explanation;
    $("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${data.date}`;
    $("apod-date-info").textContent = data.date;
    $("apod-media-type").textContent = data.media_type === "video" ? "Video" : "Image";
    $("apod-copyright").innerHTML = data.copyright
      ? `&copy; ${data.copyright.replace(/\n/g, " ").trim()}`
      : "&copy; NASA";

    apodInput.value = data.date;
    apodLabel.textContent = fmtDate(data.date + "T00:00:00");

    const container = $("apod-image-container");
    container.querySelector("iframe")?.remove();
    const img = $("apod-image");

    if (data.media_type === "video") {
      img.classList.add("hidden");
      const f = document.createElement("iframe");
      f.src = data.url;
      f.className = "w-full h-full";
      f.allowFullscreen = true;
      container.prepend(f);
      apodFullUrl = data.url;
    } else {
      img.src = data.url;
      img.alt = data.title;
      apodFullUrl = data.hdurl || data.url;
      img.classList.remove("hidden");
    }
    $("apod-loading").classList.add("hidden");
  } catch (err) {
    console.error("APOD error:", err);
    $("apod-title").textContent = "Couldn't load the image";
    $("apod-explanation").textContent =
      "Something went wrong while fetching data from NASA (maybe no image for this date, or the API rate limit was reached). Please try another date.";
    $("apod-image").src = "./images/placeholder.webp";
    setApodLoading(false);
  }
}

// الزر "View Full Resolution"
$("apod-image-container").querySelector("button").addEventListener("click", () => {
  if (apodFullUrl) window.open(apodFullUrl, "_blank", "noopener");
});

apodInput.max = toISODate(new Date());
$("load-date-btn").addEventListener("click", () => {
  if (apodInput.value) loadAPOD(apodInput.value);
});
$("today-apod-btn").addEventListener("click", () => loadAPOD());
apodInput.addEventListener("change", () => {
  if (apodInput.value) apodLabel.textContent = fmtDate(apodInput.value + "T00:00:00");
});

// =========================================================
// 2) Launches (The Space Devs)
// =========================================================
const STATUS_STYLES = {
  Go: "bg-green-500/90",
  TBC: "bg-yellow-500/90",
  TBD: "bg-blue-500/90",
  Success: "bg-green-500/90",
  Hold: "bg-yellow-500/90",
  "In Flight": "bg-blue-500/90",
};
const CARD_ICONS = ["fa-rocket", "fa-space-shuttle", "fa-satellite-dish"];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function launchMeta(l) {
  const net = l.net ? new Date(l.net) : null;
  return {
    name: l.name || "Unknown mission",
    provider: l.launch_service_provider?.name || "Unknown",
    rocket: l.rocket?.configuration?.full_name || l.rocket?.configuration?.name || "N/A",
    status: l.status?.abbrev || "TBD",
    date: net ? fmtDate(l.net, { year: "numeric", month: "short", day: "numeric" }) : "TBD",
    longDate: net ? fmtDate(l.net, { year: "numeric", month: "long", day: "numeric" }) : "TBD",
    time: net ? net.toISOString().substring(11, 16) + " UTC" : "TBD",
    pad: l.pad?.name || "N/A",
    location: l.pad?.location?.name || "N/A",
    country: l.pad?.location?.country_code || l.launch_service_provider?.country_code || "N/A",
    image: l.image || "",
    description: l.mission?.description || "No description available for this mission yet.",
    days: net ? Math.max(0, Math.ceil((net - new Date()) / 86400000)) : null,
    url: l.url || "",
    link: l.info_urls?.[0]?.url || l.vid_urls?.[0]?.url || "",
  };
}

function renderFeatured(l) {
  const m = launchMeta(l);
  const ok = m.status === "Go" || m.status === "Success";
  const statusClass = ok
    ? "bg-green-500/20 text-green-400"
    : m.status === "TBC"
    ? "bg-slate-700 text-yellow-400"
    : "bg-blue-500/20 text-blue-400";

  $("featured-launch").innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
                <i class="fas fa-star"></i> Featured Launch
              </span>
              <span class="px-4 py-1.5 ${statusClass} rounded-full text-sm font-semibold">${esc(m.status)}</span>
            </div>
            <h3 class="text-3xl font-bold mb-3 leading-tight">${esc(m.name)}</h3>
            <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
              <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${esc(m.provider)}</span></div>
              <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${esc(m.rocket)}</span></div>
            </div>
            ${
              m.days !== null
                ? `<div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
                    <i class="fas fa-clock text-2xl text-blue-400"></i>
                    <div>
                      <p class="text-2xl font-bold text-blue-400">${m.days}</p>
                      <p class="text-xs text-slate-400">Days Until Launch</p>
                    </div>
                  </div>`
                : ""
            }
            <div class="grid xl:grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i> Launch Date</p>
                <p class="font-semibold">${esc(m.longDate)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i> Launch Time</p>
                <p class="font-semibold">${esc(m.time)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Location</p>
                <p class="font-semibold text-sm">${esc(m.location)}</p>
              </div>
              <div class="bg-slate-900/50 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i> Country</p>
                <p class="font-semibold">${esc(m.country)}</p>
              </div>
            </div>
            <p class="text-slate-300 leading-relaxed mb-6">${esc(m.description)}</p>
          </div>
          <div class="flex flex-col md:flex-row gap-3">
            <button data-link="${esc(m.link || m.url)}" class="details-btn flex-1 self-start md:self-center px-6 py-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-info-circle"></i> View Full Details
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
              m.image
                ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" class="w-full h-full object-cover absolute inset-0" onerror="this.src='./images/launch-placeholder.png'" />`
                : `<div class="flex items-center justify-center h-full min-h-[400px] bg-slate-800"><i class="fas fa-rocket text-9xl text-slate-700/50"></i></div>`
            }
            <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </div>`;
}

function renderCard(l, i) {
  const m = launchMeta(l);
  const badge = STATUS_STYLES[m.status] || "bg-blue-500/90";
  const icon = CARD_ICONS[i % CARD_ICONS.length];
  return `
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
        ${
          m.image
            ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" class="w-full h-full object-cover" onerror="this.src='./images/launch-placeholder.png'" />`
            : `<i class="fas ${icon} text-5xl text-slate-700"></i>`
        }
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 ${badge} text-white backdrop-blur-sm rounded-full text-xs font-semibold">${esc(m.status)}</span>
        </div>
      </div>
      <div class="p-5">
        <div class="mb-3">
          <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${esc(m.name)}</h4>
          <p class="text-sm text-slate-400 flex items-center gap-2"><i class="fas fa-building text-xs"></i>${esc(m.provider)}</p>
        </div>
        <div class="space-y-2 mb-4">
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${esc(m.date)}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${esc(m.time)}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${esc(m.rocket)}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${esc(m.pad)}</span></div>
        </div>
        <div class="flex items-center gap-2 pt-4 border-t border-slate-700">
          <button data-link="${esc(m.link || m.url)}" class="details-btn flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
          <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
        </div>
      </div>
    </div>`;
}

function bindLaunchButtons() {
  document.querySelectorAll("#launches .details-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const link = b.dataset.link;
      if (link) window.open(link, "_blank", "noopener");
    })
  );
  document.querySelectorAll("#launches .fa-heart").forEach((h) => {
    h.parentElement.addEventListener("click", (e) => {
      e.stopPropagation();
      const on = h.classList.contains("fas");
      h.classList.toggle("fas", !on);
      h.classList.toggle("far", on);
      h.classList.toggle("text-red-400", !on);
    });
  });
}

function setLaunchCount(n) {
  $("launches-count").textContent = `${n} Launches`;
  $("launches-count-mobile").textContent = n;
}

async function loadLaunches() {
  const grid = $("launches-grid");
  $("featured-launch").innerHTML = `
    <div class="text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
    <p class="text-slate-400">Loading launches...</p></div>`;
  grid.innerHTML = "";
  try {
    const data = await getJSON(`${CONFIG.LAUNCHES_URL}?limit=${CONFIG.LAUNCHES_LIMIT}&mode=normal`);
    const list = data.results || [];
    if (!list.length) throw new Error("No launches returned");
    setLaunchCount(list.length);
    renderFeatured(list[0]);
    grid.innerHTML = list.slice(1).map(renderCard).join("");
    bindLaunchButtons();
  } catch (err) {
    console.error("Launches error:", err);
    $("featured-launch").innerHTML = `
      <div class="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-2xl">
        <i class="fas fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>
        <p class="text-slate-300 mb-2">Couldn't load upcoming launches.</p>
        <p class="text-slate-400 text-sm">The API may be rate-limited (free tier). Try again in a few minutes.</p>
      </div>`;
  }
}

// =========================================================
// 3) Planets (Solar System OpenData)
// =========================================================
const PLANETS = [
  { id: "mercure", key: "mercury", name: "Mercury", color: "#eab308", badge: "bg-orange-500/50 text-orange-200", type: "Terrestrial" },
  { id: "venus", key: "venus", name: "Venus", color: "#f97316", badge: "bg-orange-500/50 text-orange-200", type: "Terrestrial" },
  { id: "terre", key: "earth", name: "Earth", color: "#3b82f6", badge: "bg-blue-500/50 text-blue-200", type: "Terrestrial" },
  { id: "mars", key: "mars", name: "Mars", color: "#ef4444", badge: "bg-red-500/50 text-red-200", type: "Terrestrial" },
  { id: "jupiter", key: "jupiter", name: "Jupiter", color: "#fb923c", badge: "bg-purple-500/50 text-purple-200", type: "Gas Giant" },
  { id: "saturne", key: "saturn", name: "Saturn", color: "#facc15", badge: "bg-yellow-500/50 text-yellow-200", type: "Gas Giant" },
  { id: "uranus", key: "uranus", name: "Uranus", color: "#06b6d4", badge: "bg-cyan-500/50 text-cyan-200", type: "Ice Giant" },
  { id: "neptune", key: "neptune", name: "Neptune", color: "#2563eb", badge: "bg-blue-500/50 text-blue-200", type: "Ice Giant" },
];

// وصف + حقائق سريعة (الـ API مبيرجعش وصف نصي)
const PLANET_INFO = {
  mercury: {
    desc: "Mercury is the smallest planet in the Solar System and the closest to the Sun. It has almost no atmosphere, so temperatures swing wildly between scorching days and freezing nights. Its surface is heavily cratered, much like our Moon.",
    facts: ["Smallest planet in the Solar System", "A year lasts only 88 Earth days", "No significant atmosphere", "Surface covered with impact craters"],
    temp: "167°C",
  },
  venus: {
    desc: "Venus is the second planet from the Sun and the hottest in the Solar System thanks to a thick carbon-dioxide atmosphere that traps heat. It spins backwards compared to most planets, and a day on Venus is longer than its year.",
    facts: ["Hottest planet despite not being closest to the Sun", "Rotates backwards (retrograde)", "Atmospheric pressure ~92x Earth's", "Clouds made of sulfuric acid"],
    temp: "464°C",
  },
  earth: {
    desc: "Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 29% of Earth's surface is land consisting of continents and islands. The remaining 71% is covered with water, mostly by oceans, seas, gulfs, and other salt-water bodies, but also by lakes, rivers, and other fresh water, which together constitute the hydrosphere.",
    facts: ["Only known planet with liquid water", "Atmosphere contains 78% nitrogen", "Magnetic field protects from solar wind", "Formed 4.54 billion years ago"],
    temp: "15°C",
  },
  mars: {
    desc: "Mars is the fourth planet from the Sun, known as the Red Planet because of iron oxide on its surface. It hosts Olympus Mons, the tallest volcano in the Solar System, and evidence suggests liquid water once flowed across its surface.",
    facts: ["Home to Olympus Mons, the tallest volcano known", "Has two small moons: Phobos and Deimos", "A day is about 24h 37m", "Evidence of ancient rivers and lakes"],
    temp: "-65°C",
  },
  jupiter: {
    desc: "Jupiter is the largest planet in the Solar System, a gas giant more than twice as massive as all the other planets combined. Its Great Red Spot is a storm larger than Earth that has raged for centuries.",
    facts: ["Largest planet in the Solar System", "Great Red Spot is a giant storm", "Shortest day of all planets (~10 hours)", "Has a faint ring system"],
    temp: "-110°C",
  },
  saturn: {
    desc: "Saturn is the sixth planet from the Sun and is famous for its spectacular ring system made mostly of ice and rock. It is a gas giant so light that it would float in water if there were a bathtub big enough.",
    facts: ["Most extensive ring system of any planet", "Less dense than water", "Has 80+ confirmed moons including Titan", "Winds can reach 1,800 km/h"],
    temp: "-140°C",
  },
  uranus: {
    desc: "Uranus is an ice giant that rotates on its side, with an axial tilt of about 98 degrees. Its pale blue-green color comes from methane in its atmosphere, and it is the coldest planetary atmosphere in the Solar System.",
    facts: ["Rotates on its side (98° tilt)", "Coldest planetary atmosphere recorded", "Has 13 known rings", "Discovered by William Herschel in 1781"],
    temp: "-195°C",
  },
  neptune: {
    desc: "Neptune is the eighth and farthest known planet from the Sun. This deep-blue ice giant has the strongest winds in the Solar System, reaching over 2,000 km/h, and takes about 165 Earth years to orbit the Sun.",
    facts: ["Farthest planet from the Sun", "Fastest winds in the Solar System", "Discovered through mathematical prediction (1846)", "Has 14 known moons, the largest being Triton"],
    temp: "-200°C",
  },
};

// بيانات احتياطية لو الـ API مردش (أرقام تقريبية معروفة)
const FALLBACK = {
  mercury: { semimajorAxis: 57909227, meanRadius: 2439.7, mass: [3.3011, 23], density: 5.427, sideralOrbit: 87.969, sideralRotation: 1407.6, moons: null, gravity: 3.7, perihelion: 46001200, aphelion: 69816900, eccentricity: 0.2056, inclination: 7.0, axialTilt: 0.034, escape: 4250, vol: [6.083, 10] },
  venus: { semimajorAxis: 108209475, meanRadius: 6051.8, mass: [4.8675, 24], density: 5.243, sideralOrbit: 224.701, sideralRotation: -5832.5, moons: null, gravity: 8.87, perihelion: 107476259, aphelion: 108942109, eccentricity: 0.0068, inclination: 3.39, axialTilt: 177.4, escape: 10360, vol: [9.2843, 11] },
  earth: { semimajorAxis: 149598023, meanRadius: 6371, mass: [5.9724, 24], density: 5.514, sideralOrbit: 365.256, sideralRotation: 23.9345, moons: [{ moon: "Moon" }], gravity: 9.8, perihelion: 147098290, aphelion: 152098232, eccentricity: 0.0167, inclination: 0, axialTilt: 23.44, escape: 11186, vol: [1.0832, 12] },
  mars: { semimajorAxis: 227939366, meanRadius: 3389.5, mass: [6.4171, 23], density: 3.934, sideralOrbit: 686.98, sideralRotation: 24.6229, moons: [{}, {}], gravity: 3.71, perihelion: 206655215, aphelion: 249261000, eccentricity: 0.0935, inclination: 1.85, axialTilt: 25.19, escape: 5030, vol: [1.6318, 11] },
  jupiter: { semimajorAxis: 778479000, meanRadius: 69911, mass: [1.8982, 27], density: 1.326, sideralOrbit: 4332.589, sideralRotation: 9.925, moons: new Array(95).fill({}), gravity: 24.79, perihelion: 740595000, aphelion: 816363000, eccentricity: 0.0489, inclination: 1.304, axialTilt: 3.13, escape: 59500, vol: [1.4313, 15] },
  saturn: { semimajorAxis: 1433530000, meanRadius: 58232, mass: [5.6834, 26], density: 0.687, sideralOrbit: 10759.22, sideralRotation: 10.656, moons: new Array(146).fill({}), gravity: 10.44, perihelion: 1357554000, aphelion: 1506527000, eccentricity: 0.0565, inclination: 2.485, axialTilt: 26.73, escape: 35500, vol: [8.2713, 14] },
  uranus: { semimajorAxis: 2870972000, meanRadius: 25362, mass: [8.681, 25], density: 1.27, sideralOrbit: 30685.4, sideralRotation: -17.24, moons: new Array(28).fill({}), gravity: 8.87, perihelion: 2732696000, aphelion: 3001390000, eccentricity: 0.0457, inclination: 0.772, axialTilt: 97.77, escape: 21300, vol: [6.833, 13] },
  neptune: { semimajorAxis: 4500000000, meanRadius: 24622, mass: [1.0241, 26], density: 1.638, sideralOrbit: 60189, sideralRotation: 16.11, moons: new Array(16).fill({}), gravity: 11.15, perihelion: 4459631496, aphelion: 4553946490, eccentricity: 0.0113, inclination: 1.767, axialTilt: 28.32, escape: 23500, vol: [6.254, 13] },
};

const planetCache = {};

async function getPlanet(p) {
  if (planetCache[p.key]) return planetCache[p.key];
  let data;
  try {
    data = await getJSON(`${CONFIG.PLANETS_URL}${p.id}`);
  } catch (e) {
    console.warn(`Planet API failed for ${p.name}, using fallback data`, e);
    data = FALLBACK[p.key];
  }
  planetCache[p.key] = data;
  return data;
}

const massVal = (m) => (m && m.massValue !== undefined ? m.massValue * Math.pow(10, m.massExponent) : Array.isArray(m) ? m[0] * Math.pow(10, m[1]) : null);
const massParts = (m) => (m && m.massValue !== undefined ? [m.massValue, m.massExponent] : Array.isArray(m) ? m : null);
const sup = (n) => String(n).replace(/-/g, "⁻").replace(/0/g, "⁰").replace(/1/g, "¹").replace(/2/g, "²").replace(/3/g, "³").replace(/4/g, "⁴").replace(/5/g, "⁵").replace(/6/g, "⁶").replace(/7/g, "⁷").replace(/8/g, "⁸").replace(/9/g, "⁹");

function fmtMass(m) {
  const mp = massParts(m);
  return mp ? `${fmtNum(mp[0], 2)} × 10${sup(mp[1])} kg` : "N/A";
}
function fmtVol(v) {
  const vp = v && v.volValue !== undefined ? [v.volValue, v.volExponent] : Array.isArray(v) ? v : null;
  return vp ? `${fmtNum(vp[0], 2)} × 10${sup(vp[1])} km³` : "N/A";
}
const fmtKm = (km) => (km >= 1e6 ? `${fmtNum(km / 1e6, 1)}M km` : `${fmtNum(km, 0)} km`);
function fmtPeriod(days) {
  if (days === null || days === undefined) return "N/A";
  return days >= 730 ? `${fmtNum(days / 365.25, 1)} years` : `${fmtNum(days, 1)} days`;
}
function fmtRotation(h) {
  if (h === null || h === undefined) return "N/A";
  const abs = Math.abs(h);
  const txt = abs >= 48 ? `${fmtNum(abs / 24, 1)} days` : `${fmtNum(abs, 1)} hours`;
  return h < 0 ? `${txt} (retrograde)` : txt;
}
const moonCount = (d) => (Array.isArray(d.moons) ? d.moons.length : 0);

async function showPlanet(key) {
  const p = PLANETS.find((x) => x.key === key);
  const info = PLANET_INFO[key];
  const d = await getPlanet(p);

  $("planet-detail-image").src = `./images/${key}.png`;
  $("planet-detail-image").alt = `${p.name} planet`;
  $("planet-detail-name").textContent = p.name;
  $("planet-detail-description").textContent = info.desc;

  $("planet-distance").textContent = fmtKm(d.semimajorAxis);
  $("planet-radius").textContent = `${fmtNum(d.meanRadius, 1)} km`;
  $("planet-mass").textContent = fmtMass(d.mass);
  $("planet-density").textContent = `${fmtNum(d.density, 2)} g/cm³`;
  $("planet-orbital-period").textContent = fmtPeriod(d.sideralOrbit);
  $("planet-rotation").textContent = fmtRotation(d.sideralRotation);
  $("planet-moons").textContent = moonCount(d);
  $("planet-gravity").textContent = `${fmtNum(d.gravity, 2)} m/s²`;

  $("planet-discoverer").textContent = d.discoveredBy || "Known since antiquity";
  $("planet-discovery-date").textContent = d.discoveryDate || "Ancient";
  $("planet-body-type").textContent = d.bodyType || "Planet";
  $("planet-volume").textContent = fmtVol(d.vol);

  $("planet-facts").innerHTML = info.facts
    .map(
      (f) => `<li class="flex items-start"><i class="fas fa-check text-green-400 mt-1 mr-2"></i><span class="text-slate-300">${esc(f)}</span></li>`
    )
    .join("");

  $("planet-perihelion").textContent = fmtKm(d.perihelion);
  $("planet-aphelion").textContent = fmtKm(d.aphelion);
  $("planet-eccentricity").textContent = fmtNum(d.eccentricity, 4);
  $("planet-inclination").textContent = `${fmtNum(d.inclination, 2)}°`;
  $("planet-axial-tilt").textContent = `${fmtNum(d.axialTilt, 2)}°`;
  $("planet-temp").textContent = d.avgTemp ? `${fmtNum(d.avgTemp - 273.15, 0)}°C` : info.temp;
  $("planet-escape").textContent = d.escape ? `${fmtNum(d.escape / 1000, 1)} km/s` : "N/A";

  // تمييز الكوكب المختار
  document.querySelectorAll(".planet-card").forEach((c) => {
    const on = c.dataset.planetId === key;
    c.style.borderColor = on ? p.color : "#334155";
    c.dataset.selected = on ? "1" : "";
  });
}

function renderComparisonRow(p, d) {
  const mass = massVal(d.mass);
  const earthMass = 5.9724e24;
  const cell = "px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap";
  return `
    <tr class="hover:bg-slate-800/30 transition-colors ${p.key === "earth" ? "bg-blue-500/5" : ""}">
      <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
        <div class="flex items-center space-x-2 md:space-x-3">
          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${p.color}"></div>
          <span class="font-semibold text-sm md:text-base whitespace-nowrap">${p.name}</span>
        </div>
      </td>
      <td class="${cell}">${fmtNum(d.semimajorAxis / AU_KM, 2)}</td>
      <td class="${cell}">${fmtNum(d.meanRadius * 2, 0)}</td>
      <td class="${cell}">${mass ? fmtNum(mass / earthMass, mass / earthMass < 1 ? 3 : 1) : "N/A"}</td>
      <td class="${cell}">${fmtPeriod(d.sideralOrbit)}</td>
      <td class="${cell}">${moonCount(d)}</td>
      <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap"><span class="px-2 py-1 rounded text-xs ${p.badge}">${p.type}</span></td>
    </tr>`;
}

async function loadPlanets() {
  // الكروت (الموجودة في الـ HTML) -> click
  document.querySelectorAll(".planet-card").forEach((c) =>
    c.addEventListener("click", () => showPlanet(c.dataset.planetId))
  );
  // لوحة الأرض كبداية + جدول المقارنة
  const results = await Promise.all(PLANETS.map((p) => getPlanet(p)));
  $("planet-comparison-tbody").innerHTML = PLANETS.map((p, i) => renderComparisonRow(p, results[i])).join("");
  showPlanet("earth");
}

// =========================================================
// Init
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
  showSection("today-in-space");
  loadAPOD();
  loadLaunches();
  loadPlanets();
});
