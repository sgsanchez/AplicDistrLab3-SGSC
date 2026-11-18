const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticacion basado en JWT.
 * Espera el encabezado:  Authorization: Bearer <token>
 * Si el token es valido agrega la informacion del usuario a req.usuario.
 */
module.exports = function authMiddleware(req, res, next) {
  const encabezado = req.headers.authorization || '';

  if (!encabezado.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Acceso denegado: no se proporciono un token Bearer'
    });
  }

  const token = encabezado.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload = { id, correo, iat, exp }
    req.usuario = { id: payload.id, correo: payload.correo };
    return next();
  } catch (error) {
    const mensaje =
      error.name === 'TokenExpiredError'
        ? 'El token ha expirado, inicie sesion nuevamente'
        : 'Token invalido';
    return res.status(401).json({ ok: false, mensaje });
  }
};
