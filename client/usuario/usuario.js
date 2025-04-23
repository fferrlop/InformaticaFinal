window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';
    const usuario = localStorage.getItem('usuario');
    let cargadorSeleccionadoId = null;
    let estadosReserva = [];
    let estadosTecnico = [];
    let marcadores = [];

    const filtrosSeleccionados = new Set(["lento", "estandar", "rapido"]);

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    async function cargarDatosEstados() {
        const [res1, res2] = await Promise.all([
            fetch('/api/estados'),
            fetch('/api/estado-tecnico')
        ]);
        estadosReserva = await res1.json();
        estadosTecnico = await res2.json();
    }

    function obtenerEstadoReserva(id) {
        const reservas = estadosReserva.filter(e => e.idCargador === id);
        const ahora = new Date();
        const activa = reservas.find(e => {
            if (!e.fecha || !e.hora || !e.minutos) return false;
            const inicio = new Date(`${e.fecha}T${e.hora}`);
            const fin = new Date(inicio.getTime() + e.minutos * 60000);
            return ahora >= inicio && ahora < fin;
        });

        if (activa) {
            return {
                estado: 'Ocupado',
                usuario: activa.usuario
            };
        }

        return {
            estado: 'Libre',
            usuario: null
        };
    }

    function obtenerEstadoTecnico(id) {
        const estado = estadosTecnico.find(e => e.idCargador === id);
        return estado ? estado.estadoTecnico : 'Activo';
    }

    function clasificarPotencia(kW) {
        if (kW <= 7) return 'lento';
        if (kW <= 22) return 'estandar';
        return 'rapido';
    }

    function mostrarCargadores(data) {
        marcadores.forEach(m => map.removeLayer(m));
        marcadores = [];

        data.forEach(cargador => {
            const coords = [cargador.AddressInfo.Latitude, cargador.AddressInfo.Longitude];
            const id = cargador.ID;
            const title = cargador.AddressInfo.Title || 'Cargador sin nombre';
            const address = cargador.AddressInfo.AddressLine1 || 'Sin dirección';
            const potenciaKW = cargador.Connections?.[0]?.PowerKW || 0;
            const tipo = clasificarPotencia(potenciaKW);
            const estadoR = obtenerEstadoReserva(id);
            const estadoT = obtenerEstadoTecnico(id);

            if (!filtrosSeleccionados.has(tipo)) return;

            const marker = L.marker(coords).addTo(map);
            marcadores.push(marker);

            marker.on('click', () => {
                cargadorSeleccionadoId = id;

                document.getElementById('modal-title').textContent = title;
                document.getElementById('modal-address').textContent = address;
                document.getElementById('modal-info').innerHTML = `
                    <strong>Potencia:</strong> ${potenciaKW} kW (${tipo})<br>
                    <strong>Estado de reserva:</strong> ${estadoR.estado}<br>
                    ${estadoR.estado === "Ocupado" ? `<strong>Reservado por:</strong> ${estadoR.usuario}<br>` : ""}
                    <strong>Estado técnico:</strong> ${estadoT}
                `;

                const boton = document.getElementById('reservarBtn');
                const fecha = document.getElementById('fechaReserva');
                const hora = document.getElementById('horaReserva');
                const minutos = document.getElementById('minutosReserva');

                if (estadoT !== "Activo") {
                    boton.style.display = 'none';
                    fecha.style.display = 'none';
                    hora.style.display = 'none';
                    minutos.style.display = 'none';
                } else {
                    if (estadoR.estado === 'Ocupado' && estadoR.usuario === usuario) {
                        boton.textContent = 'Cancelar reserva';
                        boton.style.display = 'block';
                        fecha.style.display = 'none';
                        hora.style.display = 'none';
                        minutos.style.display = 'none';
                    } else if (estadoR.estado === 'Libre') {
                        boton.textContent = 'Reservar cargador';
                        boton.style.display = 'block';
                        fecha.style.display = 'inline-block';
                        hora.style.display = 'inline-block';
                        minutos.style.display = 'inline-block';
                    } else {
                        boton.style.display = 'none';
                        fecha.style.display = 'none';
                        hora.style.display = 'none';
                        minutos.style.display = 'none';
                    }
                }

                document.getElementById('reservaModal').style.display = 'block';
            });
        });
    }

    async function cargarCargadores(lat, lon) {
        await cargarDatosEstados();

        const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=ES&latitude=${lat}&longitude=${lon}&distance=10&maxresults=50&compact=true&verbose=false&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        mostrarCargadores(data);
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

        const estadoActual = obtenerEstadoReserva(cargadorSeleccionadoId);
        const ruta = (estadoActual.estado === 'Ocupado' && estadoActual.usuario === usuario)
            ? '/api/cancelar'
            : '/api/reservar';

        if (ruta === '/api/reservar') {
            const fecha = document.getElementById('fechaReserva').value;
            const hora = document.getElementById('horaReserva').value;
            const minutos = parseInt(document.getElementById('minutosReserva').value);

            if (!fecha || !hora || !minutos || isNaN(minutos) || minutos <= 0) {
                alert("Rellena correctamente la fecha, hora y duración.");
                return;
            }

            const res = await fetch(ruta, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idCargador: cargadorSeleccionadoId,
                    usuario,
                    fecha,
                    hora,
                    minutos
                })
            });

            const data = await res.json();
            alert(data.message || 'Reserva realizada');
            location.reload();
        } else {
            const res = await fetch(ruta, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idCargador: cargadorSeleccionadoId, usuario })
            });

            const data = await res.json();
            alert(data.message || 'Reserva cancelada');
            location.reload();
        }

        document.getElementById('reservaModal').style.display = 'none';
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

    document.querySelectorAll('input[name="filtro-potencia"]').forEach(input => {
        input.addEventListener('change', () => {
            filtrosSeleccionados.clear();
            document.querySelectorAll('input[name="filtro-potencia"]:checked').forEach(i => {
                filtrosSeleccionados.add(i.value);
            });
            navigator.geolocation.getCurrentPosition(
                (pos) => cargarCargadores(pos.coords.latitude, pos.coords.longitude),
                () => cargarCargadores(defaultCoords[0], defaultCoords[1])
            );
        });
    });
};
