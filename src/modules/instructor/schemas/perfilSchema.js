// @build: 2026-09-03 | id: INSTRUCTOR-PERFIL-SCHEMA-V2 | backup: perfilSchema.backup-20260903-000000 | desc: Esquema ampliado de perfil del instructor con validación isomórfica
import { z } from 'zod';

export const perfilInstructorSchema = z.object({
  nombre: z.string()
    .min(1, 'Nombre es requerido')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  apellido: z.string()
    .max(100, 'Apellido no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),
  telefono: z.string()
    .regex(/^\d{10,15}$/, 'Teléfono debe tener entre 10 y 15 dígitos')
    .optional()
    .or(z.literal('')),
  especialidad: z.string()
    .max(200, 'Especialidad no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, 'Bio no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  fotoUrl: z.string()
    .url('URL de foto inválida')
    .optional()
    .or(z.literal(''))
});

export default perfilInstructorSchema;
