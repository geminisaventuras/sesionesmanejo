const admin = require('firebase-admin');
const serviceAccount = require('C:\\keys\\motoescuelapp-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.cert(serviceAccount)
});

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

async function seedDatabase() {
  const basePath = 'artifacts/motoescuela-pro-v1/public/data';

  // Verificar si ya tiene datos
  const configSnap = await db.collection(basePath + '/configuraciones').get();
  if (!configSnap.empty) {
    console.log('⚠️ La base de datos ya tiene datos. Actualizando proveedor y admin...');
    
    // Actualizar documento admin1 con el campo nombre (merge: true para no sobrescribir)
    await db.doc(basePath + '/admins/admin1').set({
      nombre: 'Administrador'
    }, { merge: true });
    console.log('✅ Documento admin1 actualizado con campo "nombre".');

    // Crear proveedor de ejemplo si no existe
    const proveedorRef = db.doc(basePath + '/proveedores/prov1');
    const proveedorSnap = await proveedorRef.get();
    if (!proveedorSnap.exists) {
      await proveedorRef.set({
        id: 'prov1',
        nombre: 'Proveedor de Ejemplo',
        email: 'proveedor@example.com',
        activo: true
      });
      console.log('✅ Proveedor de ejemplo creado.');
    } else {
      console.log('⚠️ El proveedor de ejemplo ya existe.');
    }
    
    process.exit(0);
  }

  // Si no hay datos, sembrar todo desde cero
  console.log('🌱 Iniciando siembra completa...');

  // Configuraciones
  await db.doc(basePath + '/configuraciones/main').set({
    monedaPagoStaff: 'USD', tasaUSD: 600, tasaEUR: 700, precioBase: 35,
    recargoGuarenas: 5, recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0,
    pagoInstructor: 15, pagoProveedor: 10, autoTasas: false,
    pagoMovilEscuela: { banco: 'Banesco', telefono: '04127185256', cedula: '19497344', codigo: '0134' },
    monedaCobroClientes: 'EUR'
  });

  // Sedes
  await db.doc(basePath + '/sedes/sede1').set({ id: 'sede1', nombre: 'Guarenas', direccion: 'Av. Principal', activo: true });
  await db.doc(basePath + '/sedes/sede2').set({ id: 'sede2', nombre: 'Caracas', direccion: 'Centro', activo: true });

  // Horarios
  const horarios = [
    { id: 'h1', label: '08:00 AM - 10:00 AM', activo: true, isLunch: false },
    { id: 'h2', label: '10:00 AM - 12:00 PM', activo: true, isLunch: false },
    { id: 'h3', label: '12:00 PM - 02:00 PM', activo: true, isLunch: true },
    { id: 'h4', label: '02:00 PM - 04:00 PM', activo: true, isLunch: false },
    { id: 'h5', label: '04:00 PM - 06:00 PM', activo: true, isLunch: false }
  ];
  for (const h of horarios) {
    await db.doc(basePath + '/horarios/' + h.id).set(h);
  }

  // Cursos
  await db.doc(basePath + '/cursos/c1').set({ id: 'c1', nombre: 'Básico', modulos: ['Teoría', 'Práctica'], activo: true });
  await db.doc(basePath + '/cursos/c2').set({ id: 'c2', nombre: 'Intermedio', modulos: ['Teoría', 'Práctica', 'Carretera'], activo: true });

  // Instructores
  await db.doc(basePath + '/instructores/095xu7THRRXnvRNfCVkm4xFy1vm1').set({
    id: '095xu7THRRXnvRNfCVkm4xFy1vm1', nombre: 'Armando', email: 'armandoaventurasve@gmail.com', sedes: ['sede2', 'sede1'], activo: true, esPrincipal: true
  });
  await db.doc(basePath + '/instructores/oImFwkGGjDRxxG2unUB7T762IuA2').set({
    id: 'oImFwkGGjDRxxG2unUB7T762IuA2', nombre: 'Leonardo', email: 'leonardo@example.com', sedes: ['sede2'], activo: true, esPrincipal: false
  });

  // Motos
  await db.doc(basePath + '/motos/1782055081899').set({ id: '1782055081899', tipo: 'Automática', sedes: ['sede1', 'sede2'], activo: true });
  await db.doc(basePath + '/motos/1782055104779').set({ id: '1782055104779', tipo: 'Sincrónica', sedes: ['sede2'], activo: true });

  // Proveedor de ejemplo
  await db.doc(basePath + '/proveedores/prov1').set({
    id: 'prov1',
    nombre: 'Proveedor de Ejemplo',
    email: 'proveedor@example.com',
    activo: true
  });

  // Admin
  await db.doc(basePath + '/admins/admin1').set({
    email: 'armandoaventurasve@gmail.com',
    role: 'admin',
    nombre: 'Administrador'
  });

  console.log('✅ Siembra completada exitosamente.');
}

seedDatabase().catch(err => {
  console.error('❌ Error durante la siembra:', err);
  process.exit(1);
});