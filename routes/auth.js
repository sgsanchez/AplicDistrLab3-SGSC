const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const router = express.Router();

/**
 * Genera un JWT firmado con el id y el correo del usuario.
 * @param {object} usuario documento de Mongoose
 * @returns {string} token
 */
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, correo: usuario.correo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '1h' }
  );
}

/** Normaliza el correo recibido (minusculas y sin espacios) */
const normalizarCorreo = (correo) => String(correo).trim().toLowerCase();

/**
 * Traduce un error de Mongoose a una respuesta HTTP entendible.
 */
function responderError(error, res) {
  if (error.name === 'ValidationError') {
    const detalles = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ ok: false, mensaje: 'Datos invalidos', detalles });
  }
  if (error.code === 11000) {
    return res
      .status(409)
      .json({ ok: false, mensaje: 'Ya existe un usuario registrado con ese correo' });
  }
  console.error('[auth] error no controlado:', error);
  return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
}

/* ------------------------------------------------------------------
 * POST /api/auth/register  -> Paso 6: registro de usuario
 * ------------------------------------------------------------------ */
router.post('/register', async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Los campos nombre, correo y password son obligatorios'
      });
    }

    const correoNormalizado = normalizarCorreo(correo);
    const existente = await Usuario.findOne({ correo: correoNormalizado });
    if (existente) {
      return res
        .status(409)
        .json({ ok: false, mensaje: 'Ya existe un usuario registrado con ese correo' });
    }

    const usuario = await Usuario.create({
      nombre: String(nombre).trim(),
      correo: correoNormalizado,
      password: String(password)
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      usuario,
      token: generarToken(usuario)
    });
  } catch (error) {
    return responderError(error, res);
  }
});

/* ------------------------------------------------------------------
 * POST /api/auth/login  -> Paso 6: inicio de sesion
 * ------------------------------------------------------------------ */
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'Los campos correo y password son obligatorios' });
    }

    // Se usa select('+...') implicito: password si esta en el esquema
    const usuario = await Usuario.findOne({ correo: normalizarCorreo(correo) });
    if (!usuario) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales invalidas' });
    }

    const coincide = await usuario.compararPassword(String(password));
    if (!coincide) {
      return res.status(401).json({ ok: false, mensaje: 'Credenciales invalidas' });
    }

    return res.json({
      ok: true,
      mensaje: `Bienvenido ${usuario.nombre}`,
      usuario,
      token: generarToken(usuario)
    });
  } catch (error) {
    return responderError(error, res);
  }
});

/* ------------------------------------------------------------------
 * POST /api/auth/recover  -> ACTIVIDAD 1
 * Valida que el correo exista, genera un token temporal de expiracion
 * corta y devuelve un mensaje simulado (no se envia correo real).
 * ------------------------------------------------------------------ */
router.post('/recover', async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res
        .status(400)
        .json({ ok: false, mensaje: 'El campo correo es obligatorio' });
    }

    const usuario = await Usuario.findOne({ correo: normalizarCorreo(correo) });
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No existe una cuenta asociada al correo indicado'
      });
    }

    // Token temporal en texto plano (se "enviaria" por correo)
    const tokenTemporal = crypto.randomBytes(24).toString('hex');
    const minutos = Number(process.env.RESET_TOKEN_MINUTOS) || 15;

    // En la base se guarda unicamente el hash SHA-256 del token
    usuario.resetToken = crypto.createHash('sha256').update(tokenTemporal).digest('hex');
    usuario.resetTokenExpira = new Date(Date.now() + minutos * 60 * 1000);
    await usuario.save({ validateBeforeSave: false });

    return res.json({
      ok: true,
      mensaje: `Se envio un enlace de recuperacion al correo ${usuario.correo} (envio simulado, no se utiliza servidor de correo)`,
      // Se devuelve el token SOLO con fines academicos para poder probarlo en Postman
      tokenTemporal,
      expiraEn: `${minutos} minutos`,
      expiraEl: usuario.resetTokenExpira
    });
  } catch (error) {
    return responderError(error, res);
  }
});

module.exports = router;
