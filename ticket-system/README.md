# 🎫 SupportDesk — Customer Support Ticket System

A full-stack customer support platform with real-time updates, role-based access, email notifications, and Docker/ECS deployment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, MongoDB (Mongoose) |
| Frontend | React 18, React Router v6, Axios, Socket.io-client |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Real-time | Socket.io |
| Email | Nodemailer (Gmail SMTP) |
| Logging | Winston + daily rotate |
| Containerization | Docker (multi-stage builds) |
| Orchestration | AWS ECS Fargate |
| Registry | AWS ECR |
| Reverse Proxy | Nginx |

---

## Project Structure

```
ticket-system/
├── backend/
│   ├── config/          db.js — MongoDB connection
│   ├── controllers/     authController.js, ticketController.js
│   ├── middleware/       auth.js, errorHandler.js, logger.js
│   ├── models/          User.js, Ticket.js
│   ├── routes/          authRoutes.js, ticketRoutes.js
│   ├── services/        emailService.js
│   ├── socket/          socket.js
│   ├── Dockerfile
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/  Navbar.js, UI.js (shared components)
│   │   ├── context/     AuthContext.js
│   │   ├── hooks/       useTickets.js
│   │   ├── pages/       Login, Register, Dashboard, AgentDashboard, CreateTicket, TicketDetail
│   │   ├── services/    api.js, socket.js
│   │   ├── App.js
│   │   └── index.css
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── docker/
│   ├── ecs-task-backend.json
│   └── ecs-task-frontend.json
├── docker-compose.yml   ← Local development
├── deploy.sh            ← One-shot ECS deploy script
└── .env.example
```

---

## Quickstart — Local Docker (Recommended)

### 1. Clone and configure

```bash
cd ticket-system
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
```

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

### 3. Run without Docker (development)

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
cp .env.example .env
npm install
npm start
```

---

## API Reference

### Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/register | Public | Register user/agent |
| POST | /api/auth/login | Public | Login, returns JWT |
| GET | /api/auth/me | Private | Get current user |
| PUT | /api/auth/me | Private | Update profile |

### Tickets

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/tickets | User only | Create ticket |
| GET | /api/tickets | Private | List tickets (users: own; agents: all) |
| GET | /api/tickets/stats | Private | Stats by status/priority |
| GET | /api/tickets/:id | Private | Get single ticket |
| PUT | /api/tickets/:id | Private | Update ticket |
| DELETE | /api/tickets/:id | Private | Delete ticket |
| POST | /api/tickets/:id/comments | Private | Add comment |

### Sample Requests

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@test.com","password":"pass123","role":"user"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'

# Create ticket (with token)
curl -X POST http://localhost:5000/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Login broken","description":"Cannot login since yesterday morning","priority":"high","category":"technical"}'
```

---

## Deploy to AWS ECS

### Prerequisites

1. AWS CLI installed and configured (`aws configure`)
2. Docker Desktop running
3. IAM user with: `ECR`, `ECS`, `EC2`, `SecretsManager`, `CloudWatch` permissions

---

### Step 1 — Store secrets in AWS Secrets Manager

```bash
# MongoDB URI
aws secretsmanager create-secret \
  --name ticket-app/mongo-uri \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/ticketdb" \
  --region ap-south-1

# JWT Secret
aws secretsmanager create-secret \
  --name ticket-app/jwt-secret \
  --secret-string "your_64_char_hex_secret" \
  --region ap-south-1

# Email credentials
aws secretsmanager create-secret --name ticket-app/email-user --secret-string "you@gmail.com" --region ap-south-1
aws secretsmanager create-secret --name ticket-app/email-pass --secret-string "your16charapppass" --region ap-south-1
aws secretsmanager create-secret --name ticket-app/email-from --secret-string "Support Team <you@gmail.com>" --region ap-south-1
aws secretsmanager create-secret --name ticket-app/client-url --secret-string "http://YOUR-ALB-DNS.amazonaws.com" --region ap-south-1
```

### Step 2 — Create IAM roles

