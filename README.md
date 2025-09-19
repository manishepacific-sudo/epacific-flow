# Welcome to your Lovable project

## Authentication & Admin Bootstrap System

This project features a complete authentication system with admin bootstrap functionality and user invitation flows.

### Demo Admin Account (Development Only)

For development and testing purposes, a demo admin account is available:

**Email:** `admin@demo.local`  
**Password:** `Admin@123`

⚠️ **IMPORTANT:** This demo account should be removed in production environments.

### Features

#### 🔐 Authentication System
- **Secure Login:** Email/password authentication with Supabase Auth
- **Magic Link Invitations:** Admin can invite users via email
- **First-time Password Setup:** Invited users set their password on first login
- **Role-based Access:** Admin, Manager, and User roles with appropriate permissions
- **Demo Account Support:** Marked with `is_demo = true` for filtering

#### 👤 User Management
- **Admin Bootstrap:** Automatic demo admin creation on first deployment
- **User Invitations:** Admins can invite users with specific roles
- **Password Requirements:** Strong password validation with visual feedback
- **Profile Management:** User profiles with roles and metadata

#### 🎨 Modern UI/UX
- **Glassmorphism Design:** Beautiful animated glass-effect login interface
- **Responsive Layout:** Works perfectly on mobile and desktop
- **Framer Motion Animations:** Smooth transitions and micro-interactions
- **Accessible Forms:** ARIA labels and keyboard navigation support

## Project info

**URL**: https://lovable.dev/projects/548fe184-ba6f-426c-bdf6-cf1a0c71f09d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/548fe184-ba6f-426c-bdf6-cf1a0c71f09d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/548fe184-ba6f-426c-bdf6-cf1a0c71f09d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
