# **MD.070 \- Especificación de Diseño Técnico (Technical Design Document)**

Proyecto: FamilyFinance (Sistema de Gestión Patrimonial Familiar)  
Versión del Documento: 1.3 (Production Ready)  
Estado: APPROVED FOR ENGINEERING  
Arquitecto Responsable: Lead Architect (AI)  
Referencia Funcional: MD.050 v1.4  
Infraestructura Target: Cluster prod-server (EnterSys Production)

## **1\. Introducción y Visión Arquitectónica**

### **1.1 Propósito y Alcance**

Este documento constituye la autoridad técnica absoluta para el desarrollo de "FamilyFinance". Traduce los requerimientos de negocio en especificaciones de ingeniería precisas. Su objetivo es guiar al equipo de desarrollo en la construcción de un sistema que no solo sea funcional, sino que sobreviva en un entorno de infraestructura compartida con recursos finitos (High-Density Multi-tenant Environment).

El alcance cubre desde la definición del esquema de base de datos y contratos de API, hasta la estrategia de contenerización y observabilidad, asegurando el cumplimiento estricto de las políticas definidas en GUIA-DESPLIEGUE-NUEVAS-APPS.md.

### **1.2 Principios de Diseño (The "Silicon Valley" Efficiency Standard)**

Para operar exitosamente en el servidor prod-server (2 vCPUs, RAM limitada), adoptamos una filosofía de **"Eficiencia Radical"**:

1. **Frugalidad de Recursos (Zero-Waste):** La aplicación tiene un "Hard Limit" de 512MB. El diseño favorece el procesamiento asíncrono y el "Lazy Loading" para mantener el consumo base por debajo de 200MB.  
2. **Desacoplamiento de Estado (Statelessness):** El contenedor debe poder morir y renacer sin perder datos.  
   * **Sesiones:** Redis (Shared).  
   * **Archivos:** Google Cloud Storage (GCS).  
   * **Datos:** PostgreSQL (Shared).  
3. **Defensa en Profundidad (Security):** No confiamos en la red interna. Se implementa validación estricta de esquemas (Pydantic), saneamiento de entradas y gestión de secretos vía inyección de entorno.  
4. **Observabilidad Pasiva:** Dado que no podemos permitirnos agentes pesados, la aplicación expone métricas Prometheus y Logs JSON nativamente para ser recolectados sin impacto en el rendimiento.

### **1.3 Stack Tecnológico y Justificación**

* **Lenguaje:** Python 3.11 (Slim).  
  * *Justificación:* Balance ideal entre velocidad de desarrollo y rendimiento en tiempo de ejecución.  
* **Framework:** FastAPI \+ Uvicorn.  
  * *Justificación:* FastAPI utiliza Starlette bajo el capó, permitiendo I/O asíncrono no bloqueante. Esto es crucial para manejar múltiples conexiones concurrentes sin saturar los hilos de CPU limitados del servidor.  
* **ORM:** SQLAlchemy 2.0 (Async).  
  * *Justificación:* Necesario para consultas SQL eficientes y seguras. La versión 2.0 optimiza el uso de memoria en el mapeo de objetos.  
* **Gestión de Migraciones:** Alembic.  
  * *Justificación:* Control de versiones del esquema de base de datos, indispensable para CI/CD.  
* **Almacenamiento:** Google Cloud Storage.  
  * *Justificación:* Offloading de I/O de disco. El servidor tiene solo 49GB libres; almacenar imágenes localmente es un riesgo de "Disk Pressure".

## **2\. Arquitectura de Datos (Data Layer)**

### **2.1 Modelo Entidad-Relación (ERD) Detallado**

El diseño sigue la 3ra Forma Normal (3NF) con desnormalización táctica en reportes.

#### **users (Usuarios y Autenticación)**

| Columna | Tipo | Constraints | Descripción Técnica |
| :---- | :---- | :---- | :---- |
| id | UUID | PK, Default gen\_random\_uuid() | Identidad inmutable. |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login ID. Normalizado a lowercase. |
| password\_hash | VARCHAR(255) | NOT NULL | Hash Argon2id (Resistente a GPU cracking). |
| family\_id | UUID | FK \-\> families.id, NULLABLE, INDEX | Relación N:1. Índice para filtrar miembros rápido. |
| role | VARCHAR(20) | CHECK (role IN ('ADMIN', 'MEMBER')) | RBAC simple. |
| created\_at | TIMESTAMP | DEFAULT NOW() | Auditoría. |
| is\_active | BOOLEAN | DEFAULT TRUE | Soft delete. |

