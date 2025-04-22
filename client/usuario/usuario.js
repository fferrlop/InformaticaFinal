window.onload = () => {
    const defaultCoords = [40.4168, -3.7038]; // Madrid centro
    const defaultZoom = 13;

    const map = L.map('map').setView(defaultCoords, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Geolocalización
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userCoords = [latitude, longitude];

                // Centrar el mapa en la ubicación del usuario
                map.setView(userCoords, 15);

                // Añadir marcador
                L.marker(userCoords)
                    .addTo(map)
                    .bindPopup("Estás aquí 🔍")
                    .openPopup();
            },
            (err) => {
                console.warn("No se pudo obtener tu ubicación. Usando Madrid por defecto.");
            }
        );
    } else {
        console.warn("Tu navegador no soporta geolocalización.");
    }
};
