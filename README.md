# Fragments Management System

A full-stack application for managing and storing small pieces of data called "fragments". The system supports various content types including text (plain text, Markdown, CSV, JSON) and images (PNG, JPG, WebP, AVIF, GIF). It provides a RESTful API backend and a modern web-based user interface.

## Project Overview

This project consists of two main components:

1. **NewFragments** - Backend REST API service for fragment management
2. **NewFragments-ui** - Frontend web application for interacting with the API

The backend supports multiple storage backends (in-memory, AWS S3, DynamoDB) and authentication methods (AWS Cognito, Basic Auth). The frontend provides an intuitive interface for creating, viewing, updating, and deleting fragments.

## Architecture

### Backend (NewFragments)

- **Framework**: Express.js (Node.js)
- **Authentication**: AWS Cognito (JWT) or HTTP Basic Authentication
- **Storage**: AWS S3 (for fragment content), DynamoDB (for metadata)
- **Content Types**: Supports text and image fragments with type conversion capabilities
- **API**: RESTful API following REST principles

### Frontend (NewFragments-ui)

- **Framework**: Vanilla JavaScript with Parcel bundler
- **Authentication**: AWS Cognito OIDC integration
- **UI**: Modern, responsive web interface
- **Features**: Create, read, update, delete fragments with real-time updates

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- **AWS Account** (for production deployment with Cognito, S3, and DynamoDB)
- **Docker** (optional, for local development with Docker Compose)

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/shara111/Fragments-Public.git
cd Labs-public
```

### Step 2: Install Backend Dependencies

```bash
cd NewFragments
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd ../NewFragments-ui
npm install
```

## Configuration

### Backend Configuration

The backend requires environment variables for configuration. Create environment files based on your needs:

#### For Local Development (Basic Auth)

Create a `local.env` file in the `NewFragments` directory:

```
LOG_LEVEL=debug
PORT=8080
HTPASSWD_FILE=tests/.htpasswd
```

#### For AWS Cognito Authentication

Create a `debug.env` file in the `NewFragments` directory:

```
LOG_LEVEL=debug
AWS_COGNITO_POOL_ID=your-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_REGION=us-east-1
```

#### For AWS Storage (S3 and DynamoDB)

Add the following to your environment configuration:

```
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_DYNAMODB_TABLE_NAME=fragments
AWS_REGION=us-east-1
```

**Important**: Never commit `.env` files or files containing credentials to version control. The `.gitignore` file is configured to exclude these files.

### Frontend Configuration

The frontend can be configured via environment variables or window object:

- `API_URL` - Backend API URL (default: `http://localhost:8080`)
- `AWS_COGNITO_POOL_ID` - AWS Cognito User Pool ID
- `AWS_COGNITO_CLIENT_ID` - AWS Cognito Client App ID
- `OAUTH_SIGN_IN_REDIRECT_URL` - OAuth redirect URL (default: `http://localhost:1234`)

Create a `.env` file in the `NewFragments-ui` directory:

```
API_URL=http://localhost:8080
AWS_COGNITO_POOL_ID=your-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
OAUTH_SIGN_IN_REDIRECT_URL=http://localhost:1234
```

## Running the Application

### Step 1: Start the Backend Server

Navigate to the backend directory:

```bash
cd NewFragments
```

For development with Basic Auth:

```bash
npm run debug
```

For development with AWS Cognito:

```bash
npm run dev
```

For production:

```bash
npm start
```

The backend server will start on port 8080 (or the port specified in your environment configuration).

### Step 2: Start the Frontend Application

Open a new terminal and navigate to the frontend directory:

```bash
cd NewFragments-ui
npm start
```

The frontend application will start on port 1234 and automatically open in your browser.

### Step 3: Access the Application

- **Frontend UI**: http://localhost:1234
- **Backend API**: http://localhost:8080
- **API Health Check**: http://localhost:8080/

## API Documentation

### Base URL

All API endpoints are prefixed with `/v1`.

### Authentication

The API supports two authentication methods:

1. **AWS Cognito JWT**: Include the JWT token in the Authorization header:
   ```
   Authorization: Bearer <jwt-token>
   ```

2. **HTTP Basic Auth**: Include credentials in the Authorization header:
   ```
   Authorization: Basic <base64-encoded-credentials>
   ```

### Endpoints

#### Health Check

```
GET /
```

Returns server status and version information.

#### List Fragments

```
GET /v1/fragments?expand=1
```

Retrieves all fragments for the authenticated user. The `expand=1` query parameter returns full fragment metadata.

**Response**: Array of fragment objects

#### Get Fragment by ID

```
GET /v1/fragments/:id
```

Retrieves the content of a specific fragment.

**Response**: Fragment content (content-type varies based on fragment type)

#### Get Fragment Metadata

```
GET /v1/fragments/:id/info
```

Retrieves metadata for a specific fragment without the content.

**Response**: Fragment metadata object

#### Create Fragment

```
POST /v1/fragments
Content-Type: <supported-content-type>
```

Creates a new fragment. The Content-Type header determines the fragment type.

**Supported Content Types**:
- Text: `text/plain`, `text/markdown`, `text/csv`, `text/html`
- JSON: `application/json`
- Images: `image/png`, `image/jpeg`, `image/webp`, `image/avif`, `image/gif`

