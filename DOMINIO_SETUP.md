# Configuração do Domínio www.enzoloft.pt

## 🎯 Objetivo
Conectar o domínio **www.enzoloft.pt** ao Firebase Hosting do projeto EnzoLoft.

---

## 📋 Passo a Passo Completo

### 1️⃣ Firebase Console - Adicionar Domínio Personalizado

1. Acede ao Firebase Console (já deve estar aberto):
   - URL: https://console.firebase.google.com/project/enzoloft/hosting/sites

2. Clica em **"Add custom domain"** (Adicionar domínio personalizado)

3. Introduz: `www.enzoloft.pt`

4. Escolhe o modo de configuração:
   - **Quick Setup** (recomendado): Para domínios novos ou migração simples
   - **Advanced Setup**: Para migração sem downtime de outro provider

5. O Firebase irá gerar automaticamente:
   - 📝 **Registo TXT** para verificação de propriedade
   - 🌐 **Registos A** para apontamento (IPs do Firebase)

---

### 2️⃣ Dominios.pt - Configurar DNS

#### Aceder à Gestão DNS

1. Vai a: https://www.dominios.pt
2. Faz login com as tuas credenciais
3. Menu: **"Os Meus Domínios"** ou **"Gestão de Domínios"**
4. Seleciona: `enzoloft.pt`
5. Clica em: **"Gestão DNS"** ou **"Configurar DNS"**

---

#### Registos DNS a Adicionar

O Firebase vai fornecer os valores exatos, mas geralmente serão assim:

##### ✅ Registo TXT - Verificação de Propriedade
```
Tipo:    TXT
Nome:    @ (ou enzoloft.pt)
Valor:   hosting-site=enzoloft-51508
         (ou o código que o Firebase mostrar)
TTL:     3600 (ou automático)
```

##### ✅ Registo A - Apontamento Principal (www)
```
Tipo:    A
Nome:    www
Valor:   [IP fornecido pelo Firebase - normalmente 2 IPs]
TTL:     3600
```

**Nota Importante:** O Firebase fornecerá **2 endereços IP** que deves adicionar como **2 registos A separados**, ambos com:
- Nome: `www`
- Valor: cada um dos IPs fornecidos

---

#### ⚠️ Registos a REMOVER (se existirem)

Para o Firebase funcionar corretamente, **remove** estes registos se existirem para `www`:
- ❌ Registos **AAAA** (IPv6)
- ❌ Registos **CNAME** que apontem para outros serviços
- ❌ Outros registos **A** antigos

---

### 3️⃣ Validação e Espera

1. **Salva todos os registos** no painel do dominios.pt

2. **Volta ao Firebase Console** e clica em:
   - **"Verify"** (Verificar) - para validar o registo TXT
   - **"Connect"** (Conectar) - após verificação

3. **Aguarda a propagação DNS:**
   - Tempo mínimo: 15-30 minutos
   - Tempo médio: 2-6 horas
   - Tempo máximo: 24-48 horas

4. **Provisão do Certificado SSL:**
   - Automático após propagação DNS
   - Pode demorar até 24 horas
   - Gratuito e gerido pelo Firebase

---

### 4️⃣ Verificar Status

#### No Firebase Console:
Verifica o status do domínio em: https://console.firebase.google.com/project/enzoloft/hosting/sites

**Estados possíveis:**
- 🟡 **Needs Setup**: Registos DNS ainda não propagados
- 🟡 **Pending**: DNS correto, aguardando SSL
- 🟠 **Minting Certificate**: Criando certificado SSL
- 🟢 **Connected**: Tudo pronto! ✅

#### Testar DNS Manualmente:
```powershell
# Verificar registo TXT
nslookup -type=TXT enzoloft.pt

# Verificar registos A para www
nslookup www.enzoloft.pt
```

---

## 🔧 Detalhes para Dominios.pt

### Campos no Painel DNS do Dominios.pt

| Campo Firebase | Campo Dominios.pt | Exemplo |
|----------------|-------------------|---------|
| Type | Tipo de Registo | A, TXT, CNAME |
| Host | Nome / Hostname | www, @, ou vazio |
| Value | Valor / Endereço | IP ou texto |
| TTL | TTL | 3600 ou automático |

### Valores Comuns para "Nome/Host":

- **Domínio raiz** (enzoloft.pt): `@` ou deixar vazio
- **Subdomínio www** (www.enzoloft.pt): `www`

---

## 📞 Suporte

### Se tiveres problemas:

1. **DNS não propaga:**
   - Aguarda mais tempo (até 48h)
   - Verifica se salvaste os registos corretamente
   - Contacta suporte dominios.pt: suporte@dominios.pt

2. **SSL não é emitido:**
   - Verifica se removeste todos os AAAA e CNAME conflituosos
   - Verifica se tens CAA records restritivos
   - Aguarda mais 24h

3. **Erro "needs setup":**
   - Confirma que os IPs estão corretos
   - Usa o comando `nslookup` para verificar DNS

---

## ✅ Checklist Final

- [ ] Firebase Console: Domínio adicionado
- [ ] Dominios.pt: Registo TXT adicionado
- [ ] Dominios.pt: 2 Registos A adicionados (www)
- [ ] Dominios.pt: Registos antigos removidos (AAAA, CNAME)
- [ ] Firebase: Verificação concluída
- [ ] Aguardar propagação (2-24h)
- [ ] Status "Connected" no Firebase
- [ ] Site acessível em https://www.enzoloft.pt

---

## 🎉 Resultado Final

Após configuração completa:
- ✅ https://www.enzoloft.pt → Site EnzoLoft
- ✅ Certificado SSL automático (HTTPS)
- ✅ CDN global do Firebase
- ✅ Renovação automática de certificados

---

**Data de criação:** 24 de Fevereiro de 2026  
**Registrador:** Dominios.pt  
**Firebase Project:** enzoloft (ID: enzoloft-51508)
