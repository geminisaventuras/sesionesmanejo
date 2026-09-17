// @build: 2026-09-03 | id: INSTRUCTOR-PERFIL-TAB | backup: PerfilTab.backup-20260903-000000 | desc: Pestaña de perfil ampliado con validación Zod y avatar de iniciales
import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { perfilInstructorSchema } from '../schemas/perfilSchema';
import AvatarIniciales from './AvatarIniciales';
import { useToast } from '../../shared/components/ToastProvider';
import { Button } from '../../../components/UI';

export default function PerfilTab({ user, saveInstructor }) {
  const { showToast } = useToast();
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState(user?.data || {});
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    const validacion = perfilInstructorSchema.safeParse(perfil);

    if (!validacion.success) {
      const erroresFormateados = {};
      validacion.error.errors.forEach(err => {
        erroresFormateados[err.path[0]] = err.message;
      });
      setErrores(erroresFormateados);
      showToast('Corrige los errores antes de guardar', 'error');
      return;
    }

    setErrores({});
    setGuardando(true);

    try {
      await saveInstructor({ ...user.data, ...perfil });
      showToast('Perfil actualizado correctamente', 'success');
      setEditando(false);
    } catch (error) {
      console.error('[PerfilTab] Error guardando:', {
        action: 'savePerfil',
        userId: user?.uid,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      showToast('Error al guardar perfil', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mi Perfil</h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <AvatarIniciales
            nombre={perfil.nombre}
            apellido={perfil.apellido}
            size="lg"
          />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">
              {perfil.nombre} {perfil.apellido}
            </h3>
            <p className="text-sm text-gray-500">
              {perfil.especialidad || 'Instructor'}
            </p>
          </div>
          {!editando && (
            <Button onClick={() => setEditando(true)} variant="outline">
              Editar
            </Button>
          )}
        </div>

        {perfil.bio && !editando && (
          <p className="text-sm text-gray-600 mt-3">{perfil.bio}</p>
        )}
      </div>

      {editando && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Editar Perfil</h3>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Nombre</label>
            <input
              type="text"
              value={perfil.nombre || ''}
              onChange={e => setPerfil({ ...perfil, nombre: e.target.value })}
              className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${
                errores.nombre ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            {errores.nombre && <p className="text-xs text-red-600 mt-1">{errores.nombre}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Apellido</label>
            <input
              type="text"
              value={perfil.apellido || ''}
              onChange={e => setPerfil({ ...perfil, apellido: e.target.value })}
              className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${
                errores.apellido ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            {errores.apellido && <p className="text-xs text-red-600 mt-1">{errores.apellido}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Teléfono</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="\d+"
              value={perfil.telefono || ''}
              onChange={e => setPerfil({ ...perfil, telefono: e.target.value.replace(/\D/g, '') })}
              className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${
                errores.telefono ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            {errores.telefono && <p className="text-xs text-red-600 mt-1">{errores.telefono}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Especialidad</label>
            <input
              type="text"
              value={perfil.especialidad || ''}
              onChange={e => setPerfil({ ...perfil, especialidad: e.target.value })}
              className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none ${
                errores.especialidad ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            {errores.especialidad && <p className="text-xs text-red-600 mt-1">{errores.especialidad}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Bio</label>
            <textarea
              rows={4}
              maxLength={500}
              value={perfil.bio || ''}
              onChange={e => setPerfil({ ...perfil, bio: e.target.value })}
              className={`w-full bg-gray-50 border-2 rounded-xl py-2.5 px-3 text-sm outline-none resize-none ${
                errores.bio ? 'border-red-400' : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            <p className="text-xs text-gray-500 text-right mt-1">{(perfil.bio || '').length}/500</p>
            {errores.bio && <p className="text-xs text-red-600 mt-1">{errores.bio}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleGuardar}
              variant="success"
              disabled={guardando}
              icon={Save}
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              onClick={() => {
                setEditando(false);
                setPerfil(user?.data || {});
                setErrores({});
              }}
              variant="outline"
              icon={X}
            >
              Cancelar
            </Button>
          </div>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {guardando && 'Guardando perfil...'}
          </div>
        </div>
      )}
    </div>
  );
}
