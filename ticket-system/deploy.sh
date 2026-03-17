#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║     SupportDesk — ECS Deployment Script                     ║
# ║     Usage: ./deploy.sh [--backend-only | --frontend-only]   ║
# ╚══════════════════════════════════════════════════════════════╝

set -euo pipefail

# ─── CONFIG — edit these before running ──────────────────────
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"          # e.g. 123456789012
ECS_CLUSTER="ticket-cluster"
BACKEND_REPO="ticket-backend"
FRONTEND_REPO="ticket-frontend"
BACKEND_SERVICE="ticket-backend-service"
FRONTEND_SERVICE="ticket-frontend-service"
BACKEND_TASK_DEF="ticket-backend-task"
FRONTEND_TASK_DEF="ticket-frontend-task"
# If you want to pass the frontend's API URL at build time, set:
REACT_APP_API_URL="/api"
# ─────────────────────────────────────────────────────────────

ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true

# Parse flags
for arg in "$@"; do
  case $arg in
    --backend-only)  DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false  ;;
  esac
done

log()  { echo -e "\033[1;34m[$(date '+%H:%M:%S')] $*\033[0m"; }
ok()   { echo -e "\033[1;32m[$(date '+%H:%M:%S')] ✓ $*\033[0m"; }
err()  { echo -e "\033[1;31m[$(date '+%H:%M:%S')] ✗ $*\033[0m"; exit 1; }
warn() { echo -e "\033[1;33m[$(date '+%H:%M:%S')] ⚠ $*\033[0m"; }

# ─── Prerequisites check ─────────────────────────────────────
log "Checking prerequisites..."
command -v docker  >/dev/null 2>&1 || err "docker is not installed"
command -v aws     >/dev/null 2>&1 || err "aws cli is not installed"
aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1 || err "AWS credentials not configured. Run: aws configure"
ok "Prerequisites OK"

# ─── ECR Login ───────────────────────────────────────────────
log "Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_BASE" >/dev/null 2>&1
ok "ECR login successful"

# ─── Create ECR repos if they don't exist ───────────────────
create_ecr_repo() {
  local name=$1
  if ! aws ecr describe-repositories --repository-names "$name" --region "$AWS_REGION" >/dev/null 2>&1; then
    log "Creating ECR repository: $name"
    aws ecr create-repository \
      --repository-name "$name" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 >/dev/null
    ok "Repository created: $name"
  else
    ok "Repository exists: $name"
  fi
}

# ─── ECS Cluster ─────────────────────────────────────────────
log "Ensuring ECS cluster exists: $ECS_CLUSTER"
if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" \
    --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  aws ecs create-cluster --cluster-name "$ECS_CLUSTER" --region "$AWS_REGION" \
    --capacity-providers FARGATE FARGATE_SPOT >/dev/null
  ok "Cluster created: $ECS_CLUSTER"
else
  ok "Cluster active: $ECS_CLUSTER"
fi

# ─── Build & Push: Backend ───────────────────────────────────
if [ "$DEPLOY_BACKEND" = true ]; then
  create_ecr_repo "$BACKEND_REPO"

  log "Building backend Docker image..."
  docker build \
    --platform linux/amd64 \
    -t "$BACKEND_REPO:latest" \
    ./backend
  ok "Backend image built"

  log "Tagging and pushing backend..."
  docker tag "$BACKEND_REPO:latest" "$ECR_BASE/$BACKEND_REPO:latest"
  docker tag "$BACKEND_REPO:latest" "$ECR_BASE/$BACKEND_REPO:$(date +%Y%m%d-%H%M%S)"
  docker push "$ECR_BASE/$BACKEND_REPO:latest"
  ok "Backend pushed to ECR: $ECR_BASE/$BACKEND_REPO:latest"

  # Register task definition
  log "Registering backend task definition..."
  BACKEND_TASK_JSON=$(cat docker/ecs-task-backend.json \
    | sed "s|YOUR_ACCOUNT_ID|$AWS_ACCOUNT_ID|g" \
    | sed "s|YOUR_REGION|$AWS_REGION|g")

  aws ecs register-task-definition \
    --cli-input-json "$BACKEND_TASK_JSON" \
    --region "$AWS_REGION" >/dev/null
  ok "Backend task definition registered"

  # Update or create ECS service
  if aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$BACKEND_SERVICE" \
      --region "$AWS_REGION" --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    log "Updating backend ECS service..."
    aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$BACKEND_SERVICE" \
      --task-definition "$BACKEND_TASK_DEF" \
      --force-new-deployment \
      --region "$AWS_REGION" >/dev/null
    ok "Backend service update triggered"
  else
    warn "Backend service '$BACKEND_SERVICE' not found."
    warn "Create it manually in the AWS Console (ECS → Clusters → $ECS_CLUSTER → Create Service)"
    warn "Use task definition: $BACKEND_TASK_DEF, launch type: FARGATE"
  fi
fi

# ─── Build & Push: Frontend ──────────────────────────────────
if [ "$DEPLOY_FRONTEND" = true ]; then
  create_ecr_repo "$FRONTEND_REPO"

  log "Building frontend Docker image..."
  docker build \
    --platform linux/amd64 \
    --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
    -t "$FRONTEND_REPO:latest" \
    ./frontend
  ok "Frontend image built"

  log "Tagging and pushing frontend..."
  docker tag "$FRONTEND_REPO:latest" "$ECR_BASE/$FRONTEND_REPO:latest"
  docker tag "$FRONTEND_REPO:latest" "$ECR_BASE/$FRONTEND_REPO:$(date +%Y%m%d-%H%M%S)"
  docker push "$ECR_BASE/$FRONTEND_REPO:latest"
  ok "Frontend pushed to ECR: $ECR_BASE/$FRONTEND_REPO:latest"

  log "Registering frontend task definition..."
  FRONTEND_TASK_JSON=$(cat docker/ecs-task-frontend.json \
    | sed "s|YOUR_ACCOUNT_ID|$AWS_ACCOUNT_ID|g" \
    | sed "s|YOUR_REGION|$AWS_REGION|g")

  aws ecs register-task-definition \
    --cli-input-json "$FRONTEND_TASK_JSON" \
    --region "$AWS_REGION" >/dev/null
  ok "Frontend task definition registered"

  if aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$FRONTEND_SERVICE" \
      --region "$AWS_REGION" --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    log "Updating frontend ECS service..."
    aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$FRONTEND_SERVICE" \
      --task-definition "$FRONTEND_TASK_DEF" \
      --force-new-deployment \
      --region "$AWS_REGION" >/dev/null
    ok "Frontend service update triggered"
  else
    warn "Frontend service '$FRONTEND_SERVICE' not found."
    warn "Create it manually in the AWS Console (ECS → Clusters → $ECS_CLUSTER → Create Service)"
    warn "Use task definition: $FRONTEND_TASK_DEF, launch type: FARGATE, port: 80"
  fi
fi

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo -e "\033[1;32m╔══════════════════════════════════════════╗"
echo    "║         Deployment Complete! 🚀          ║"
echo -e "╚══════════════════════════════════════════╝\033[0m"
echo ""
echo "  Cluster:   $ECS_CLUSTER"
echo "  Region:    $AWS_REGION"
echo ""
echo "  ▸ Monitor: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${ECS_CLUSTER}/services"
echo "  ▸ Logs:    https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups"
echo ""
echo "  After ~2 mins, get your app URL from:"
echo "  EC2 → Load Balancers → DNS name"
echo ""
