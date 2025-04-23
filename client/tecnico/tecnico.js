window.onload = () => {
    const map = L.map('map').setView([40.4168, -3.7038], 13);
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    let cargadorSeleccionado = null;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function obtenerEstadosTecnicos() {
        const res = await fetch('/api/estado-tecnico');
        return await res.json();
    }

    async function cargarCargadores(lat, lon) {
        const estados = await obtenerEstadosTecnicos();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=20&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        data.forEach(cargador => {
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const estado = estados.find(e => e.idCargador === cargador.ID)?.estadoTecnico || 'Activo';

            const marker = L.marker(coords).addTo(map);
            marker.on('click', () => {
                cargadorSeleccionado = cargador;
                document.getElementById('detalle-titulo').textContent = cargador.AddressInfo.Title;
                document.getElementById('detalle-direccion').textContent = cargador.AddressInfo.AddressLine1;
                document.getElementById('estadoNuevo').value = estado;
                document.getElementById('modal').style.display = 'block';
            });
        });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                map.setView([latitude, longitude], 14);
                L.marker([latitude, longitude]).addTo(map).bindPopup("Estás aquí 🔍").openPopup();
                cargarCargadores(latitude, longitude);
            },
            () => cargarCargadores(40.4168, -3.7038)
        );
    } else {
        cargarCargadores(40.4168, -3.7038);
    }

    // Modal
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('modal').style.display = 'none';
    };

    window.onclick = (e) => {
        if (e.target.id === 'modal') {
            document.getElementById('modal').style.display = 'none';
        }
    };

    // Cambiar estado técnico
    document.getElementById('actualizarEstadoBtn').onclick = async () => {
        if (!cargadorSeleccionado) return;
        const nuevoEstado = document.getElementById('estadoNuevo').value;

        await fetch('/api/estado-tecnico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idCargador: cargadorSeleccionado.ID,
                estadoTecnico: nuevoEstado
            })
        });

        alert("Estado actualizado");
        document.getElementById('modal').style.display = 'none';
    };

    // Perfil
    document.getElementById('perfilIcon').addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('perfilMenu');
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('perfilMenu');
        if (!menu.contains(e.target) && e.target.id !== 'perfilIcon') {
            menu.style.display = 'none';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('usuario');
        window.location.href = '/login/login.html';
    });
};
