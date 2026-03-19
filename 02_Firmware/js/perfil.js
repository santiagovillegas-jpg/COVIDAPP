const usuarioActivo = localStorage.getItem("usuarioActivo");
const rolActivo = localStorage.getItem("rolActivo");
const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
const indexUsuario = usuarios.findIndex(u => u.usuario === usuarioActivo);

const usuarioPerfil = document.getElementById("usuarioPerfil");
const correoPerfil = document.getElementById("correoPerfil");
const listaHistorial = document.getElementById("listaHistorial");
const listaTareas = document.getElementById("listaTareas");
const rolInfo = document.getElementById("rolInfo");

rolInfo.textContent = "Rol actual: " + rolActivo.toUpperCase();

// Mostrar datos del usuario activo
if (usuarioActivo && indexUsuario !== -1) {
  usuarioPerfil.value = usuarioActivo;
  if (usuarios[indexUsuario].correo) correoPerfil.value = usuarios[indexUsuario].correo;
  if (usuarios[indexUsuario].historial) usuarios[indexUsuario].historial.forEach((nota, i) => agregarNotaUI(nota, i));
  if (usuarios[indexUsuario].tareas) usuarios[indexUsuario].tareas.forEach((tarea, i) => agregarTareaUI(tarea, i));
}

// Guardar cambios perfil
document.getElementById("perfilForm").addEventListener("submit", e => {
  e.preventDefault();
  const nuevaContrasena = document.getElementById("contrasenaPerfil").value;
  const confirmar = document.getElementById("confirmarPerfil").value;
  const nuevoCorreo = correoPerfil.value;

  if (nuevaContrasena && nuevaContrasena !== confirmar) {
    mostrarMensaje("Las contraseñas no coinciden.", "danger");
    return;
  }

  if (nuevoCorreo) usuarios[indexUsuario].correo = nuevoCorreo;
  if (nuevaContrasena) usuarios[indexUsuario].contrasena = nuevaContrasena;
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  mostrarMensaje("Cambios guardados correctamente.", "success");
});

// Historial
document.getElementById("historialForm").addEventListener("submit", e => {
  e.preventDefault();
  const nota = document.getElementById("notaHistorial").value.trim();
  if (!nota) return;
  if (!usuarios[indexUsuario].historial) usuarios[indexUsuario].historial = [];
  usuarios[indexUsuario].historial.push(nota);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  agregarNotaUI(nota, usuarios[indexUsuario].historial.length - 1);
  document.getElementById("notaHistorial").value = "";
});

function agregarNotaUI(nota, index) {
  const li = document.createElement("li");
  li.className = "list-group-item d-flex justify-content-between align-items-center";
  li.textContent = nota;

  if (rolActivo === "admin") {
    const btnGroup = document.createElement("div");
    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.className = "btn btn-sm btn-warning me-2";
    btnEditar.onclick = () => {
      const nuevaNota = prompt("Editar nota:", nota);
      if (nuevaNota) {
        usuarios[indexUsuario].historial[index] = nuevaNota;
        localStorage.setItem("usuarios", JSON.stringify(usuarios));
        recargarHistorial();
      }
    };
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.className = "btn btn-sm btn-danger";
    btnEliminar.onclick = () => {
      usuarios[indexUsuario].historial.splice(index, 1);
      localStorage.setItem("usuarios", JSON.stringify(usuarios));
      recargarHistorial();
    };
    btnGroup.appendChild(btnEditar);
    btnGroup.appendChild(btnEliminar);
    li.appendChild(btnGroup);
  }
  listaHistorial.appendChild(li);
}

function recargarHistorial() {
  listaHistorial.innerHTML = "";
  usuarios[indexUsuario].historial.forEach((nota, i) => agregarNotaUI(nota, i));
}

// Tareas (solo admin)
if (rolActivo === "admin") {
  document.getElementById("tareasForm").classList.remove("d-none");
  document.getElementById("tareasForm").addEventListener("submit", e => {
    e.preventDefault();
    const tarea = document.getElementById("nuevaTarea").value.trim();
    if (!tarea) return;
    if (!usuarios[indexUsuario].tareas) usuarios[indexUsuario].tareas = [];
    usuarios[indexUsuario].tareas.push(tarea);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    agregarTareaUI(tarea, usuarios[indexUsuario].tareas.length - 1);
    document.getElementById("nuevaTarea").value = "";
  });
}

function agregarTareaUI(tarea, index) {
  const li = document.createElement("li");
  li.className = "list-group-item";
  li.textContent = tarea;
  listaTareas.appendChild(li);
}

function mostrarMensaje(texto, tipo) {
  const mensajePerfil = document.getElementById("mensajePerfil");
  mensajePerfil.textContent = texto;
  mensajePerfil.className = `mt-3 text-${tipo} text-center`;
}

// Panel de pacientes para admin
if (rolActivo === "admin") {
  document.getElementById("adminPanel").classList.remove("d-none");
  const listaPacientes = document.getElementById("listaPacientes");

  usuarios.forEach(u => {
    if (u.rol === "paciente") {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.textContent = u.usuario;

      const btnVer = document.createElement("button");
      btnVer.textContent = "Ver perfil";
      btnVer.className = "btn btn-sm btn-primary";
      btnVer.onclick = () => {
        localStorage.setItem("usuarioActivo", u.usuario);
        localStorage.setItem("rolActivo", "admin");
        window.location.href = "perfil.html";
      };

      li.appendChild(btnVer);
      listaPacientes.appendChild(li);
    }
  });
}
