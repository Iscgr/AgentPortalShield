#!/bin/bash

#═══════════════════════════════════════════════════════════════════════════════
#  MarFaNet Health Check Script
#  
#  This script monitors the health of MarFaNet application and services
#═══════════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="marfanet"
SERVICE_NAME="marfanet"
APP_URL="http://localhost:3000"
LOG_FILE="/var/log/marfanet-health.log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✓${NC} $service is running"
        log_message "SUCCESS: $service is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service is not running"
        log_message "ERROR: $service is not running"
        return 1
    fi
}

# Function to check HTTP response
check_http() {
    local url=$1
    local expected_code=${2:-200}
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $url)
    
    if [[ $response_code -eq $expected_code ]] || [[ $response_code -eq 302 ]]; then
        echo -e "${GREEN}✓${NC} HTTP check passed ($url -> $response_code)"
        log_message "SUCCESS: HTTP check passed for $url (code: $response_code)"
        return 0
    else
        echo -e "${RED}✗${NC} HTTP check failed ($url -> $response_code)"
        log_message "ERROR: HTTP check failed for $url (code: $response_code)"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    if sudo -u postgres psql -d marfanet_db -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database connection successful"
        log_message "SUCCESS: Database connection successful"
        return 0
    else
        echo -e "${RED}✗${NC} Database connection failed"
        log_message "ERROR: Database connection failed"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold=90
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $disk_usage -lt $threshold ]]; then
        echo -e "${GREEN}✓${NC} Disk usage: ${disk_usage}%"
        log_message "SUCCESS: Disk usage is normal (${disk_usage}%)"
        return 0
    else
        echo -e "${RED}✗${NC} Disk usage: ${disk_usage}% (above ${threshold}%)"
        log_message "WARNING: High disk usage (${disk_usage}%)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local threshold=90
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [[ $memory_usage -lt $threshold ]]; then
        echo -e "${GREEN}✓${NC} Memory usage: ${memory_usage}%"
        log_message "SUCCESS: Memory usage is normal (${memory_usage}%)"
        return 0
    else
        echo -e "${RED}✗${NC} Memory usage: ${memory_usage}% (above ${threshold}%)"
        log_message "WARNING: High memory usage (${memory_usage}%)"
        return 1
    fi
}

# Function to check SSL certificate expiry
check_ssl_cert() {
    local domain=$1
    if [ -z "$domain" ]; then
        echo -e "${YELLOW}⚠${NC} SSL check skipped (domain not provided)"
        return 0
    fi
    
    cert_file="/etc/letsencrypt/live/$domain/fullchain.pem"
    if [ -f "$cert_file" ]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))
        
        if [[ $days_left -gt 30 ]]; then
            echo -e "${GREEN}✓${NC} SSL certificate valid ($days_left days left)"
            log_message "SUCCESS: SSL certificate valid ($days_left days left)"
            return 0
        elif [[ $days_left -gt 7 ]]; then
            echo -e "${YELLOW}⚠${NC} SSL certificate expires soon ($days_left days left)"
            log_message "WARNING: SSL certificate expires soon ($days_left days left)"
            return 1
        else
            echo -e "${RED}✗${NC} SSL certificate expires very soon ($days_left days left)"
            log_message "CRITICAL: SSL certificate expires very soon ($days_left days left)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} SSL certificate not found"
        log_message "WARNING: SSL certificate not found"
        return 1
    fi
}

# Main health check function
main() {
    echo -e "${BLUE}MarFaNet Health Check - $(date)${NC}"
    echo "════════════════════════════════════════════════"
    
    local exit_code=0
    
    # Check services
    echo -e "\n${BLUE}Service Status:${NC}"
    check_service $SERVICE_NAME || exit_code=1
    check_service nginx || exit_code=1
    check_service postgresql || exit_code=1
    
    # Check HTTP endpoints
    echo -e "\n${BLUE}HTTP Health Checks:${NC}"
    check_http $APP_URL || exit_code=1
    check_http "$APP_URL/api/health" || exit_code=1
    
    # Check database
    echo -e "\n${BLUE}Database Health:${NC}"
    check_database || exit_code=1
    
    # Check system resources
    echo -e "\n${BLUE}System Resources:${NC}"
    check_disk_space || exit_code=1
    check_memory || exit_code=1
    
    # Check SSL certificate if domain is provided
    if [ ! -z "$1" ]; then
        echo -e "\n${BLUE}SSL Certificate:${NC}"
        check_ssl_cert $1 || exit_code=1
    fi
    
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✓ All health checks passed!${NC}"
        log_message "SUCCESS: All health checks passed"
    else
        echo -e "${RED}✗ Some health checks failed!${NC}"
        log_message "ERROR: Some health checks failed"
    fi
    
    exit $exit_code
}

# Run health check
main "$@"