import { useEffect, useMemo } from 'react';
import { TIPOS_CURSO } from '../constants/tiposCurso';

export function useCursoAutomatico(form, updateForm, cursos, options = {}) {
  const { bloquearCurso = false } = options;

  const cursosActivos = useMemo(
    () => (cursos || []).filter(c => c.activo !== false),
    [cursos]
  );

  const findCursoByTipo = (tipo) => {
    return cursosActivos
      .filter(c => c.tipoCurso === tipo)
      .sort((a, b) => (a.orden || 999) - (b.orden || 999))[0];
  };

  useEffect(() => {
    if (bloquearCurso) return;

    // CASO 1: No sabe bicicleta → Equilibrio + Automática
    if (form.sabeBicicleta === 'No') {
      const cursoEquilibrio = findCursoByTipo(TIPOS_CURSO.EQUILIBRIO);
      if (!cursoEquilibrio) return;

      if (form.tipoMoto !== 'Automática' || form.cursoId !== cursoEquilibrio.id) {
        updateForm({
          tipoMoto: 'Automática',
          cursoId: cursoEquilibrio.id
        });
      }
      return;
    }

    // CASO 2: Sí sabe bicicleta + Automática
    if (form.sabeBicicleta === 'Sí' && form.tipoMoto === 'Automática') {
      const cursoBasicoAuto = findCursoByTipo(TIPOS_CURSO.BASICO_AUTO);
      if (!cursoBasicoAuto) return;

      if (form.cursoId !== cursoBasicoAuto.id) {
        updateForm({ cursoId: cursoBasicoAuto.id });
      }
      return;
    }

    // CASO 3: Sí sabe bicicleta + Sincrónica
    if (form.sabeBicicleta === 'Sí' && form.tipoMoto === 'Sincrónica') {
      const cursoBasicoSincro = findCursoByTipo(TIPOS_CURSO.BASICO_SINCRO);
      if (!cursoBasicoSincro) return;

      if (form.cursoId !== cursoBasicoSincro.id) {
        updateForm({ cursoId: cursoBasicoSincro.id });
      }
    }
  }, [form.sabeBicicleta, form.tipoMoto, form.cursoId, cursosActivos, updateForm, bloquearCurso]);

  const cursoAsignado = cursosActivos.find(c => c.id === form.cursoId);
  const esAutomatico = !bloquearCurso && (
    form.sabeBicicleta === 'No' ||
    (form.sabeBicicleta === 'Sí' && !!form.tipoMoto)
  );

  return { cursoAsignado, esAutomatico };
}