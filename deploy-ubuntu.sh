
#!/bin/bash

# MarFaNet Automated Ubuntu Deployment Script
# Version: 1.0
# Compatible with: Ubuntu 20.04+ LTS

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "این اسکریپت نباید با root اجرا شود. لطفا با کاربر عادی اجرا کنید."
    fi
}

# Welcome message
show_welcome() {
    clear
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   MarFaNet Automated Ubuntu Deployment Script   "
    echo "=================================================="
    echo -e "${NC}"
    echo ""
    echo "این اسکریپت تمام مراحل نصب MarFaNet را به صورت خودکار انجام می‌دهد:"
    echo "✅ آماده‌سازی سیستم عامل"
    echo "✅ نصب Node.js 20 LTS"
    echo "✅ نصب و پیکربندی PostgreSQL"
    echo "✅ کلون و نصب اپلیکیشن"
    echo "✅ پیکربندی متغیرهای محیطی"
    echo "✅ ایجاد سرویس سیستمی"
    echo "✅ پیکربندی Nginx"
    echo "✅ نصب SSL Certificate"
    echo "✅ تست نهایی سیستم"
    echo ""
    read -p "آیا می‌خواهید ادامه دهید؟ (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
}

# Collect user input
collect_config() {
    echo ""
    log "لطفا اطلاعات مورد نیاز را وارد کنید:"
    echo ""
    
    # Database configuration
    read -p "رمز عبور PostgreSQL: " -s DB_PASSWORD
    echo ""
    read -p "نام کاربری مدیر اپلیکیشن (پیش‌فرض: mgr): " ADMIN_USERNAME
    ADMIN_USERNAME=${ADMIN_USERNAME:-mgr}
    read -p "رمز عبور مدیر اپلیکیشن (پیش‌فرض: 8679): " -s ADMIN_PASSWORD
    ADMIN_PASSWORD=${ADMIN_PASSWORD:-8679}
    echo ""
    
    # Domain configuration
    read -p "نام دامنه شما (مثال: example.com): " DOMAIN_NAME
    if [[ -z "$DOMAIN_NAME" ]]; then
        warn "دامنه وارد نشد. Nginx برای localhost پیکربندی می‌شود."
        DOMAIN_NAME="localhost"
    fi
    
    # Optional services
    read -p "کلید API Google Gemini (اختیاری): " GEMINI_API_KEY
    read -p "توکن ربات تلگرام (اختیاری): " TELEGRAM_BOT_TOKEN
    read -p "Chat ID تلگرام (اختیاری): " TELEGRAM_CHAT_ID
    
    # Git repository
    read -p "آدرس Git Repository (اختیاری - برای کلون از ریپازیتوری): " GIT_REPO
    
    echo ""
    log "پیکربندی دریافت شد. شروع نصب..."
}

# Update system
update_system() {
    log "بروزرسانی سیستم عامل..."
    sudo apt update -qq
    sudo apt upgrade -y -qq
    sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    log "سیستم عامل بروزرسانی شد"
}

# Install Node.js 20 LTS
install_nodejs() {
    log "نصب Node.js 20 LTS..."
    
    # Remove existing Node.js
    sudo apt remove -y nodejs npm 2>/dev/null || true
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js نصب شد - نسخه: $NODE_VERSION"
    log "npm نصب شد - نسخه: $NPM_VERSION"
}

# Install PostgreSQL
install_postgresql() {
    log "نصب PostgreSQL..."
    
    sudo apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    log "ایجاد کاربر و دیتابیس..."
    sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS marfanet_db;
DROP USER IF EXISTS marfanet;
CREATE USER marfanet WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE marfanet_db OWNER marfanet;
GRANT ALL PRIVILEGES ON DATABASE marfanet_db TO marfanet;
ALTER USER marfanet CREATEDB;
\q
EOF

    log "PostgreSQL نصب و پیکربندی شد"
    
    # Test connection
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U marfanet -d marfanet_db -c "SELECT version();" > /dev/null 2>&1; then
        log "اتصال به دیتابیس تست شد - موفقیت‌آمیز"
    else
        error "خطا در اتصال به دیتابیس"
    fi
}

# Setup application directory
setup_app_directory() {
    log "ایجاد دایرکتوری اپلیکیشن..."
    
    sudo mkdir -p /opt/marfanet
    sudo chown $USER:$USER /opt/marfanet
    cd /opt/marfanet
    
    if [[ -n "$GIT_REPO" ]]; then
        log "کلون از ریپازیتوری Git..."
        git clone "$GIT_REPO" .
    else
        warn "آدرس Git ارائه نشد. لطفا فایل‌های اپلیکیشن را دستی در /opt/marfanet قرار دهید"
        read -p "بعد از کپی فایل‌ها Enter بزنید..." -r
    fi
}

