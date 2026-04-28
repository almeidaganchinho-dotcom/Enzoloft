# Deploy na Vercel - Guia Passo a Passo

Este projeto agora está configurado para deploy na Vercel com suporte completo para emails via Resend.

## 🚀 Passos para Deploy

### 1. Criar Conta na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize o acesso ao GitHub

### 2. Importar o Projeto

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Procure pelo repositório **"Enzoloft"**
3. Clique em **"Import"**

### 3. Configurar Variáveis de Ambiente

**IMPORTANTE:** Antes de fazer deploy, adicione estas variáveis:

Na tela de configuração do projeto, vá para **"Environment Variables"** e adicione:

| Nome | Valor |
|------|-------|
| `RESEND_API_KEY` | `re_...` (chave privada do Resend) |
| `ADMIN_EMAIL` | `admin@seudominio.com` |
| `NEXT_PUBLIC_APP_URL` | `https://seu-projeto.vercel.app` (a Vercel mostrará a URL) |

### 4. Deploy

1. Depois de adicionar as variáveis, clique em **"Deploy"**
2. Aguarde ~2 minutos
3. ✅ Pronto! Site online com emails funcionando

### 5. Configurar Domínio (Opcional)

Se tiver domínio próprio (`enzoloft.com`):

1. Vá para **"Settings"** → **"Domains"**
2. Adicione `enzoloft.com` e `www.enzoloft.com`
3. Configure DNS conforme instruções da Vercel
4. Atualize `NEXT_PUBLIC_APP_URL` para o domínio final

## 📧 Emails Funcionando

Após o deploy na Vercel:
- ✅ Emails de confirmação para hóspedes
- ✅ Notificações para admin
- ✅ Emails de cancelamento
- ✅ Todos os templates HTML

## 🔄 Deploys Automáticos

Sempre que você fizer `git push` para o GitHub:
- Vercel detecta automaticamente
- Faz build
- Deploy em produção
- Zero configuração necessária!

## 🆚 Comparação: Firebase vs Vercel

| Recurso | Firebase Hosting | Vercel |
|---------|-----------------|--------|
| Páginas estáticas | ✅ | ✅ |
| API Routes | ❌ | ✅ |
| Emails (Resend) | ❌ | ✅ |
| Deploy automático | Manual | ✅ Automático |
| SSL grátis | ✅ | ✅ |
| Edge network | ✅ | ✅ |

## 💡 Dica

Mantenha:
- **Firestore** e **Authentication** no Firebase (continuam funcionando)
- **Hosting** na Vercel (para API routes e emails)

O site na Vercel conecta-se ao Firebase normalmente para banco de dados e autenticação.

## 🐛 Troubleshooting

**Emails não chegam na Vercel:**
- Verifique se `RESEND_API_KEY` foi adicionada
- Verifique logs: Vercel Dashboard → Functions → Logs
- Confirme que `ADMIN_EMAIL` está definido com um email válido

**Build falha:**
- Verifique se `next.config.js` não tem `output: 'export'`
- Limpe cache: Settings → General → Clear Cache

## 📱 Links Úteis

- [Dashboard Vercel](https://vercel.com/dashboard)
- [Documentação Vercel](https://vercel.com/docs)
- [Logs de Deploy](https://vercel.com/docs/deployments/logs)
