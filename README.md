# Práctica N.° 3 — API REST para la gestión de reservas de salas

**Asignatura:** Aplicaciones Distribuidas · NRC 37869
**Institución:** Universidad de las Fuerzas Armadas ESPE — Departamento de Ciencias de la Computación
**Estudiante:** Santiago Geovanny Sánchez Camacho
**Docente:** Ing. Luis Castillo, Mgtr.
**Fecha:** 18 de noviembre de 2026

---

## 1. Descripción general

El proyecto implementa una **API REST** que permite registrar usuarios, autenticarlos y administrar
reservas de salas. Está construida con **Node.js + Express** y persiste la información en **MongoDB**
a través de **Mongoose**.

Características principales:

- Registro e inicio de sesión de usuarios con **contraseñas cifradas** (bcryptjs).
- Autenticación **sin estado** mediante **JSON Web Tokens (JWT)**: el token viaja en el encabezado
  `Authorization: Bearer <token>` y lo valida un **middleware** reutilizable.
- Operaciones **CRUD** de reservas, siempre restringidas al usuario autenticado.
- **Validaciones** en tres niveles: controlador, esquema de Mongoose e índice único de la base.
- **Códigos HTTP semánticos**: `200`, `201`, `400`, `401`, `403`, `404`, `409`.
- **Actividades de refuerzo** resueltas: recuperación de contraseña con token temporal y edición de
  reservas con validación de propiedad del recurso.

---

## 2. Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 26.x | Entorno de ejecución (probado con v26.13.0) |
| Express | 5.x | Framework HTTP y enrutamiento |
| MongoDB | 8.0 | Base de datos NoSQL orientada a documentos |
| Mongoose | 8.x | Modelado de esquemas y validación |
| bcryptjs | 3.x | Cifrado de contraseñas con salt |
| jsonwebtoken | 9.x | Emisión y verificación de JWT |
| dotenv | 17.x | Variables de entorno |
| cors | 2.x | Acceso desde otros orígenes |

---

## 3. Estructura del proyecto

```text
proyecto/
├── .env                          # Variables de entorno
├── .gitignore
├── package.json
├── server.js                     # Punto de entrada: middlewares, rutas y conexión a MongoDB
├── models/
│   ├── Usuario.js                # Esquema de usuario + hook de cifrado + método compararPassword
│   └── Reserva.js                # Esquema de reserva (referencia al usuario propietario)
├── middleware/
│   └── authMiddleware.js         # Verificación del JWT y control de acceso
├── routes/
│   ├── auth.js                   # register, login y recover (Actividad 1)
│   └── reservas.js               # GET, POST, PUT (Actividad 2) y DELETE
├── pruebas.ps1                   # 14 casos de prueba con respuestas completas
├── resumen-pruebas.ps1           # Resumen compacto 14/14
└── iniciar-entorno.ps1           # Arranca MongoDB portable + servidor (opcional)
```

---

## 4. Requisitos previos

- **Node.js 18 o superior** (verificar con `node -v`).
- **npm** (incluido con Node.js).
- **MongoDB** en ejecución. Cualquiera de estas dos opciones:

  **a) MongoDB local.** Instalar MongoDB Community Server y arrancar el servicio, o ejecutar:

  ```bash
  mongod --dbpath <carpeta-de-datos> --port 27017
  ```

  **b) MongoDB Atlas.** Crear un clúster gratuito y copiar la cadena de conexión.

---

## 5. Instalación y ejecución

### 5.1 Clonar e instalar dependencias

```bash
git clone https://github.com/sgsanchez/AplicDistrLab3-SGSC.git
cd AplicDistrLab3-SGSC
npm install
```

### 5.2 Configurar las variables de entorno

El archivo `.env` ya está incluido en el repositorio con valores de laboratorio.
Si se usa Atlas o se cambia el puerto, ajustar:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto donde escucha la API |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/lab3_reservas` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | `lab3_reservas_clave_secreta_2026` | Clave de firma de los tokens |
| `JWT_EXPIRES` | `1h` | Vigencia del token de sesión |
| `RESET_TOKEN_MINUTOS` | `15` | Vigencia del token de recuperación |

Ejemplo para Atlas:

```env
MONGODB_URI=mongodb+srv://<usuario>:<clave>@cluster0.xxxxx.mongodb.net/lab3_reservas
```

### 5.3 Arrancar la API

```bash
node server.js
```

Salida esperada:

```text
[MongoDB] conectado a mongodb://127.0.0.1:27017/lab3_reservas
[Servidor] escuchando en http://localhost:3000
```

> **Windows (opcional):** el script `iniciar-entorno.ps1` arranca MongoDB portable y el servidor en
> una sola ejecución. Está configurado para la instalación portable del autor
> (`%USERPROFILE%\mongodb\...`); si esa ruta no existe, usar los comandos manuales anteriores.

---

## 6. Endpoints de la API

Ruta base: `http://localhost:3000`

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Registro de usuario |
| `POST` | `/api/auth/login` | No | Inicio de sesión y emisión del JWT |
| `POST` | `/api/auth/recover` | No | **Actividad 1:** recuperación de contraseña |
| `GET` | `/api/reservas` | JWT | Lista las reservas del usuario autenticado |
| `POST` | `/api/reservas` | JWT | Crea una reserva |
| `PUT` | `/api/reservas/:id` | JWT | **Actividad 2:** edita una reserva propia |
| `DELETE` | `/api/reservas/:id` | JWT | Cancela (elimina) una reserva propia |

