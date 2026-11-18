/**
 * Punto de entrada de la API REST de reservas de salas.
 * Practica N. 3 - Aplicaciones Distribuidas - ESPE
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');

const app = express();

// ------------------------- Middlewares globales -------------------------
app.use(cors());
app.use(express.json());

// ------------------------- Rutas -------------------------
app.get('/', (req, res) => {
  res.json({
    ok: true,
    servicio: 'API REST - Reservas de Salas',
    version: '1.0.0',
    endpoints: {
      publicos: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/recover'
      ],
      protegidos: [
        'GET /api/reservas',
        'POST /api/reservas',
        'PUT /api/reservas/:id',
        'DELETE /api/reservas/:id'
      ]
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservasRoutes);

// ------------------------- 404 -------------------------
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// ------------------------- Manejador global de errores -------------------------
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ ok: false, mensaje: 'El cuerpo de la peticion no contiene un JSON valido' });
  }
  console.error('[server] error no controlado:', error);
  return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
});

// ------------------------- Arranque -------------------------
const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[MongoDB] conectado a ${process.env.MONGODB_URI}`);
    app.listen(PORT, () => {
      console.log(`[Servidor] escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[MongoDB] no fue posible conectar:', error.message);
    process.exit(1);
  }
}

iniciar();
