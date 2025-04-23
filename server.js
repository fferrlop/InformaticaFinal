const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());

// ──────── Archivos estáticos ────────
app.use('/login', express.static(path.join(__dirname, 'client/login')));
app.use('/usuario', express.static(path.join(__dirname, 'client/usuario')));
app.use('/tecnico', express.static(path.join(__dirname, 'client/tecnico')));
app.use('/admin', express.static(path.join(__dirname, 'client/admin')));

// ──────── Autenticación ────────
const USERS_FILE = path.join(__dirname, 'data/users.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

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
    res.json({ success: true, role: 'usuario' });
});

// ──────── Reservas (estados.json) ────────
const ESTADOS_FILE = path.join(__dirname, 'data/estados.json');

function leerEstados() {
    if (!fs.existsSync(ESTADOS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ESTADOS_FILE));
}

function guardarEstados(estados) {
    fs.writeFileSync(ESTADOS_FILE, JSON.stringify(estados, null, 2));
}

app.post('/api/reservar', (req, res) => {
    const { idCargador, usuario } = req.body;
    const estados = leerEstados();

    if (estados.find(e => e.idCargador === idCargador && e.estado === "Ocupado")) {
        return res.json({ success: false, message: "Este cargador ya está reservado." });
    }

    estados.push({ idCargador, estado: "Ocupado", usuario });
    guardarEstados(estados);
    res.json({ success: true });
});

app.post('/api/cancelar', (req, res) => {
    const { idCargador, usuario } = req.body;
    let estados = leerEstados();

    const existe = estados.find(e => e.idCargador === idCargador && e.usuario === usuario && e.estado === "Ocupado");
    if (!existe) {
        return res.json({ success: false, message: "No tienes reserva en este cargador." });
    }

    estados = estados.filter(e => !(e.idCargador === idCargador && e.usuario === usuario));
    guardarEstados(estados);
    res.json({ success: true });
});

app.get('/api/estados', (req, res) => {
    const estados = leerEstados();
    res.json(estados);
});

// ──────── Estado Técnico (estadoTecnico.json) ────────
const ESTADO_TECNICO_FILE = path.join(__dirname, 'data/estadoTecnico.json');

function leerEstadoTecnico() {
    if (!fs.existsSync(ESTADO_TECNICO_FILE)) return [];
    return JSON.parse(fs.readFileSync(ESTADO_TECNICO_FILE));
}

function guardarEstadoTecnico(estados) {
    fs.writeFileSync(ESTADO_TECNICO_FILE, JSON.stringify(estados, null, 2));
}

app.get('/api/estado-tecnico', (req, res) => {
    const estados = leerEstadoTecnico();
    res.json(estados);
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
    res.json({ success: true });
});

// ──────── Arrancar servidor ────────
app.listen(PORT, () => {
    console.log(`✅ Servidor activo en http://localhost:${PORT}/login/login.html`);
});
