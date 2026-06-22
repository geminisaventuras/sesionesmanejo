// @build: 2026-06-21.FASE3 | id: CONFIG-PROVIDER | desc: Hook de configuración extraído del AppContext monolítico
import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';

const INITIAL_CONFIG = {
  monedaPagoStaff: 'USD', tasaUSD: 36.50, tasaEUR: 39.10, precioBase: 35, recargoGuarenas: 5,
  recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0, pagoInstructor: 15, pagoProveedor: 10,
  autoTasas: false, pagoMovilEscuela: { banco: 'Banesco', telefono: '04141234567', cedula: '12345678', codigo: '0134' }, monedaCobroClientes: 'EUR'
};

export function useConfigProvider(authReady) {
  const [config, setConfig] = useState(INITIAL_CONFIG);

  useEffect(() => {
    if (!db || !authReady) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main');
    const unsub = onSnapshot(docRef, (snap) => { if (snap.exists()) setConfig(snap.data()); });
    return () => unsub();
  }, [authReady]);

  const saveConfig = async (newCfg) => {
    if (db) {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main'), newCfg);
    } else {
      setConfig(newCfg);
    }
  };

  return { config, saveConfig, INITIAL_CONFIG };
}