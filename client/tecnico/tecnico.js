window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    let cargadorSeleccionado = null;

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function cargarCargadores(lat, lon) {
        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&compact=true&verbose=false&key=${apiKey}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                data.forEach(cargador => {
                    const coords = [
                        cargador.AddressInfo.Latitude,
                        cargador.AddressInfo.Longitude
                    ];
                    const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
                    const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';

                    const marker = L.marker(coords).addTo(map)
                        .bindPopup(`<strong>${title}</strong><br>${address}`)
                        .on('click', () => mostrarDetalles(cargador));
                });
            })
            .catch(err => console.error("Error al cargar cargadores:", err));
    }

    function mostrarDetalles(cargador) {
        cargadorSeleccionado = cargador;

        const estadoActual = cargador.estadoManual || cargador.StatusType?.Title || 'Desconocido';

        const detalle = `
      <strong>${cargador.AddressInfo.Title}</strong><br>
      Dirección: ${cargador.AddressInfo.AddressLine1}<br>
      Estado actual: <em id="estadoActual">${estadoActual}</em>
    `;

        document.getElementById("detalle-info").innerHTML = detalle;
        document.getElementById("panel-detalles").style.display = "block";
        document.getElementById("estadoNuevo").value = "activo";

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

    window.actualizarEstado = () => {
        if (!cargadorSeleccionado) return;

        const nuevoEstado = document.getElementById("estadoNuevo").value;
        cargadorSeleccionado.estadoManual = nuevoEstado;

        const estadoActualElem = document.getElementById("estadoActual");
        if (estadoActualElem) estadoActualElem.innerText = nuevoEstado;

        alert(`Estado actualizado a "${nuevoEstado}" para el cargador ${cargadorSeleccionado.ID}`);
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

    // Menú perfil
    const perfilIcon = document.getElementById('perfilIcon');
    const perfilMenu = document.getElementById('perfilMenu');

    perfilIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        perfilMenu.style.display = (perfilMenu.style.display === 'block') ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!perfilMenu.contains(e.target) && e.target !== perfilIcon) {
            perfilMenu.style.display = 'none';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('usuarioActivo');
        window.location.href = '/login/login.html';
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
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
