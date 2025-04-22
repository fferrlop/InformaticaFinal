const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para leer JSON del body
app.use(express.json());

// Rutas estáticas para cada vista según el rol
app.use('/login', express.static(path.join(__dirname, 'client/login')));
app.use('/usuario', express.static(path.join(__dirname, 'client/usuario')));
app.use('/tecnico', express.static(path.join(__dirname, 'client/tecnico')));
app.use('/admin', express.static(path.join(__dirname, 'client/admin')));


// Ruta del archivo que simula la base de datos
const USERS_FILE = path.join(__dirname, 'data/users.json');

// Función para leer usuarios
function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

// Función para guardar usuarios
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Ruta para iniciar sesión
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

// Ruta para registrar un nuevo usuario
app.post('/register', (req, res) => {
    const { username, password, nombre, apellido } = req.body;
    const users = getUsers();

    // Validar que no exista el mismo usuario
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'Nombre de usuario ya existe.' });
    }

    // Impedir creación de usuarios con nombres sospechosos
    if (username.toLowerCase().includes('admin') || username.toLowerCase().includes('tecnico')) {
        return res.json({ success: false, message: 'No tienes permisos para crear ese tipo de usuario.' });
    }

    // Crear usuario con rol por defecto
    const role = 'usuario';
    users.push({ username, password, nombre, apellido, role });
    saveUsers(users);
    res.json({ success: true, role });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en: http://localhost:${PORT}/login/login.html`);
});
