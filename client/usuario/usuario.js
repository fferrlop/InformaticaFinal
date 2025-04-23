window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const usuario = localStorage.getItem('usuario') || 'anonimo';
    let cargadorSeleccionadoId = null;
    let estadosCargadores = [];

    const map = L.map('map').setView(defaultCoords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerEstados() {
        const res = await fetch('/api/estados');
        estadosCargadores = await res.json();
    }

    function obtenerEstadoCargador(id) {
        const estadoObj = estadosCargadores.find(e => e.idCargador === id);
        return estadoObj || { estado: 'Libre', usuario: null };
    }

    async function cargarCargadores(lat, lon) {
        await obtenerEstados();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(cargador => {
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const id = cargador.ID;
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';
            const estadoData = obtenerEstadoCargador(id);

            const marker = L.marker(coords).addTo(map);
            marker.on('click', () => {
                cargadorSeleccionadoId = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Tipo:</strong> ${tipo}<br>
                    <strong>Estado:</strong> ${estadoData.estado}
                `;

                const btn = document.getElementById('reservarBtn');
                if (estadoData.estado === 'Libre') {
                    btn.textContent = 'Reservar cargador';
                    btn.style.display = 'block';
                } else if (estadoData.estado === 'Ocupado' && estadoData.usuario === usuario) {
                    btn.textContent = 'Cancelar reserva';
                    btn.style.display = 'block';
                } else {
                    btn.style.display = 'none';
                }

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

    function iniciarMapa() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const { latitude, longitude } = pos.coords;
                    map.setView([latitude, longitude], 14);
                    L.marker([latitude, longitude]).addTo(map).bindPopup("Estás aquí 🔍").openPopup();
                    cargarCargadores(latitude, longitude);
                },
                () => {
                    cargarCargadores(defaultCoords[0], defaultCoords[1]);
                }
            );
        } else {
            cargarCargadores(defaultCoords[0], defaultCoords[1]);
        }
    }

    document.getElementById('reservarBtn').onclick = async () => {
        const estado = obtenerEstadoCargador(cargadorSeleccionadoId);
        const esCancelacion = estado.estado === 'Ocupado' && estado.usuario === usuario;
        const ruta = esCancelacion ? '/api/cancelar' : '/api/reservar';

        const res = await fetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCargador: cargadorSeleccionadoId, usuario })
        });

        const data = await res.json();
        alert(data.message || (esCancelacion ? 'Reserva cancelada' : 'Reserva realizada'));
        document.getElementById('reservaModal').style.display = 'none';
        map.eachLayer(layer => {
            if (layer instanceof L.Marker && !layer._popup) map.removeLayer(layer);
        });
        cargarCargadores(map.getCenter().lat, map.getCenter().lng);
    };

    document.getElementById('closeModal').onclick = () => {
        document.getElementById('reservaModal').style.display = 'none';
    };
    window.onclick = e => {
        if (e.target.id === 'reservaModal') {
            document.getElementById('reservaModal').style.display = 'none';
        }
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

    iniciarMapa();
};
