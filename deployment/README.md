# Deployment Instructions

## Prerequisites

Ensure you have SSH access to the server (`188.166.154.230`) as `root`.
Ensure Node.js (v18+) and npm are installed on the server.

## 1. Initial Server Setup

Run these commands on the server to set up the directory structure and permissions (if not handled by the deploy script):

```bash
mkdir -p /var/www/journal/public
mkdir -p /var/www/journal/backend
mkdir -p /var/www/journal/data/entries/.trash
```

## 2. Nginx Configuration

1.  Copy `deployment/nginx-journal.conf` to `/etc/nginx/sites-available/notes.samdriver.xyz` on the server.
2.  Enable the site:
    ```bash
    ln -s /etc/nginx/sites-available/notes.samdriver.xyz /etc/nginx/sites-enabled/
    ```
3.  Test configuration:
    ```bash
    nginx -t
    ```
4.  Reload Nginx:
    ```bash
    systemctl reload nginx
    ```

## 3. Systemd Service

1.  Copy `deployment/journal-backend.service` to `/etc/systemd/system/journal-backend.service` on the server.
2.  Reload systemd daemon:
    ```bash
    systemctl daemon-reload
    ```
3.  Enable the service to start on boot:
    ```bash
    systemctl enable journal-backend
    ```

## 4. First Deployment

Run the deployment script from your local machine:

```bash
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

This will:
- Build the frontend and backend locally.
- Copy files to the server.
- Install backend dependencies on the server.
- Start/Restart the backend service.

## 5. HTTPS Setup (Certbot)

Once the site is running on HTTP (port 80), run Certbot on the server to enable HTTPS:

```bash
certbot --nginx -d notes.samdriver.xyz
```

Follow the prompts. Certbot will automatically update the Nginx configuration to handle SSL and redirects.

## 6. Verification

Visit `https://notes.samdriver.xyz` in your browser.
