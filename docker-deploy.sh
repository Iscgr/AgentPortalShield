#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet Docker Deployment Script v2.0
#  
#  Fully automated Docker-based deployment with auto-generated configurations
#  Compatible with: Ubuntu 20.04+ / 22.04+ / 24.04+ / Debian 11+
#  
#  Features:
#  - ✅ Auto-generated passwords and secrets
#  - ✅ Docker containerization
#  - ✅ SSL with Let's Encrypt
#  - ✅ Atomic deployment
#  - ✅ Zero manual configuration
#  
#  Author: MarFaNet Development Team
#  Version: 2.0.0
#  License: MIT
#═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail  # Strict error handling

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

# Configuration
readonly APP_NAME="marfanet"
readonly APP_DIR="/opt/$APP_NAME"
readonly LOCK_FILE="/tmp/marfanet-deploy.lock"
readonly CONFIG_FILE="$APP_DIR/.env"
readonly DEPLOYMENT_LOG="/var/log/marfanet-deployment.log"

# Global variables for generated values
declare DOMAIN_NAME=""
declare SSL_EMAIL=""
declare DB_PASSWORD=""
declare ADMIN_PASSWORD=""
declare SESSION_SECRET=""
declare REDIS_PASSWORD=""

# Lock mechanism to prevent concurrent deployments
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo -e "${RED}[ERROR]${NC} Another deployment is already running!"
    exit 1
fi

# Cleanup function
cleanup() {
    local exit_code=$?
    exec 200>&-
    rm -f "$LOCK_FILE"
    
    if [ $exit_code -ne 0 ]; then
        log_message "ERROR" "Deployment failed with exit code $exit_code"
        rollback_deployment
    fi
    
    exit $exit_code
}
trap cleanup EXIT

# Logging function
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" | tee -a "$DEPLOYMENT_LOG"
}

# Colored output functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log_message "INFO" "$1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log_message "SUCCESS" "$1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_message "WARNING" "$1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log_message "ERROR" "$1"
}

print_header() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════════════════════╗
║                     MarFaNet Docker Deployment v2.0                         ║
║                    Automated Zero-Config Deployment                          ║
║                                                                              ║
║  🚀 Features:                                                                ║
║     ✅ Auto-generated secure passwords                                      ║
║     ✅ Docker containerization                                              ║
║     ✅ SSL certificates (Let's Encrypt)                                     ║
║     ✅ Production-ready configuration                                       ║
║     ✅ Ubuntu 20.04+ / 22.04+ / 24.04+ support                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root. Please use 'sudo'."
        exit 1
    fi
}

# Detect OS version
detect_os() {
    print_status "Detecting operating system..."
    
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        OS_NAME="$NAME"
        OS_VERSION="$VERSION_ID"
        
        case "$ID" in
            ubuntu)
                if [[ "$VERSION_ID" =~ ^(20\.04|22\.04|24\.04)$ ]]; then
                    print_success "Supported Ubuntu version detected: $VERSION_ID"
                else
                    print_warning "Ubuntu $VERSION_ID detected. Officially supported: 20.04, 22.04, 24.04"
                fi
                ;;
            debian)
                if [[ "$VERSION_ID" =~ ^(11|12)$ ]]; then
                    print_success "Supported Debian version detected: $VERSION_ID"
                else
                    print_warning "Debian $VERSION_ID detected. Officially supported: 11, 12"
                fi
                ;;
            *)
                print_warning "OS $ID not officially supported. Proceeding anyway..."
                ;;
        esac
    else
        print_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

# Generate secure passwords and secrets
generate_secrets() {
    print_status "Generating secure passwords and secrets..."
    
    # Generate database password (32 chars, alphanumeric + special chars)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Generate admin password (16 chars, user-friendly)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    # Generate session secret (64 chars)
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # Generate Redis password (32 chars)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    print_success "All secrets generated successfully!"
}

