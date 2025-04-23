window.onload = () => {
    const defaultCoords = [40.4168, -3.7038];
    const defaultZoom = 13;
    const apiKey = 'bb1e821a-d37a-4ad9-8e67-d407113bd22a';

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                    const tipo = cargador.Connections?.[0]?.ConnectionType?.Title || 'No especificado';
                    const estado = "Libre";

                    L.marker(coords)
                        .addTo(map)
                        .on('click', () => {
                            document.getElementById('modal-title').textContent = title;
                            document.getElementById('modal-address').textContent = address;
                            document.getElementById('modal-info').innerHTML = `
                <strong>Tipo:</strong> ${tipo}<br>
                <strong>Estado:</strong> ${estado}
              `;
                            document.getElementById('reservaModal').style.display = 'block';
                        });
                });
            })
            .catch(err => {
                console.error("Error al cargar cargadores:", err);
            });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userCoords = [latitude, longitude];

                map.setView(userCoords, 14);

                L.marker(userCoords)
                    .addTo(map)
                    .bindPopup("Estás aquí 🔍")
                    .openPopup();

                cargarCargadores(latitude, longitude);
            },
            () => {
                console.warn("Ubicación denegada, usando Madrid por defecto.");
                cargarCargadores(defaultCoords[0], defaultCoords[1]);
            }
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
        window.location.href = '/login/login.html';
    });
};
