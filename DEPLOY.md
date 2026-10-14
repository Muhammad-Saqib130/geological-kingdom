# Putting Geological Kingdom online

The shop is made of four free services:

| Service | What it does |
|---|---|
| **Vercel** | Shows the website to visitors (fast, worldwide) |
| **Render** or **Railway** | Runs the server: orders, accounts, admin, emails |
| **MongoDB Atlas** | Stores the data: products, orders, customers |
| **Cloudinary** | Stores the photos, payment proofs and investigation reports |

Visitors only ever see your Vercel address. Vercel quietly passes requests for data (`/api`) to
the server. That keeps sign-in cookies on your own address, so sign-in works in every browser,
Safari included.

It takes about 30 minutes. You'll copy a few things into a notes app along the way:

- the database address (`MONGODB_URI`)
- three Cloudinary keys
- your server address, e.g. `https://geological-kingdom-api.onrender.com`
- your shop address, e.g. `https://geological-kingdom.vercel.app`
- an admin email and password

---

## 0. Merge the pull request

On GitHub, open the open pull request and click **Merge pull request**. Every service below
deploys from the `main` branch.

## 1. Database: MongoDB Atlas

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up. "Sign up with Google" is fastest.
2. When it asks you to deploy a cluster, choose **M0 (Free)**.
   - Provider: **AWS**. Region: **Mumbai (ap-south-1)**, the closest to Pakistan.
   - Click **Create Deployment**.
3. A window asks you to create a database user.
   - Username: `gkadmin`.
   - Click **Autogenerate Secure Password**, then **Copy**, and paste it into your notes.
   - Click **Create Database User**.
4. Click **Choose a connection method**, then **Drivers**. Copy the address that starts with
   `mongodb+srv://`:
   ```
   mongodb+srv://gkadmin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Edit it in your notes:
   - Replace `<db_password>` (including the `< >`) with the password from step 3.
   - Add `geological-kingdom` right after `.mongodb.net/`:
   ```
   mongodb+srv://gkadmin:YOURPASSWORD@cluster0.abcde.mongodb.net/geological-kingdom?retryWrites=true&w=majority&appName=Cluster0
   ```
   This is your **MONGODB_URI**.
6. In the left menu, click **Network Access**, then **Add IP Address**, then
   **Allow Access from Anywhere** (`0.0.0.0/0`), then **Confirm**.
   Free servers have no fixed IP address, so this is needed. The password still protects the database.

## 2. Photos: Cloudinary

1. Sign up at <https://cloudinary.com/users/register_free>.
2. Go to **Settings** (gear icon), then **API Keys**. Copy these into your notes:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click the eye icon to show it)
3. Go to **Settings**, then **Security**. Turn on **Allow delivery of PDF and ZIP files** and
   click **Save**. Gem Investigation reports can be PDFs, and new accounts block PDF links.

## 3. Server: Render

(Prefer Railway? Skip to [3b](#3b-server-railway-instead-of-render).)

1. Go to <https://dashboard.render.com/register> and sign up with **GitHub**.
2. Click **New +**, then **Blueprint**. Pick the **geological-kingdom** repository.
3. Render reads `render.yaml` and asks for these values:

   | Name | What to enter |
   |---|---|
   | `CLIENT_URL` | `https://geological-kingdom.vercel.app` for now. You'll fix it in step 6 if your Vercel address turns out different. |
   | `MONGODB_URI` | From step 1 |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From step 2 |
   | `ADMIN_EMAIL` | The email you'll sign in to the admin with |
   | `ADMIN_PASSWORD` | A new password of **at least 12 characters**. Save it in your notes. |

4. Click **Apply**. The first deploy takes 3–5 minutes.
5. When it says **Live**, copy the address at the top of the page into your notes, e.g.
   `https://geological-kingdom-api.onrender.com`. That's your **server address**.
6. Check it: open `<your server address>/api/health`. It should say `"status":"ok"`.

On the first start, the server fills the empty database with 12 sample gemstones and creates your
admin account.

> **Render's free plan sleeps after 15 idle minutes.** The first visitor after a quiet spell waits
> about a minute, and may see an error until the server has woken. For a shop taking real orders,
> switch the service to **Starter** ($7/month) in **Settings**, then **Instance Type**.

### 3b. Server: Railway instead of Render

1. Go to <https://railway.com> and sign in with GitHub. Click **New Project**, then
   **Deploy from GitHub repo**, and pick **geological-kingdom**.
2. Click the new service, then **Settings**:
   - **Root Directory**: `server`
   - **Custom Start Command**: `npm start`
   - **Healthcheck Path**: `/api/health`
3. Open **Variables**, then **Raw Editor**, and paste the following. Fill in your values; for
   `JWT_SECRET`, use any random string of 40 or more letters and digits.
   ```
   NODE_ENV=production
   SERVE_CLIENT=false
   TRUST_PROXY=2
   CLIENT_URL=https://geological-kingdom.vercel.app
   MONGODB_URI=
   JWT_SECRET=
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ADMIN_EMAIL=
   ADMIN_PASSWORD=
   SEED_ON_START=true
   ```
4. Go to **Settings**, then **Networking**, then **Generate Domain**. Copy the address
   (e.g. `https://geological-kingdom-production.up.railway.app`). That's your **server address**.

Railway charges by use (about $5/month for a small shop) and doesn't sleep.

## 4. Point the shop at the server

1. On GitHub, open `client/vercel.json` and click the pencil icon to edit it.
2. Replace every `YOUR-SERVER.onrender.com` (5 places) with your server address, without `https://`.
   For example: `geological-kingdom-api.onrender.com`.
