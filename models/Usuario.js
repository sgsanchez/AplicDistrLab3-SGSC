const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Modelo de Usuario
 * Representa a la persona que puede autenticarse y crear reservas de salas.
 */
const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres']
    },
    correo: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El correo no tiene un formato valido']
    },
    password: {
      type: String,
      required: [true, 'La contrasena es obligatoria'],
      minlength: [6, 'La contrasena debe tener al menos 6 caracteres']
    },
    // Campos usados por la ACTIVIDAD 1 (recuperacion de contrasena)
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpira: {
      type: Date,
      default: null
    }
  },
  { timestamps: true, versionKey: false }
);

/**
 * Hook pre-save: cifra la contrasena con bcrypt antes de guardar.
 * Solo se ejecuta cuando el campo password fue creado o modificado.
 */
usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Metodo de instancia: compara una contrasena en texto plano con el hash.
 * @param {string} passwordPlain contrasena recibida en el login
 * @returns {Promise<boolean>}
 */
usuarioSchema.methods.compararPassword = function (passwordPlain) {
  return bcrypt.compare(passwordPlain, this.password);
};

/**
 * Oculta informacion sensible cuando el documento se serializa a JSON.
 */
usuarioSchema.methods.toJSON = function () {
  const usuario = this.toObject();
  delete usuario.password;
  delete usuario.resetToken;
  delete usuario.resetTokenExpira;
  return usuario;
};

module.exports = mongoose.model('Usuario', usuarioSchema);
