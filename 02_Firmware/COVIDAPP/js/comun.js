function mostrarMensajeGlobal(idElemento, texto, tipo="danger") {
  const elemento = document.getElementById(idElemento);
  elemento.textContent = texto;
  elemento.className = `mt-3 text-${tipo}`;
}
