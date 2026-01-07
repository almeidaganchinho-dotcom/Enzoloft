# Configuração do Resend.com

Este projeto usa **Resend** para envio de emails transacionais (confirmações de reserva, notificações admin, etc.).

## 1. Criar Conta no Resend

1. Acesse [https://resend.com](https://resend.com)
2. Crie uma conta gratuita (até 3.000 emails/mês grátis)
3. Verifique o seu email

## 2. Obter API Key

1. Acesse o [Dashboard do Resend](https://resend.com/api-keys)
2. Clique em **"Create API Key"**
3. Dê um nome (ex: "EnzoLoft Production")
4. Copie a chave (começa com `re_`)

## 3. Configurar Domínio (Recomendado)

### Opção A: Usar domínio próprio
1. Vá para [Domains](https://resend.com/domains)
2. Clique em **"Add Domain"**
3. Adicione o seu domínio (ex: `enzoloft.com`)
4. Configure os registros DNS conforme instruções:
   - **TXT** para verificação
   - **MX** para receber emails
   - **SPF** e **DKIM** para autenticação

### Opção B: Usar domínio compartilhado (apenas para testes)
- Emails virão de `onboarding@resend.dev`
- Limitado a 100 emails/dia
- Não recomendado para produção

## 4. Configurar Variáveis de Ambiente

### Firebase Hosting (Produção)

Execute no terminal:

```bash
firebase functions:config:set resend.api_key="sua_chave_aqui"
firebase functions:config:set admin.email="admin@enzoloft.com"
```

### Desenvolvimento Local

Crie/edite o arquivo `.env.local` na raiz do projeto:

```env
RESEND_API_KEY=re_sua_chave_aqui
ADMIN_EMAIL=admin@enzoloft.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Tipos de Email Implementados

### Confirmação de Reserva (para hóspede)
- **Trigger:** Quando uma reserva é criada
- **Template:** Email HTML com detalhes da reserva
- **Inclui:** Check-in, check-out, preço, descontos

### Notificação Admin (para administrador)
- **Trigger:** Quando uma reserva é criada
- **Template:** Email HTML com informações do hóspede
- **Inclui:** Link direto para o dashboard

### Cancelamento (para hóspede)
- **Trigger:** Quando admin cancela uma reserva
- **Template:** Email de notificação de cancelamento
- **Inclui:** Datas da reserva, motivo (se fornecido)

## 6. Personalizar Templates

Os templates de email estão em [`pages/api/send-email.ts`](pages/api/send-email.ts).

Para personalizar:
1. Edite as funções `generateReservationConfirmationEmail()`, `generateAdminNotificationEmail()`, etc.
2. Altere cores, textos, layout conforme necessário
3. Mantenha o HTML inline CSS para compatibilidade

## 7. Testar Emails

### Via API diretamente:

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "reservation_confirmation",
    "data": {
      "guestName": "João Silva",
      "guestEmail": "seu-email@example.com",
      "startDate": "2026-06-01",
      "endDate": "2026-06-05",
      "nights": 4,
      "guestsCount": 2,
      "totalPrice": 480,
      "discount": 0
    }
  }'
```

### Via aplicação:
1. Faça uma reserva de teste no site
2. Verifique a caixa de entrada do email fornecido
3. Verifique o painel do Resend para logs de envio

## 8. Monitoramento

1. Acesse [Resend Dashboard > Emails](https://resend.com/emails)
2. Veja todos os emails enviados, status de entrega, aberturas
3. Verifique bounces e reclamações de spam

## 9. Limites do Plano Gratuito

- ✅ 3.000 emails/mês
- ✅ 100 emails/dia
- ✅ Domínio personalizado
- ✅ API ilimitada
- ❌ Sem remoção de branding

Para mais emails, considere upgrading para um plano pago.

## 10. Troubleshooting

### Erro: `Invalid API key`
- Verifique se a variável `RESEND_API_KEY` está configurada
- Confirme que a chave está correta e ativa

### Emails não chegam
- Verifique a pasta de spam
- Confirme que o domínio está verificado
- Veja os logs no dashboard do Resend

### Erro: `Domain not verified`
- Complete a configuração DNS
- Aguarde até 48h para propagação DNS
- Ou use `onboarding@resend.dev` para testes

## 11. Segurança

⚠️ **IMPORTANTE:**
- Nunca commite a API key no código
- Use variáveis de ambiente
- Rotacione a chave periodicamente
- Monitore uso anormal no dashboard

## Links Úteis

- [Documentação Resend](https://resend.com/docs)
- [Dashboard](https://resend.com/overview)
- [API Reference](https://resend.com/docs/api-reference)
- [Status Page](https://status.resend.com)
