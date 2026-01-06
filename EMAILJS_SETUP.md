# Configuração do EmailJS para EnzoLoft

Este projeto usa EmailJS para envio de emails automáticos. Siga os passos abaixo para configurar:

## 1. Criar Conta no EmailJS

1. Aceda a https://www.emailjs.com/
2. Crie uma conta gratuita (permite 200 emails/mês)
3. Confirme seu email

## 2. Adicionar Serviço de Email

1. No dashboard do EmailJS, vá para **Email Services**
2. Clique em **Add New Service**
3. Escolha seu provedor de email (Gmail, Outlook, etc.)
4. Siga as instruções para conectar sua conta
5. Copie o **Service ID** gerado

## 3. Criar Templates de Email

### Template 1: Nova Reserva (template_new_reservation)

1. Vá para **Email Templates**
2. Clique em **Create New Template**
3. Nome do template: `template_new_reservation`
4. **Subject**: `✅ Reserva EnzoLoft - Confirmação de Pedido`
5. **Content** (copie e cole):

```html
Olá {{guest_name}},

Obrigado por escolher o EnzoLoft!

Recebemos o seu pedido de reserva com os seguintes detalhes:

📋 RESUMO DA RESERVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Propriedade: {{property_name}}
📍 Localização: {{property_location}}

👤 Nome: {{guest_name}}
📧 Email: {{guest_email}}
📞 Telefone: {{guest_phone}}

📅 Check-in: {{check_in}}
📅 Check-out: {{check_out}}
🌙 Noites: {{nights}}
👥 Hóspedes: {{guests_count}}

💰 Preço Total: €{{total_price}}
🎁 {{voucher_info}}

📊 Status: {{status}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ A sua reserva está pendente de confirmação. Receberá um email assim que for aprovada.

Se tiver alguma dúvida, não hesite em contactar-nos:
📧 {{property_email}}

Obrigado!
Equipa EnzoLoft
```

6. Clique em **Save**

### Template 2: Atualização de Status (template_status_update)

1. Criar outro template
2. Nome: `template_status_update`
3. **Subject**: `📬 EnzoLoft - Atualização da Sua Reserva`
4. **Content**:

```html
Olá {{guest_name}},

{{status_message}}

📋 DETALHES DA RESERVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Propriedade: {{property_name}}
📍 Localização: {{property_location}}

📅 Check-in: {{check_in}}
📅 Check-out: {{check_out}}
🌙 Noites: {{nights}}
👥 Hóspedes: {{guests_count}}

💰 Preço Total: €{{total_price}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se tiver alguma questão, contacte-nos:
📧 {{property_email}}
📞 {{property_phone}}

Obrigado por escolher o EnzoLoft!
Equipa EnzoLoft
```

5. Clique em **Save**

## 4. Obter Public Key

1. No dashboard, vá para **Account** → **General**
2. Copie a **Public Key**

## 5. Configurar no Código

Edite o arquivo `lib/emailService.ts` e substitua:

```typescript
const EMAILJS_CONFIG = {
  serviceId: 'SEU_SERVICE_ID_AQUI',      // Cole aqui
  publicKey: 'vQQD08CqAu_cZ6mU3',      // Cole aqui
  templates: {
    newReservation: 'template_new_reservation',
    statusUpdate: 'template_status_update',
  }
};
```

## 6. Testar

1. Execute `npm run build`
2. Execute `firebase deploy --only hosting`
3. Crie uma reserva de teste no site
4. Verifique se recebeu o email
5. No admin, mude o status da reserva
6. Verifique se recebeu o email de atualização

## 7. Monitoramento

- Aceda ao dashboard do EmailJS para ver estatísticas de emails enviados
- Limite gratuito: 200 emails/mês
- Para mais emails, considere upgrade para plano pago

## Troubleshooting

**Emails não chegam:**
- Verifique spam/lixo
- Confirme que Service ID e Public Key estão corretos
- Verifique console do navegador (F12) para erros
- Certifique-se que os nomes dos templates estão corretos

**Erro de CORS:**
- No EmailJS dashboard, vá para Security
- Adicione seu domínio: `enzoloft-51508.web.app`

**Emails vão para spam:**
- Configure SPF/DKIM no seu provedor de email
- Use email profissional (evite Gmail pessoal)
