> **Historical only — AWS Elastic Beanstalk era.**
>
> The server no longer runs on Elastic Beanstalk; it runs on Railway, built from the repo-root `Dockerfile`. The instructions below are kept for reference (in case anyone needs to understand why `.ebextensions/`, `Procfile`, or the `nginx + Let's Encrypt + Route 53` recipe exists in this repo).
>
> For current deploy and operations docs see:
> - `docs/DEPLOYMENT.md`
> - `docs/RUNBOOK.md`
> - `docs/railway-deployment.md`

---

## Deploy steps with ElasticBeanStalk

- eb init -p node.js-22 moana-city --profile personal --region ap-south-1
- eb create moana-city --single --instance_type t2.micro --profile personal --region ap-south-1
- eb deploy

## Infrastructure setup

# AWS Elastic Beanstalk Setup with Custom Domain

This document outlines the steps to configure a custom domain (`moana-server.lokeshinumpudi.com`) to work with an AWS Elastic Beanstalk environment (`moana-city.eba-nkxmxk7x.ap-south-1.elasticbeanstalk.com`) using Nginx as a reverse proxy and Let's Encrypt for SSL.

---

## 1. Elastic Beanstalk Setup

### a. Deploying the Application

- The application is deployed to an AWS Elastic Beanstalk environment.
- It runs on **port 8080** inside the EC2 instance managed by Beanstalk.
- A security group is assigned to allow HTTP (80) and HTTPS (443) traffic.

---

## 2. Custom Domain Configuration

### a. Domain Setup in Route 53

1. In AWS Route 53, create a **CNAME record**:

   - **Name**: `moana-server.lokeshinumpudi.com`
   - **Type**: CNAME
   - **Value**: `moana-city.eba-nkxmxk7x.ap-south-1.elasticbeanstalk.com`
   - **TTL**: 300 seconds (5 minutes)

2. Verify that the domain resolves correctly using:
   ```sh
   nslookup moana-server.lokeshinumpudi.com
   ```

---

## 3. Nginx Reverse Proxy Configuration

### a. Nginx Configuration (`/etc/nginx/nginx.conf`)

```nginx
server {
    listen 80;
    server_name moana-server.lokeshinumpudi.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name moana-server.lokeshinumpudi.com moana-city.eba-nkxmxk7x.ap-south-1.elasticbeanstalk.com;

    ssl_certificate /etc/letsencrypt/live/moana-server.lokeshinumpudi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moana-server.lokeshinumpudi.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### b. Restart Nginx

```sh
sudo systemctl restart nginx
```

### c. Test Nginx Configuration

```sh
sudo nginx -t
```

---

## 4. SSL Certificate with Let's Encrypt

### a. Install Certbot & Generate SSL Certificate

```sh
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d moana-server.lokeshinumpudi.com
```

### b. Verify SSL Renewal (Runs Automatically)

```sh
sudo certbot renew --dry-run
```

---

## 5. Security Group Configuration

- **Inbound Rules**:
  - **HTTP (80)** → `0.0.0.0/0` (Allow traffic on port 80)
  - **HTTPS (443)** → `0.0.0.0/0` (Allow traffic on port 443)
  - **SSH (22)** → Restricted to specific IP (for admin access)

---

## 6. Final Verification

Run the following command to check if HTTPS is working:

```sh
curl -I https://moana-server.lokeshinumpudi.com/status
```

Expected output:

```sh
HTTP/1.1 200 OK
Server: nginx
X-Powered-By: Express
Access-Control-Allow-Origin: *
```

Everything is now working correctly with HTTPS enabled! 🎉
