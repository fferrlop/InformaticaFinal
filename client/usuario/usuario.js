window.onload = () => {
    // Coordenadas del centro de Madrid
    const centroMadrid = [40.4168, -3.7038];

    const map = L.map('map').setView(centroMadrid, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
};
