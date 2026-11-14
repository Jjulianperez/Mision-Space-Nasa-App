# OrbitaLab: MDL Edition
**Simulador Interactivo de Ingeniería Concurrente y Operaciones Espaciales**  
*Proyecto desarrollado por **Pacha Team** para el NASA Space Apps Challenge 2026*

---

## 1. El Desafío de la NASA (El Problema)

Diseñar una misión espacial real implica equilibrar demandas que compiten constantemente entre sí: objetivos científicos, arquitectura de la nave, instrumentos, vehículos lanzadores, presupuesto, energía eléctrica, masa, comunicaciones y restricciones orbitales.

Actualmente existe una brecha educativa importante: los estudiantes y aspirantes a ingenieros suelen aprender estos temas por separado (mecánica orbital en una herramienta, diseño de cohetes en otra), sin experimentar cómo funciona una misión como un **sistema integrado de extremo a extremo**. En la práctica, cada decisión dispara un **"efecto dominó"**: agregar un sensor más potente aumenta el valor científico, pero también incrementa la masa total, dispara el consumo eléctrico, satura el ancho de banda de bajada de datos y puede hacer que el cohete elegido ya no alcance la órbita prevista.

**El reto:** Crear un juego interactivo accesible tanto para nivel **Principiante/Juvenil** como **Intermedio** (jugable en solitario o en equipos cooperativos de **1 a 4 participantes**) que permita diseñar, negociar, gestionar y simular una misión espacial completa, aprendiendo tanto de los éxitos como de los fracasos.

---

## 2. Nuestra Solución

**OrbitaLab: MDL Edition** es una aplicación web de simulación táctica y diseño colaborativo que pone a los jugadores al mando de un centro de ingeniería y control de misión de la NASA.

En lugar de centrarse únicamente en el pilotaje arcade, el juego reproduce el ciclo de vida real de una misión espacial: desde la definición de objetivos científicos y el armado modular sobre planos técnicos (*blueprints*), hasta la negociación democrática de recursos en equipo y la resolución de crisis asimétricas en tiempo real durante el vuelo.

### Pilares de la experiencia
* **Interfaz de Consola Aeroespacial:** Diseño visual oscuro de tres paneles con planos técnicos interactivos, barras de telemetría conectadas en tiempo real y visualización orbital esquemática.
* **Dos niveles de profundidad:**
  * **Modo Aprendiz (Principiante/Juvenil):** Incluye un mini-tutorial interactivo, alertas guiadas y recomendaciones de margen de seguridad.
  * **Modo Ingeniero (Intermedio):** Presenta métricas técnicas completas, presupuestos ajustados y mayor probabilidad de anomalías operativas.
* **Progresión de Campaña y Presupuesto:** Los jugadores comienzan con presupuestos acotados en misiones cercanas (Órbita Baja Terrestre) y, al completar objetivos científicos y descargar datos válidos, desbloquean mayor financiamiento para misiones complejas (Órbita Lunar y Espacio Profundo).

---

## 3. Alineación con la Metodología de la NASA

Nuestra arquitectura traduce directamente los estándares y herramientas oficiales de la Dirección de Misiones Científicas (SMD) de la NASA a mecánicas jugables:

| Marco / Herramienta NASA | Aplicación en OrbitaLab |
| :--- | :--- |
| **Los 4 Segmentos de Misión** | Define exactamente los **4 roles cooperativos** del equipo: *Segmento de Usuarios* (Director de Misión), *Segmento de Lanzamiento* (Ing. de Propulsión y Nave), *Segmento Espacial* (Especialista de Ciencia) y *Segmento Terrestre* (Ing. de Comunicaciones). |
| **Proceso de 6 Etapas y CMLS (1--4)** | Estructura el flujo de cada partida: *1. Necesidades y Objetivos -> 2. Concepto (ConOps) -> 3. Requerimientos -> 4. Diseño Modular -> 5. Verificación Pre-Lanzamiento -> 6. Implementación en Vuelo*. |
| **Mission Design Lab (MDL)** | Inspira la **Mesa de Negociación Concurrente**, donde cada especialista propone módulos y el equipo vota su aprobación viendo el impacto inmediato en todo el sistema. |
| **NASA Mission Viz y GMAT** | Inspiran el visor orbital en tiempo real, las ventanas de cobertura terrestre y los cálculos de eficiencia propulsiva ($\Delta v$) y enlace de datos. |
| **Misiones Reales de Referencia** | Los escenarios y el informe final conectan los diseños de los jugadores con misiones reales como **PUNCH**, **Dawn**, **BioNutrients-2** y **Artemis**. |

