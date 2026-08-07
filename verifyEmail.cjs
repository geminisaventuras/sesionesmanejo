const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('C:\\keys\\motoescuelapp-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.cert(serviceAccount)
});

const auth = getAuth();

async function verifyAdminEmail() {
  const email = 'armandoaventurasve@gmail.com';
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { emailVerified: true });
    console.log(`✅ Correo ${email} verificado exitosamente.`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ El usuario ${email} no existe en el proyecto.`);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
  process.exit(0);
}

verifyAdminEmail();