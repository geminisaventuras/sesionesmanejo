// @build: 2026-06-22 | id: CONFIG-PROVIDER | desc: Hook de configuración extraído del AppContext monolítico, con protección de token de autenticación
import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';

const INITIAL_CONFIG = {
  monedaPagoStaff: 'USD', tasaUSD: 600, tasaEUR: 700, precioBase: 35, recargoGuarenas: 5,
  recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0, pagoInstructor: 15, pagoProveedor: 10,
  autoTasas: false, pagoMovilEscuela: { banco: 'Banesco', telefono: '04127185256', cedula: '19497344', codigo: '0134' }, monedaCobroClientes: 'EUR'
};

export function useConfigProvider(authReady, fbUser) {
  const [config, setConfig] = useState(INITIAL_CONFIG);

  useEffect(() => {
    // ✅ CORRECCIÓN: Solo suscribirse si hay token de autenticación (fbUser existe)
    if (!db || !authReady || !fbUser) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main');
    const unsub = onSnapshot(docRef, (snap) => { if (snap.exists()) setConfig(snap.data()); });
    return () => unsub();
  }, [authReady, fbUser]);

  const saveConfig = async (newCfg) => {
    if (db && fbUser) {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main'), newCfg);
    } else {
      setConfig(newCfg);
    }
  };

  return { config, saveConfig, INITIAL_CONFIG };
}