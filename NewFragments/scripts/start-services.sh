#!/bin/bash
# Script to start docker-compose services for development/testing
# This script:
# 1. Starts docker-compose services
# 2. Waits for services to be ready
# 3. Sets up AWS resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${GREEN}Starting development services...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

# Start docker-compose services
echo -e "${YELLOW}Starting docker-compose services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"

# Wait for LocalStack
echo "Waiting for LocalStack..."
until curl --silent http://localhost:4566/_localstack/health | grep -q '"s3": "\(running\|available\)"' 2>/dev/null; do
  sleep 2
done
echo -e "${GREEN}LocalStack is ready${NC}"

# Wait for DynamoDB Local
echo "Waiting for DynamoDB Local..."
until curl --silent http://localhost:8000 > /dev/null 2>&1; do
  sleep 2
done
echo -e "${GREEN}DynamoDB Local is ready${NC}"

# Wait for fragments service
echo "Waiting for fragments service..."
timeout=60
elapsed=0
until curl --silent http://localhost:8080/ > /dev/null 2>&1; do
  if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}Error: fragments service did not start within ${timeout} seconds${NC}"
    $DOCKER_COMPOSE logs fragments
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
echo -e "${GREEN}Fragments service is ready${NC}"

# Set up AWS resources
echo -e "${YELLOW}Setting up AWS resources (S3 bucket, DynamoDB table)...${NC}"
if [ -f "$SCRIPT_DIR/local-aws-setup.sh" ]; then
  bash "$SCRIPT_DIR/local-aws-setup.sh"
else
  echo -e "${RED}Error: local-aws-setup.sh not found${NC}"
  exit 1
fi

echo -e "${GREEN}All services are ready!${NC}"
echo ""
echo "Services running:"
echo "  - Fragments API: http://localhost:8080"
echo "  - DynamoDB Local: http://localhost:8000"
echo "  - LocalStack S3: http://localhost:4566"
echo ""
echo "To stop services, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"

