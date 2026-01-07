// Script de diagnóstico para testar Resend
// Execute: node scripts/test-resend.js

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

async function testResend() {
  console.log('🔍 Verificando configuração do Resend...\n');
  
  // Verificar API Key
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não encontrada no .env.local');
    process.exit(1);
  }
  
  console.log('✅ RESEND_API_KEY encontrada:', apiKey.substring(0, 10) + '...');
  console.log('✅ ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'não configurado');
  console.log('');
  
  // Inicializar Resend
  const resend = new Resend(apiKey);
  
  // Tentar enviar email de teste
  console.log('📧 Tentando enviar email de teste...\n');
  
  try {
    const result = await resend.emails.send({
      from: 'Enzo Loft <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL || 'test@example.com',
      subject: '🧪 Teste Resend - EnzoLoft',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #b45309;">✅ Resend Funcionando!</h1>
          <p>Este é um email de teste do sistema EnzoLoft.</p>
          <p>Se você está recebendo isto, a integração com Resend está funcionando corretamente.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Enviado em: ${new Date().toLocaleString('pt-PT')}<br>
            API Key: ${apiKey.substring(0, 10)}...
          </p>
        </div>
      `
    });
    
    if (result.error) {
      console.error('❌ Erro ao enviar email:');
      console.error(JSON.stringify(result.error, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Email enviado com sucesso!');
    console.log('📬 ID do email:', result.data.id);
    console.log('\n✨ Verifique sua caixa de entrada (e pasta de spam)!');
    console.log('📧 Email enviado para:', process.env.ADMIN_EMAIL);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Resposta:', await error.response.text());
    }
    process.exit(1);
  }
}

testResend();