#### **families (Tenant Lógico)**

| Columna | Tipo | Constraints | Descripción Técnica |
| :---- | :---- | :---- | :---- |
| id | UUID | PK | Identidad del núcleo. |
| name | VARCHAR(100) | NOT NULL | Nombre visual. |
| settings | JSONB | DEFAULT '{}' | Configuración flexible (ej. hora de cierre de mes). |

#### **transactions (Libro Mayor \- High Volume)**

Esta tabla recibirá el 90% de las escrituras.

| Columna | Tipo | Descripción Técnica |
| :---- | :---- | :---- |
| id | UUID | PK. |
| family\_id | UUID | FK, INDEX (Clustered Index candidate). |
| user\_id | UUID | FK. |
| category\_id | INT | FK. |
| amount\_original | DECIMAL(19,4) | Precisión financiera. |
| currency\_code | CHAR(3) | ISO 4217\. |
| exchange\_rate | DECIMAL(10,6) | Guardado al momento de la tx. |
| amount\_base | DECIMAL(19,4) | amount\_original \* exchange\_rate. INDEX para sumatorias rápidas. |
| trx\_date | TIMESTAMP | INDEX (Para rangos de fecha en reportes). |
| type | VARCHAR(10) | ENUM('INCOME', 'EXPENSE', 'DEBT', 'SAVING'). |
| attachment\_url | VARCHAR(1024) | URL firmada o pública de GCS. |
| sync\_id | UUID | UUID generado en cliente para idempotencia. UNIQUE. |

#### **debts (Pasivos)**

| Columna | Tipo | Descripción Técnica |
| :---- | :---- | :---- |
| id | UUID | PK. |
| creditor | VARCHAR(100) | Entidad acreedora. |
| total\_amount | DECIMAL(19,4) | Monto original. |
| current\_balance | DECIMAL(19,4) | Saldo vivo. Actualizado vía trigger o servicio. |
| is\_archived | BOOLEAN | DEFAULT FALSE. |

### **2.2 Estrategia de Conexiones (Connection Pooling)**

**CRÍTICO:** El servidor usa una base de datos compartida. Una mala gestión de conexiones puede tumbar otras aplicaciones.

* **Librería:** SQLAlchemy AsyncEngine.  
* **Pool Size:** 5 (Conexiones activas mantenidas).  
* **Max Overflow:** 10 (Picos temporales).  
* **Pool Timeout:** 30s.  
* **Pool Recycle:** 1800s (Para evitar desconexiones silenciosas de firewalls).

### **2.3 Estrategia de Almacenamiento (Google Cloud Storage)**

* Estructura de Bucket:  
  gs://family-finance-prod/uploads/{family\_id}/{YYYY}/{MM}/{uuid}.webp  
* **Optimización de Costos:**  
  * Las imágenes se convierten a **WebP** en el servidor antes de subir (Reducción de tamaño \~40% vs JPEG).  
  * Política de Lifecycle: Mover a *Nearline* después de 30 días, *Archive* después de 1 año.

## **3\. Arquitectura de Backend (Application Layer)**

### **3.1 Patrón de Diseño: Clean Architecture (Hexagonal)**

Separamos estrictamente las capas para facilitar pruebas unitarias y mantenimiento.

