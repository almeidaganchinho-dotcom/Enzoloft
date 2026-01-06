# Configuração de Autenticação Admin

Este projeto usa **Firebase Authentication** para proteger a área de administração.

## Criar Utilizador Admin

### Opção 1: Via Firebase Console (Recomendado)
1. Aceda ao [Firebase Console](https://console.firebase.google.com/project/enzoloft/authentication/users)
2. Vá para **Authentication** > **Users**
3. Clique em **Add user**
4. Insira:
   - **Email**: seu email seguro
   - **Password**: password forte (mínimo 6 caracteres)
5. Clique em **Add user**

### Opção 2: Via Script Node.js
⚠️ **Requer Service Account Key**

1. Baixe a chave de serviço:
   - Vá para [Project Settings](https://console.firebase.google.com/project/enzoloft/settings/serviceaccounts/adminsdk) > Service Accounts
   - Clique em **Generate new private key**
   - Salve como `enzoloft-51508-firebase-adminsdk.json` na raiz do projeto

2. Instale dependências:
```bash
npm install firebase-admin --save-dev
```

3. Execute o script:
```bash
node scripts/create-admin-user.js
```

4. Siga as instruções no terminal

## Segurança

✅ **Implementado:**
- Firebase Authentication com hash de passwords
- Tokens JWT para sessões
- Proteção contra força bruta (Firebase rate limiting)
- HTTPS obrigatório em produção

⚠️ **Importante:**
- Use passwords fortes (12+ caracteres, mistura de maiúsculas, minúsculas, números e símbolos)
- Nunca partilhe suas credenciais
- Ative 2FA no email associado à conta admin
- A chave `enzoloft-51508-firebase-adminsdk.json` NÃO deve ser commitada ao Git

## Login

URL: https://enzoloft-51508.web.app/admin/login

Use o email e password que criou no Firebase Authentication.

## Logout

O botão de logout está no canto superior direito do dashboard.
