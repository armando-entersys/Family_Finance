# INSTRUCCIÓN DE INICIO DE PROYECTO: FAMILY FINANCE (HIGH-DENSITY ENVIRONMENT)

ACTÚA COMO: Principal Software Engineer & Cloud Architect (Nivel Silicon Valley).
TU MISIÓN: Implementar el backend de "FamilyFinance" siguiendo una arquitectura de "Eficiencia Radical".

CONTEXTO INICIAL:
Estoy en la raíz de un directorio que contiene dos documentos críticos que son tu "Biblia" para este proyecto:
1. `md050_diseno_funcional.md`: Define la lógica de negocio (Bolsas, Multi-moneda, Ahorros).
2. `md070_diseno_tecnico.md`: Define la arquitectura técnica (Stack, Restricciones de Memoria, Clean Architecture).

TUS RESTRICCIONES DE HIERRO (NON-NEGOTIABLES):
- LÍMITE DE MEMORIA: La aplicación debe arrancar con <150MB de RAM y nunca exceder 512MB bajo carga.
- ORM: SQLAlchemy 2.0 (Async) es obligatorio.
- ALMACENAMIENTO: Cero almacenamiento local persistente para archivos. Usa Google Cloud Storage (GCS) como indica el MD070.
- BASE DE DATOS: PostgreSQL compartido. Usa Pool de conexiones eficiente (máx 5 conexiones).
- ARQUITECTURA: Hexagonal / Clean Architecture. Nada de código espagueti en `main.py`.
- Usa MAterial Designe 3 de google
PLAN DE EJECUCIÓN:

FASE 1: ANÁLISIS PROFUNDO
- Lee exhaustivamente `md050_diseno_funcional.md` y `md070_diseno_tecnico.md`.
- No me resumas los documentos. Confírmame que has entendido la arquitectura de tablas, los endpoints requeridos y la estrategia de despliegue en Docker.

FASE 2: SCAFFOLDING (ESTRUCTURA)
- Crea la estructura de directorios exacta definida en el MD070 Sección 3.1 (`src/api`, `src/core`, `src/domain`, etc.).
- Configura `pyproject.toml` o `requirements.txt` con las versiones "Slim" de las librerías (FastAPI, Uvicorn, SQLAlchemy, Pydantic V2, Gunicorn).

FASE 3: NÚCLEO Y MODELOS
- Implementa `src/core/config.py` usando Pydantic BaseSettings para leer el `.env`.
- Implementa los Modelos SQLAlchemy (`src/domain/models`) reflejando EXACTAMENTE el ERD del MD070 (Tablas: users, families, transactions, debts).

FASE 4: LÓGICA DE NEGOCIO Y API
- Implementa los endpoints críticos definidos en MD050.
- Asegura que la subida de imágenes comprima a WebP y suba a GCS (Stateless).

FASE 5: INFRAESTRUCTURA
- Genera el `Dockerfile` Multi-stage optimizado del MD070.
- Genera el `docker-compose.yml` con los límites de recursos (CPU 0.5, Mem 450M) y las etiquetas de Traefik correctas.

INSTRUCCIÓN DE COMANDO:
Por favor, inicia ejecutando la FASE 1: Lee los archivos locales y dame un breve acuse de recibo confirmando que tienes el "Mapa Mental" del sistema antes de escribir código.