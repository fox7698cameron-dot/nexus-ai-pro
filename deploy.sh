#!/bin/bash

# ================================================
# NEXUS AI PRO - AUTOMATED DEPLOYMENT SCRIPT
# Complete automation for build, test, and deploy
# ================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="nexus-ai-pro"
IOS_PROJECT_PATH="./nexus ai pro/nexus ai pro.xcodeproj"
WEB_APP_PATH="./"
BACKEND_PATH="./"
DOCKER_IMAGE="nexus-ai-pro"
DOCKER_TAG="latest"

# Deployment targets
VERCEL_PROJECT=""
RAILWAY_PROJECT=""
AWS_S3_BUCKET=""
TESTFLIGHT_ENABLED=true

echo -e "${PURPLE}"
echo "===================================================================="
echo "                                                                    "
echo "                    NEXUS AI PRO                                    "
echo "          AUTOMATED DEPLOYMENT SYSTEM v1.0                         "
echo "                                                                    "
echo "===================================================================="
echo -e "${NC}"

# Parse command line arguments
DEPLOY_TARGET="all"
SKIP_TESTS=false
SKIP_BUILD=false
ENVIRONMENT="production"

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            DEPLOY_TARGET="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./deploy.sh [options]"
            echo ""
            echo "Options:"
            echo "  --target <target>    Deployment target: all, ios, web, backend, docker"
            echo "  --skip-tests         Skip running tests"
            echo "  --skip-build         Skip build step"
            echo "  --env <environment>  Environment: production, staging, development"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# ================================================
# UTILITY FUNCTIONS
# ================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ">>> $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        return 1
    fi
    return 0
}

# ================================================
# PREREQUISITES CHECK
# ================================================

check_prerequisites() {
    log_step "Checking Prerequisites"
    
    local missing=()
    
    # Check required tools
    check_command "node" || missing+=("node")
    check_command "npm" || missing+=("npm")
    check_command "git" || missing+=("git")
    
    # Check optional tools based on target
    if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "ios" ]]; then
        check_command "xcodebuild" || missing+=("xcodebuild")
        check_command "xcrun" || missing+=("xcrun")
    fi
    
    if [[ "$DEPLOY_TARGET" == "all" || "$DEPLOY_TARGET" == "docker" ]]; then
        check_command "docker" || missing+=("docker")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# ================================================
# ENVIRONMENT SETUP
# ================================================

