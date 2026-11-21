# PermiConduit

Plateforme de mise en relation entre élèves et moniteurs de conduite en Tunisie — Votre permis commence ici.

## Configuration locale

1. Installer les dépendances :

```sh
bun install
```

2. Configurer `.env` avec vos identifiants Supabase :

```env
SUPABASE_PROJECT_ID="mpqdatzadwkapjfgjzkq"
SUPABASE_URL="https://mpqdatzadwkapjfgjzkq.supabase.co"
SUPABASE_PUBLISHABLE_KEY="votre_publishable_key"
VITE_SUPABASE_PROJECT_ID="mpqdatzadwkapjfgjzkq"
VITE_SUPABASE_URL="https://mpqdatzadwkapjfgjzkq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="votre_publishable_key"
```

> Pour les opérations serveur admin (`supabaseAdmin`), ajoutez `SUPABASE_SERVICE_ROLE_KEY` uniquement dans `.env.local` (jamais commité dans Git ni préfixé par `VITE_`).

3. Exécuter le schéma SQL [supabase/schema.sql](supabase/schema.sql) dans le **SQL Editor** de votre projet Supabase.

4. Lancer le serveur de développement :

```sh
bun run dev
```
