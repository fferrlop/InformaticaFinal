window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const usuario = localStorage.getItem('usuario');  // debe estar seteado en login.js
    let cargadorSeleccionadoId = null;
    let estadosCargadores = [];

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerEstados() {
        try {
            const res = await fetch('/api/estados');
            estadosCargadores = await res.json();
        } catch (error) {
            console.error("Error cargando estados:", error);
        }
    }

    function obtenerEstadoCargador(id) {
        const estadoObj = estadosCargadores.find(e => e.idCargador === id);
        return estadoObj ? { estado: estadoObj.estado, reservadoPorUsuario: estadoObj.usuario } : { estado: 'Libre', reservadoPorUsuario: null };
    }

    async function cargarCargadores(lat, lon) {
        await obtenerEstados();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&compact=true&verbose=false&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(cargador => {
            const id = cargador.ID;
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';

            const estadoInfo = obtenerEstadoCargador(id);

            const marker = L.marker(coords).addTo(map);
            marker.on('click', () => {
                cargadorSeleccionadoId = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Tipo:</strong> ${tipo}<br>
                    <strong>Estado:</strong> ${estadoInfo.estado}
                `;

                const boton = document.getElementById('reservarBtn');
                if (estadoInfo.estado === 'Libre' || (estadoInfo.estado === 'Ocupado' && estadoInfo.reservadoPorUsuario === usuario)) {
                    boton.style.display = 'block';
                    boton.textContent = (estadoInfo.estado === 'Ocupado') ? 'Cancelar reserva' : 'Reservar cargador';
                } else {
                    boton.style.display = 'none';
                }

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

    // Geolocalización
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
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

    // Modal botones
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('reservaModal').style.display = 'none';
    };
    window.onclick = (e) => {
        if (e.target.id === 'reservaModal') {
            document.getElementById('reservaModal').style.display = 'none';
        }
    };

    document.getElementById('reservarBtn').onclick = async () => {
        if (!cargadorSeleccionadoId) return;

        const estadoActual = obtenerEstadoCargador(cargadorSeleccionadoId);
        const ruta = (estadoActual.estado === 'Ocupado' && estadoActual.reservadoPorUsuario === usuario)
            ? '/api/cancelar'
            : '/api/reservar';

        const response = await fetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCargador: cargadorSeleccionadoId, usuario })
        });

        const data = await response.json();
        alert(data.message || (ruta === '/api/cancelar' ? 'Reserva cancelada' : 'Reserva realizada'));

        document.getElementById('reservaModal').style.display = 'none';
        location.reload();  // recargar el mapa
    };

    // Perfil
    const perfilIcon = document.getElementById('perfilIcon');
    const perfilMenu = document.getElementById('perfilMenu');
    perfilIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        perfilMenu.style.display = perfilMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
        if (!perfilMenu.contains(e.target) && e.target !== perfilIcon) {
            perfilMenu.style.display = 'none';
        }
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('usuario');
        window.location.href = '/login/login.html';
    });
};
