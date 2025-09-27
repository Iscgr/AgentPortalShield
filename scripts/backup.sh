#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet Backup Script
#  
#  This script creates comprehensive backups of the MarFaNet system
#═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/var/backups/marfanet"
APP_DIR="/var/www/marfanet"
DB_NAME="marfanet_db"
DB_USER="marfanet"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create database backup
backup_database() {
    print_status "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/db_backup_$DATE.sql"
    
    sudo -u postgres pg_dump $DB_NAME > $backup_file
    
    # Compress the backup
    gzip $backup_file
    
    print_success "Database backup created: ${backup_file}.gz"
    
    # Verify backup
    if [ -f "${backup_file}.gz" ]; then
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        print_status "Backup size: $size"
    fi
}

# Function to create application files backup
backup_application() {
    print_status "Creating application files backup..."
    
    local backup_file="$BACKUP_DIR/app_backup_$DATE.tar.gz"
    
    # Create backup excluding node_modules and logs
    tar -czf $backup_file \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='*.log' \
        --exclude='.env' \
        -C /var/www marfanet
    
    print_success "Application backup created: $backup_file"
    
    # Verify backup
    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        print_status "Backup size: $size"
    fi
}

# Function to backup configuration files
backup_configuration() {
    print_status "Creating configuration backup..."
    
    local config_backup="$BACKUP_DIR/config_backup_$DATE.tar.gz"
    
    # Create temporary directory for config files
    local temp_dir=$(mktemp -d)
    
    # Copy important configuration files
    mkdir -p $temp_dir/nginx
    mkdir -p $temp_dir/systemd
    mkdir -p $temp_dir/ssl
    
    # Nginx configuration
    if [ -f "/etc/nginx/sites-available/marfanet" ]; then
        cp /etc/nginx/sites-available/marfanet $temp_dir/nginx/
    fi
    
    # Systemd service
    if [ -f "/etc/systemd/system/marfanet.service" ]; then
        cp /etc/systemd/system/marfanet.service $temp_dir/systemd/
    fi
    
    # SSL certificates (if they exist)
    if [ -d "/etc/letsencrypt" ]; then
        cp -r /etc/letsencrypt $temp_dir/ssl/ 2>/dev/null || true
    fi
    
    # Environment file (without sensitive data)
    if [ -f "$APP_DIR/.env" ]; then
        grep -v "PASSWORD\|SECRET\|KEY" $APP_DIR/.env > $temp_dir/.env.template 2>/dev/null || true
    fi
    
    # Create archive
    tar -czf $config_backup -C $temp_dir .
    
    # Cleanup
    rm -rf $temp_dir
    
    print_success "Configuration backup created: $config_backup"
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Remove old database backups
    find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Remove old application backups
    find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Remove old configuration backups
    find $BACKUP_DIR -name "config_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    print_success "Old backups cleaned up"
}

# Function to create backup manifest
create_manifest() {
    print_status "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/backup_manifest_$DATE.txt"
    
    cat > $manifest_file << EOF
MarFaNet Backup Manifest
========================
Date: $(date)
Backup ID: $DATE
Server: $(hostname)
User: $(whoami)

Files Created:
$(ls -la $BACKUP_DIR/*_$DATE.*)

System Information:
- OS: $(lsb_release -d | cut -f2)
- Kernel: $(uname -r)
- Uptime: $(uptime)
- Disk Usage: $(df -h /)

Services Status:
- MarFaNet: $(systemctl is-active marfanet)
- Nginx: $(systemctl is-active nginx)
- PostgreSQL: $(systemctl is-active postgresql)

Database Information:
- Database Name: $DB_NAME
- Database Size: $(sudo -u postgres psql -d $DB_NAME -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" -t | xargs)

Application Information:
- Application Directory: $APP_DIR
- Node.js Version: $(node --version)
- NPM Version: $(npm --version)
EOF

    print_success "Backup manifest created: $manifest_file"
}

# Function to test backup integrity
test_backup_integrity() {
    print_status "Testing backup integrity..."
    
    # Test database backup
    local db_backup=$(ls $BACKUP_DIR/db_backup_$DATE.sql.gz 2>/dev/null | head -1)
    if [ -f "$db_backup" ]; then
        if gunzip -t "$db_backup" 2>/dev/null; then
            print_success "Database backup integrity: OK"
        else
            print_error "Database backup integrity: FAILED"
        fi
    fi
    
    # Test application backup
    local app_backup=$(ls $BACKUP_DIR/app_backup_$DATE.tar.gz 2>/dev/null | head -1)
    if [ -f "$app_backup" ]; then
        if tar -tzf "$app_backup" >/dev/null 2>&1; then
            print_success "Application backup integrity: OK"
        else
            print_error "Application backup integrity: FAILED"
        fi
    fi
    
    # Test configuration backup
    local config_backup=$(ls $BACKUP_DIR/config_backup_$DATE.tar.gz 2>/dev/null | head -1)
    if [ -f "$config_backup" ]; then
        if tar -tzf "$config_backup" >/dev/null 2>&1; then
            print_success "Configuration backup integrity: OK"
        else
            print_error "Configuration backup integrity: FAILED"
        fi
    fi
}

# Main backup function
main() {
    print_status "Starting MarFaNet backup process..."
    print_status "Backup ID: $DATE"
    
    # Create backup directory
    mkdir -p $BACKUP_DIR
    
    # Perform backups
    backup_database
    backup_application
    backup_configuration
    
    # Create manifest
    create_manifest
    
    # Test integrity
    test_backup_integrity
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Display summary
    print_success "Backup process completed!"
    print_status "Backup location: $BACKUP_DIR"
    print_status "Backup files:"
    ls -la $BACKUP_DIR/*_$DATE.*
    
    # Calculate total backup size
    local total_size=$(du -sh $BACKUP_DIR | cut -f1)
    print_status "Total backup directory size: $total_size"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script should be run as root for complete backup"
    exit 1
fi

# Run main function
main "$@"