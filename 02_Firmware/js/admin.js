document.getElementById("adminForm").addEventListener("submit", e => {
  e.preventDefault();
  const usuario = document.getElementById("adminUsuario").value.trim();
  const contrasena = document.getElementById("adminContrasena").value;

  if (usuario === "admin" && contrasena === "1234") {
    localStorage.setItem("usuarioActivo", usuario);
    localStorage.setItem("rolActivo", "admin");
    window.location.href = "bienvenida.html";
  } else {
    document.getElementById("mensajeAdmin").textContent = "Credenciales incorrectas.";
  }
});