---

## 4. Ciclo de Juego (Gameplay Loop)

### Fase 1: Mesa de Diseño Blueprint y Votación Democrática
1. **Definición de Misión:** El jugador (o equipo de hasta 4 personas) elige el destino orbital y el objetivo científico principal.
2. **Ensamblaje por Roles:** Cada rol visualiza su catálogo especializado en el panel izquierdo mientras el plano esquemático de la nave y las **6 barras de telemetría** (*Presupuesto, Masa, Energía, Generación de Datos, Bajada de Datos y Riesgo Estructural*) se actualizan en vivo para todos.
3. **Negociación de Prioridades:** Cuando un integrante propone un componente costoso o pesado, se dispara una tarjeta de votación (*Aprobar recurso* vs. *Rechazar margen*) para debatir los sacrificios de ingeniería. En modo solitario, el sistema simula alertas y propuestas de asesores virtuales.
4. **Verificación y Lanzamiento:** El sistema advierte si la nave supera márgenes críticos (por ejemplo, $> 90\%$ de masa máxima), pero **permite lanzar igual** si el equipo decide asumir el riesgo.

### Fase 2: Vuelo Asimétrico en 3 Actos
Una vez iniciado el lanzamiento, la misión se desarrolla en una simulación acelerada dividida en **3 actos** (*Ascenso e Inserción Orbital -> Crisis Crítica al $40\%$ del viaje -> Operación y Descarga/Aterrizaje Final*), aplicando **información asimétrica** entre los roles:

* **Ing. de Comunicaciones (Segmento Terrestre):** Es el **único que ve el mapa orbital real**, la trayectoria, las tormentas solares y las ventanas de conexión con estaciones terrenas. Debe guiar por voz o alertas al resto del equipo.
* **Ing. de Propulsión y Nave (Segmento de Lanzamiento):** **No ve el mapa orbital**, pero monitorea el consumo de combustible, la temperatura y la integridad estructural. Ejecuta maniobras dictadas por Comunicaciones y resuelve **mini-puzzles rápidos de reparación** sobre el plano de la nave.
* **Especialista de Ciencia (Segmento Espacial):** Gestiona el encendido y apagado de los instrumentos para no desbordar la batería y realiza **mini-puzzles de calibración** al pasar sobre el objetivo científico.
* **Director de Misión (Segmento de Usuarios):** Supervisa el cumplimiento de los objetivos científicos y toma decisiones ejecutivas ante crisis (como sacrificar un experimento secundario para salvar la nave).

### Fase 3: Informe de Auditoría Post-Misión
Al finalizar el vuelo (con éxito total, éxito parcial o fallo), el sistema genera un reporte técnico detallado que:
1. Explica la **causa raíz** de cada logro o falla (vinculando las decisiones tomadas en la Fase 1 con lo ocurrido en la Fase 2).
2. **Compara la nave construida por el equipo con una misión histórica real de la NASA**, mostrando cómo resolvieron los ingenieros de la agencia ese mismo desafío.

---

## 5. Arquitectura Técnica y Stack Tecnológico

El sistema sigue una arquitectura **Full-Stack TypeScript con Servidor WebSocket Stateful** para garantizar sincronización en tiempo real, autoridad sobre el reloj de misión y filtrado seguro de información asimétrica por rol:

* **Frontend (`client/`):** React + Vite + TypeScript + Tailwind CSS + Zustand (estado global) + SVG / Canvas 2D interactivo (plano *Blueprint* y visor orbital tipo *Mission Viz*).
* **Backend (`server/`):** Node.js + Express / NestJS + **Socket.io** (gestión de salas de 1 a 4 jugadores, votaciones concurrentes y bucle de simulación de vuelo en memoria).
* **Capa de Datos y Persistencia:** Archivos JSON estáticos (`/data`) para catálogos modulares, misiones y textos educativos + **SQLite / PostgreSQL** para persistir el ranking y los diseños guardados.
* **Despliegue:** Frontend en **Vercel** + Backend en **Render** o **Railway**.

---

## 6. Modelo Matemático y Catálogos Modulares

El simulador opera sobre un motor determinista ligero que conecta todas las decisiones de diseño:

* **Restricción Económica:**  
  $$Presupuesto\_Restante = Presupuesto\_Inicial - \sum Costo\_Modulo_i \ge 0$$
