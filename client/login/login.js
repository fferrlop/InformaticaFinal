let mode = 'login';

document.getElementById('register-btn').addEventListener('click', () => {
    mode = 'register';
    document.getElementById('form-title').textContent = 'Crear usuario';
    document.getElementById('extra-fields').style.display = 'block';
    document.getElementById('confirm-password').style.display = 'block';
    document.getElementById('submit-btn').textContent = 'Continuar';
});

document.getElementById('login-btn').addEventListener('click', () => {
    mode = 'login';
    document.getElementById('form-title').textContent = 'Iniciar sesión';
    document.getElementById('extra-fields').style.display = 'none';
    document.getElementById('confirm-password').style.display = 'none';
    document.getElementById('submit-btn').textContent = 'Continuar';
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const nombre = document.getElementById('nombre')?.value.trim();
    const apellido = document.getElementById('apellido')?.value.trim();

    if (mode === 'register') {
        if (password !== confirmPassword) {
            document.getElementById('message').textContent = "Las contraseñas no coinciden.";
            return;
        }
    }

    const response = await fetch(`/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nombre, apellido }),
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = `/${data.role}/${data.role}.html`;
    } else {
        document.getElementById('message').textContent = data.message;
    }


});