**Response**: Created fragment metadata with Location header

#### Update Fragment

```
PUT /v1/fragments/:id
Content-Type: <supported-content-type>
```

Updates an existing fragment. The Content-Type must match the original fragment type.

**Response**: Updated fragment metadata

#### Delete Fragment

```
DELETE /v1/fragments/:id
```

Deletes a fragment.

**Response**: 204 No Content on success

#### Fragment Type Conversion

```
GET /v1/fragments/:id.<extension>
```

Retrieves a fragment converted to a different format. Supported conversions depend on the fragment type:

- Text fragments can be converted to HTML, Markdown, or plain text
- JSON fragments can be converted to various formats
- Image fragments support format conversions (e.g., PNG to JPEG)

## Project Structure

```
Labs-public/
├── NewFragments/                 # Backend API
│   ├── src/
│   │   ├── app.js               # Express app configuration
│   │   ├── index.js             # Application entry point
│   │   ├── server.js            # Server startup
│   │   ├── logger.js            # Logging configuration
│   │   ├── auth/                # Authentication modules
│   │   │   ├── cognito.js       # AWS Cognito authentication
│   │   │   ├── basic-auth.js    # Basic authentication
│   │   │   └── index.js         # Auth strategy selector
│   │   ├── model/               # Data models
│   │   │   ├── fragment.js      # Fragment model
│   │   │   └── data/            # Data storage implementations
│   │   │       ├── aws/         # AWS S3 and DynamoDB clients
│   │   │       └── memory/      # In-memory storage
│   │   └── routes/              # API routes
│   │       └── api/             # v1 API endpoints
│   ├── tests/                   # Test suites
│   │   ├── unit/                # Unit tests
│   │   └── integration/         # Integration tests (Hurl)
│   ├── scripts/                 # Utility scripts
│   ├── Dockerfile               # Docker configuration
│   ├── docker-compose.yml       # Docker Compose configuration
│   └── package.json            # Dependencies and scripts
│
└── NewFragments-ui/             # Frontend application
    ├── src/
    │   ├── app.js              # Main application logic
    │   ├── api.js              # API client functions
    │   └── auth.js             # Authentication handling
    ├── index.html              # Entry HTML file
    ├── dist/                   # Build output (gitignored)
    ├── Dockerfile              # Docker configuration
    └── package.json           # Dependencies and scripts
```

## Testing

### Backend Tests

Run unit tests:

```bash
cd NewFragments
npm test
```

Run tests with coverage:

```bash
npm run coverage
```

Run integration tests (requires running server):

```bash
npm run test:integration
```

### Frontend Tests

Currently, the frontend does not have automated tests configured. Manual testing can be performed through the web interface.

## Development Workflow

1. **Start Development Environment**:
   - Backend: `cd NewFragments && npm run dev`
   - Frontend: `cd NewFragments-ui && npm start`

2. **Make Changes**:
   - Backend changes will auto-reload with nodemon
   - Frontend changes will hot-reload with Parcel

3. **Test Changes**:
   - Use the frontend UI to test functionality
   - Use curl or Postman for API testing
   - Run test suites before committing

4. **Code Quality**:
   - Run linting: `npm run lint` (in NewFragments)
   - Fix any linting errors before committing

5. **Commit Changes**:
   - Ensure sensitive files are not committed
   - Write clear commit messages

## Deployment

### Docker Deployment

Both components include Dockerfiles for containerized deployment.

#### Backend

```bash
cd NewFragments
docker build -t fragments-api .
docker run -p 8080:8080 --env-file .env fragments-api
```

#### Frontend

```bash
cd NewFragments-ui
npm run build
docker build -t fragments-ui .
docker run -p 1234:1234 fragments-ui
```

### AWS Deployment

The project includes configuration for AWS ECS deployment:

- Backend can be deployed as an ECS Fargate task
- Frontend can be deployed to S3 with CloudFront
- See `fragments-definition.json` for ECS task definition

## Security Considerations

1. **Environment Variables**: Never commit `.env` files or files containing credentials
2. **Authentication**: Use AWS Cognito for production deployments
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure CORS appropriately for your deployment
5. **Input Validation**: The API validates content types and sizes

## Troubleshooting

### Backend Issues

**Server won't start**:
- Check if port 8080 is available
- Verify environment variables are set correctly
- Check logs for error messages

**Authentication fails**:
- Verify AWS Cognito configuration (Pool ID, Client ID)
- Check that JWT tokens are valid and not expired
- For Basic Auth, ensure `.htpasswd` file exists

**Storage issues**:
- Verify AWS credentials and permissions
- Check S3 bucket and DynamoDB table exist
- Ensure IAM roles have necessary permissions

### Frontend Issues

**Cannot connect to backend**:
- Verify `API_URL` is set correctly
- Check that backend server is running
- Verify CORS is configured on backend

**Authentication redirect fails**:
- Check `OAUTH_SIGN_IN_REDIRECT_URL` matches Cognito configuration
- Verify Cognito User Pool and Client ID are correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is unlicensed and intended for educational purposes.

## Author

Shara111 - [GitHub](https://github.com/shara111)

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Parcel Documentation](https://parceljs.org/)