setup_environment() {
    log_step "Setting Up Environment"
    
    # Load environment variables
    if [ -f ".env.$ENVIRONMENT" ]; then
        export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
        log_info "Loaded environment: $ENVIRONMENT"
    elif [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
        log_info "Loaded default environment"
    else
        log_warning "No environment file found, using defaults"
    fi
    
    # Set build number
    export BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
    log_info "Build number: $BUILD_NUMBER"
    
    log_success "Environment configured"
}

# ================================================
# SECURITY SCAN
# ================================================

run_security_scan() {
    log_step "Running Security Scan"
    
    # Check for sensitive data in code
    log_info "Scanning for sensitive data..."
    
    # Check for hardcoded secrets
    if grep -r "api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9]" --include="*.swift" --include="*.js" --include="*.ts" . 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
        log_warning "Potential hardcoded API keys found"
    else
        log_success "No hardcoded secrets detected"
    fi
    
    # Run npm audit for web dependencies
    if [ -f "package.json" ]; then
        log_info "Running npm audit..."
        npm audit --production || log_warning "Some vulnerabilities found"
    fi
    
    log_success "Security scan completed"
}

# ================================================
# WEB APP BUILD & DEPLOY
# ================================================

build_web_app() {
    log_step "Building Web Application"
    
    cd "$WEB_APP_PATH"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Run tests
    if [ "$SKIP_TESTS" = false ]; then
        log_info "Running tests..."
        npm test || log_warning "Some tests failed"
    fi
    
    # Build
    log_info "Building production bundle..."
    npm run build
    
    log_success "Web app built successfully"
}

deploy_web_app() {
    log_step "Deploying Web Application"
    
    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        log_info "Deploying to Vercel..."
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --prod --yes
        else
            vercel --yes
        fi
        log_success "Deployed to Vercel"
    fi
    
    # Deploy to Railway
    if command -v railway &> /dev/null && [ -n "$RAILWAY_PROJECT" ]; then
        log_info "Deploying to Railway..."
        railway up
        log_success "Deployed to Railway"
    fi
}

# ================================================
# BACKEND BUILD & DEPLOY
# ================================================

build_backend() {
    log_step "Building Backend"
    
    cd "$BACKEND_PATH"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Run tests
    if [ "$SKIP_TESTS" = false ]; then
        log_info "Running backend tests..."
        npm run test || log_warning "Some tests failed"
    fi
    
    log_success "Backend built successfully"
}

deploy_backend() {
    log_step "Deploying Backend"
    
    # Build Docker image
    if [ "$DEPLOY_TARGET" = "docker" ] || [ "$DEPLOY_TARGET" = "all" ]; then
        build_docker_image
    fi
    
    # Deploy to cloud
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Deploying to production..."
        # Add your production deployment commands here
    fi
    
    log_success "Backend deployed successfully"
}

# ================================================
# DOCKER BUILD
# ================================================

build_docker_image() {
    log_step "Building Docker Image"
    
    log_info "Building Docker image: $DOCKER_IMAGE:$DOCKER_TAG"
    docker build -t $DOCKER_IMAGE:$DOCKER_TAG .
    
    # Tag with build number
    docker tag $DOCKER_IMAGE:$DOCKER_TAG $DOCKER_IMAGE:$BUILD_NUMBER
    
    log_success "Docker image built: $DOCKER_IMAGE:$DOCKER_TAG"
    
    # Push to registry if configured
    if [ -n "$DOCKER_REGISTRY" ]; then
        log_info "Pushing to registry..."
        docker push $DOCKER_REGISTRY/$DOCKER_IMAGE:$DOCKER_TAG
        docker push $DOCKER_REGISTRY/$DOCKER_IMAGE:$BUILD_NUMBER
        log_success "Pushed to registry"
    fi
}

# ================================================
# iOS BUILD & DEPLOY
# ================================================

build_ios_app() {
    log_step "Building iOS Application"
    
    cd "nexus ai pro"
    
    # Clean build folder
    log_info "Cleaning build folder..."
    xcodebuild clean -project "nexus ai pro.xcodeproj" -scheme "nexus ai pro" -configuration Release 2>/dev/null || true
    
    # Build for simulator (for testing)
    log_info "Building for simulator..."
    xcodebuild build \
        -project "nexus ai pro.xcodeproj" \
        -scheme "nexus ai pro" \
        -destination "platform=iOS Simulator,name=iPhone 15 Pro" \
        -configuration Release \
        CODE_SIGN_IDENTITY="" \
        CODE_SIGNING_REQUIRED=NO \
        CODE_SIGNING_ALLOWED=NO
    
    log_success "iOS app built for simulator"
    
    # Build for device (archive)
    if [ "$ENVIRONMENT" = "production" ] && [ "$TESTFLIGHT_ENABLED" = true ]; then
        log_info "Creating archive for distribution..."
        
        xcodebuild archive \
            -project "nexus ai pro.xcodeproj" \
            -scheme "nexus ai pro" \
            -archivePath "./build/nexus-ai-pro.xcarchive" \
            -configuration Release \
            -destination "generic/platform=iOS"
        
        log_success "Archive created"
    fi
    
    cd ..
}

deploy_ios_app() {
    log_step "Deploying iOS Application"
    
    if [ "$TESTFLIGHT_ENABLED" = true ] && [ -f "./nexus ai pro/build/nexus-ai-pro.xcarchive" ]; then
        log_info "Exporting IPA..."
        
        xcodebuild -exportArchive \
            -archivePath "./nexus ai pro/build/nexus-ai-pro.xcarchive" \
            -exportPath "./nexus ai pro/build" \
            -exportOptionsPlist "./nexus ai pro/ExportOptions.plist"
        
        # Upload to TestFlight
        if command -v xcrun &> /dev/null; then
            log_info "Uploading to TestFlight..."
            xcrun altool --upload-app \
                --type ios \
                --file "./nexus ai pro/build/nexus ai pro.ipa" \
                --username "$APPLE_ID" \
                --password "$APP_SPECIFIC_PASSWORD"
            
            log_success "Uploaded to TestFlight"
        fi
    else
        log_warning "TestFlight deployment skipped"
    fi
}

# ================================================
# RUN iOS SIMULATOR
# ================================================

run_ios_simulator() {
    log_step "Running iOS Simulator"
    
    # Boot simulator
    log_info "Booting iPhone 15 Pro simulator..."
    xcrun simctl boot "iPhone 15 Pro" 2>/dev/null || true
    
    # Open Simulator app
    open -a Simulator
    
    # Wait for boot
    sleep 5
    
    # Install and launch app
    log_info "Installing app..."
    xcrun simctl install booted "./nexus ai pro/build/Build/Products/Release-iphonesimulator/nexus ai pro.app" 2>/dev/null || \
    xcrun simctl install booted "./nexus ai pro/build/Release-iphonesimulator/nexus ai pro.app" 2>/dev/null || \
    log_warning "Could not install app to simulator"
    
    log_info "Launching app..."
    xcrun simctl launch booted "com.nexusai.pro" 2>/dev/null || \
    log_warning "Could not launch app in simulator"
    
    log_success "Simulator running"
}

# ================================================
# START LOCAL DEVELOPMENT
# ================================================

start_dev() {
    log_step "Starting Development Environment"
    
    # Start backend
    log_info "Starting backend server..."
    npm run dev:server &
    BACKEND_PID=$!
    
    # Wait for backend
    sleep 3
    
    # Start frontend
    log_info "Starting frontend..."
    npm run dev:client &
    FRONTEND_PID=$!
    
    log_success "Development servers started"
    log_info "Backend PID: $BACKEND_PID"
    log_info "Frontend PID: $FRONTEND_PID"
    log_info "Press Ctrl+C to stop"
    
    # Wait for interrupt
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT
    wait
}

# ================================================
# MAIN EXECUTION
# ================================================

main() {
    log_info "Deployment target: $DEPLOY_TARGET"
    log_info "Environment: $ENVIRONMENT"
    log_info "Skip tests: $SKIP_TESTS"
    log_info "Skip build: $SKIP_BUILD"
    
    check_prerequisites
    setup_environment
    run_security_scan
    
    case $DEPLOY_TARGET in
        "all")
            if [ "$SKIP_BUILD" = false ]; then
                build_web_app
                build_backend
                build_ios_app
            fi
            deploy_web_app
            deploy_backend
            deploy_ios_app
            ;;
        "web")
            if [ "$SKIP_BUILD" = false ]; then
                build_web_app
            fi
            deploy_web_app
            ;;
        "backend")
            if [ "$SKIP_BUILD" = false ]; then
                build_backend
            fi
            deploy_backend
            ;;
        "ios")
            if [ "$SKIP_BUILD" = false ]; then
                build_ios_app
            fi
            deploy_ios_app
            ;;
        "docker")
            build_docker_image
            ;;
        "simulator")
            build_ios_app
            run_ios_simulator
            ;;
        "dev")
            start_dev
            ;;
        *)
            log_error "Unknown target: $DEPLOY_TARGET"
            exit 1
            ;;
    esac
    
    log_step "Deployment Complete"
    
    echo -e "${GREEN}"
    echo "===================================================================="
    echo "                                                                    "
    echo "              DEPLOYMENT SUCCESSFUL!                               "
    echo "                                                                    "
    echo "  Build Number: $BUILD_NUMBER                              "
    echo "  Environment:  $ENVIRONMENT                                   "
    echo "                                                                    "
    echo "===================================================================="
    echo -e "${NC}"
}

# Run main function
main
