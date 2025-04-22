const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware para leer JSON
app.use(express.json());

// Archivos estáticos
app.use('/login', express.static(path.join(__dirname, 'client/login')));
app.use('/usuario', express.static(path.join(__dirname, 'client/usuario')));
app.use('/tecnico', express.static(path.join(__dirname, 'client/tecnico')));
app.use('/admin', express.static(path.join(__dirname, 'client/admin')));

// Simulación de base de datos
const USERS_FILE = path.join(__dirname, 'data/users.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Login
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

// Registro
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

// INICIO del servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor activo en http://localhost:${PORT}/login/login.html`);
});
