import { z } from 'zod';

// Esquema para paso 1 (datos personales + salud)
export const paso1Schema = z.object({
  nombre: z.string().min(2, 'Nombre: mínimo 2 letras').max(50),
  apellido: z.string().min(2, 'Apellido: mínimo 2 letras').max(50),
  cedula: z.string().regex(/^\d{7,10}$/, 'Cédula: 7 a 10 dígitos'),
  diaNac: z.string().regex(/^\d{1,2}$/, 'Día inválido'),
  mesNac: z.string().regex(/^\d{1,2}$/, 'Mes inválido'),
  anoNac: z.string().regex(/^\d{4}$/, 'Año inválido'),
  sexo: z.enum(['Masculino', 'Femenino'], { message: 'Selecciona sexo' }),
  estado: z.string().min(1, 'Selecciona estado'),
  zona: z.string().min(1, 'Indica zona'),
  correo: z.string().email('Correo inválido'),
  telefono: z.string().regex(/^\d{11}$/, 'Teléfono: 11 dígitos'),
  contactoEmergencia: z.string().regex(/^\d{11}$/, 'Contacto emergencia: 11 dígitos'),
  condicionMedica: z.enum(['si', 'no'], { message: 'Completa información de salud' }),
  detalleCondicion: z.string().optional(),
});

// Esquema para paso 4 (pago)
export const paso4Schema = z.object({
  pagoBanco: z.string().min(1, 'Selecciona banco'),
  pagoTelefono: z.string().regex(/^\d{11}$/, 'Teléfono origen: 11 dígitos'),
  pagoCedula: z.string().regex(/^\d{7,10}$/, 'Cédula titular: 7 a 10 dígitos'),
  pagoRef: z.string().regex(/^\d{4}$/, 'Referencia: 4 dígitos'),
});

// Esquemas de login
export const loginEmailSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Contraseña: mínimo 6 caracteres'),
});

export const loginEstudianteSchema = z.object({
  correo: z.string().email('Correo inválido'),
  pin: z.string().regex(/^\d{6}$/, 'PIN: 6 dígitos'),
});

// Esquema completo de inscripción
export const inscripcionSchema = z.object({
  nombre: z.string().min(2).max(50),
  apellido: z.string().min(2).max(50),
  cedula: z.string().regex(/^\d{7,10}$/),
  diaNac: z.string().regex(/^\d{1,2}$/),
  mesNac: z.string().regex(/^\d{1,2}$/),
  anoNac: z.string().regex(/^\d{4}$/),
  sexo: z.enum(['Masculino', 'Femenino']),
  estado: z.string().min(1),
  zona: z.string().min(1),
  correo: z.string().email(),
  telefono: z.string().regex(/^\d{11}$/),
  contactoEmergencia: z.string().regex(/^\d{11}$/),
  sabeBicicleta: z.enum(['Sí', 'No']),
  traeMoto: z.enum(['Sí', 'No']),
  tipoMoto: z.enum(['Automática', 'Sincrónica']),
  cursoId: z.string(),
  sedeId: z.string(),
  condicionMedica: z.enum(['si', 'no']),
  detalleCondicion: z.string().optional(),
});

// Funciones de validación
export function validarPaso1(datos) {
  const result = paso1Schema.safeParse(datos);
  if (!result.success) {
    const errores = {};
    result.error.issues.forEach(issue => {
      const campo = issue.path[0];
      if (!errores[campo]) errores[campo] = issue.message;
    });
    return { success: false, errores };
  }
  
  // Validar mayoría de edad
  const { diaNac, mesNac, anoNac } = result.data;
  const fechaNac = new Date(`${anoNac}-${mesNac.padStart(2, '0')}-${diaNac.padStart(2, '0')}T12:00:00`);
  if (isNaN(fechaNac.getTime())) {
    return { success: false, errores: { fechaNac: 'Fecha de nacimiento inválida' } };
  }
  
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  if (edad < 18) {
    return { success: false, errores: { fechaNac: 'Debes ser mayor de 18 años' } };
  }
  
  return { success: true, data: result.data };
}

export function validarPaso4(datos) {
  const result = paso4Schema.safeParse(datos);
  if (!result.success) {
    const errores = {};
    result.error.issues.forEach(issue => {
      const campo = issue.path[0];
      if (!errores[campo]) errores[campo] = issue.message;
    });
    return { success: false, errores };
  }
  return { success: true, data: result.data };
}

export function validarInscripcionCompleta(datos) {
  const result = inscripcionSchema.safeParse(datos);
  if (!result.success) {
    const errores = {};
    result.error.issues.forEach(issue => {
      const campo = issue.path[0];
      if (!errores[campo]) errores[campo] = issue.message;
    });
    return { success: false, errores };
  }
  return { success: true, data: result.data };
}