# 🛠️ 02_Firmware: Desarrollo y Despliegue COVIDAPP

Este directorio es ahora el núcleo técnico del sistema **COVIDAPP**, consolidando tanto el desarrollo como las configuraciones de despliegue en una estructura unificada.

## 🏗️ Estructura del Software

El sistema está organizado como un monorepo que integra todos los componentes necesarios:

*   **[covidapp-completo/](./covidapp-completo):** El corazón del proyecto. Un monorepo gestionado con **pnpm** que contiene:
    *   **Backend:** Servidor API en `artifacts/api-server`.
    *   **Frontend:** Aplicación React en `artifacts/covidapp`.
    *   **Shared Libs:** Lógica compartida, esquemas de base de datos (Drizzle) y validaciones en `lib/`.
*   **[covidapp-proyecto/](./covidapp-proyecto):** Configuraciones adicionales y recursos específicos para el entorno de ejecución y despliegue.

## 🚀 Tecnologías Principales

*   **Lenguaje:** TypeScript.
*   **Frontend:** React, Vite, Tailwind CSS.
*   **Backend:** Node.js, Express.
*   **Base de Datos:** PostgreSQL (Drizzle ORM).
*   **Gestión de Monorepo:** pnpm Workspaces.

## 🛠️ Instrucciones de Inicio Rápido

Para trabajar en el proyecto completo:

1.  Navegue a `covidapp-completo/`.
2.  Instale dependencias: `pnpm install`.
3.  Inicie el entorno de desarrollo: `pnpm dev`.

---
*Consolidación técnica para la eficiencia institucional de Covida.*
