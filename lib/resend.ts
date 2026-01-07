import { Resend } from 'resend';

// Inicializar Resend com a chave da API
// Obter a chave em: https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };
