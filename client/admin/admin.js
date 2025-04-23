window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const map = L.map('map').setView(defaultCoords, defaultZoom);
    let estadosTecnico = [];
    let cargadorSeleccionadoAdmin = null;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function cargarCargadores(lat, lon) {
        estadosTecnico = await fetch('/api/estado-tecnico').then(r => r.json());

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=50&compact=true&verbose=false&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        data.forEach(cargador => {
            const coords = [
                cargador.AddressInfo.Latitude,
                cargador.AddressInfo.Longitude
            ];

            const id = cargador.ID;
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';

            const estado = obtenerEstadoTecnico(id);

            L.marker(coords).addTo(map).on('click', () => {
                cargadorSeleccionadoAdmin = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Tipo:</strong> ${tipo}<br>
                    <strong>Estado técnico:</strong> ${estado}<br><br>
                    <label><strong>Cambiar estado técnico:</strong></label><br>
                    <select id="estadoTecnicoSelect">
                        <option value="Activo">Activo</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Fuera de servicio">Fuera de servicio</option>
                    </select><br><br>
                    <button id="btnActualizarEstado">Actualizar estado</button>
                `;

                document.getElementById("estadoTecnicoSelect").value = estado;
                document.getElementById("btnActualizarEstado").onclick = actualizarEstadoTecnicoAdmin;

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

    function obtenerEstadoTecnico(id) {
        const encontrado = estadosTecnico.find(e => e.idCargador === id);
        return encontrado ? encontrado.estadoTecnico : 'Activo';
    }

    async function actualizarEstadoTecnicoAdmin() {
        if (!cargadorSeleccionadoAdmin) return;
        const nuevoEstado = document.getElementById('estadoTecnicoSelect').value;

        const res = await fetch('/api/estado-tecnico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCargador: cargadorSeleccionadoAdmin, estadoTecnico: nuevoEstado })
        });

        const data = await res.json();
        alert(data.message || 'Estado actualizado correctamente');
        document.getElementById('reservaModal').style.display = 'none';
        location.reload();
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

    // Modal
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('reservaModal').style.display = 'none';
    };
    window.onclick = (e) => {
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
        window.location.href = '/login/login.html';
    });

    // Estadísticas (actualizado)
    Promise.all([
        fetch('/api/estados').then(res => res.json()),
        fetch(`https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=40.4168&longitude=-3.7038&distance=10&maxresults=50&compact=true&verbose=false&key=${apiKey}`)
            .then(res => res.json())
    ])
        .then(([estados, cargadores]) => {
            const totalCargadores = cargadores.length;
            const ocupados = estados.filter(d => d.estado === 'Ocupado').length;
            const libres = totalCargadores - ocupados;

            document.getElementById('estadisticas').innerHTML = `
            <p><strong>Total de cargadores:</strong> ${totalCargadores}</p>
            <p><strong>Ocupados:</strong> ${ocupados}</p>
            <p><strong>Libres:</strong> ${libres}</p>
        `;
        })
        .catch(err => {
            console.error("Error cargando estadísticas:", err);
        });

    // Usuarios
    fetch('/api/users')
        .then(res => res.json())
        .then(users => {
            const contenedor = document.getElementById('gestion-usuarios');
            users.forEach(user => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <strong>${user.username}</strong> - ${user.nombre} ${user.apellido}
                    <button onclick="eliminarUsuario('${user.username}')">Eliminar</button>
                    <button onclick="editarUsuario('${user.username}', '${user.nombre}', '${user.apellido}')">Editar</button>
                `;
                contenedor.appendChild(div);
            });
        });

    // Logs
    fetch('/api/logs')
        .then(res => res.json())
        .then(logs => {
            const contenedor = document.getElementById('logs-auditoria');
            if (logs.length === 0) {
                contenedor.innerHTML = '<p>No hay logs registrados.</p>';
                return;
            }
            logs.reverse().forEach(log => {
                const div = document.createElement('div');
                div.textContent = `[${new Date(log.fecha).toLocaleString()}] ${log.evento}`;
                contenedor.appendChild(div);
            });
        });
};

// Funciones globales
function eliminarUsuario(username) {
    if (!confirm(`¿Eliminar al usuario ${username}?`)) return;
    fetch(`/api/users/${username}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            alert(data.success ? 'Usuario eliminado' : data.message);
            location.reload();
        });
}

function editarUsuario(username, nombreActual, apellidoActual) {
    const nuevoNombre = prompt("Nuevo nombre:", nombreActual);
    const nuevoApellido = prompt("Nuevo apellido:", apellidoActual);
    if (!nuevoNombre || !nuevoApellido) return;

    fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre, apellido: nuevoApellido })
    })
        .then(res => res.json())
        .then(data => {
            alert(data.success ? 'Usuario actualizado' : data.message);
            location.reload();
        });
}
