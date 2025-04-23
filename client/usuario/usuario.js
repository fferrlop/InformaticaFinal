window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const usuario = localStorage.getItem('usuario');
    let cargadorSeleccionadoId = null;
    let estados = [];

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerEstados() {
        const res = await fetch('/api/estados');
        estados = await res.json();
    }

    function getEstadoCargador(id) {
        const estado = estados.find(e => e.idCargador === id);
        return {
            tecnico: estado?.estadoTecnico || 'Activo',
            uso: estado?.estado === 'Ocupado' ? 'Ocupado' : 'Libre',
            reservadoPor: estado?.usuario || null
        };
    }

    async function cargarCargadores(lat, lon) {
        await obtenerEstados();
        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&compact=true&verbose=false&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(cargador => {
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const id = cargador.ID;
            const info = getEstadoCargador(id);
            const title = cargador.AddressInfo.Title || 'Cargador';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';

            const marker = L.marker(coords).addTo(map);
            marker.on('click', () => {
                cargadorSeleccionadoId = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Tipo:</strong> ${tipo}<br>
                    <strong>Estado:</strong> ${info.uso}<br>
                    <strong>Técnico:</strong> ${info.tecnico}
                `;

                const btn = document.getElementById('reservarBtn');

                if (info.tecnico !== 'Activo') {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'block';
                    btn.textContent = (info.uso === 'Ocupado' && info.reservadoPor === usuario)
                        ? 'Cancelar reserva'
                        : (info.uso === 'Libre' ? 'Reservar cargador' : 'No disponible');
                }

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 14);
                L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map).bindPopup("Estás aquí 🔍").openPopup();
                cargarCargadores(pos.coords.latitude, pos.coords.longitude);
            },
            () => cargarCargadores(defaultCoords[0], defaultCoords[1])
        );
    } else {
        cargarCargadores(defaultCoords[0], defaultCoords[1]);
    }

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

        const estado = getEstadoCargador(cargadorSeleccionadoId);
        const endpoint = (estado.uso === 'Ocupado' && estado.reservadoPor === usuario)
            ? '/api/cancelar'
            : '/api/reservar';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCargador: cargadorSeleccionadoId, usuario })
        });

        const data = await response.json();
        alert(data.message || 'Acción completada.');
        document.getElementById('reservaModal').style.display = 'none';
        location.reload();
    };

    document.getElementById('perfilIcon')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('perfilMenu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('perfilMenu');
        const icon = document.getElementById('perfilIcon');
        if (!menu.contains(e.target) && e.target !== icon) {
            menu.style.display = 'none';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('usuario');
        window.location.href = '/login/login.html';
    });
};
