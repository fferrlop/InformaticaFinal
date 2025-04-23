window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    let cargadorSeleccionado = null;
    let estados = [];
    let estadosTecnicos = [];

    const map = L.map('map').setView(defaultCoords, defaultZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerDatosEstado() {
        const res1 = await fetch('/api/estados');
        estados = await res1.json();
        const res2 = await fetch('/api/estado-tecnico');
        estadosTecnicos = await res2.json();
    }

    function obtenerEstadoOcupacion(id) {
        return estados.find(e => e.idCargador === id) || null;
    }

    function obtenerEstadoTecnico(id) {
        const e = estadosTecnicos.find(e => e.idCargador === id);
        return e?.estadoTecnico || 'Activo';
    }

    async function cargarCargadores(lat, lon) {
        await obtenerDatosEstado();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&compact=true&verbose=false&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(cargador => {
            const coords = [
                cargador.AddressInfo.Latitude,
                cargador.AddressInfo.Longitude
            ];
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';

            L.marker(coords)
                .addTo(map)
                .on('click', () => mostrarDetalles(cargador));
        });
    }

    function mostrarDetalles(cargador) {
        cargadorSeleccionado = cargador;

        const estadoOcupacion = obtenerEstadoOcupacion(cargador.ID);
        const estadoTecnico = obtenerEstadoTecnico(cargador.ID);
        const ocupado = estadoOcupacion ? 'Ocupado' : 'Libre';
        const reservadoPor = estadoOcupacion?.usuario || 'Nadie';

        document.getElementById("detalle-info").innerHTML = `
            <strong>${cargador.AddressInfo.Title}</strong><br>
            Dirección: ${cargador.AddressInfo.AddressLine1}<br><br>
            <strong>Estado:</strong> ${ocupado}<br>
            <strong>Reservado por:</strong> ${estadoOcupacion ? reservadoPor : '—'}<br>
            <strong>Estado técnico:</strong> ${estadoTecnico}
        `;

        document.getElementById("estadoNuevo").value = estadoTecnico.toLowerCase().replace(/\s/g, "_");
        document.getElementById("panel-detalles").style.display = "block";
        cargarHistorial(cargador.ID);
    }

    function cargarHistorial(id) {
        const historialSimulado = [
            { fecha: "2024-12-02", descripcion: "Cambio de fusibles." },
            { fecha: "2025-01-20", descripcion: "Revisión general." }
        ];

        const lista = document.getElementById("historial");
        lista.innerHTML = "";
        historialSimulado.forEach(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.fecha}: ${entry.descripcion}`;
            lista.appendChild(li);
        });
    }

    window.actualizarEstado = async () => {
        if (!cargadorSeleccionado) return;

        const nuevoEstado = document.getElementById("estadoNuevo").value;

        const res = await fetch('/api/estado-tecnico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCargador: cargadorSeleccionado.ID, estadoTecnico: nuevoEstado })
        });

        const data = await res.json();
        alert(data.message || "Estado actualizado correctamente.");
        document.getElementById("panel-detalles").style.display = "none";
        location.reload();
    };

    window.reportarIncidencia = () => {
        if (!cargadorSeleccionado) return;

        const descripcion = document.getElementById("reporte").value.trim();
        if (!descripcion) {
            alert("Por favor describe la incidencia.");
            return;
        }

        alert(`Incidencia reportada para cargador ${cargadorSeleccionado.ID}:\n${descripcion}`);
        document.getElementById("reporte").value = "";
    };

    // Perfil
    const perfilIcon = document.getElementById("perfilIcon");
    const perfilMenu = document.getElementById("perfilMenu");
    perfilIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        perfilMenu.style.display = perfilMenu.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", (e) => {
        if (!perfilMenu.contains(e.target) && e.target !== perfilIcon) {
            perfilMenu.style.display = "none";
        }
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
        window.location.href = "/login/login.html";
    });

    // Geolocalización
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], 14);
                L.marker([latitude, longitude]).addTo(map).bindPopup("Estás aquí 🔍").openPopup();
                cargarCargadores(latitude, longitude);
            },
            () => cargarCargadores(defaultCoords[0], defaultCoords[1])
        );
    } else {
        cargarCargadores(defaultCoords[0], defaultCoords[1]);
    }
};
