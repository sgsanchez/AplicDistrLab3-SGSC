const express = require('express');
const mongoose = require('mongoose');
const Reserva = require('../models/Reserva');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas de reservas requieren un JWT valido
router.use(authMiddleware);

/** Devuelve true si la cadena es una fecha valida en formato YYYY-MM-DD o ISO */
function fechaValida(valor) {
  const fecha = new Date(valor);
  return !Number.isNaN(fecha.getTime());
}

/**
 * Valida la coherencia de la franja horaria.
 * Al estar en formato HH:mm la comparacion lexicografica es equivalente
 * a la comparacion cronologica.
 */
function franjaHorariaValida(horaInicio, horaFin) {
  return horaFin > horaInicio;
}

/** Traduce errores de validacion de Mongoose / ObjectId a respuestas HTTP */
function responderError(error, res) {
  if (error.name === 'ValidationError') {
    const detalles = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ ok: false, mensaje: 'Datos invalidos', detalles });
  }
  if (error.name === 'CastError') {
    return res
      .status(400)
      .json({ ok: false, mensaje: 'El identificador de la reserva no es valido' });
  }
  console.error('[reservas] error no controlado:', error);
  return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
}

/* ------------------------------------------------------------------
 * GET /api/reservas -> lista las reservas del usuario autenticado
 * ------------------------------------------------------------------ */
router.get('/', async (req, res) => {
  try {
    const reservas = await Reserva.find({ usuario: req.usuario.id }).sort({ fecha: 1, horaInicio: 1 });
    return res.json({ ok: true, total: reservas.length, reservas });
  } catch (error) {
    return responderError(error, res);
  }
});

/* ------------------------------------------------------------------
 * POST /api/reservas -> crea una reserva para el usuario autenticado
 * ------------------------------------------------------------------ */
router.post('/', async (req, res) => {
  try {
    const { sala, fecha, horaInicio, horaFin, motivo } = req.body;

    if (!sala || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos sala, fecha, horaInicio y horaFin son obligatorios'
      });
    }

    if (!fechaValida(fecha)) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'La fecha no tiene un formato valido (use YYYY-MM-DD)' });
    }

    if (!franjaHorariaValida(horaInicio, horaFin)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La hora de fin debe ser posterior a la hora de inicio'
      });
    }

    const reserva = await Reserva.create({
      usuario: req.usuario.id,
      sala: String(sala).trim(),
      fecha: new Date(fecha),
      horaInicio,
      horaFin,
      motivo: motivo ? String(motivo).trim() : ''
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Reserva creada correctamente',
      reserva
    });
  } catch (error) {
    return responderError(error, res);
  }
});

/* ------------------------------------------------------------------
 * PUT /api/reservas/:id -> ACTIVIDAD 2
 * Permite editar sala, fecha u horas y valida que la reserva
 * pertenezca al usuario autenticado.
 * ------------------------------------------------------------------ */
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'El identificador de la reserva no es valido' });
    }

    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) {
      return res.status(404).json({ ok: false, mensaje: 'Reserva no encontrada' });
    }

    // Verificacion de propiedad de la reserva
    if (reserva.usuario.toString() !== req.usuario.id) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para modificar una reserva que no le pertenece'
      });
    }

    const { sala, fecha, horaInicio, horaFin, motivo } = req.body;

    if (fecha !== undefined) {
      if (!fechaValida(fecha)) {
        return res
          .status(400)
          .json({ ok: false, mensaje: 'La fecha no tiene un formato valido (use YYYY-MM-DD)' });
      }
      reserva.fecha = new Date(fecha);
    }
    if (sala !== undefined) reserva.sala = String(sala).trim();
    if (horaInicio !== undefined) reserva.horaInicio = horaInicio;
    if (horaFin !== undefined) reserva.horaFin = horaFin;
    if (motivo !== undefined) reserva.motivo = String(motivo).trim();

    if (!franjaHorariaValida(reserva.horaInicio, reserva.horaFin)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La hora de fin debe ser posterior a la hora de inicio'
      });
    }

    await reserva.save();

    return res.json({ ok: true, mensaje: 'Reserva actualizada correctamente', reserva });
  } catch (error) {
    return responderError(error, res);
  }
});

/* ------------------------------------------------------------------
 * DELETE /api/reservas/:id -> cancela (elimina) una reserva propia
 * ------------------------------------------------------------------ */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'El identificador de la reserva no es valido' });
    }

    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) {
      return res.status(404).json({ ok: false, mensaje: 'Reserva no encontrada' });
    }

    if (reserva.usuario.toString() !== req.usuario.id) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para cancelar una reserva que no le pertenece'
      });
    }

    await reserva.deleteOne();

    return res.json({
      ok: true,
      mensaje: 'Reserva cancelada correctamente',
      reservaCancelada: { id: reserva._id, sala: reserva.sala, fecha: reserva.fecha }
    });
  } catch (error) {
    return responderError(error, res);
  }
});

module.exports = router;
