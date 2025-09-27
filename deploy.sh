#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet Financial Management System - Automated Deployment Script
#  
#  This script automates the complete deployment process from zero to production
#  Compatible with: Ubuntu 20.04+ / Debian 11+
#  
#  Author: MarFaNet Development Team
#  Version: 1.0.0
#  License: MIT
#═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="marfanet"
APP_DIR="/var/www/$APP_NAME"
SERVICE_NAME="marfanet"
DB_NAME="marfanet_db"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                    MarFaNet Deployment Script v1.0.0                        ║
║                    Automated Ubuntu Server Deployment                        ║
╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
}

# Function to check if script is run as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root. Please use 'sudo' or login as root."
        exit 1
    fi
}

# Function to get user input
get_user_input() {
    print_header
    print_status "Starting MarFaNet deployment configuration..."
    
    echo ""
    echo -e "${CYAN}Please provide the following information:${NC}"
    echo ""
    
    # Domain configuration
    read -p "Enter your domain name (e.g., your-domain.com): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
        print_error "Domain name is required!"
        exit 1
    fi
    
    # Database configuration
    read -p "Enter PostgreSQL database name [$DB_NAME]: " input_db_name
    DB_NAME=${input_db_name:-$DB_NAME}
    
    read -p "Enter PostgreSQL username [marfanet]: " DB_USER
    DB_USER=${DB_USER:-marfanet}
    
    read -s -p "Enter PostgreSQL password: " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Database password is required!"
        exit 1
    fi
    
    # Admin user configuration
    read -p "Enter admin username [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    read -s -p "Enter admin password: " ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        print_error "Admin password is required!"
        exit 1
    fi
    
    # Email configuration
    read -p "Enter your email for SSL certificate: " SSL_EMAIL
    if [ -z "$SSL_EMAIL" ]; then
        print_error "Email is required for SSL certificate!"
        exit 1
    fi
    
    # GitHub repository
    read -p "Enter GitHub repository URL [https://github.com/Iscgr/AgentPortalShield.git]: " REPO_URL
    REPO_URL=${REPO_URL:-"https://github.com/Iscgr/AgentPortalShield.git"}
    
    echo ""
    print_success "Configuration collected successfully!"
    echo ""
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated successfully!"
}

# Function to install basic dependencies
install_dependencies() {
    print_status "Installing basic dependencies..."
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    print_success "Basic dependencies installed!"
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    print_success "Node.js installed: $node_version, npm: $npm_version"
}

# Function to install PostgreSQL
install_postgresql() {
    print_status "Installing PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    print_success "PostgreSQL installed and started!"
}

# Function to configure PostgreSQL
configure_postgresql() {
    print_status "Configuring PostgreSQL database..."
    
    # Create database and user
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    
    # Configure PostgreSQL for network access
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
    
    # Update postgresql.conf
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf"
    
    # Update pg_hba.conf
    echo "local   $DB_NAME    $DB_USER                                md5" >> "$PG_CONFIG_DIR/pg_hba.conf"
    
    # Restart PostgreSQL
    systemctl restart postgresql
    
    print_success "PostgreSQL configured successfully!"
}

# Function to install Nginx
install_nginx() {
    print_status "Installing Nginx..."
    apt install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    print_success "Nginx installed and started!"
}

# Function to install Certbot for SSL
install_certbot() {
    print_status "Installing Certbot for SSL certificates..."
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed!"
}

# Function to clone and setup application
setup_application() {
    print_status "Setting up MarFaNet application..."
    
    # Create application directory
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clone repository
    git clone $REPO_URL .
    
    # Install dependencies
    npm install
    
    # Build application
    npm run build
    
    print_success "Application setup completed!"
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Application Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://$DOMAIN_NAME

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# Admin Configuration
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Domain Configuration
DOMAIN_NAME=$DOMAIN_NAME

# Security
BCRYPT_ROUNDS=12

# API Keys (These will need to be added manually)
# TELEGRAM_BOT_TOKEN=your_telegram_bot_token
# OPENAI_API_KEY=your_openai_api_key
# GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Email Configuration (Optional)
# SMTP_HOST=your_smtp_host
# SMTP_PORT=587
# SMTP_USER=your_smtp_user
# SMTP_PASS=your_smtp_password
EOF

    chmod 600 $APP_DIR/.env
    print_success "Environment file created!"
}

# Function to setup database
setup_database() {
    print_status "Setting up database schema..."
    
    cd $APP_DIR
    
    # Run database migrations
    npm run db:push
    
    print_success "Database schema setup completed!"
}

# Function to create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=MarFaNet Financial Management System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Set correct permissions
    chown -R www-data:www-data $APP_DIR
    
    # Reload systemd and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    print_success "Systemd service created and started!"
}

# Function to configure Nginx
configure_nginx() {
    print_status "Configuring Nginx..."
    
    cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    # SSL Configuration (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
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

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Representative portal with ID
    location ~ ^/portal/([0-9]+)$ {
        proxy_pass http://localhost:3000/portal?id=\$1;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    # Logs
    access_log /var/log/nginx/$APP_NAME.access.log;
    error_log /var/log/nginx/$APP_NAME.error.log;
}
EOF

    # Enable site
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    print_success "Nginx configured successfully!"
}

