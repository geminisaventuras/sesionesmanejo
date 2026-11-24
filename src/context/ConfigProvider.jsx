import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { normalizarConfigNumerica } from '../modules/shared/utils/configNumerica';
import { fusionarConfiguracion, separarConfiguracion } from '../modules/shared/utils/configuracionHelpers';

const APP_ID = 'motoescuela-pro-v1';

const INITIAL_CONFIG = {
  monedaPagoStaff: 'USD', tasaUSD: 600, tasaEUR: 700, precioBase: 35, recargoGuarenas: 5,
  recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0, pagoInstructor: 15, pagoProveedor: 10,
  autoTasas: false, pagoMovilEscuela: { banco: 'Banesco', telefono: '04127185256', cedula: '19497344', codigo: '0134' }, monedaCobroClientes: 'EUR'
};

export function useConfigProvider(authReady, fbUser, isAdmin = false) {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  // ADR-009 fase 1: `main` es la base operativa para todos; `privada` solo se
  // lee para admin y se fusiona sin cambiar la API del contexto.
  const [configOperativa, setConfigOperativa] = useState(null);
  const [configPrivada, setConfigPrivada] = useState(null);

  useEffect(() => {
    setConfigOperativa(null);
    if (!db || !authReady || !fbUser) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main');
    const unsub = onSnapshot(
      docRef,
      (snap) => { if (snap.exists()) setConfigOperativa(snap.data()); },
      (err) => console.warn('[ConfigProvider] No se pudo leer configuración operativa:', err.code)
    );
    return () => unsub();
  }, [authReady, fbUser]);

  useEffect(() => {
    setConfigPrivada(null);
    // Sin señal fiable de admin no se hace ninguna lectura de `privada`.
    if (!db || !authReady || !fbUser || !isAdmin) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'privada');
    const unsub = onSnapshot(
      docRef,
      (snap) => setConfigPrivada(snap.exists() ? snap.data() : null),
      (err) => {
        // Tolerante: si la lectura falla (permisos, red o documento ausente),
        // se conserva `main` y la UI sigue operando.
        console.warn('[ConfigProvider] No se pudo leer configuración privada; se usa main:', err.code);
        setConfigPrivada(null);
      }
    );
    return () => unsub();
  }, [authReady, fbUser, isAdmin]);

  useEffect(() => {
    if (!configOperativa) {
      setConfig(INITIAL_CONFIG);
      return;
    }
    setConfig(normalizarConfigNumerica(fusionarConfiguracion(configOperativa, isAdmin ? configPrivada : null)));
  }, [configOperativa, configPrivada, isAdmin]);

  const saveConfig = async (newCfg) => {
    const payload = normalizarConfigNumerica(newCfg);
    if (db && fbUser) {
      try {
        // ADR-009 fase 2: `main` solo recibe lo operativo; lo fiscal/interno va a `privada`.
        // `pagoProveedor` sigue en `main` como compatibilidad explícita.
        const { operativa, privada } = separarConfiguracion(payload);
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main'), operativa, { merge: true });
        if (isAdmin && Object.keys(privada).length > 0) {
          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'privada'), privada, { merge: true });
        }
      } catch (err) {
        console.warn('[ConfigProvider] Error al guardar configuración:', err.code);
      }
    } else {
      setConfig(payload);
    }
  };

  return { config, saveConfig, INITIAL_CONFIG };
}