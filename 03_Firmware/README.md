🔑 index.html (Login con roles)

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>COVIDAPP - Login</title>
  <link href="css/estilos.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container text-center">
  <h1 class="text-success my-4">COVIDAPP</h1>
  <div class="login-box">
    <form id="loginForm">
      <input type="text" id="usuario" class="form-control mb-3" placeholder="Usuario" required>
      <input type="password" id="contrasena" class="form-control mb-3" placeholder="Contraseña" required>
      <select id="rol" class="form-select mb-3" required>
        <option value="paciente">Paciente</option>
        <option value="admin">Administrador</option>
      </select>
      <button type="submit" class="btn btn-success w-100">Ingresar</button>
    </form>
    <div id="mensaje" class="text-danger mt-3"></div>
    <a href="registro.html" class="small d-block mt-2">¿No tienes cuenta? Regístrate</a>
  </div>
</div>
<script src="js/login.js"></script>
</body>
</html>


🔑 registro.html (Registro con barra de fuerza)

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Registro COVIDAPP</title>
  <link href="css/estilos.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container text-center">
  <h1 class="text-success my-4">Registro de Usuario</h1>
  <div class="registro-box">
    <form id="registroForm">
      <input type="text" id="nuevoUsuario" class="form-control mb-3" placeholder="Nuevo usuario" required>
      <input type="password" id="nuevaContrasena" class="form-control mb-3" placeholder="Contraseña" required>
      <div class="progress mb-3"><div id="barraFuerza" class="progress-bar"></div></div>
      <input type="password" id="confirmarContrasena" class="form-control mb-3" placeholder="Confirmar contraseña" required>
      <button type="submit" class="btn btn-primary w-100">Registrar</button>
    </form>
    <div id="mensajeRegistro" class="mt-3"></div>
    <a href="index.html" class="d-block mt-3">Volver al inicio</a>
  </div>
</div>
<script src="js/registro.js"></script>
</body>
</html>


bienvenida.html (Bienvenida personalizada)

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bienvenido</title>
  <link href="css/estilos.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light text-center">
<nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom border-dark">
  <div class="container-fluid">
    <a class="navbar-brand fw-bold text-success" href="#">COVIDAPP</a>
  </div>
</nav>
<div class="p-5">
  <h1 class="text-success">¡Bienvenido a COVIDAPP!</h1>
  <p id="mensajeUsuario" class="mt-3 fs-5"></p>
  <button id="cerrarSesion" class="btn btn-outline-secondary mt-3">Cerrar sesión</button>
</div>
<script src="js/comun.js"></script>
<script>
  const usuarioActivo = localStorage.getItem("usuarioActivo");
  const rolActivo = localStorage.getItem("rolActivo");
  document.getElementById("mensajeUsuario").textContent =
    usuarioActivo ? `Has iniciado sesión como: ${usuarioActivo} (${rolActivo})` : "Sesión activa.";
  document.getElementById("cerrarSesion").addEventListener("click", () => {
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("rolActivo");
    window.location.href = "index.html";
  });
</script>
</body>
</html>


perfil.html (Perfil con historial y tareas)

<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Perfil de Usuario</title>
  <link href="css/estilos.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="perfil-box">
  <h2 class="text-success text-center mb-4">Perfil de Usuario</h2>
  <p id="rolInfo" class="text-center fw-bold"></p>
  <form id="perfilForm">
    <input type="text" id="usuarioPerfil" class="form-control mb-3" readonly>
    <input type="email" id="correoPerfil" class="form-control mb-3" placeholder="Correo">
    <input type="password" id="contrasenaPerfil" class="form-control mb-3" placeholder="Nueva contraseña">
    <input type="password" id="confirmarPerfil" class="form-control mb-3" placeholder="Confirmar contraseña">
    <button type="submit" class="btn btn-success w-100 mb-3">Guardar cambios</button>
  </form>
  <h4 class="text-primary">Historial médico</h4>
  <form id="historialForm" class="mb-3">
    <textarea id="notaHistorial" class="form-control" placeholder="Añadir nota..." required></textarea>
    <button type="submit" class="btn btn-outline-success mt-2">Agregar nota</button>
  </form>
  <ul id="listaHistorial" class="list-group mb-3"></ul>
  <h4 class="text-danger">Alertas de tareas</h4>
  <form id="tareasForm" class="mb-3 d-none">
    <textarea id="nuevaTarea" class="form-control" placeholder="Asignar tarea..." required></textarea>
    <button type="submit" class="btn btn-outline-danger mt-2">Asignar tarea</button>
  </form>
  <ul id="listaTareas" class="list-group"></ul>
  <div id="mensajePerfil" class="mt-3 text-center"></div>
  <a href="bienvenida.html" class="btn btn-outline-secondary mt-3">Volver</a>
</div>
<script src="js/perfil.js"></script>
</body>
</html>


🔑 js/login.js


document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const usuario = document.getElementById("usuario").value.trim();
  const contrasena = document.getElementById("contrasena").value;
  const rol = document.getElementById("rol").value;
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const usuarioValido = usuarios.find(u => u.usuario === usuario && u.contrasena === contrasena);
  if (usuarioValido) {
    localStorage.setItem("usuarioActivo", usuario);
    localStorage.setItem("rolActivo", rol);
    window.location.href = "bienvenida.html";
  } else {
    document.getElementById("mensaje").textContent = "Usuario o contraseña incorrectos.";
  }
});


🔑 js/registro.js

const contrasenaInput = document.getElementById("nuevaContrasena");
const barraFuerza = document.getElementById("barraFuerza");

function calcularFuerza(password) {
  let fuerza = 0;
  if (password.length >= 6) fuerza

  s