### 6.1 Registro — `POST /api/auth/register`

```json
{ "nombre": "Santiago Sánchez", "correo": "santiago@espe.edu.ec", "password": "secreto123" }
```

Respuesta `201 Created`:

```json
{
  "ok": true,
  "mensaje": "Usuario registrado correctamente",
  "usuario": { "nombre": "Santiago Sánchez", "correo": "santiago@espe.edu.ec", "_id": "..." },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Errores: `400` (campos inválidos), `409` (correo ya registrado).

### 6.2 Login — `POST /api/auth/login`

```json
{ "correo": "santiago@espe.edu.ec", "password": "secreto123" }
```

Respuesta `200 OK` con el campo `token`. Credenciales incorrectas → `401`.

### 6.3 Crear reserva — `POST /api/reservas`

Encabezado: `Authorization: Bearer <token>`

```json
{
  "sala": "Sala A-101",
  "fecha": "2026-11-25",
  "horaInicio": "08:00",
  "horaFin": "10:00",
  "motivo": "Clase de Aplicaciones Distribuidas"
}
```

Respuesta `201 Created`. Validaciones: campos obligatorios, fecha válida (`YYYY-MM-DD`) y
`horaFin > horaInicio` (`400` en caso contrario). Sin token → `401`.

### 6.4 Listar reservas — `GET /api/reservas`

Devuelve `200 OK` con `{ ok, total, reservas }`, únicamente las del usuario del token.

### 6.5 Cancelar reserva — `DELETE /api/reservas/:id`

Devuelve `200 OK`. Si la reserva pertenece a otro usuario → `403`; si no existe → `404`.

---

## 7. Actividades de refuerzo

### Actividad 1 — Recuperación de contraseña (`POST /api/auth/recover`)

```json
{ "correo": "santiago@espe.edu.ec" }
```

Comportamiento implementado:

1. Valida que el campo `correo` esté presente (`400` si falta).
2. Comprueba que el correo exista en la base; si no, responde **`404`**
   («No existe una cuenta asociada al correo indicado»).
3. Genera un **token temporal** con `crypto.randomBytes(24)`.
4. Guarda en el usuario únicamente el **hash SHA-256** del token y su fecha de expiración
   (**15 minutos**, configurable con `RESET_TOKEN_MINUTOS`).
5. Devuelve un **mensaje simulado** de envío de correo (no se usa servidor SMTP) y, con fines
   exclusivamente académicos, el token para poder verificarlo:

```json
{
  "ok": true,
  "mensaje": "Se envio un enlace de recuperacion al correo santiago@espe.edu.ec (envio simulado...)",
  "tokenTemporal": "f1af2c45261545326b504cf59171d382015b40a7dd44eab1",
  "expiraEn": "15 minutos",
  "expiraEl": "2026-11-18T15:53:19.180Z"
}
```

> En producción el token **no** debe devolverse en la respuesta ni almacenarse en claro.

### Actividad 2 — Edición de reservas (`PUT /api/reservas/:id`)

Encabezado: `Authorization: Bearer <token>`

```json
{ "sala": "Sala A-102", "fecha": "2026-11-28", "horaInicio": "11:00", "horaFin": "13:00" }
```

Comportamiento implementado:

1. Valida el formato del identificador (`mongoose.isValidObjectId` → `400` si es inválido).
2. Busca la reserva (`404` si no existe).
3. **Verifica la propiedad**: si `reserva.usuario` no coincide con el `id` del token, responde
   **`403`** («No tiene permisos para modificar una reserva que no le pertenece»).
4. Aplica solo los campos enviados, revalida la fecha y la coherencia horaria y guarda los cambios.
5. Devuelve `200 OK` con la reserva actualizada.

La misma verificación de propiedad se aplica en la cancelación (`DELETE`).

---

## 8. Pruebas

### 8.1 Colección de Postman

La colección **«API Biblioteca»** (`API Biblioteca.postman_collection.json`) se entrega junto al
informe, en la carpeta `Entregables/` del proyecto académico. Contiene 13 peticiones organizadas así:

| Grupo | Peticiones |
|---|---|
| Requeridas | Registro de Usuario, Login de Usuario, Crear Reserva, Obtener Reservas, Cancelar Reservas |
| Actividades practicas | Actividad 1 - Recuperar contraseña, Actividad 2a - Crear reserva de prueba, Actividad 2b - Editar reserva (PUT) |
| Casos de error | Registro duplicado (409), Ruta sin token (401), Correo inexistente (404), Registro de segundo usuario, Editar reserva ajena (403) |

Incluye **scripts de prueba** que verifican el código HTTP y guardan automáticamente `token`,
`token2`, `reservaId` y `reservaTestId` en las variables de colección.

**Uso en la aplicación Postman:** *Import* → seleccionar el JSON → **Run** de la colección.
**Con Newman (CLI oficial de Postman):**

```bash
npm install -g newman newman-reporter-htmlextra
newman run "API Biblioteca.postman_collection.json" \
  --env-var "baseUrl=http://127.0.0.1:3000" \
  --env-var "correo=santiago@espe.edu.ec" \
  --env-var "correo2=companero@espe.edu.ec" \
  -r cli,htmlextra --reporter-htmlextra-export Reporte_Postman.html
