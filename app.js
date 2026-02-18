const apiKey = "1d445bc9bd8847cfa1542a32abe0f19c";

const button = document.getElementById("detectBtn");
const consent = document.getElementById("consent");
const output = document.getElementById("output");

button.addEventListener("click", async () => {
    if (!consent.checked) {
        alert("Debes aceptar el consentimiento primero.");
        return;
    }

    output.textContent = "Obteniendo IP pública...";

    try {
        const ip = await getPublicIP();
        output.textContent = `IP detectada: ${ip}\nConsultando ubicación...`;

        const geo = await getGeoLocation(ip);

        output.textContent = `
IP Pública: ${ip}

País: ${geo.country_name}
Estado: ${geo.state_prov}
Ciudad: ${geo.city}
Distrito: ${geo.district}

Latitud: ${geo.latitude}
Longitud: ${geo.longitude}
        `;
    } catch (error) {
        output.textContent = "Error: " + error.message;
    }
});


function getPublicIP() {
    return new Promise((resolve, reject) => {

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        pc.createDataChannel("");

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;

            const candidate = event.candidate.candidate;
            const parts = candidate.split(" ");

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


async function getGeoLocation(ip) {
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Error consultando la API");
    }

    return await response.json();
}