**ecsTaskExecutionRole** (allows ECS to pull images + fetch secrets):
```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"ecs-tasks.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }'

# Attach managed policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

### Step 3 — Edit deploy.sh

Open `deploy.sh` and set:
```bash
AWS_REGION="ap-south-1"       # your region
AWS_ACCOUNT_ID="123456789012"  # your 12-digit account ID
```

Also update `docker/ecs-task-backend.json` and `docker/ecs-task-frontend.json`:
- Replace all `YOUR_ACCOUNT_ID` with your account ID
- Replace all `YOUR_REGION` with your region

### Step 4 — Run the deploy script

```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
1. Log in to ECR
2. Create ECR repositories if missing
3. Create ECS cluster if missing
4. Build Docker images (linux/amd64)
5. Push images to ECR
6. Register ECS task definitions
7. Trigger rolling deployment on existing services

To deploy only one service:
```bash
./deploy.sh --backend-only
./deploy.sh --frontend-only
```

### Step 5 — Create ECS Services (first time only)

In the AWS Console, for each service:

1. Go to **ECS → Clusters → ticket-cluster → Services → Create**
2. Settings:
   - Launch type: **Fargate**
   - Task definition: `ticket-backend-task` / `ticket-frontend-task`
   - Service name: `ticket-backend-service` / `ticket-frontend-service`
   - Desired tasks: `1`
3. Networking:
   - VPC: default
   - Subnets: pick 2 public subnets
   - Security group: allow TCP 5000 (backend) / TCP 80 (frontend)
   - Auto-assign public IP: **ENABLED**
4. Load balancer:
   - Type: **Application Load Balancer**
   - Listener: HTTP 80
   - Target group port: 5000 (backend) or 80 (frontend)

### Step 6 — Get your live URL

```
AWS Console → EC2 → Load Balancers → copy DNS name
```

Example: `http://ticket-alb-1234567890.ap-south-1.elb.amazonaws.com`

---

## Socket.io Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `ticketCreated` | Server → All clients | `{ ticket }` | POST /api/tickets |
| `ticketUpdated` | Server → All clients | `{ ticket }` | PUT /api/tickets/:id |
| `ticketDeleted` | Server → All clients | `{ ticketId }` | DELETE /api/tickets/:id |
| `commentAdded` | Server → All clients | `{ ticket }` | POST /api/tickets/:id/comments |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Min 32 chars, random hex recommended |
| `JWT_EXPIRES_IN` | — | Default: `7d` |
| `PORT` | — | Default: `5000` |
| `NODE_ENV` | — | `development` or `production` |
| `CLIENT_URL` | ✅ | Frontend URL for CORS |
| `EMAIL_USER` | — | Gmail address |
| `EMAIL_PASS` | — | 16-char Gmail App Password |
| `EMAIL_FROM` | — | Display name + email |
| `AWS_REGION` | — | For deploy script |
| `AWS_ACCOUNT_ID` | — | For deploy script |

---

## Future AWS Upgrades (Files Already Prepared)

| Current | AWS Equivalent | What to change |
|---------|---------------|----------------|
| Gmail SMTP (Nodemailer) | AWS SES | Replace transporter in `emailService.js` |
| MongoDB Atlas | Amazon DocumentDB | Change `MONGO_URI` |
| ECS on ALB | ECS + CloudFront | Add CloudFront distribution |
| Manual secrets | AWS Secrets Manager | Already wired in `ecs-task-backend.json` |
| Winston file logs | AWS CloudWatch | Already wired via `awslogs` driver in task definitions |

---

## Troubleshooting

**Container exits immediately**
```bash
docker logs ticket-backend
# Usually means MONGO_URI is wrong or unreachable
```

**CORS errors in browser**
- Check `CLIENT_URL` in backend `.env` matches your frontend URL exactly (no trailing slash)

**Socket.io not connecting**
- Check `REACT_APP_SOCKET_URL` in frontend `.env`
- For ECS: the ALB must have a listener rule that forwards `/socket.io/*` to the backend target group

**Email not sending**
- Verify Gmail 2FA is enabled
- App password must be 16 chars with no spaces
- Check spam folder for test emails

---

## License

MIT