```

Resultado obtenido en la entrega: **13 peticiones, 15 aserciones, 0 fallos**.

> ⚠️ Con las versiones actuales de Node.js, Newman falla con `localhost`
> (`Invalid IP address: undefined`). Usar `127.0.0.1` en `baseUrl`. En la aplicación Postman
> `localhost` funciona normalmente.

### 8.2 Scripts incluidos

```powershell
# 14 casos con el detalle completo de cada respuesta
powershell -ExecutionPolicy Bypass -File .\pruebas.ps1

# Resumen compacto (14/14)
powershell -ExecutionPolicy Bypass -File .\resumen-pruebas.ps1
```

Casos cubiertos: registro (`201`), correo duplicado (`409`), login correcto (`200`) e incorrecto
(`401`), recuperación con correo existente (`200`) e inexistente (`404`), creación de reserva con y
sin token (`201` / `401`), franja horaria inválida (`400`), listado (`200`), edición propia (`200`) y
ajena (`403`), cancelación (`200`) y listado posterior (`200`).

---

## 9. Verificación rápida para el docente

Con la base de datos y el servidor en ejecución, la práctica completa se comprueba en seis pasos
desde PowerShell (sin necesidad de Postman):

```powershell
$api = 'http://127.0.0.1:3000'

# 1. Registro (201)
$reg = Invoke-RestMethod -Method Post -Uri "$api/api/auth/register" -ContentType 'application/json' `
       -Body '{"nombre":"Docente","correo":"docente@espe.edu.ec","password":"secreto123"}'

# 2. Login (200) -> token JWT
$login = Invoke-RestMethod -Method Post -Uri "$api/api/auth/login" -ContentType 'application/json' `
         -Body '{"correo":"docente@espe.edu.ec","password":"secreto123"}'
$token = $login.token

# 3. Crear reserva (201) con el token
$h = @{ Authorization = "Bearer $token" }
$reserva = Invoke-RestMethod -Method Post -Uri "$api/api/reservas" -Headers $h -ContentType 'application/json' `
           -Body '{"sala":"Sala A-101","fecha":"2026-11-25","horaInicio":"08:00","horaFin":"10:00"}'

# 4. Listar reservas (200)
Invoke-RestMethod -Method Get -Uri "$api/api/reservas" -Headers $h

# 5. ACTIVIDAD 1: recuperación de contraseña (200 con tokenTemporal)
Invoke-RestMethod -Method Post -Uri "$api/api/auth/recover" -ContentType 'application/json' `
  -Body '{"correo":"docente@espe.edu.ec"}'

# 6. ACTIVIDAD 2: editar la reserva creada (200)
Invoke-RestMethod -Method Put -Uri "$api/api/reservas/$($reserva.reserva._id)" -Headers $h `
  -ContentType 'application/json' -Body '{"sala":"Sala A-102","horaInicio":"11:00","horaFin":"13:00"}'
```

Comprobaciones de seguridad sugeridas:

- Llamar `GET /api/reservas` **sin** encabezado `Authorization` → debe responder **`401`**.
- Registrarse con un segundo usuario y usar su token para editar la reserva del primero →
  debe responder **`403`**.
- Llamar `recover` con un correo inexistente → debe responder **`404`**.

---

## 10. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| `[MongoDB] no fue posible conectar` | El servicio de MongoDB no está arrancado o `MONGODB_URI` es incorrecta. |
| `EADDRINUSE` al arrancar | El puerto 3000 está ocupado: cambiar `PORT` en `.env` o cerrar el proceso anterior. |
| `401` en todas las rutas protegidas | El token expiró (1 h) o se envió sin el prefijo `Bearer `. |
| `Invalid IP address: undefined` en Newman | Usar `127.0.0.1` en lugar de `localhost` como `baseUrl`. |
| `409` al ejecutar la colección por segunda vez | El correo ya existe: cambiar `correo`/`correo2` en las variables de la colección. |

---

## 11. Documentación complementaria

El informe completo de la práctica (resumen, introducción, objetivos, marco teórico, descripción del
procedimiento paso a paso con capturas, desarrollo de las dos actividades, conclusiones,
recomendaciones, bibliografía y anexos con el código fuente) se entrega por separado en formato
`.docx`, junto con la colección de Postman y el reporte de su ejecución.