* **Restricción de Masa y Riesgo Estructural:**  
  $$Masa\_Total = \sum Masa\_Modulo_i \le Masa\_Maxima\_Lanzador$$  
  *(Superar el $90\%$ de capacidad activa alertas de estrés estructural en Max-Q y riesgo de apagado prematuro de motores; superar el $95\%$ añade un $+5\%$ adicional de riesgo estructural).*
* **Balance Energético:**  
  $$Consumo\_Total\text{ (kW)} = Consumo\_Bus\_Base + \sum Consumo\_Instrumento_i \le Generacion\_Disponible\text{ (kW)}$$
* **Eficiencia Propulsiva ($\Delta v$):**  
  $$Eficiencia\_Propulsiva = 100\% - \left(\frac{Masa\_Total}{Masa\_Maxima\_Lanzador} \times 25\%\right)$$
* **Balance de Datos y Comunicaciones:**  
  $$Datos\_Recuperados = \min\left(Datos\_Generados\_Ciencia,\; Capacidad\_Enlace\_Antena \times Ventanas\_Terrestres\right)$$

### Catálogos Modulares
* **`EST` (Estructuras y Propulsión):** Etapas centrales ligeras, medias y pesadas, motores criogénicos y de queroseno, aceleradores sólidos (SRB), etapas de transferencia profunda, cofias, cápsulas tripuladas, aterrizadores y sistemas de escape.
* **`SCI` (Instrumentos Científicos):** Espectrómetro de masas, magnetómetro, cámara multiespectral, sismómetro subsuperficial, telescopio infrarrojo, laboratorio biológico, detector de radiación y brazo robótico muestreador (con incompatibilidades y sinergias reales entre sí).
* **`COM` (Comunicaciones y Energía):** Paneles solares desplegables, baterías de alta densidad, antenas de banda S/X/Ka y redes de estaciones terrenas.

---

## 7. Equipo de Desarrollo y División de Roles — Pacha Team

Proyecto ideado, diseñado y desarrollado por los 5 integrantes de **Pacha Team**:

* **Julian** *(Frontend Core, UI/UX & Bridge)* — Arquitectura cliente, conexión con Socket.io/API y maquetación de la Mesa de Diseño MDL (layout de 3 columnas, 6 barras de telemetría y votación).
* **Thiago** *(Backend Core & Motor Físico-Económico)* — Implementación de fórmulas NASA, catálogos modulares (`EST`, `SCI`, `COM`), auditoría pre-lanzamiento y tests unitarios.
* **Angel (Ferri)** *(Backend Real-Time, Salas & Vuelo Asimétrico)* — Salas multijugador (1 a 4 jugadores), sistema de votación democrática, bucle de vuelo en 3 actos con filtrado asimétrico por rol, informe post-misión y ranking.
* **Alvaro** *(Frontend de Experiencia, Vuelo & Reporte)* — Lobby, selector *Aprendiz / Ingeniero* con mini-tutorial, vista orbital en tiempo real con mini-puzzles rápidos y pantalla de reporte final.
* **Axel** *(Balanceo de Datos, Contenido NASA, QA & Pitch)* — Calibración numérica en JSON, redacción educativa (modo Aprendiz, crisis y misiones reales), pruebas de QA continuo y preparación de la demo/pitch.

---

## 8. Hoja de Ruta del MVP (Hackatón)

- [ ] **Paso 1 — Core Engine & Datos (Thiago + Axel):** Implementar fórmulas de balance, catálogos JSON (`EST`, `SCI`, `COM`) y 3 misiones con presupuestos calibrados.
- [ ] **Paso 2 — Salas & Sincronización Real-Time (Angel):** Levantar servidor Socket.io con salas de 1 a 4 jugadores, selección de roles y votación de prioridades.
- [ ] **Paso 3 — Interfaz Blueprint (Julian):** Construir el layout de 3 columnas, catálogo filtrado por rol, 6 barras en vivo y modal de votación.
- [ ] **Paso 4 — Flujo Inicial, Vuelo Asimétrico y Reporte (Alvaro + Angel):** Implementar Lobby/Tutorial, bucle de vuelo en 3 actos con información filtrada por rol, mini-puzzles y pantalla de auditoría NASA.
- [ ] **Paso 5 — QA, Despliegue y Pitch (Todo el equipo + Axel):** Pruebas integrales de extremo a extremo, despliegue en Vercel/Render y grabación de demo.