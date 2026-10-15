# ECE Vault (project name: vaniece)

Notes and past papers for ECE students. React + Vite + Supabase. Students browse freely; only admins (you) upload and delete.

## 1. Run locally
```
npm install
cp .env.example .env     # then fill in the two values (step 2)
npm run dev
```

## 2. Set up Supabase (free)
1. Create a project at supabase.com.
2. SQL Editor > paste all of `supabase/schema.sql` > Run.
3. Project Settings > API: copy the Project URL and anon public key into `.env`.
4. Authentication > URL Configuration: add `http://localhost:5173` and your Vercel URL to Site URL / Redirect URLs.

## 3. Make yourself admin
1. Open the site > Admin login > enter your email > click the link in your inbox.
2. In the SQL Editor run:
   `insert into admins select id from auth.users where email = 'you@example.com';`
3. Refresh the site. You now see Upload and Delete.

## 4. Deploy on Vercel
Push to GitHub > import in Vercel, set the Project Name to `vaniece` (your link becomes vaniece.vercel.app if the name is free) > add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables > Deploy.
