# **MD.050 \- Especificación de Diseño Funcional de Aplicaciones**

Nombre del Proyecto: Aplicación de Finanzas Familiares ("FamilyFinance")  
Módulo: Gestión Financiera Integral (Ingresos, Gastos, Deudas, Ahorro)  
Referencia: REQ-CORE-001  
Fecha: 17-Ene-2026

## **1\. Control del Documento**

| Versión | Fecha | Autor | Descripción del Cambio |
| :---- | :---- | :---- | :---- |
| 1.4 | 18-Ene-2026 | Analista Funcional | Expansión integral del documento. Se detallan reglas de negocio (BR), flujos de excepción, lógica de sincronización offline y especificaciones de UX para el módulo de captura. |
| 1.3 | 18-Ene-2026 | Analista Funcional | Especificación detallada de captura directa de cámara (Scan Ticket) y compresión de imágenes. |
| 1.2 | 18-Ene-2026 | Analista Funcional | Integración de Multi-moneda, Módulo de Ahorro/Metas, Adjuntos y Lógica de Notificaciones. |
| 1.1 | 17-Ene-2026 | Analista Funcional | Expansión detallada de requerimientos, lógica de negocio y casos de uso extendidos. |
| 1.0 | 17-Ene-2026 | Analista Funcional | Creación inicial basada en historia de usuario (Núcleo Familiar). |

### **1.1 Aprobaciones**

| Nombre | Cargo | Firma/Aprobación |
| :---- | :---- | :---- |
| Papá / Mamá | Product Owners (Jefes de Familia) |  |
| Equipo de Desarrollo | Lead Developer |  |

## **2\. Definición del Requerimiento**

### **2.1 Propósito**

El propósito de este documento es definir el diseño funcional detallado para el desarrollo de "FamilyFinance", una aplicación móvil colaborativa tipo Fintech Personal. Esta herramienta busca resolver la falta de educación y herramientas financieras adaptadas a la realidad de las familias mexicanas, donde los ingresos pueden ser variables y la economía informal juega un rol importante.

El sistema debe empoderar a los jefes de familia (Mamá y Papá) para actuar como "Cofundadores" de su economía doméstica. El objetivo no es solo registrar datos, sino cambiar comportamientos: fomentar la transparencia, reducir el estrés financiero causado por la incertidumbre ("¿nos alcanza?") y facilitar la transición de una economía de supervivencia a una economía de planificación y crecimiento patrimonial mediante el control de deudas y el ahorro estructurado.

### **2.2 Requerimientos del Negocio (Análisis de Pain Points)**

Se han identificado fricciones críticas en la administración actual de los hogares objetivo:

* **Opacidad y "Ceguera" Financiera:** Las familias operan con "saldos mentales" que rara vez coinciden con la realidad. Al no descontar los gastos diarios del presupuesto mensual en tiempo real, se crea una falsa sensación de liquidez que resulta en déficits al final de la quincena.  
* **Gestión de Pasivos Fragmentada:** Las deudas no se limitan a bancos. Existen préstamos personales (familiares, amigos), tandas y créditos comerciales. La falta de una visión consolidada impide priorizar qué deuda pagar primero ("Bola de nieve" vs "Avalancha") y genera pago excesivo de intereses o daño a relaciones personales.  
* **Fricción Operativa en el Registro:** El método tradicional (Excel o cuaderno) requiere tiempo y memoria. Si el gasto no se registra en el momento ("en caliente"), es probable que se olvide. La pérdida de tickets físicos impide reclamos de garantía o devoluciones.  
* **Desalineación de Pareja:** A menudo, un miembro de la pareja desconoce los gastos del otro hasta que es demasiado tarde. La falta de una plataforma neutral y compartida genera conflictos y desconfianza.

### **2.3 Alcance del Sistema**

El sistema cubrirá los siguientes dominios funcionales clave:

