# 🔥 Guia de Deploy no Firebase

## 📋 Pré-requisitos

1. **Conta Firebase**
   - Cria uma conta em [firebase.google.com](https://firebase.google.com)
   - Cria um projeto novo chamado `enzoloft`

2. **Instalar Firebase CLI** (se ainda não tiveres)
   ```bash
   npm install -g firebase-tools
   ```

3. **Login no Firebase**
   ```bash
   firebase login
   ```

## 🚀 Opções de Deploy

### Opção 1: Static Export (Recomendado para começar)

**Vantagens:** Simples, grátis, rápido
**Desvantagens:** Sem API routes, sem SSR

1. **Configurar next.config.js:**
   Descomenta as linhas no `next.config.js`:
   ```js
   output: 'export',
   images: { unoptimized: true },
   ```

2. **Build e Deploy:**
   ```bash
   npm run export
   firebase deploy --only hosting
   ```

### Opção 2: Firebase Hosting + Cloud Functions (SSR)

**Vantagens:** Suporta API routes, SSR, funcionalidades completas
**Desvantagens:** Requer configuração adicional, pode ter custos

1. **Instalar dependências:**
   ```bash
   npm install firebase-admin firebase-functions
   ```

2. **Configurar Functions:**
   - Criar pasta `functions/`
   - Configurar Next.js para rodar em Cloud Functions

3. **Deploy:**
   ```bash
   firebase deploy
   ```

### Opção 3: Firebase Hosting + Cloud Run (Melhor para Next.js moderno)

**Vantagens:** Performance superior, suporta todas as features Next.js
**Desvantagens:** Requer Docker, mais complexo

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Export estático (para opção 1)
npm run export

# Deploy no Firebase
npm run firebase:deploy

# Testar localmente antes do deploy
npm run firebase:serve
```

## 🗄️ Base de Dados

### Opção A: Firestore (Nativa Firebase)
- Melhor integração com Firebase
- Grátis até 50k leituras/dia
- Requer migração do código Prisma

### Opção B: PostgreSQL Cloud (Atual)
- Manter Prisma
- Usar Supabase, Railway, ou Neon
- Configurar DATABASE_URL no `.env`

### Opção C: Híbrido
- Firestore para dados em tempo real
- PostgreSQL para dados estruturados

## 🔧 Configuração Atual

✅ `firebase.json` - Configuração de hosting
✅ `.firebaserc` - Projeto Firebase
✅ `next.config.js` - Configuração Next.js
✅ Scripts npm preparados

## 📌 Próximos Passos

1. **Criar projeto Firebase:**
   ```bash
   firebase projects:create enzoloft
   firebase use enzoloft
   ```

2. **Inicializar Firebase:**
   ```bash
   firebase init
   ```
   - Seleciona: Hosting
   - Public directory: `out`
   - Single-page app: `No`
   - GitHub integration: Opcional

3. **Primeiro Deploy:**
   ```bash
   npm run export
   firebase deploy --only hosting
   ```

## 🌐 URL do Site

Depois do deploy, o site ficará disponível em:
- `https://enzoloft.web.app`
- `https://enzoloft.firebaseapp.com`

## 💡 Notas Importantes

- **API Routes:** Se precisares das APIs (`/api/*`), usa Cloud Functions ou Cloud Run
- **Imagens:** Firebase Hosting suporta CDN automático
- **SSL:** Certificado HTTPS automático
- **Custom Domain:** Podes adicionar `enzoloft.com` nas configurações

## 🆘 Troubleshooting

### Erro: "Firebase project not found"
```bash
firebase use --add
```

### Erro: "Build failed"
Verifica se o `.env` tem todas as variáveis necessárias

### Site não atualiza
Limpa o cache:
```bash
firebase hosting:channel:delete preview
```

## 📚 Recursos

- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase + Next.js](https://firebase.google.com/docs/hosting/frameworks/nextjs)
