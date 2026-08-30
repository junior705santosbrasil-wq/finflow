# Guia de Deploy do FinFlow (Grátis + Permanente)

Este guia publica o FinFlow na internet, de graça, com dados **permanentes**.
Stack: **Render** (hospeda o site, grátis) + **Neon** (banco Postgres, grátis e que não expira).

Total: **3 contas** (GitHub, Neon, Render). Leva ~15 min.

---

## PASSO 1 — Criar conta no GitHub

1. Acesse **https://github.com/signup**
2. Preencha e-mail, senha e confirme o link por e-mail.
3. Ao criar, anote seu **nome de usuário** (ex.: `joaosilva`).

---

## PASSO 2 — Criar o repositório e enviar o código

1. Acesse **https://github.com/new**
2. Repository name: `finflow`
3. Deixe **Public** (é só o código do app, sem seus dados).
4. **NÃO** marque nada (não criar README/gitignore/license — o repositório deve estar vazio).
5. Clique **Create repository**.

Depois de criar, você verá uma página com comandos. Copie a versão que usa **HTTPS** (algo como `https://github.com/SEU_USUARIO/finflow.git`).

### Configurar o Git local e enviar

Abra o **Prompt de Comando** ou **PowerShell** e rode (troque SEU_USUARIO):

```bash
cd C:\Users\junio\Downloads\financeiro

git remote add origin https://github.com/SEU_USUARIO/finflow.git
git branch -M main
git push -u origin main
```

O git vai pedir login do GitHub. Aparecerá uma janela **"Sign in with your browser"** — clique e faça login no navegador.

> Se o login pelo navegador não funcionar, use um token:
> 1. https://github.com/settings/tokens → **Generate new token (classic)**
> 2. Marque a caixa **repo** → Generate → copie o token
> 3. Quando o git pedir usuário, coloque seu usuário; quando pedir **Password**, cole o token.

---

## PASSO 3 — Criar o banco de dados Postgres (Neon)

1. Acesse **https://neon.tech** → **Sign up** (criar conta grátis, sem cartão).
2. Após entrar, clique **Create a project** → dê o nome `finflow` → **Create**.
3. Na tela seguinte, copie a **Connection string** que aparece (UM dos formatos é o ideal):
   - Use a que vem **com senha** (algo como `postgresql://usuario:senha@ep-xxxx.region.aws.neon.tech/finflow?sslmode=require`)
4. Guarde essa URL — vai ser usada no próximo passo. Deixe a aba do Neon aberta.

---

## PASSO 4 — Publicar no Render

1. Acesse **https://render.com** → **Sign up** (botão *GitHub* para entrar rápido).
2. Depois de entrar, clique **New +** → **Web Service**.
3. Conecte ao GitHub e escolha o repositório `finflow`.
4. Deixe as configurações:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Em **Instance Type**, escolha **Free**.
6. Clique em **Advanced** (ou preencha na tela) e adicione as **Environment Variables**:
   - `DATABASE_URL` = a URL que você copiou do Neon
   - `JWT_SECRET` = uma senha longa qualquer, ex.: `jx7K2mP9...` (invente!)
7. Clique **Create Web Service**. O Render vai baixar o código e subir o app (1–3 min).
8. Quando terminar, o Render mostra uma URL do tipo **`https://finflow-xxxx.onrender.com`**. É só abrir!

---

## PASSO 5 — Enviar o link para os amigos

Pronto! Compartilhe a URL do Render (ex.: `https://finflow-xxxx.onrender.com`).

Cada pessoa cria a **própria conta** (e-mail + senha) e os dados ficam **separados**.
Sem cartão de crédito, sem banco, sem Open Finance — tudo manual. 🔒

---

## Dicas úteis

- **Free tier do Render** "dorme" após ~15 min sem uso; ao visitar de novo, ele acorda em ~50s. Não é um problema.
- Para garantir que **nenhuma atualização futura** altere seu código: é só editar e dar `git push` que o Render atualiza sozinho.
- Se algum amigo esquecer a senha, não há recuperação automática (sem e-mail transaction) — nesse caso, exclua o usuário direto no Neon.

## Para rodar localmente (opcional)

Local usa Postgres também. Crie um arquivo `.env` na pasta com:
```
DATABASE_URL=sua_url_do_neon
JWT_SECRET=qualquer_senha
```
E rode `npm start`.
