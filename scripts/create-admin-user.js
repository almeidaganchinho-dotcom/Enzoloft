/**
 * Script para criar utilizador admin no Firebase Authentication
 * Execute: node scripts/create-admin-user.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Inicializar Firebase Admin SDK
const serviceAccount = require('../enzoloft-51508-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  try {
    console.log('\n=== Criar Utilizador Admin ===\n');
    
    const email = await question('Email do admin: ');
    const password = await question('Password (mínimo 6 caracteres): ');
    
    if (password.length < 6) {
      console.error('❌ A password deve ter pelo menos 6 caracteres');
      rl.close();
      return;
    }
    
    // Criar utilizador
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: true,
      disabled: false
    });
    
    console.log('\n✅ Utilizador admin criado com sucesso!');
    console.log('Email:', userRecord.email);
    console.log('UID:', userRecord.uid);
    console.log('\nPode agora fazer login em: https://enzoloft-51508.web.app/admin/login');
    
  } catch (error) {
    console.error('\n❌ Erro ao criar utilizador:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.log('Este email já está registado.');
    }
  } finally {
    rl.close();
  }
}

createAdminUser();
