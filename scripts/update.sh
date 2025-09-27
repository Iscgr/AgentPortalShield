#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet Update Script
#  
#  This script safely updates the MarFaNet application
#═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/var/www/marfanet"
SERVICE_NAME="marfanet"
BACKUP_DIR="/var/backups/marfanet"
REPO_URL="https://github.com/Iscgr/AgentPortalShield.git"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    # Check if application directory exists
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        exit 1
    fi
    
    # Check if service exists
    if ! systemctl list-units --type=service | grep -q $SERVICE_NAME; then
        print_error "Service not found: $SERVICE_NAME"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create pre-update backup
create_backup() {
    print_status "Creating pre-update backup..."
    
    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/pre_update_backup_$backup_date.tar.gz"
    
    mkdir -p $BACKUP_DIR
    
    # Backup current application
    tar -czf $backup_file \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='*.log' \
        -C /var/www marfanet
    
    print_success "Backup created: $backup_file"
    echo "BACKUP_FILE=$backup_file" > /tmp/marfanet_update_backup
}

# Function to stop services
stop_services() {
    print_status "Stopping MarFaNet service..."
    systemctl stop $SERVICE_NAME
    print_success "Service stopped"
}

# Function to start services
start_services() {
    print_status "Starting MarFaNet service..."
    systemctl start $SERVICE_NAME
    
    # Wait a moment for service to start
    sleep 5
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Service started successfully"
    else
        print_error "Failed to start service"
        return 1
    fi
}

# Function to update application code
update_code() {
    print_status "Updating application code..."
    
    cd $APP_DIR
    
    # Stash any local changes
    git stash push -m "Pre-update stash $(date)"
    
    # Fetch latest changes
    git fetch origin main
    
    # Get current and latest commit hashes
    local current_commit=$(git rev-parse HEAD)
    local latest_commit=$(git rev-parse origin/main)
    
    if [ "$current_commit" = "$latest_commit" ]; then
        print_status "Already up to date"
        return 0
    fi
    
    # Show what will be updated
    print_status "Updating from $current_commit to $latest_commit"
    git log --oneline $current_commit..$latest_commit | head -10
    
    # Pull latest changes
    git reset --hard origin/main
    
    print_success "Code updated successfully"
}

# Function to update dependencies
update_dependencies() {
    print_status "Updating dependencies..."
    
    cd $APP_DIR
    
    # Update npm packages
    npm install
    
    print_success "Dependencies updated"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    cd $APP_DIR
    
    # Run database push (Drizzle ORM)
    npm run db:push
    
    print_success "Database migrations completed"
}

# Function to build application
build_application() {
    print_status "Building application..."
    
    cd $APP_DIR
    
    # Clean previous build
    rm -rf dist/
    
    # Build application
    npm run build
    
    print_success "Application built successfully"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if service is running
    if ! systemctl is-active --quiet $SERVICE_NAME; then
        print_error "Service is not running"
        return 1
    fi
    
    # Wait for application to start
    sleep 10
    
    # Check HTTP response
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000)
    
    if [[ $response_code -eq 200 ]] || [[ $response_code -eq 302 ]]; then
        print_success "Application is responding (HTTP $response_code)"
    else
        print_error "Application is not responding properly (HTTP $response_code)"
        return 1
    fi
    
    # Check API endpoint
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000/api/health)
    
    if [[ $api_response -eq 200 ]]; then
        print_success "API is responding (HTTP $api_response)"
    else
        print_warning "API might not be responding properly (HTTP $api_response)"
    fi
    
    print_success "Deployment verification completed"
}

# Function to rollback on failure
rollback() {
    print_error "Update failed, attempting rollback..."
    
    # Stop service
    systemctl stop $SERVICE_NAME || true
    
    # Restore from backup if available
    if [ -f "/tmp/marfanet_update_backup" ]; then
        source /tmp/marfanet_update_backup
        
        if [ -f "$BACKUP_FILE" ]; then
            print_status "Restoring from backup: $BACKUP_FILE"
            
            # Remove current application
            rm -rf $APP_DIR
            mkdir -p $APP_DIR
            
            # Extract backup
            tar -xzf $BACKUP_FILE -C /var/www/
            
            # Restore ownership
            chown -R www-data:www-data $APP_DIR
            
            print_success "Application restored from backup"
        fi
    fi
    
    # Try to start service
    systemctl start $SERVICE_NAME || true
    
    print_error "Rollback completed. Please check system status manually."
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Remove temporary files
    rm -f /tmp/marfanet_update_backup
    
    # Clean npm cache
    cd $APP_DIR
    npm cache clean --force >/dev/null 2>&1 || true
    
    print_success "Cleanup completed"
}

# Function to show update summary
show_summary() {
    print_success "
╔══════════════════════════════════════════════════════════════════════════════╗
║                        🎉 UPDATE COMPLETED! 🎉                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  MarFaNet has been successfully updated!                                    ║
║                                                                              ║
║  📊 Service Status:                                                          ║
║     - MarFaNet: $(systemctl is-active marfanet)                                      
║     - Nginx: $(systemctl is-active nginx)                                           
║     - PostgreSQL: $(systemctl is-active postgresql)                                 
║                                                                              ║
║  🔧 Useful Commands:                                                         ║
║     - Check logs: journalctl -u marfanet -f                                 ║
║     - Restart: systemctl restart marfanet                                   ║
║     - Status: systemctl status marfanet                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝"
}

# Main update function
main() {
    print_status "Starting MarFaNet update process..."
    
    # Set up error handling
    trap rollback ERR
    
    # Run update steps
    check_prerequisites
    create_backup
    stop_services
    update_code
    update_dependencies
    run_migrations
    build_application
    start_services
    verify_deployment
    cleanup
    
    # Clear error trap
    trap - ERR
    
    show_summary
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "MarFaNet Update Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --force        Force update even if no changes detected"
        echo ""
        exit 0
        ;;
    --force)
        FORCE_UPDATE=true
        ;;
esac

# Run main function
main "$@"