# Install application dependencies
install_app_dependencies() {
    log "نصب وابستگی‌های اپلیکیشن..."
    cd /opt/marfanet
    
    # Install dependencies
    npm install --production
    
    # Build application
    npm run build
    
    log "اپلیکیشن ساخته شد"
}

# Create environment configuration
create_env_config() {
    log "ایجاد فایل پیکربندی محیطی..."
    cd /opt/marfanet
    
    # Generate session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://marfanet:$DB_PASSWORD@localhost:5432/marfanet_db

# Security
SESSION_SECRET=$SESSION_SECRET

# Admin Credentials
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Optional Services
GEMINI_API_KEY=$GEMINI_API_KEY
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID

# Application Settings
REPLIT_DOMAIN=$DOMAIN_NAME
EOF

    # Secure environment file
    chmod 600 .env
    log "فایل محیطی ایجاد شد"
}

# Create systemd service
create_systemd_service() {
    log "ایجاد سرویس سیستمی..."
    
    sudo cat > /etc/systemd/system/marfanet.service << EOF
[Unit]
Description=MarFaNet Financial CRM Application
After=network.target postgresql.service
Wants=postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=/opt/marfanet
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30

# Security settings
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/marfanet
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes

# Resource limits
LimitNOFILE=65536
MemoryLimit=1G

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable marfanet
    
    log "سرویس سیستمی ایجاد شد"
}

# Install and configure Nginx
install_nginx() {
    log "نصب و پیکربندی Nginx..."
    
    sudo apt install -y nginx
    
    # Create Nginx configuration
    sudo cat > /etc/nginx/sites-available/marfanet << EOF
# MarFaNet Nginx Configuration
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Download-Options "noopen" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;

    # Special handling for portal routes (public access)
    location /portal/ {
        add_header X-Frame-Options "ALLOWALL" always;
        add_header Cache-Control "public, max-age=300" always;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000;
        access_log off;
        proxy_read_timeout 10;
    }

    # Static files and main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # File upload size
    client_max_body_size 50M;
    client_body_timeout 300s;
    client_header_timeout 300s;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/marfanet /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Test Nginx configuration
    if sudo nginx -t; then
        sudo systemctl restart nginx
        sudo systemctl enable nginx
        log "Nginx نصب و پیکربندی شد"
    else
        error "خطا در پیکربندی Nginx"
    fi
}

# Install SSL Certificate
install_ssl() {
    if [[ "$DOMAIN_NAME" == "localhost" ]]; then
        info "SSL برای localhost نصب نمی‌شود"
        return
    fi
    
    log "نصب SSL Certificate با Let's Encrypt..."
    
    # Install Certbot
    sudo apt install -y certbot python3-certbot-nginx
    
    # Get certificate
    if sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME" --redirect; then
        log "SSL Certificate نصب شد"
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        log "تمدید خودکار SSL فعال شد"
    else
        warn "خطا در نصب SSL Certificate. ممکن است DNS تنظیم نشده باشد"
    fi
}

# Setup firewall
setup_firewall() {
    log "پیکربندی فایروال..."
    
    # Install and configure UFW
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH, HTTP, HTTPS
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    
    # Allow application port for direct access if needed
    sudo ufw allow 5000
    
    sudo ufw --force reload
    log "فایروال پیکربندی شد"
}

# Setup monitoring
setup_monitoring() {
    log "پیکربندی مانیتورینگ..."
    
    # Create monitoring script
    sudo cat > /usr/local/bin/marfanet-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/marfanet-monitor.log"
HEALTH_URL="http://localhost:5000/health"

check_service() {
    if systemctl is-active --quiet marfanet; then
        echo "$(date): MarFaNet service is running" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): MarFaNet service is not running, attempting restart" >> "$LOG_FILE"
        systemctl restart marfanet
        return 1
    fi
}

check_health() {
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "$(date): Health check passed" >> "$LOG_FILE"
        return 0
    else
        echo "$(date): Health check failed" >> "$LOG_FILE"
        return 1
    fi
}

# Main monitoring
check_service
sleep 5
check_health

# Log cleanup (keep last 1000 lines)
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
EOF

    sudo chmod +x /usr/local/bin/marfanet-monitor.sh
    
    # Add to crontab for monitoring every 5 minutes
    echo "*/5 * * * * /usr/local/bin/marfanet-monitor.sh" | sudo crontab -
    
    log "مانیتورینگ پیکربندی شد"
}

# Setup log rotation
setup_log_rotation() {
    log "پیکربندی Log Rotation..."
    
    sudo cat > /etc/logrotate.d/marfanet << EOF
/opt/marfanet/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $USER $USER
}

