# Opções de Deploy com API Routes

## Problema Atual

O Firebase Hosting serve apenas arquivos estáticos (`output: 'export'`), mas agora temos API routes para enviar emails via Resend que requerem um servidor Node.js.

## Soluções

### 🎯 Opção 1: Vercel (Recomendado - Mais Simples)

**Vantagens:**
- ✅ Suporte nativo para API routes Next.js
- ✅ Deploy automático via GitHub
- ✅ SSL grátis
- ✅ Edge functions globais
- ✅ Zero configuração

**Como fazer:**
1. Criar conta em [vercel.com](https://vercel.com)
2. Conectar repositório GitHub
3. Adicionar variáveis de ambiente:
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy automático!

**Importante:** 
- Manter Firebase apenas para Firestore e Authentication
- Apontar domínio para Vercel ao invés de Firebase Hosting

---

### 🔧 Opção 2: Firebase Cloud Functions + Hosting

**Vantagens:**
- ✅ Tudo no Firebase
- ✅ Mesma plataforma do Firestore

**Desvantagens:**
- ❌ Configuração mais complexa
- ❌ Requer plano Blaze (pago)
- ❌ Cold starts

**Como fazer:**
1. Converter API routes para Cloud Functions
2. Configurar rewrites no firebase.json
3. Deploy separado de functions

---

### 📧 Opção 3: Enviar Emails do Cliente (Temporário)

**Vantagens:**
- ✅ Funciona com Firebase Hosting estático
- ✅ Sem servidor necessário

**Desvantagens:**
- ❌ API key exposta no cliente (segurança)
- ❌ Não recomendado para produção

**Implementação:**
Chamar Resend diretamente do navegador (não seguro).

---

### ⚡ Opção 4: Firebase Extensions (Alternativa)

Usar extensões do Firebase para emails:
- [Trigger Email](https://extensions.dev/extensions/firebase/firestore-send-email)
- Configurar com SendGrid, Mailgun, etc.

---

## 🚀 Recomendação

Para produção com emails funcionando:

**Use Vercel** - é a solução mais simples e profissional.

Para desenvolvimento local, continue usando `npm run dev` que suporta API routes.

## Deploy Atual (Sem Emails)

Por enquanto, posso fazer deploy no Firebase Hosting **sem** as API routes de email. O site funcionará, mas emails não serão enviados em produção.

Quer que eu:
1. **Faça deploy no Firebase sem emails** (site funcionará, mas sem notificações)
2. **Configure Vercel para deploy completo** (site + emails funcionando)
3. **Outra solução?**