1. **Gestión de Usuarios y Roles:** Creación de un "Núcleo Familiar" seguro, permitiendo la invitación y sincronización de dispositivos entre la pareja.  
2. **Motor de Presupuestos (Budget Engine):** Definición de "Bolsas" de gasto con lógica de semaforización y alertas predictivas.  
3. **Registro Transaccional 360°:** Captura de todo movimiento de dinero: Ingresos (fijos/variables), Gastos (hormiga/estructurales), Pagos de Deuda y Transferencias a Ahorro.  
4. **Soporte de Evidencia Digital (Camera-First):** Integración nativa y optimizada con la cámara para la captura instantánea de comprobantes, vinculándolos inmutablemente a la transacción.  
5. **Gestión de Pasivos Multi-Moneda:** Capacidad de administrar deudas en divisas extranjeras (USD, EUR) con conversión referencial a moneda local para el balance general.  
6. **Módulo de Metas de Ahorro (Goals):** Gestión de apartados virtuales ("Cochinitos") con visualización de progreso y distinción entre metas individuales y familiares.  
7. **Inteligencia y Notificaciones:** Resúmenes diarios no intrusivos ("Daily Briefing") y alertas de desviación presupuestal.

## **3\. Diseño de la Solución**

### **3.1 Estrategia de Proceso**

El sistema se basa en la filosofía de **"Fricción Mínima, Consciencia Máxima"**.

* *Fricción Mínima:* Reducir el tiempo de captura de un gasto a menos de 10 segundos utilizando atajos, cámara rápida y categorías predictivas.  
* *Consciencia Máxima:* Mostrar el impacto inmediato de cada gasto en el presupuesto restante, utilizando refuerzos visuales (colores, barras de progreso).

### **3.2 Lógica del Proceso Detallada y Reglas de Negocio**

#### **A. Flujo de Ingresos y Presupuestos (La "Bolsa")**

* **BR-001 (Consolidación de Ingresos):** Todos los ingresos marcados como "Familiares" se suman a una bolsa global llamada "Poder Adquisitivo del Mes". Los ingresos "Personales" se mantienen en una vista separada y no afectan el presupuesto operativo del hogar.  
* **BR-002 (Multi-moneda en Ingresos):** Si se registra un ingreso en moneda extranjera (ej. Remesa en USD), el sistema debe capturar:  
  1. Monto original (ej. $100 USD).  
  2. Tipo de cambio real aplicado o estimado al momento (ej. $20.50 MXN).  
  3. Monto final en moneda base (MXN) que se sumará al presupuesto disponible.

#### **B. Módulo de Ahorro y Metas**

Este módulo actúa como una "bóveda" virtual para proteger el dinero.

1. **Creación de Meta:**  
   * Definición de parámetros: Nombre, Monto Objetivo, Fecha Límite, Icono/Emoji.  
   * **BR-003 (Visibilidad de Metas):** Las metas marcadas como "Privadas" solo son visibles y editables por el usuario creador, aunque el dinero se descuente del saldo global si así se configura. Las metas "Familiares" notifican a ambos usuarios sobre los avances.  
2. **Aportación (El "Apartado"):**  
   * Al "enviar dinero" a una meta, el sistema realiza un movimiento contable interno: Saldo\_Disponible \-= Monto y Saldo\_Meta \+= Monto.  
   * **Feedback Visual:** Animación de monedas cayendo en una alcancía para reforzar positivamente el hábito.  
3. **Retiro de Emergencia:**  
   * Permite devolver fondos al saldo corriente. Requiere una confirmación de "Doble toque" para evitar retiros impulsivos ("¿Realmente quieres romper el cochinito?").

#### **C. Flujo de Deudas Multi-Moneda**

1. **Registro y Tipificación:**  
   * Se clasifica la deuda: Bancaria (TC), Personal (Amigo/Familiar), Servicio.  
   * Selección de Divisa (MXN, USD, etc.).  
2. **Visualización Dual:**  
   * En el detalle de la deuda: Se muestra el saldo estricto en la moneda origen para control de pagos exactos.  
   * En el Dashboard Patrimonial: Se muestra el contravalor en MXN usando un tipo de cambio referencial (API de terceros o valor fijo configurado) para entender el peso real de la deuda en la economía local.  
3. **Lógica de Abonos:**  
   * **BR-004 (Historial de Abonos):** Cada abono es inmutable. Si hubo un error, se debe crear un movimiento de contra-cargo o ajuste, no borrar el historial, para mantener la trazabilidad.