3. Click **Commit changes** (to `main`).

If this step is skipped, the Vercel build stops with a message reminding you.

## 5. Shop: Vercel

1. Go to <https://vercel.com/signup> and sign up with **GitHub**.
2. Click **Add New…**, then **Project**, then **Import** next to **geological-kingdom**.
3. **Root Directory**: click **Edit** and choose `client`. Vercel detects **Vite** by itself.
4. Optionally, open **Environment Variables** and add any of these:
   - `VITE_CONTACT_EMAIL`: shown in the footer
   - `VITE_INSTAGRAM_URL`, `VITE_FACEBOOK_URL`, `VITE_TIKTOK_URL`, `VITE_YOUTUBE_URL`
   - `VITE_WHATSAPP_NUMBER`: only a fallback; you set the real number in the admin in step 7
5. Click **Deploy**. When it's done, copy the address it shows, e.g.
   `https://geological-kingdom.vercel.app`. That's your **shop address**.

## 6. Connect them

If your shop address is exactly what you entered as `CLIENT_URL` in step 3, skip this step.
Otherwise:

1. Render: open the service, then **Environment**. Set `CLIENT_URL` to your shop address
   (with `https://`, no `/` at the end). Click **Save Changes**; the server restarts.
2. Railway: open the service, then **Variables**, and change `CLIENT_URL`.

The server uses `CLIENT_URL` for:
- links in emails;
- card payment returns;
- the sitemap and link previews;
- accepting sign-ins.

If it's wrong, sign-in fails with "unexpected origin".

## 7. First sign-in

1. Open `<your shop address>/login` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. Go to **Settings**:
   - your WhatsApp number (with `+92`);
   - the exchange rate;
   - shipping prices;
   - your real bank, JazzCash and Easypaisa details.
3. Go to **Products**: edit or delete the 12 samples and add your own stones.
4. Place a test order with cash on delivery, then find it under **Orders**.
5. Send a product link to yourself on WhatsApp. The preview shows the stone's photo, name and price.

### Get found on Google

1. Go to <https://search.google.com/search-console> and add your shop address as a
   **URL prefix** property.
2. To verify, choose **HTML tag** and copy only the code inside `content="…"`. In Vercel, open the
   project, then **Settings**, then **Environment Variables**. Add `VITE_GOOGLE_SITE_VERIFICATION`
   with that code, then **Redeploy** (from the **Deployments** tab). Back in Search Console, click
   **Verify**.
3. Go to **Sitemaps**, enter `sitemap.xml` and click **Submit**.

---

## Optional

### Order emails

Add these to the server's environment (Render: **Environment**; Railway: **Variables**). For
Gmail, first create an [App Password](https://myaccount.google.com/apppasswords).

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=the 16-letter app password
MAIL_FROM=Geological Kingdom <you@gmail.com>
```

### Card payments (Stripe)

Stripe isn't available to businesses registered in Pakistan, so skip this unless you have a
Stripe account abroad. With one:

1. Add `STRIPE_SECRET_KEY` to the server's environment.
2. In Stripe, go to **Developers**, then **Webhooks**, and add the endpoint
   `<your server address>/api/webhooks/stripe` with the event `checkout.session.completed`.
   Use the server address here, not the Vercel one.
3. Copy the webhook's signing secret into `STRIPE_WEBHOOK_SECRET`.

### Your own domain

1. In Vercel, open the project, then **Settings**, then **Domains**. Add your domain and follow the
   DNS instructions.
2. Change the server's `CLIENT_URL` to `https://your-domain.com`.

Nothing else changes: the shop keeps forwarding to the same server.

---

## If something goes wrong

| What you see | What to do |
|---|---|
| Vercel build fails: "client/vercel.json still says YOUR-SERVER…" | Do step 4. |
| The site loads but shows no products, or "Something went wrong" | Open `<shop address>/api/health`. If it isn't `ok`, check the server's logs (Render: **Logs**; Railway: **Deployments**, then **View logs**). Also check that `vercel.json` has the right server address. |
| Server log: `Failed to connect to MongoDB` | Check `MONGODB_URI` (password, database name), and that Atlas Network Access allows `0.0.0.0/0`. |
| Server log: `Invalid environment variables` | The lines below it name the setting to fix. |
| Sign-in says "Request blocked: unexpected origin" | `CLIENT_URL` doesn't match your shop address exactly (step 6). |
| Photo uploads fail | Check the three `CLOUDINARY_*` values. |
| A PDF report link shows an error | Step 2.3: allow PDF delivery in Cloudinary. |
| The first page load after a quiet spell is slow | Render's free plan is waking up; see the note in step 3. |

**Forgot the admin password?** On the server, change `ADMIN_EMAIL` to another email address you
own and set a new `ADMIN_PASSWORD`. When the server restarts, a new admin account is created with
those details.

---

## Alternative: everything on Render (no Vercel)

The server can also show the website itself, as one service. That's simpler, but slower for
visitors far from Singapore, and the whole site sleeps on the free plan. Create a **Web Service**
(not a Blueprint) from the repository with:

- **Build Command**:
  ```
  npm ci --prefix server --omit=dev && npm ci --prefix client --include=dev && npm run build --prefix client
  ```
- **Start Command**: `npm start --prefix server`
- **Health Check Path**: `/api/health`
- **Environment**: the same variables as step 3, but without `SERVE_CLIENT` and `TRUST_PROXY`.
  Leave `CLIENT_URL` out too: it defaults to the Render address.
