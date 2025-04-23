const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());

// ──────────────── Archivos estáticos ────────────────
app.use('/login', express.static(path.join(__dirname, 'client/login')));
app.use('/usuario', express.static(path.join(__dirname, 'client/usuario')));
app.use('/tecnico', express.static(path.join(__dirname, 'client/tecnico')));
app.use('/admin', express.static(path.join(__dirname, 'client/admin')));

// ──────────────── Archivos y funciones base ────────────────
const USERS_FILE = path.join(__dirname, 'data/users.json');
const ESTADOS_FILE = path.join(__dirname, 'data/estados.json');
const ESTADO_TECNICO_FILE = path.join(__dirname, 'data/estadoTecnico.json');
const LOGS_FILE = path.join(__dirname, 'data/logs.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function leerEstados() {
    if (!fs.existsSync(ESTADOS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ESTADOS_FILE));
}

function guardarEstados(estados) {
    fs.writeFileSync(ESTADOS_FILE, JSON.stringify(estados, null, 2));
}

function leerEstadoTecnico() {
    if (!fs.existsSync(ESTADO_TECNICO_FILE)) return [];
    return JSON.parse(fs.readFileSync(ESTADO_TECNICO_FILE));
}

function guardarEstadoTecnico(estados) {
    fs.writeFileSync(ESTADO_TECNICO_FILE, JSON.stringify(estados, null, 2));
}

function leerLogs() {
    return fs.existsSync(LOGS_FILE) ? JSON.parse(fs.readFileSync(LOGS_FILE)) : [];
}

function agregarLog(evento) {
    const logs = leerLogs();
    logs.push({ fecha: new Date().toISOString(), evento });
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// ──────────────── Autenticación ────────────────
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, role: user.role });
    } else {
        res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }
});

app.post('/register', (req, res) => {
    const { username, password, nombre, apellido } = req.body;
    const users = getUsers();

    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'Nombre de usuario ya existe.' });
    }

    if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('tecnico')) {
        return res.json({ success: false, message: 'No puedes crear ese tipo de usuario.' });
    }

    users.push({ username, password, nombre, apellido, role: 'usuario' });
    saveUsers(users);
    agregarLog(`Nuevo usuario registrado: ${username}`);
    res.json({ success: true, role: 'usuario' });
});

// ──────────────── Reservas ────────────────
function parseDateTime(fecha, hora) {
    return new Date(`${fecha}T${hora}`);
}

app.post('/api/reservar', (req, res) => {
    const { idCargador, usuario, fecha, hora, minutos } = req.body;

    if (!idCargador || !usuario || !fecha || !hora || !minutos) {
        return res.json({ success: false, message: "Todos los campos son obligatorios." });
    }

    const duracion = parseInt(minutos);
    if (isNaN(duracion) || duracion <= 0 || duracion > 240) {
        return res.json({ success: false, message: "La duración debe estar entre 1 y 240 minutos." });
    }

    const nuevaInicio = parseDateTime(fecha, hora);
    const ahora = new Date();

    if (nuevaInicio <= ahora) {
        return res.json({ success: false, message: "No puedes reservar en el pasado." });
    }

    const nuevaFin = new Date(nuevaInicio.getTime() + duracion * 60000);

    const estados = leerEstados().filter(e =>
        e.idCargador && e.usuario && e.fecha && e.hora && e.minutos
    );

    const conflicto = estados.some(e => {
        const existenteInicio = parseDateTime(e.fecha, e.hora);
        const existenteFin = new Date(existenteInicio.getTime() + e.minutos * 60000);
        return (nuevaInicio < existenteFin && nuevaFin > existenteInicio && e.idCargador === idCargador);
    });

    if (conflicto) {
        return res.json({ success: false, message: "Este cargador ya está reservado en ese horario." });
    }

    estados.push({ idCargador, estado: "Ocupado", usuario, fecha, hora, minutos: duracion });
    guardarEstados(estados);
    agregarLog(`Reserva realizada por ${usuario} en cargador ${idCargador}`);
    res.json({ success: true, message: "Reserva realizada correctamente." });
});

app.post('/api/cancelar', (req, res) => {
    const { idCargador, usuario } = req.body;
    let estados = leerEstados();

    const antes = estados.length;
    estados = estados.filter(e => !(e.idCargador === idCargador && e.usuario === usuario));
    const despues = estados.length;

    if (antes === despues) {
        return res.json({ success: false, message: "No tienes reserva activa en este cargador." });
    }

    guardarEstados(estados);
    agregarLog(`Reserva cancelada por ${usuario} en cargador ${idCargador}`);
    res.json({ success: true, message: "Reserva cancelada correctamente." });
});

app.get('/api/estados', (req, res) => {
    res.json(leerEstados());
});

// ──────────────── Estado Técnico ────────────────
app.get('/api/estado-tecnico', (req, res) => {
    res.json(leerEstadoTecnico());
});

app.post('/api/estado-tecnico', (req, res) => {
    const { idCargador, estadoTecnico } = req.body;
    let estados = leerEstadoTecnico();

    if (estadoTecnico === 'Activo') {
        estados = estados.filter(e => e.idCargador !== idCargador);
    } else {
        const index = estados.findIndex(e => e.idCargador === idCargador);
        if (index !== -1) {
            estados[index].estadoTecnico = estadoTecnico;
        } else {
            estados.push({ idCargador, estadoTecnico });
        }
    }

    guardarEstadoTecnico(estados);
    agregarLog(`Estado técnico de ${idCargador} actualizado a ${estadoTecnico}`);
    res.json({ success: true });
});

// ──────────────── Gestión de Usuarios (Admin) ────────────────
app.get('/api/users', (req, res) => {
    const users = getUsers().filter(u => u.role === 'usuario').map(({ password, ...rest }) => rest);
    res.json(users);
});


app.delete('/api/users/:username', (req, res) => {
    const username = req.params.username;
    let users = getUsers();

    if (!users.find(u => u.username === username)) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    users = users.filter(u => u.username !== username);
    saveUsers(users);
    agregarLog(`Usuario eliminado: ${username}`);
    res.json({ success: true });
});

app.put('/api/users/:username', (req, res) => {
    const username = req.params.username;
    const { nombre, apellido } = req.body;
    let users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    users[userIndex].nombre = nombre || users[userIndex].nombre;
    users[userIndex].apellido = apellido || users[userIndex].apellido;

    saveUsers(users);
    agregarLog(`Usuario editado: ${username}`);
    res.json({ success: true });
});

// ──────────────── Logs ────────────────
app.get('/api/logs', (req, res) => {
    res.json(leerLogs());
});

// ──────────────── Incidencias ────────────────
app.get('/api/incidencia', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'incidencias.json');

    if (!fs.existsSync(filePath)) {
        return res.json([]);
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error al leer las incidencias' });
        }

        try {
            const incidencias = JSON.parse(data);
            res.json(incidencias);
        } catch (e) {
            res.status(500).json({ message: 'Incidencias corruptas o mal formateadas' });
        }
    });
});


// ──────────────── Iniciar servidor ────────────────
app.listen(PORT, () => {
    console.log(`✅ Servidor activo en http://localhost:${PORT}/login/login.html`);
});