# Get minimal user input
get_user_input() {
    print_header
    print_status "Starting automated deployment configuration..."
    echo ""
    
    # Only ask for essential information
    while true; do
        read -p "🌐 Enter your domain name (e.g., mydomain.com): " DOMAIN_NAME
        if [[ $DOMAIN_NAME =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
            break
        else
            print_error "Invalid domain format. Please enter a valid domain (e.g., mydomain.com)"
        fi
    done
    
    while true; do
        read -p "📧 Enter your email for SSL certificate: " SSL_EMAIL
        if [[ $SSL_EMAIL =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
            break
        else
            print_error "Invalid email format. Please enter a valid email address."
        fi
    done
    
    echo ""
    print_success "Configuration collected! All passwords will be auto-generated."
    echo ""
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=$((10 * 1024 * 1024))  # 10GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        print_error "Insufficient disk space. Required: 10GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    # Check available memory (minimum 2GB)
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    if [ "$available_memory" -lt 2048 ]; then
        print_warning "Low available memory: ${available_memory}MB. Minimum recommended: 2048MB"
    fi
    
    print_success "System requirements check passed!"
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    
    export DEBIAN_FRONTEND=noninteractive
    
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban
    
    print_success "System packages updated!"
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y -qq docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Test Docker installation
    if docker --version && docker compose version; then
        print_success "Docker installed successfully!"
    else
        print_error "Docker installation failed!"
        exit 1
    fi
}

# Setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow essential services
    ufw allow ssh
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    
    # Enable UFW
    ufw --force enable
    
    print_success "Firewall configured!"
}

# Clone repository
clone_repository() {
    print_status "Cloning MarFaNet repository..."
    
    # Create app directory
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    
    # Clone repository
    if [ -d ".git" ]; then
        print_status "Repository exists, updating..."
        git fetch origin main
        git reset --hard origin/main
    else
        git clone https://github.com/Iscgr/AgentPortalShield.git .
    fi
    
    print_success "Repository cloned successfully!"
}

# Create environment configuration
create_environment() {
    print_status "Creating environment configuration..."
    
    cat > "$CONFIG_FILE" << EOF
# MarFaNet Production Configuration
# Generated automatically on $(date)

# ===== DATABASE CONFIGURATION =====
DB_NAME=marfanet_db
DB_USER=marfanet
DB_PASSWORD=$DB_PASSWORD

# ===== APPLICATION CONFIGURATION =====
NODE_ENV=production
APP_URL=https://$DOMAIN_NAME
DOMAIN_NAME=$DOMAIN_NAME
PORT=3000

# ===== SESSION & SECURITY =====
SESSION_SECRET=$SESSION_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD
BCRYPT_ROUNDS=12

# ===== ADMIN CONFIGURATION =====
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD

# ===== SSL CONFIGURATION =====
SSL_EMAIL=$SSL_EMAIL

# ===== API KEYS (Add your keys here) =====
# TELEGRAM_BOT_TOKEN=
# OPENAI_API_KEY=
# GOOGLE_GEMINI_API_KEY=

# ===== SMTP CONFIGURATION (Optional) =====
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=

# ===== ADVANCED SETTINGS =====
LOG_LEVEL=info
BACKUP_RETENTION_DAYS=30
ENABLE_PERFORMANCE_MONITORING=true
EOF

    chmod 600 "$CONFIG_FILE"
    print_success "Environment configuration created!"
}

# Create Nginx configuration
create_nginx_config() {
    print_status "Creating Nginx configuration..."
    
    cat > "$APP_DIR/nginx.conf" << EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
    
    # Upstream application
    upstream marfanet_app {
        server app:3000;
    }
    
    # HTTP server (redirect to HTTPS)
    server {
        listen 80;
        server_name $DOMAIN_NAME www.$DOMAIN_NAME;
        
        # ACME challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all other HTTP traffic to HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name $DOMAIN_NAME www.$DOMAIN_NAME;
        
        # SSL configuration
        ssl_certificate /etc/ssl/certs/$DOMAIN_NAME.crt;
        ssl_certificate_key /etc/ssl/certs/$DOMAIN_NAME.key;
        
        # SSL security settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
        # Main application
        location / {
            proxy_pass http://marfanet_app;
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
        
        # API endpoints with rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://marfanet_app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://marfanet_app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://marfanet_app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    print_success "Nginx configuration created!"
}

# Deploy with Docker
deploy_application() {
    print_status "Deploying MarFaNet with Docker..."
    
    cd "$APP_DIR"
    
    # Build and start services
    docker compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    print_status "Running database migrations..."
    docker compose exec -T app npm run db:push
    
    print_success "Application deployed successfully!"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    # Install certbot
    apt-get install -y -qq certbot
    
    # Create SSL directory
    mkdir -p "$APP_DIR/ssl"
    
    # Stop nginx container temporarily
    docker compose stop nginx
    
    # Get SSL certificate
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$SSL_EMAIL" \
        -d "$DOMAIN_NAME" \
        -d "www.$DOMAIN_NAME"
    
    # Copy certificates to SSL directory
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$APP_DIR/ssl/$DOMAIN_NAME.crt"
    cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$APP_DIR/ssl/$DOMAIN_NAME.key"
    
    # Set proper permissions
    chown -R root:root "$APP_DIR/ssl"
    chmod 600 "$APP_DIR/ssl"/*
    
    # Start nginx container
    docker compose start nginx
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -
    
    print_success "SSL certificate configured!"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:3000/api/health" >/dev/null; then
            print_success "Application health check passed!"
            return 0
        fi
        
        print_status "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Application health check failed after $max_attempts attempts!"
    return 1
}

# Display deployment summary
display_summary() {
    local admin_panel="https://$DOMAIN_NAME/admin"
    local crm_panel="https://$DOMAIN_NAME/crm"
    local portal_url="https://$DOMAIN_NAME/portal/[ID]"
    
    print_success "
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🎉 DEPLOYMENT COMPLETED! 🎉                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Your MarFaNet Financial Management System is ready!                        ║
║                                                                              ║
║  🌐 Application URL: https://$DOMAIN_NAME                        
║  👨‍💼 Admin Panel: $admin_panel                             
║  📊 CRM Panel: $crm_panel                                
║  🔗 Representative Portal: $portal_url               
║                                                                              ║
║  🔐 Auto-Generated Credentials:                                              ║
║     📧 Admin Username: admin                                                 ║
║     🔑 Admin Password: $ADMIN_PASSWORD                              
║     🗄️ Database Password: $DB_PASSWORD                    
║                                                                              ║
║  💾 Configuration Files:                                                     ║
║     📁 App Directory: $APP_DIR                                   
║     ⚙️ Environment: $CONFIG_FILE                               
║     📋 Docker Compose: $APP_DIR/docker-compose.yml                  
║                                                                              ║
║  🔧 Management Commands:                                                     ║
║     • View logs: docker compose -f $APP_DIR/docker-compose.yml logs -f     
║     • Restart: docker compose -f $APP_DIR/docker-compose.yml restart       
║     • Update: cd $APP_DIR && git pull && docker compose up -d --build     
║     • Backup: docker compose -f $APP_DIR/docker-compose.yml exec database \
║       pg_dump -U marfanet marfanet_db > backup_\$(date +%Y%m%d).sql         
║                                                                              ║
║  ⚠️ IMPORTANT NOTES:                                                         ║
║     • Save these passwords in a secure location                             ║
║     • Configure your API keys in $CONFIG_FILE               
║     • Point your domain DNS to this server's IP: $(curl -s ifconfig.me)     
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝"

    # Save credentials to file
    cat > "$APP_DIR/CREDENTIALS.txt" << EOF
MarFaNet Deployment Credentials
Generated on: $(date)
Server IP: $(curl -s ifconfig.me)

Admin Panel: https://$DOMAIN_NAME/admin
Username: admin
Password: $ADMIN_PASSWORD

Database:
Name: marfanet_db
User: marfanet
Password: $DB_PASSWORD

Session Secret: $SESSION_SECRET
Redis Password: $REDIS_PASSWORD

IMPORTANT: Keep this file secure and delete after copying credentials!
EOF

    chmod 600 "$APP_DIR/CREDENTIALS.txt"
    
    echo ""
    print_warning "💾 Credentials saved to: $APP_DIR/CREDENTIALS.txt"
    print_warning "🔐 Please copy these credentials and delete the file for security!"
    echo ""
}

# Rollback function
rollback_deployment() {
    print_error "Rolling back deployment..."
    
    # Stop and remove containers
    if [ -f "$APP_DIR/docker-compose.yml" ]; then
        cd "$APP_DIR"
        docker compose down --volumes || true
    fi
    
    # Remove app directory (keep logs)
    if [ -d "$APP_DIR" ]; then
        mv "$APP_DIR" "${APP_DIR}.failed.$(date +%s)" || true
    fi
    
    print_error "Rollback completed. Check logs for details."
}

# Main deployment function
main() {
    # Initialize logging
    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
    
    print_header
    log_message "INFO" "Starting MarFaNet Docker deployment v2.0"
    
    # Pre-flight checks
    check_root
    detect_os
    check_requirements
    
    # Get user input
    get_user_input
    
    # Generate all secrets automatically
    generate_secrets
    
    # System preparation
    update_system
    install_docker
    setup_firewall
    
    # Application deployment
    clone_repository
    create_environment
    create_nginx_config
    deploy_application
    
    # SSL and final setup
    setup_ssl
    
    # Verification
    health_check
    
    # Success!
    display_summary
    
    log_message "SUCCESS" "MarFaNet deployment completed successfully!"
}

# Command line options
case "${1:-}" in
    --help|-h)
        echo "MarFaNet Docker Deployment Script v2.0"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --check        Check system requirements only"
        echo ""
        echo "Features:"
        echo "  ✅ Auto-generated secure passwords"
        echo "  ✅ Docker containerization"
        echo "  ✅ SSL with Let's Encrypt"
        echo "  ✅ Production-ready configuration"
        echo "  ✅ Ubuntu 20.04+ / 22.04+ / 24.04+ support"
        echo ""
        exit 0
        ;;
    --check)
        check_root
        detect_os
        check_requirements
        print_success "System requirements check completed!"
        exit 0
        ;;
esac

# Run main function
main "$@"