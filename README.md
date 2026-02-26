# Enzo Loft — Sistema de Reservas com Firebase

Sistema completo de reservas para alojamento turístico com Firebase (Firestore + Authentication) e Resend para emails.

## Funcionalidades

- ✅ Formulário de reservas no site público
- ✅ Calendário interativo com datas bloqueadas
- ✅ Sistema de preços por época
- ✅ Vouchers/cupons de desconto
- ✅ Dashboard administrativo protegido
- ✅ Firebase Authentication (Email/Password)
- ✅ Emails automáticos via Resend.com
- ✅ Analytics e gráficos de ocupação

## Tecnologias

- **Frontend:** Next.js 16 + React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Emails:** Resend.com
- **Charts:** Recharts
- **Hosting:** Firebase Hosting

## Setup Local

### 1. Alinhar versão do Node (recomendado)
```bash
nvm use
```

Se não tiver `nvm`, use Node `20.19.0` (ou qualquer `20.x`) com `npm >= 10`.

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
RESEND_API_KEY=re_sua_chave_aqui
ADMIN_EMAIL=admin@enzoloft.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Veja [.env.example](.env.example) para referência.

### 4. Executar em desenvolvimento
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## Configuração

### Firebase
A configuração do Firebase já está feita em [`lib/firebase.ts`](lib/firebase.ts).  
Para usar o seu próprio projeto Firebase, substitua as credenciais.

### Resend (Emails)
Consulte [RESEND_SETUP.md](RESEND_SETUP.md) para instruções completas de configuração de emails.

### Autenticação Admin
Consulte [ADMIN_AUTH.md](ADMIN_AUTH.md) para criar utilizadores admin.

## Estrutura do Projeto

```
Enzoloft/
├── lib/                    # Configurações e utilitários
│   ├── firebase.ts         # Configuração Firebase
│   ├── resend.ts           # Configuração Resend
│   └── utils.ts            # Funções auxiliares
├── pages/
│   ├── index.tsx           # Página pública com formulário
│   ├── admin/
│   │   ├── login.tsx       # Login administrativo
│   │   └── dashboard.tsx   # Dashboard admin
│   └── api/
│       └── send-email.ts   # API para envio de emails
├── styles/
│   └── globals.css         # Estilos globais
└── public/                 # Assets estáticos
```

## Firebase Collections

### `reservations`
```typescript
{
  id: string
  propertyId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  startDate: string
  endDate: string
  guestsCount: number
  totalPrice: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: string
  voucher?: {
    code: string
    discount: number
    originalPrice: number
  }
}
```

### `availability`
```typescript
{
  id: string
  startDate: string
  endDate: string
  reason: string
  status: 'blocked'
}
```

### `prices`
```typescript
{
  id: string
  season: string
  description?: string
  pricePerNight: number
  startDate: string
  endDate: string
}
```

### `vouchers`
```typescript
{
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  expiryDate: string
}
```

### `settings/contactInfo`
```typescript
{
  location: string
  email: string
  phone: string
  description: string
  mapsUrl: string
}
```

## Deploy

### Firebase Hosting

1. Instalar Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login:
```bash
firebase login
```

3. Configurar variáveis de ambiente:
```bash
firebase functions:config:set resend.api_key="sua_chave"
firebase functions:config:set admin.email="admin@enzoloft.com"
```

4. Deploy:
```bash
npm run firebase:deploy
```

Consulte [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md) para mais detalhes.

## SEO e Indexação (Google)

### O que já está configurado no projeto

- `sitemap.xml` em `https://enzoloft.pt/sitemap.xml`
- `robots.txt` com sitemap e bloqueio da área `/admin`
- Canonical, Open Graph, Twitter Cards e Schema.org na homepage
- `noindex` nas páginas administrativas

### Ativar verificação Search Console

1. No Google Search Console, adicione a propriedade `https://enzoloft.pt`
2. Escolha verificação por **tag HTML**
3. Copie o token e adicione em `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=SEU_TOKEN_AQUI
```

4. Deploy:

```bash
npm run firebase:deploy
```

### Pedir indexação imediata

1. Abra o Search Console → **Inspeção de URL**
2. Teste e solicite indexação de:
  - `https://enzoloft.pt/`
3. Em **Sitemaps**, submeta:
  - `https://enzoloft.pt/sitemap.xml`

## Troubleshooting

- **Problemas de autenticação:** Veja [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md)
- **Emails não chegam:** Veja [RESEND_SETUP.md](RESEND_SETUP.md#10-troubleshooting)
- **Erros de deploy:** Veja [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md)

## Licença

Privado - Todos os direitos reservados
