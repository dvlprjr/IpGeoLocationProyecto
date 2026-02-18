const apiKey = "1d445bc9bd8847cfa1542a32abe0f19c";
document.addEventListener("DOMContentLoaded", () => {
  const detectBtn = document.getElementById("detectBtn");
  const lookupBtn = document.getElementById("lookupBtn");
  const consent = document.getElementById("consent");
  const ipInput = document.getElementById("ipInput");
  const output = document.getElementById("output");

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
      alert("Configura tu API key en app.js (apiKey).");
      return false;
    }
    return true;
  }

  function isValidIPv4(ip) {
    const parts = ip.trim().split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      if (!/^\d+$/.test(p)) return false;
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const v = ip.trim();
    if (!v.includes(":")) return false;
    return /^[0-9a-fA-F:]+$/.test(v);
  }

  function isValidIP(ip) {
    return isValidIPv4(ip) || isValidIPv6(ip);
  }

  lookupBtn.addEventListener("click", async () => {
    try {
      if (!requireConsent()) return;
      if (!ensureApiKey()) return;

      const ip = ipInput.value.trim();
      if (!isValidIP(ip)) {
        alert("Ingresa una IP válida (IPv4 o IPv6). Ej: 8.8.8.8");
        return;
      }

      setOutput(`IP ingresada: ${ip}\nConsultando ubicación...`);
      await lookupAndRender(ip);
    } catch (err) {
      setOutput("Error: " + (err?.message || err));
    }
  });

  detectBtn.addEventListener("click", async () => {
    try {
      if (!requireConsent()) return;
      if (!ensureApiKey()) return;

      setOutput("Obteniendo IP pública vía WebRTC...");
      const ip = await getPublicIP();
      await lookupAndRender(ip);
    } catch (err) {
      setOutput(
        "Error detectando IP: " +
          (err?.message || err) +
          "\nTip: algunos VPN/navegadores bloquean WebRTC."
      );
    }
  });

  function getPublicIP() {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pc.createDataChannel("x");

      const timeout = setTimeout(() => {
        try { pc.close(); } catch {}
        reject(new Error("Timeout: no se obtuvo candidate srflx."));
      }, 9000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        const parts = event.candidate.candidate.split(" ");
        const ip = parts[4];
        const type = parts[7];

        if (type === "srflx" && ip) {
          clearTimeout(timeout);
          resolve(ip);
          try { pc.close(); } catch {}
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => {
          clearTimeout(timeout);
          try { pc.close(); } catch {}
          reject(err);
        });
    });
  }

  async function lookupAndRender(ip) {
    setOutput(`IP: ${ip}\nConsultando ubicación completa...`);

    const geo = await getGeoLocation(ip);

    const result = {
      ip: geo.ip || "",
      continent_code: geo.continent_code || "",
      continent_name: geo.continent_name || "",
      country_code2: geo.country_code2 || "",
      country_code3: geo.country_code3 || "",
      country_name: geo.country_name || "",
      country_name_official: geo.country_name_official || "",
      country_capital: geo.country_capital || "",
      state_prov: geo.state_prov || "",
      state_code: geo.state_code || "",
      district: geo.district || "",
      city: geo.city || "",
      zipcode: geo.zipcode || "",
      latitude: geo.latitude || "",
      longitude: geo.longitude || "",
      is_eu: geo.is_eu ?? null,
      country_flag: geo.country_flag || "",
      geoname_id: geo.geoname_id || "",
      country_emoji: geo.country_emoji || "",
      calling_code: geo.calling_code || "",
      country_tld: geo.country_tld || "",
      languages: geo.languages || "",
      isp: geo.isp || "",
      connection_type: geo.connection_type || "",
      organization: geo.organization || "",
      currency: {
        code: geo.currency?.code || "",
        name: geo.currency?.name || "",
        symbol: geo.currency?.symbol || "",
      },
      time_zone: {
        name: geo.time_zone?.name || "",
        offset: geo.time_zone?.offset ?? null,
        offset_with_dst: geo.time_zone?.offset_with_dst ?? null,
        current_time: geo.time_zone?.current_time || "",
        current_time_unix: geo.time_zone?.current_time_unix ?? null,
        current_tz_abbreviation: geo.time_zone?.current_tz_abbreviation || "",
        current_tz_full_name: geo.time_zone?.current_tz_full_name || "",
        standard_tz_abbreviation: geo.time_zone?.standard_tz_abbreviation || "",
        standard_tz_full_name: geo.time_zone?.standard_tz_full_name || "",
        is_dst: geo.time_zone?.is_dst ?? null,
        dst_savings: geo.time_zone?.dst_savings ?? null,
        dst_exists: geo.time_zone?.dst_exists ?? null,
        dst_tz_abbreviation: geo.time_zone?.dst_tz_abbreviation || "",
        dst_tz_full_name: geo.time_zone?.dst_tz_full_name || "",
        dst_start: geo.time_zone?.dst_start || "",
        dst_end: geo.time_zone?.dst_end || "",
      },
    };

    setOutput(JSON.stringify(result, null, 2));
  }

  async function getGeoLocation(ip) {
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${encodeURIComponent(
      apiKey
    )}&ip=${encodeURIComponent(ip)}`;

    const response = await fetch(url);

    if (!response.ok) {
      let detail = "";
      try {
        const j = await response.json();
        if (j?.message) detail = ` - ${j.message}`;
      } catch {}
      throw new Error(`API error ${response.status}${detail}`);
    }

    return await response.json();
  }
});