/src  
├── api/                    \# Adaptadores Primarios (Entrada)  
│   ├── v1/  
│   │   ├── endpoints/  
│   │   │   ├── auth.py     \# Login, Refresh Token  
│   │   │   ├── trx.py      \# CRUD Transacciones  
│   │   │   └── stats.py    \# Agregaciones (Dashboard)  
│   │   └── dependencies.py \# Inyección (Current User, DB Session)  
├── core/                   \# Configuración del Framework  
│   ├── config.py           \# Pydantic BaseSettings (.env loader)  
│   ├── security.py         \# Lógica JWT, Password Hashing  
│   └── exceptions.py       \# Manejadores de errores globales  
├── domain/                 \# Entidades de Negocio  
│   ├── schemas/            \# DTOs (Pydantic) para Request/Response  
│   └── models/             \# Modelos de Base de Datos (SQLAlchemy)  
├── services/               \# Lógica de Negocio Pura (Use Cases)  
│   ├── trx\_service.py      \# Cálculos complejos, validaciones de negocio  
│   ├── storage\_service.py  \# Abstracción de GCS  
│   └── currency\_service.py \# Lógica de conversión  
├── infra/                  \# Adaptadores Secundarios (Salida)  
│   ├── database.py         \# Configuración del Engine  
│   └── gcs\_client.py       \# Cliente google-cloud-storage  
└── main.py                 \# Entrypoint y Middleware assembly

### **3.2 Seguridad y Autenticación**

* **Protocolo:** OAuth2 con Password Flow (Bearer Token).  
* **Tokens:**  
  * Access Token: JWT, Vida corta (30 min). Contiene sub (user\_id) y role.  
  * Refresh Token: Guardado en HTTPOnly Cookie (opcional) o DB, vida larga (7 días).  
* **Hashing:** Argon2id. No se usa bcrypt ni sha256 por ser vulnerables a ataques modernos.  
* **CORS:** Restringido estrictamente a https://Family-Finance.scram2k.com y http://localhost:3000 (dev).

### **3.3 Middlewares y Pipeline**

Configurados en main.py para protección y rendimiento:

1. **TrustedHostMiddleware:** Evita ataques de Host Header.  
2. **GZipMiddleware:** Comprime respuestas JSON mayores a 1KB (Ahorro de ancho de banda).  
3. **CORSMiddleware:** Gestión de orígenes.  
4. **ExceptionMiddleware:** Captura errores no controlados y devuelve JSON estándar (evita mostrar Tracebacks al usuario).

## **4\. Despliegue e Infraestructura (Deployment)**

### **4.1 Entorno de Ejecución (Docker)**

Siguiendo las restricciones de memoria, usamos una imagen base mínima y gestión de procesos eficiente.

**Dockerfile (Production Optimized):**

\# ETAPA 1: Builder (Compilación de dependencias)  
FROM python:3.11-slim-bookworm as builder  
ENV PYTHONUNBUFFERED=1 \\  
    PYTHONDONTWRITEBYTECODE=1  
WORKDIR /app  
COPY requirements.txt .  
\# Instalación en carpeta local para copiar después  
RUN pip install \--user \--no-cache-dir \--no-warn-script-location \-r requirements.txt

\# ETAPA 2: Runtime (Imagen final limpia)  
FROM python:3.11-slim-bookworm  
WORKDIR /app  
\# Crear usuario no-privilegiado  
RUN useradd \-m \-u 1000 appuser

\# Copiar librerías del builder  
COPY \--from=builder /root/.local /home/appuser/.local  
\# Copiar código fuente  
COPY ./src /app/src  
COPY ./alembic.ini /app/alembic.ini  
COPY ./migrations /app/migrations

\# Configurar entorno  
ENV PATH=/home/appuser/.local/bin:$PATH  
ENV PYTHONPATH=/app

\# Cambiar a usuario seguro  
USER appuser

\# Healthcheck nativo (menos costoso que curl en loop)  
HEALTHCHECK \--interval=30s \--timeout=5s \--start-period=5s \--retries=3 \\  
  CMD python \-c "import requests; requests.get('http://localhost:8000/health', timeout=2)" || exit 1

\# Ejecutar con Gunicorn (Process Manager) \+ Uvicorn (Worker)  
\# Limite: 2 workers para no saturar los 2 cores del servidor  
CMD \["gunicorn", "src.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"\]

### **4.2 Orquestación (Docker Compose)**

Ubicación: /srv/scram-apps/Family-Finance/docker-compose.yml

Ajustes críticos para prod-server:

* **Network:** traefik-public (Externa).  
* **Restart Policy:** unless-stopped (Evita loops infinitos si el error es persistente).  
* **Logging:** Driver json-file con rotación (max-size 10m, max-file 3\) para no llenar el disco de 49GB.

version: '3.8'