/var/log/marfanet-monitor.log {
    weekly
    missingok
    rotate 8
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

    # Create logs directory
    mkdir -p /opt/marfanet/logs
    
    log "Log rotation پیکربندی شد"
}

# Start services
start_services() {
    log "راه‌اندازی سرویس‌ها..."
    
    # Start MarFaNet service
    sudo systemctl start marfanet
    
    # Wait for service to start
    sleep 10
    
    # Check service status
    if systemctl is-active --quiet marfanet; then
        log "سرویس MarFaNet راه‌اندازی شد"
    else
        error "خطا در راه‌اندازی سرویس MarFaNet"
    fi
}

# Final tests
run_tests() {
    log "اجرای تست‌های نهایی..."
    
    # Test database connection
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U marfanet -d marfanet_db -c "SELECT 1;" > /dev/null 2>&1; then
        log "✅ اتصال دیتابیس: موفق"
    else
        error "❌ اتصال دیتابیس: ناموفق"
    fi
    
    # Test application health
    sleep 5
    if curl -f -s http://localhost:5000/health > /dev/null; then
        log "✅ سلامت اپلیکیشن: موفق"
    else
        error "❌ سلامت اپلیکیشن: ناموفق"
    fi
    
    # Test Nginx
    if curl -f -s http://localhost/ > /dev/null; then
        log "✅ وب سرور Nginx: موفق"
    else
        warn "❌ وب سرور Nginx: ناموفق"
    fi
    
    log "تست‌های نهایی کامل شد"
}

# Show final information
show_final_info() {
    clear
    echo -e "${GREEN}"
    echo "=================================================="
    echo "     نصب MarFaNet با موفقیت کامل شد! 🎉          "
    echo "=================================================="
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}📍 آدرس‌های دسترسی:${NC}"
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        echo "   🌐 پنل مدیریت: https://$DOMAIN_NAME/"
        echo "   🌐 پنل CRM: https://$DOMAIN_NAME/crm"
        echo "   🌐 API: https://$DOMAIN_NAME/api/dashboard"
        echo "   🌐 پورتال نمایندگان: https://$DOMAIN_NAME/portal/[public-id]"
    else
        echo "   🌐 پنل مدیریت: http://localhost/"
        echo "   🌐 پنل CRM: http://localhost/crm"
        echo "   🌐 API: http://localhost/api/dashboard"
        echo "   🌐 پورتال نمایندگان: http://localhost/portal/[public-id]"
    fi
    echo ""
    echo -e "${BLUE}🔐 اطلاعات ورود:${NC}"
    echo "   👤 نام کاربری مدیر: $ADMIN_USERNAME"
    echo "   🔑 رمز عبور مدیر: $ADMIN_PASSWORD"
    echo ""
    echo -e "${BLUE}⚙️ دستورات مفید:${NC}"
    echo "   📊 وضعیت سرویس: sudo systemctl status marfanet"
    echo "   🔄 ری‌استارت: sudo systemctl restart marfanet"
    echo "   📝 لاگ‌ها: sudo journalctl -u marfanet -f"
    echo "   🔧 مانیتورینگ: sudo tail -f /var/log/marfanet-monitor.log"
    echo ""
    echo -e "${BLUE}📂 مسیرهای مهم:${NC}"
    echo "   📁 اپلیکیشن: /opt/marfanet"
    echo "   ⚙️ تنظیمات: /opt/marfanet/.env"
    echo "   🔧 سرویس: /etc/systemd/system/marfanet.service"
    echo "   🌐 Nginx: /etc/nginx/sites-available/marfanet"
    echo ""
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        echo -e "${YELLOW}⚠️  نکات مهم:${NC}"
        echo "   1. مطمئن شوید DNS رکوردهای A برای $DOMAIN_NAME به IP سرور اشاره می‌کند"
        echo "   2. فایروال سرور بر روی پورت‌های 80 و 443 باز باشد"
        echo "   3. اگر SSL نصب نشد، ممکن است نیاز به تنظیم دستی DNS باشد"
    fi
    echo ""
}

# Main execution
main() {
    check_root
    show_welcome
    collect_config
    
    log "شروع نصب خودکار MarFaNet..."
    
    update_system
    install_nodejs
    install_postgresql
    setup_app_directory
    install_app_dependencies
    create_env_config
    create_systemd_service
    install_nginx
    setup_firewall
    setup_monitoring
    setup_log_rotation
    start_services
    
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        install_ssl
    fi
    
    run_tests
    show_final_info
    
    log "نصب کامل شد! 🚀"
}

# Error handling
trap 'error "اسکریپت با خطا متوقف شد. لاگ‌ها را بررسی کنید."' ERR

# Run main function
main "$@"
