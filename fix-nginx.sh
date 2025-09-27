#!/bin/bash

echo "بررسی وضعیت فایل nginx.conf..."

if [ -f /workspaces/AgentPortalShield/nginx.conf ]; then
  echo "فایل nginx.conf موجود است. بررسی محتوا:"
  cat /workspaces/AgentPortalShield/nginx.conf
  echo ""
  
  # بررسی اینکه آیا nginx.conf یک دایرکتوری است یا یک فایل
  if [ -d /workspaces/AgentPortalShield/nginx.conf ]; then
    echo "خطا: nginx.conf یک دایرکتوری است، نه یک فایل!"
    echo "در حال حذف دایرکتوری و ایجاد فایل صحیح..."
    rm -rf /workspaces/AgentPortalShield/nginx.conf
    
    # ایجاد فایل nginx.conf صحیح
    cat > /workspaces/AgentPortalShield/nginx.conf << 'EOL'
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  localhost;
        
        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOL
    
    echo "فایل nginx.conf جدید ایجاد شد."
  fi
else
  echo "فایل nginx.conf وجود ندارد. در حال ایجاد فایل..."
  
  # ایجاد فایل nginx.conf
  cat > /workspaces/AgentPortalShield/nginx.conf << 'EOL'
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       80;
        server_name  localhost;
        
        location / {
            proxy_pass http://app:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOL
  
  echo "فایل nginx.conf ایجاد شد."
fi