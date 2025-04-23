window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const usuario = localStorage.getItem('usuario');
    let cargadorSeleccionadoId = null;
    let estadosCargadores = [];
    let estadosTecnicos = [];

    const map = L.map('map').setView(defaultCoords, defaultZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerDatos() {
        const resEstados = await fetch('/api/estados');
        estadosCargadores = await resEstados.json();

        const resTecnico = await fetch('/api/estado-tecnico');
        estadosTecnicos = await resTecnico.json();
    }

    function obtenerEstadoCargador(id) {
        const estadoObj = estadosCargadores.find(e => e.idCargador === id);
        if (estadoObj) {
            return { estado: estadoObj.estado, reservadoPorUsuario: estadoObj.usuario };
        }
        return { estado: 'Libre', reservadoPorUsuario: null };
    }

    function obtenerEstadoTecnico(id) {
        const estado = estadosTecnicos.find(e => e.idCargador === id);
        return estado?.estadoTecnico || 'Activo';
    }

    async function cargarCargadores(lat, lon) {
        await obtenerDatos();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&compact=true&verbose=false&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(cargador => {
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const id = cargador.ID;
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';

            const estadoInfo = obtenerEstadoCargador(id);
            const estadoTecnico = obtenerEstadoTecnico(id);

            const marker = L.marker(coords).addTo(map);
            marker.on('click', () => {
                cargadorSeleccionadoId = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Tipo:</strong> ${tipo}<br>
                    <strong>Estado:</strong> ${estadoInfo.estado}<br>
                    <strong>Estado técnico:</strong> ${estadoTecnico}
                `;

                const boton = document.getElementById('reservarBtn');

                if (estadoTecnico !== 'Activo') {
                    boton.style.display = 'none';
                } else {
                    boton.style.display =
                        (estadoInfo.estado === 'Libre') ? 'block' :
                            (estadoInfo.estado === 'Ocupado' && estadoInfo.reservadoPorUsuario === usuario) ? 'block' : 'none';

                    boton.textContent =
                        (estadoInfo.estado === 'Ocupado' && estadoInfo.reservadoPorUsuario === usuario)
                            ? 'Cancelar reserva' : 'Reservar cargador';
                }

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

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
        location.reload();
    };

    document.getElementById('closeModal').onclick = () => {
        document.getElementById('reservaModal').style.display = 'none';
    };
    window.onclick = (e) => {
        if (e.target.id === 'reservaModal') {
            document.getElementById('reservaModal').style.display = 'none';
        }
    };

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
