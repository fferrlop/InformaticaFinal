function openModal(id) {
    document.getElementById(id).style.display = 'block';
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.close').forEach(span => {
    span.addEventListener('click', () => {
        const id = span.getAttribute('data-close');
        closeModal(id);
    });
});

window.onclick = function (e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
};

document.getElementById('open-register-modal').onclick = () => openModal('register-modal');
document.getElementById('open-tecnico-modal').onclick = () => openModal('tecnico-modal');
document.getElementById('open-admin-modal').onclick = () => openModal('admin-modal');

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.role === 'usuario') {
        window.location.href = `/usuario/usuario.html`;
    } else {
        document.getElementById('message').textContent = 'Credenciales incorrectas o no eres usuario.';
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value.trim();
    const apellido = document.getElementById('reg-apellido').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirm = document.getElementById('reg-confirm-password').value.trim();

    if (password !== confirm) {
        document.getElementById('register-message').textContent = 'Las contraseñas no coinciden.';
        return;
    }

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, username, password })
    });

    const data = await res.json();
    document.getElementById('register-message').textContent = data.message;

    if (data.success) {
        setTimeout(() => closeModal('register-modal'), 1500);
    }
});

document.getElementById('tecnico-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('tec-username').value.trim();
    const password = document.getElementById('tec-password').value.trim();

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.role === 'tecnico') {
        window.location.href = `/tecnico/tecnico.html`;
    } else {
        document.getElementById('tec-message').textContent = 'No eres técnico o credenciales incorrectas.';
    }
});

document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.role === 'admin') {
        window.location.href = `/admin/admin.html`;
    } else {
        document.getElementById('admin-message').textContent = 'No eres admin o credenciales incorrectas.';
    }
});