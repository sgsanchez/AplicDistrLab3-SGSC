const mongoose = require('mongoose');

/** Expresion regular para horas en formato HH:mm (00:00 a 23:59) */
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Modelo de Reserva
 * Cada reserva pertenece a un usuario (relacion por ObjectId) y ocupa
 * una sala en una fecha y franja horaria determinada.
 */
const reservaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'La reserva debe pertenecer a un usuario'],
      index: true
    },
    sala: {
      type: String,
      required: [true, 'La sala es obligatoria'],
      trim: true,
      minlength: [2, 'El nombre de la sala debe tener al menos 2 caracteres']
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria']
    },
    horaInicio: {
      type: String,
      required: [true, 'La hora de inicio es obligatoria'],
      match: [REGEX_HORA, 'La hora de inicio debe tener el formato HH:mm']
    },
    horaFin: {
      type: String,
      required: [true, 'La hora de fin es obligatoria'],
      match: [REGEX_HORA, 'La hora de fin debe tener el formato HH:mm']
    },
    motivo: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'El motivo no puede superar los 200 caracteres']
    }
  },
  { timestamps: true, versionKey: false }
);

/** Indice compuesto para consultar rapidamente las reservas de una sala/dia */
reservaSchema.index({ sala: 1, fecha: 1 });

module.exports = mongoose.model('Reserva', reservaSchema);
