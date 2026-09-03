# Migración a Producción — MotoEscuela App

## Cambios de Firestore realizados en desarrollo

### 1. Reglas de Firestore

- `cursos` ahora permite lectura pública:
  - `allow read: if true;`
  - `write` solo admin.

- Nueva colección raíz:
  - `informacionPublica`
  - lectura pública, escritura solo admin.

- `reservas.update` ampliado:
  - instructor: actualizar lista blanca de campos de sesión.
  - estudiante: actualizar `estudiantePresente`.
  - estudiante: rama de corrección de pago intacta.

### 2. Colección `informacionPublica`

Debe crearse en la **raíz** de Firestore, no dentro de `artifacts`.

#### Documento `contacto`

Campos:

- telefono
- whatsapp
- email
- horarioAtencion

#### Documento `sedes`

Debe contener mapas anidados:

- caracas.nombre
- caracas.direccion
- caracas.puntoReferencia
- caracas.horario

- guarenas.nombre
- guarenas.direccion
- guarenas.puntoReferencia
- guarenas.horario

NO usar subcolecciones ni campos con punto.

### 3. Reservas de prueba

No es necesario replicar. Fueron ajustes manuales locales.

### 4. Cursos actualizados

Agregar a estos cursos:

- Equilibrio
- Básico Automática
- Básico Sincrónica
- Práctica en la Vía

Campos nuevos:

- queAprenderas (array)
- dirigidoA (string)
- formato (string)
- vestimenta (string)
- hidratacion (string)
- casco (string)

No se requiere `incluyeMoto`, se deriva de `tipoCurso`.

### 5. Pendiente en producción

- Publicar reglas.
- Crear `informacionPublica/contacto`.
- Crear `informacionPublica/sedes` correctamente.
- Actualizar cursos con nuevos campos.
- Desplegar código actualizado.
- No migrar reservas históricas.
