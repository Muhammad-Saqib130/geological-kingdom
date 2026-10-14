# Putting Geological Kingdom online

The site runs as one service on **Render** (website and API together). The data lives in a
free **MongoDB Atlas** database. Both have free plans, and neither asks for a card to start.

It takes about 15 minutes. You copy two things along the way: a database address and an admin
password. Keep a notes app open.

> **Free-plan limits**
> - The site sleeps after 15 minutes with no visitors, so the next visit takes about a minute to load.
> - Photos uploaded in the admin are deleted whenever the server restarts. That's fine for a preview.
>   Before taking real orders, connect Cloudinary (step 4).
> - No emails are sent until email settings are added (step 4).

---

## 1. Create the database (MongoDB Atlas)

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up. "Sign up with Google" is fastest.
2. When it asks you to deploy a cluster, choose **M0 (Free)**.
   - Provider: **AWS**. Region: **Mumbai (ap-south-1)**, the closest to Pakistan.
   - Name: leave as is. Click **Create Deployment**.
3. A "Connect" window appears and asks you to create a database user.
   - Username: `gkadmin`.
   - Click **Autogenerate Secure Password**, then **Copy**, and paste it into your notes.
   - Click **Create Database User**.
4. Click **Choose a connection method**, then **Drivers**. Copy the address that starts with
   `mongodb+srv://`. It looks like this:
   ```
   mongodb+srv://gkadmin:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Edit it in your notes:
   - Replace `<db_password>` (including the `< >`) with the password from step 3.
   - Add the database name `geological-kingdom` right after `.mongodb.net/`:
   ```
   mongodb+srv://gkadmin:YOURPASSWORD@cluster0.abcde.mongodb.net/geological-kingdom?retryWrites=true&w=majority&appName=Cluster0
   ```
   This is your **MONGODB_URI**.
6. Allow Render to connect. In the left menu, click **Network Access**, then **Add IP Address**,
   then **Allow Access from Anywhere** (`0.0.0.0/0`), then **Confirm**.
   Render's free plan has no fixed IP address, so this is required. The password still protects the database.

## 2. Merge the deployment pull request

On GitHub, open the pull request "Deploy to Render with MongoDB Atlas" and click
**Merge pull request**. Render deploys from the `main` branch.

## 3. Create the site on Render

1. Go to <https://dashboard.render.com/register> and sign up with **GitHub**.
2. Click **New +**, then **Blueprint**.
3. Connect your GitHub account if asked, and pick the **geological-kingdom** repository.
4. Render reads `render.yaml` and asks for three values:

   | Name | What to enter |
   |---|---|
   | `MONGODB_URI` | The address from step 1.5 |
   | `ADMIN_EMAIL` | The email you'll use to sign in to the admin |
   | `ADMIN_PASSWORD` | A new password, **at least 12 characters**. Save it in your notes. |

5. Click **Apply**. The first build takes 3–5 minutes.
6. When it says **Live**, open the address at the top of the page,
   e.g. `https://geological-kingdom.onrender.com`.

On the first start, the server fills the empty database with the 12 sample gemstones and
creates your admin account. Sign in at `/login` with the email and password from step 3.4.
Then, in the admin, go to:
- **Settings**: set the exchange rate, shipping prices and your real bank, JazzCash and Easypaisa
  numbers. Customers see these when they pay by transfer.
- **Products**: edit or delete the samples and add your own stones.

### Change the WhatsApp number

In Render, open the service, then **Environment**. Set `VITE_WHATSAPP_NUMBER` to your number in
international format without the `+` (e.g. `923001234567`). Click **Save, rebuild, and deploy**.

## 4. Before taking real orders

Add these in Render, under **Environment**, and click **Save, rebuild, and deploy**.

**Photos that are kept (Cloudinary, free).** Sign up at <https://cloudinary.com>. Then go to
**Settings**, then **API Keys**. Add:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Then **delete** `ALLOW_LOCAL_UPLOADS`, and upload your product photos again.

Gem Investigation reports can be PDFs. New Cloudinary accounts block PDF links by default. To allow
them, go to **Settings**, then **Security**, and turn on **Allow delivery of PDF and ZIP files**.

**Order emails.** Any SMTP provider works. For Gmail, create an
[App Password](https://myaccount.google.com/apppasswords), then add:
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `465`
- `SMTP_SECURE` = `true`
- `SMTP_USER` = your Gmail address
- `SMTP_PASS` = the 16-letter app password
- `MAIL_FROM` = `Geological Kingdom <you@gmail.com>`

**Card payments (optional, Stripe).** Stripe isn't available to Pakistani businesses directly,
so skip this unless you have a Stripe account abroad. With one:
1. Set `STRIPE_SECRET_KEY`.
2. In Stripe, go to **Developers**, then **Webhooks**, and add the endpoint
   `https://YOUR-SITE.onrender.com/api/webhooks/stripe` with the event `checkout.session.completed`.
3. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

Without Stripe, customers pay by bank transfer, JazzCash, Easypaisa or cash on delivery.

**Always awake.** Upgrade the Render service to the **Starter** plan so the site doesn't sleep.

**Your own domain.** In Render, go to **Settings**, then **Custom Domains**. Add the domain and
follow the DNS instructions. Then set `CLIENT_URL` to `https://your-domain.com`, so links in
emails use the new domain.

## If something goes wrong

Open the service in Render and click **Logs**.

| Log message | Fix |
|---|---|
| `Failed to connect to MongoDB` | Check `MONGODB_URI` (password, database name), and that Network Access allows `0.0.0.0/0`. |
| `ADMIN_PASSWORD must be at least 12 characters` | Use a longer password. Save, and Render restarts. |
| `Invalid environment variables` | The lines below it name the setting to fix. |

**Forgot the admin password?** In Render, under **Environment**, change `ADMIN_EMAIL` to another
email address you own and set a new `ADMIN_PASSWORD`. Then click **Save, rebuild, and deploy**.
On restart, a new admin account is created with those details.