#### **D. Flujo de Captura de Gasto con Evidencia (Ticket Snap)**

1. **Inicio:** Usuario pulsa "+ Gasto".  
2. **Captura:** Usuario pulsa icono de cámara.  
   * **Acción del Sistema:** Solicita permiso de cámara (primera vez) \-\> Abre visor de cámara nativo \-\> Usuario toma foto \-\> Sistema muestra previsualización.  
   * **Procesamiento:** El sistema comprime automáticamente la imagen (formato .jpg optimizado, máx 1MB) para ahorrar datos y almacenamiento.  
3. **Guardado:** La imagen se vincula a la transacción y se sube en segundo plano (background upload) para no bloquear al usuario.

#### **E. Sistema de Notificaciones (Resumen Diario)**

1. **Política:** Cero notificaciones transaccionales inmediatas.  
2. **El "Cierre del Día":** Resumen automático a la hora configurada (Default: 9:00 PM).  
3. **Configuración:** Hora personalizable.

## **4\. Estructura de Datos (Actualizada)**

| Entidad | Descripción | Campos Nuevos/Críticos |
| :---- | :---- | :---- |
| FM\_TRANSACTIONS | Registro diario | attachment\_url (Link a la foto), attachment\_thumb\_url (Miniatura), currency\_code, exchange\_rate. |
| FM\_GOALS | Metas de Ahorro | goal\_id, type, target\_amount, current\_saved, deadline. |
| FM\_GOAL\_CONTRIB | Historial de Ahorro | contrib\_id, goal\_id, amount, date. |
| FM\_DEBTS | Pasivos | currency\_code, exchange\_rate\_fixed. |
| FM\_USER\_SETTINGS | Configuración | notification\_time, daily\_summary\_enabled. |

## **5\. Interfaz de Usuario**

### **5.1 Pantalla de Registro de Gasto (Experiencia "Scan")**

* **Layout:** Formulario limpio.  
* **Botón de Acción Principal:**  
  * **Opción A (Texto):** Botón con icono de cámara grande "Foto Ticket".  
  * **Comportamiento:** Al pulsar, abre la cámara inmediatamente. Al capturar, el icono cambia a una miniatura de la foto tomada.  
* **Opciones Secundarias:** "Elegir de Galería" (por si la foto ya fue tomada antes).  
* **Selector de Moneda:** Dropdown pequeño (Default: MXN).  
* **Feedback de Ahorro:** Mensaje sutil si hay metas pendientes.

### **5.2 Dashboard de Ahorro**

* Visualización de "Huchas" con barras de progreso circulares.  
* Diferenciación visual entre Metas Familiares y Personales.

### **5.3 Configuración de Notificaciones**

* Switch: "Recibir Resumen Diario".  
* Time Picker: "Hora del Resumen".

## **6\. Reportes y Dashboard**

### **6.1 Dashboard Principal**

* **Saldo Disponible:** Muestra dinero real (Ingresos \- Gastos \- Ahorros).  
* **Sección de Deudas:** Totales separados por moneda.

### **6.2 Visor de Gastos**

* Al ver el detalle de un gasto en el historial, si tiene foto, mostrar un thumbnail. Al hacer clic, expandir la imagen del ticket a pantalla completa con capacidad de zoom (para leer detalles pequeños del recibo).

## **7\. Escenarios de Prueba (Nuevos UATs)**

| ID | Escenario | Resultado Esperado |
| :---- | :---- | :---- |
| UAT-05 | Captura Directa de Cámara | Al pulsar el icono de cámara, se abre el hardware del celular, permite tomar la foto, confirmar y regresa al formulario mostrando la miniatura. |
| UAT-06 | Subida en Segundo Plano | El usuario puede guardar el gasto inmediatamente después de tomar la foto sin esperar a que se suba a la nube; la subida continúa aunque cierre la pantalla. |
| UAT-07 | Notificación de Resumen | A la hora configurada, llega notificación push con total gastado. |
| UAT-08 | Deuda en Dólares | Registro y abono en divisa extranjera con cálculo correcto en dashboard. |