# Function to setup SSL certificate
setup_ssl() {
    print_status "Setting up SSL certificate with Let's Encrypt..."
    
    # Stop Nginx temporarily
    systemctl stop nginx
    
    # Get SSL certificate
    certbot certonly --standalone -d $DOMAIN_NAME -d www.$DOMAIN_NAME --email $SSL_EMAIL --agree-tos --non-interactive
    
    # Start Nginx
    systemctl start nginx
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    print_success "SSL certificate configured successfully!"
}

# Function to setup firewall
setup_firewall() {
    print_status "Configuring UFW firewall..."
    
    # Install UFW if not installed
    apt install -y ufw
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    
    # Allow PostgreSQL (localhost only)
    ufw allow from 127.0.0.1 to any port 5432
    
    # Enable UFW
    ufw --force enable
    
    print_success "Firewall configured successfully!"
}

# Function to create monitoring scripts
create_monitoring() {
    print_status "Setting up monitoring and maintenance scripts..."
    
    # Create log rotation for application
    cat > /etc/logrotate.d/$APP_NAME << EOF
/var/log/$APP_NAME/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

    # Create backup script
    cat > /usr/local/bin/marfanet-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/marfanet"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="marfanet_db"
DB_USER="marfanet"

mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www marfanet

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

    chmod +x /usr/local/bin/marfanet-backup.sh
    
    # Schedule daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/marfanet-backup.sh >> /var/log/marfanet-backup.log 2>&1") | crontab -
    
    print_success "Monitoring and backup configured!"
}

# Function to setup log directories
setup_logging() {
    print_status "Setting up logging..."
    
    # Create log directories
    mkdir -p /var/log/$APP_NAME
    chown www-data:www-data /var/log/$APP_NAME
    
    # Configure rsyslog for application
    cat > /etc/rsyslog.d/30-$APP_NAME.conf << EOF
if \$programname == '$SERVICE_NAME' then /var/log/$APP_NAME/application.log
& stop
EOF

    systemctl restart rsyslog
    
    print_success "Logging configured!"
}

# Function to perform final checks
final_checks() {
    print_status "Performing final system checks..."
    
    # Check service status
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_success "MarFaNet service is running"
    else
        print_error "MarFaNet service is not running"
        systemctl status $SERVICE_NAME
    fi
    
    # Check Nginx status
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
        systemctl status nginx
    fi
    
    # Check PostgreSQL status
    if systemctl is-active --quiet postgresql; then
        print_success "PostgreSQL is running"
    else
        print_error "PostgreSQL is not running"
        systemctl status postgresql
    fi
    
    # Check SSL certificate
    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
        print_success "SSL certificate is installed"
    else
        print_warning "SSL certificate not found"
    fi
    
    # Test application connectivity
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302\|403"; then
        print_success "Application is responding"
    else
        print_warning "Application may not be responding correctly"
    fi
}

# Function to display completion message
display_completion() {
    print_success "
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🎉 DEPLOYMENT COMPLETED! 🎉                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Your MarFaNet Financial Management System is now ready!                    ║
║                                                                              ║
║  🌐 Web Application: https://$DOMAIN_NAME                         
║  👨‍💼 Admin Panel: https://$DOMAIN_NAME/admin                        
║  📊 Representative Portal: https://$DOMAIN_NAME/portal/[ID]         
║                                                                              ║
║  📁 Application Directory: $APP_DIR                                  
║  📋 Service Name: $SERVICE_NAME                                       
║  🗄️ Database: $DB_NAME                                               
║                                                                              ║
║  🔧 Useful Commands:                                                         ║
║     - Check service: systemctl status $SERVICE_NAME                  
║     - View logs: journalctl -u $SERVICE_NAME -f                      
║     - Restart app: systemctl restart $SERVICE_NAME                   
║     - Backup data: /usr/local/bin/marfanet-backup.sh                        ║
║                                                                              ║
║  ⚠️  IMPORTANT: Don't forget to configure your API keys in:                  ║
║      $APP_DIR/.env                                               
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝"

    echo ""
    print_warning "Next Steps:"
    echo "1. Configure your domain DNS to point to this server's IP address"
    echo "2. Add your API keys to the .env file (Telegram, OpenAI, etc.)"
    echo "3. Test the application thoroughly"
    echo "4. Set up regular backups and monitoring"
    echo ""
    print_status "For detailed configuration guide, please refer to README.md"
}

# Main deployment function
main() {
    print_header
    
    # Check prerequisites
    check_root
    
    # Get configuration from user
    get_user_input
    
    # Start deployment
    print_status "Starting automated deployment..."
    
    # System setup
    update_system
    install_dependencies
    
    # Install software stack
    install_nodejs
    install_postgresql
    install_nginx
    install_certbot
    
    # Configure services
    configure_postgresql
    
    # Setup application
    setup_application
    create_env_file
    setup_database
    
    # Setup system services
    create_systemd_service
    setup_logging
    configure_nginx
    
    # Security and monitoring
    setup_ssl
    setup_firewall
    create_monitoring
    
    # Final verification
    final_checks
    
    # Display completion message
    display_completion
}

# Run main function
main "$@"