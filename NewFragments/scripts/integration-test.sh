#!/bin/bash
# Script to run integration tests with docker-compose
# This script:
# 1. Starts docker-compose services (fragments, dynamodb-local, localstack)
# 2. Waits for services to be ready
# 3. Sets up AWS resources (S3 bucket, DynamoDB table)
# 4. Runs integration tests
# 5. Optionally cleans up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Parse command line arguments
CLEANUP=true
if [[ "$1" == "--no-cleanup" ]]; then
  CLEANUP=false
fi

echo -e "${GREEN}Starting integration test setup...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: docker-compose or docker is not installed${NC}"
  exit 1
fi

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

# Run integration tests
echo -e "${YELLOW}Running integration tests...${NC}"
if npm run test:integration; then
  echo -e "${GREEN}Integration tests passed!${NC}"
  TEST_RESULT=0
else
  echo -e "${RED}Integration tests failed!${NC}"
  TEST_RESULT=1
fi

# Cleanup if requested
if [ "$CLEANUP" = true ]; then
  echo -e "${YELLOW}Cleaning up docker-compose services...${NC}"
  $DOCKER_COMPOSE down
  echo -e "${GREEN}Cleanup complete${NC}"
else
  echo -e "${YELLOW}Services are still running. Use 'docker-compose down' to stop them.${NC}"
fi

exit $TEST_RESULT

