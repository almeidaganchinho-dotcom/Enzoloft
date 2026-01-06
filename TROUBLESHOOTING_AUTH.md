# Troubleshooting - Firebase Authentication

## Problema: Não consigo fazer login

### Passo 1: Verificar se Email/Password está ativado
1. Vá para: https://console.firebase.google.com/project/enzoloft/authentication/providers
2. Verifique se **"Email/Password"** está com toggle VERDE (ativado)
3. Se estiver cinza/desativado, clique nele e ative

### Passo 2: Verificar domínios autorizados
1. Vá para: https://console.firebase.google.com/project/enzoloft/authentication/settings
2. Na aba **"Authorized domains"**, verifique se existe:
   - `enzoloft-51508.web.app`
   - `enzoloft-51508.firebaseapp.com`
3. Se não existir, clique em **"Add domain"** e adicione ambos

### Passo 3: Verificar se o utilizador foi criado
1. Vá para: https://console.firebase.google.com/project/enzoloft/authentication/users
2. Confirme que o utilizador aparece na lista
3. Verifique se o email está correto (sem espaços extra)

### Passo 4: Teste com DevTools
1. Abra https://enzoloft-51508.web.app/admin/login
2. Pressione **F12** para abrir DevTools
3. Vá para a aba **Console**
4. Tente fazer login
5. Veja se aparece algum erro em vermelho

**Erros comuns e soluções:**

- `auth/operation-not-allowed` → Email/Password não está ativado (Passo 1)
- `auth/unauthorized-domain` → Domínio não autorizado (Passo 2)
- `auth/invalid-credential` → Email ou password errados
- `auth/user-not-found` → Utilizador não existe (Passo 3)

### Passo 5: Limpar cache do browser
1. Pressione **Ctrl+Shift+Delete**
2. Selecione "Cached images and files"
3. Limpe e tente novamente

### Passo 6: Testar com outro browser
Tente fazer login com Chrome/Firefox em modo anónimo/privado