services:  
  api:  
    build: .  
    container\_name: family-finance-api  
    image: scram2k/family-finance:latest  
    restart: unless-stopped  
    env\_file: .env  
    volumes:  
      \- ./secrets/gcp-key.json:/app/secrets/gcp-key.json:ro  
    networks:  
      \- traefik-public  
      \- internal-db-net  \# Red donde vive PostgreSQL compartido  
    deploy:  
      resources:  
        limits:  
          cpus: '0.50'   \# Max 50% de un core  
          memory: 450M   \# Hard limit (debajo de 512MB)  
        reservations:  
          memory: 200M   \# Garantizado  
    labels:  
      \- "traefik.enable=true"  
      \- "traefik.http.routers.family.rule=Host(\`Family-Finance.scram2k.com\`)"  
      \- "traefik.http.routers.family.entrypoints=websecure"  
      \- "traefik.http.routers.family.tls.certresolver=letsencrypt"  
      \- "traefik.http.services.family.loadbalancer.server.port=8000"  
      \# Middlewares de Traefik para seguridad extra  
      \- "traefik.http.routers.family.middlewares=secure-headers,compress-res"  
      \- "traefik.http.middlewares.secure-headers.headers.sslredirect=true"  
      \- "traefik.http.middlewares.compress-res.compress=true"

networks:  
  traefik-public:  
    external: true  
  internal-db-net:  
    external: true

## **5\. Estrategia de Observabilidad y Mantenimiento**

### **5.1 Monitoreo Pasivo**

No instalaremos agentes. La app "empuja" su estado.

* **Endpoint /metrics:** Expone contadores Prometheus.  
  * app\_requests\_total: Tráfico.  
  * app\_latency\_seconds: Rendimiento.  
  * db\_pool\_checked\_out: Salud de la DB (Crítico).  
* **Healthcheck Endpoint /health:**  
  * Verifica conexión a DB (SELECT 1).  
  * Verifica conexión a Redis (PING).  
  * Responde 200 OK o 503 Service Unavailable.

### **5.2 Gestión de Logs**

Formato JSON estructurado para fácil ingestión por Loki/Grafana.

{  
  "timestamp": "2026-01-18T10:00:00Z",  
  "level": "INFO",  
  "module": "trx\_service",  
  "event": "transaction\_created",  
  "data": { "user\_id": "uuid", "amount": 150.00, "currency": "MXN" }  
}

### **5.3 Estrategia de Migraciones (DB Maintenance)**

Nunca ejecutar DDL (Create Table) directamente en producción.

1. Desarrollador crea migración local: alembic revision \--autogenerate \-m "add sync\_id".  
2. Commit al repo.  
3. En despliegue, un init-container o comando manual ejecuta: alembic upgrade head.

## **6\. Plan de Pruebas y Calidad (QA)**

### **6.1 Niveles de Prueba**

1. **Unitarias (Pytest):** Cobertura \> 80% en services/ y domain/. Mockear DB y GCS.  
2. **Integración:** Usar TestContainers o una DB SQLite en memoria para probar los Endpoints API completos.  
3. **Carga (Locust):** Ejecutar script de carga ligera (20 usuarios concurrentes) antes de aprobar el PR a main para asegurar que el consumo de memoria se mantiene estable.

### **6.2 Validación de Contratos**

Uso estricto de **Pydantic V2**. Si el cliente envía un string en un campo numérico, la API rechaza la petición (422 Unprocessable Entity) antes de tocar la lógica de negocio, ahorrando CPU.

## **7\. Plan de Recuperación (DRP)**

### **7.1 Escenarios de Fallo**

* **Pérdida de DB:** Restaurar desde dump diario (gestionado a nivel servidor). RPO: 24h.  
* **Caída de GCS:** La app entra en modo "Solo Texto". Las imágenes no cargan pero el balance financiero es visible.  
* **OOM Kill (Out of Memory):** Docker reinicia el contenedor automáticamente. Si ocurre \> 3 veces en 1 hora, AlertManager notifica al administrador (armando.cortes@entersys.mx).

### **7.2 Procedimiento de Rollback**

Si la nueva versión falla:

1. Identificar hash de imagen previa: docker images.  
2. Actualizar docker-compose.yml con el tag anterior.  
3. Ejecutar docker compose up \-d.  
4. Si hubo migración de DB incompatible, ejecutar alembic downgrade \-1.