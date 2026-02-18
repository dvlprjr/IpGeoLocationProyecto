const apiKey = "1d445bc9bd8847cfa1542a32abe0f19c";

document.addEventListener("DOMContentLoaded", () => {

  const detectBtn = document.getElementById("detectBtn");
  const lookupBtn = document.getElementById("lookupBtn");
  const geoBtn = document.getElementById("geoBtn");

  const consent = document.getElementById("consent");
  const ipInput = document.getElementById("ipInput");
  const output = document.getElementById("output");
  const highAccuracy = document.getElementById("highAccuracy");

  let lastIPLocation = null;
  let lastGPSLocation = null;

  function setOutput(text) {
    output.textContent = text;
  }

  function requireConsent() {
    if (!consent.checked) {
      alert("Debes aceptar el consentimiento primero.");
      return false;
    }
    return true;
  }

  function ensureApiKey() {
    if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
      alert("Configura tu API key en app.js");
      return false;
    }
    return true;
  }

  // ===============================
  // VALIDACIÓN IP
  // ===============================
  function isValidIPv4(ip) {
    const parts = ip.trim().split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d+$/.test(p)) return false;
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    return /^[0-9a-fA-F:]+$/.test(ip.trim()) && ip.includes(":");
  }

  function isValidIP(ip) {
    return isValidIPv4(ip) || isValidIPv6(ip);
  }

  // ===============================
  // OPCIÓN A - DETECTAR IP
  // ===============================
  detectBtn.addEventListener("click", async () => {
    if (!requireConsent()) return;
    if (!ensureApiKey()) return;

    setOutput("Obteniendo IP pública vía WebRTC...");

    try {
      const ip = await getPublicIP();
      await lookupIP(ip);
    } catch (err) {
      setOutput("Error detectando IP: " + err.message);
    }
  });

  // ===============================
  // OPCIÓN B - IP MANUAL
  // ===============================
  lookupBtn.addEventListener("click", async () => {
    if (!requireConsent()) return;
    if (!ensureApiKey()) return;

    const ip = ipInput.value.trim();

    if (!isValidIP(ip)) {
      alert("IP inválida.");
      return;
    }

    await lookupIP(ip);
  });

  async function lookupIP(ip) {
    setOutput("Consultando ubicación aproximada por IP...");

    const geo = await getGeoLocation(ip);

    lastIPLocation = {
      latitude: parseFloat(geo.latitude),
      longitude: parseFloat(geo.longitude)
    };

    renderResults({
      source: "ip_geolocation",
      ip: geo.ip,
      country: geo.country_name,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      isp: geo.isp,
      organization: geo.organization
    });
  }

  async function getGeoLocation(ip) {
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`;
    const res = await fetch(url);
    return await res.json();
  }

  // ===============================
  // OPCIÓN C - GEOLOCATION REAL
  // ===============================
  geoBtn.addEventListener("click", () => {
    if (!requireConsent()) return;

    if (!navigator.geolocation) {
      setOutput("Tu navegador no soporta Geolocation API.");
      return;
    }

    setOutput("Obteniendo ubicación real...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        lastGPSLocation = { latitude: lat, longitude: lng };

        await reverseGeocode(lat, lng, accuracy);

      },
      (err) => {
        setOutput("Error GPS: " + err.message);
      },
      {
        enableHighAccuracy: highAccuracy.checked,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });

  // ===============================
  // REVERSE GEOCODING (OpenStreetMap)
  // ===============================
  async function reverseGeocode(lat, lng, accuracy) {

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );

      const data = await res.json();

      renderResults({
        source: "browser_geolocation",
        latitude: lat,
        longitude: lng,
        accuracy_meters: accuracy,
        country: data.address?.country || "",
        state: data.address?.state || "",
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          "",
        postcode: data.address?.postcode || "",
        full_address: data.display_name || ""
      });

      if (lastIPLocation && lastGPSLocation) {
        const distance = calculateDistance(
          lastIPLocation.latitude,
          lastIPLocation.longitude,
          lastGPSLocation.latitude,
          lastGPSLocation.longitude
        );

        output.textContent += `\n\nDistancia IP vs GPS: ${distance.toFixed(2)} km`;
      }

    } catch (error) {
      setOutput("Error obteniendo detalles de ubicación.");
    }
  }

  // ===============================
  // WEBRTC IP
  // ===============================
  function getPublicIP() {
    return new Promise((resolve, reject) => {

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.createDataChannel("");

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        const parts = event.candidate.candidate.split(" ");
        const ip = parts[4];
        const type = parts[7];

        if (type === "srflx") {
          resolve(ip);
          pc.close();
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => reject(err));
    });
  }

  // ===============================
  // CALCULAR DISTANCIA (Haversine)
  // ===============================
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // ===============================
  // RENDER RESULTADOS
  // ===============================
  function renderResults(obj) {
    setOutput(JSON.stringify(obj, null, 2));
  }

});
