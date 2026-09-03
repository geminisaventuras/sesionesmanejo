// @build: 2026-09-03 | id: INSTRUCTOR-PERFIL-SCHEMA | backup: perfilSchema.backup-20260903-000000 | desc: Esquema de validación isomórfica para perfil del instructor
import { z } from 'zod';

export const perfilInstructorSchema = z.object({
  telefono: z.string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .max(15, 'Teléfono no puede exceder 15 dígitos')
    .regex(/^\d+$/, 'Teléfono solo puede contener números')
    .optional()
    .or(z.literal('')),
  nombre: z.string().min(1).optional(),
  apellido: z.string().optional(),
  correo: z.string().email().optional(),
  especialidad: z.string().optional(),
  bio: z.string().max(500).optional()
});

export default perfilInstructorSchema;
