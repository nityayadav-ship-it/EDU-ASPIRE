# EDU-ASPIRE — Cloud LMS (GitHub Pages + Supabase)

EDU-ASPIRE is a student/tutor/admin Learning Management System built with plain
HTML, CSS and JavaScript. It uses **Supabase Cloud** for authentication,
PostgreSQL data and course-thumbnail storage, and **GitHub Pages** for free
static hosting.

## Cloud architecture

```text
GitHub Pages
    │
    │ HTTPS
    ▼
EDU-ASPIRE HTML/CSS/JS
    │
    ▼
Supabase Cloud
 ┌────────────┬─────────────┬──────────────┐
 │ Auth       │ PostgreSQL  │ Storage      │
 │ Login      │ Courses     │ Thumbnails   │
 │ Register   │ Profiles    │ Images       │
 └────────────┴─────────────┴──────────────┘
```

## 1. Configure Supabase

1. Create/open the friend's Supabase project.
2. Open **SQL Editor → New query**.
3. Paste the complete contents of `supabase-schema.sql` and run it.
4. Open **Project Settings → API**.
5. Copy the **Project URL** and the **anon/public key**.
6. Put them in `js/supabase-config.js`:

```js
export const supabaseConfig = {
  url: "YOUR_SUPABASE_PROJECT_URL",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

The anon/public key is intended for frontend use. **Never put the `service_role`
key in this project.**

### Email confirmation

The registration flow works with email confirmation enabled. For a classroom
demo you may optionally disable **Authentication → Providers → Email →
Confirm email** so newly created test accounts can log in immediately.

## 2. Create the first admin/tutor

Register normally. Then in Supabase:

**Table Editor → profiles → find the account → change `role`**

Use:
- `student` for learners
- `tutor` for course creators
- `admin` for administrators

The database prevents a normal user from changing their own role.

## 3. Test locally

From this folder, use any static server. For example:

```bash
npx serve .
```

Then open the URL printed by the command. Do not open the HTML files directly
with `file://`.

## 4. Publish on GitHub Pages

Create a GitHub repository, upload the project files to the repository root,
then enable:

**Repository → Settings → Pages → Deploy from branch → `main` → `/ (root)`**

The site will be available at:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

## 5. Supabase Auth URL

After you know the GitHub Pages URL, open:

**Supabase → Authentication → URL Configuration**

Set the **Site URL** to the GitHub Pages URL. Add the same URL under
**Redirect URLs** if required by the project's authentication settings.

## Project modules

- Student registration/login
- Student dashboard
- Course browsing
- Course details
- Likes
- Bookmarks
- Progress tracking
- Comments
- Tutor course creation
- Course thumbnail uploads
- Admin user/course view
- Supabase cloud database and authentication

## Important

Do not commit:
- Supabase `service_role` keys
- passwords
- private API keys
- `.env` files containing secrets

The only Supabase credential expected in the frontend is the public `anon` key.
