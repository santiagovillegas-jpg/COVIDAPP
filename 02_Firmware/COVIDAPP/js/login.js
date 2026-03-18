document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const usuario = document.getElementById("usuario").value.trim();
  const contrasena = document.getElementById("contrasena").value;
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const usuarioValido = usuarios.find(u => u.usuario === usuario && u.contrasena === contrasena);
  if (usuarioValido) {
    localStorage.setItem("usuarioActivo", usuario);
    localStorage.setItem("rolActivo", "paciente");
    window.location.href = "bienvenida.html";
  } else {
    document.getElementById("mensaje").textContent = "Usuario o contraseña incorrectos.";
  }
});
