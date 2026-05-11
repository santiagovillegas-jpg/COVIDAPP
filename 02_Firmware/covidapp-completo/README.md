# 📦 covidapp-completo: Monorepo Integrado

Este directorio implementa la arquitectura definitiva de **COVIDAPP** utilizando un monorepo con **pnpm workspaces**. Aquí reside toda la lógica de negocio, la interfaz de usuario y la persistencia de datos.

## 🏗️ Estructura Detallada

### 🚀 Aplicaciones (`artifacts/`)
*   **`api-server/`**: Servidor backend robusto desarrollado con Node.js y Express. Gestiona autenticación, citas y notificaciones.
*   **`covidapp/`**: Aplicación frontend moderna construida con React, optimizada para una experiencia de usuario fluida.

### 📚 Librerías Compartidas (`lib/`)
*   **`db/`**: Definiciones de esquema de base de datos con **Drizzle ORM**.
*   **`api-zod/`**: Esquemas de validación compartidos entre frontend y backend para asegurar la integridad de los datos.
*   **`api-client-react/`**: Cliente de API tipado para facilitar el consumo de servicios desde el frontend.

## 🛠️ Comandos de Desarrollo

Desde la raíz de este directorio:

*   `pnpm install`: Instala todas las dependencias.
*   `pnpm run build`: Compila todo el proyecto.
*   `pnpm run dev`: Ejecuta el backend y frontend simultáneamente en modo desarrollo.

## ✅ Ventajas de esta Arquitectura
1.  **Tipado de Extremo a Extremo:** Los cambios en la base de datos se reflejan inmediatamente en los tipos del frontend.
2.  **Mantenimiento Simplificado:** Todas las piezas del sistema se versionan y gestionan juntas.
3.  **Despliegue Atómico:** Asegura que el frontend y el backend siempre estén sincronizados.

---
*La base tecnológica de la gestión de salud en Covida.*
