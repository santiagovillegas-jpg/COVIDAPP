const form = document.getElementById("registroForm");
const mensaje = document.getElementById("mensajeRegistro");
const contrasenaInput = document.getElementById("nuevaContrasena");
const barraFuerza = document.getElementById("barraFuerza");

function calcularFuerza(password) {
  let fuerza = 0;
  if (password.length >= 6) fuerza += 20;
  if (/[A-Z]/.test(password)) fuerza += 20;
  if (/[0-9]/.test(password)) fuerza += 20;
  if (/[^A-Za-z0-9]/.test(password)) fuerza += 20;
  if (password.length >= 10) fuerza += 20;
  return fuerza;
}

contrasenaInput.addEventListener("input", () => {
  const fuerza = calcularFuerza(contrasenaInput.value);
  barraFuerza.style.width = fuerza + "%";
  if (fuerza < 40) {
    barraFuerza.className = "progress-bar bg-danger";
    barraFuerza.textContent = "Débil";
  } else if (fuerza < 80) {
    barraFuerza.className = "progress-bar bg-warning";
    barraFuerza.textContent = "Media";
  } else {
    barraFuerza.className = "progress-bar bg-success";
    barraFuerza.textContent = "Fuerte";
  }
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const usuario = document.getElementById("nuevoUsuario").value.trim();
  const contrasena = contrasenaInput.value;
  const confirmar = document.getElementById("confirmarContrasena").value;

  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

  if (usuarios.find(u => u.usuario === usuario)) {
    mensaje.textContent = "Este usuario ya está registrado.";
    mensaje.className = "text-danger";
    return;
  }

  if (contrasena !== confirmar) {
    mensaje.textContent = "Las contraseñas no coinciden.";
    mensaje.className = "text-danger";
    return;
  }

  usuarios.push({ usuario, contrasena, rol: "paciente" });
  localStorage.setItem("usuarios", JSON.stringify(usuarios));

  mensaje.innerHTML = "<span class='text-success'>¡Registro exitoso! Redirigiendo...</span>";
  setTimeout(() => window.location.href = "index.html", 2000);
});
