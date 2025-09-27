#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet SSL Setup Script
#  
#  This script sets up SSL certificates using Let's Encrypt
#═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to setup SSL certificate
setup_ssl() {
    local domain=$1
    local email=$2
    
    if [ -z "$domain" ] || [ -z "$email" ]; then
        print_error "Usage: $0 <domain> <email>"
        exit 1
    fi
    
    print_status "Setting up SSL certificate for $domain..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_status "Installing Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Stop nginx temporarily
    print_status "Stopping Nginx temporarily..."
    systemctl stop nginx
    
    # Get certificate
    print_status "Obtaining SSL certificate from Let's Encrypt..."
    certbot certonly --standalone \
        -d $domain \
        -d www.$domain \
        --email $email \
        --agree-tos \
        --non-interactive \
        --expand
    
    # Start nginx
    print_status "Starting Nginx..."
    systemctl start nginx
    
    # Test nginx configuration
    nginx -t
    systemctl reload nginx
    
    # Setup auto-renewal
    print_status "Setting up automatic renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --nginx") | crontab -
    
    print_success "SSL certificate setup completed for $domain!"
    print_status "Certificate location: /etc/letsencrypt/live/$domain/"
    
    # Show certificate info
    openssl x509 -in /etc/letsencrypt/live/$domain/fullchain.pem -text -noout | grep -A 2 "Validity"
}

# Main function
main() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    setup_ssl "$1" "$2"
}

main "$@"