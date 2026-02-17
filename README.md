# RAG Chatbot Backend

A production-ready **Retrieval-Augmented Generation (RAG)** chatbot backend built with Node.js, Express, and a layered architecture. Supports document ingestion, semantic search, streaming chat responses, and JWT-based authentication with multi-tenant data isolation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (ES Modules) |
| **Framework** | Express 5 |
| **Database** | MongoDB (Mongoose ODM) |
| **Vector DB** | Qdrant |
| **Embeddings** | Ollama (`nomic-embed-text`) |
| **LLM** | Google Gemini 2.0 Flash |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |

## Architecture

```
HTTP Request
    │
    ▼
┌─────────┐
│ Routes   │  → endpoint definitions
└────┬────┘
     ▼
┌──────────────┐
│ Middleware    │  → auth (JWT), rate limiting, file upload
└────┬─────────┘
     ▼
┌──────────────┐
│ Controller   │  → HTTP concerns (req/res)
└────┬─────────┘
     ▼
┌──────────────┐
│ Service      │  → business logic
└────┬─────────┘
     ▼
┌──────────────┐
│ Repository   │  → data access (MongoDB / Qdrant)
└──────────────┘
```

## Project Structure

```
rag-chatbot/
├── config/
│   ├── databaseConfig.js          # MongoDB connection
│   └── qdrantConfig.js            # Qdrant client
├── controllers/
│   ├── authController.js          # Register / Login / Me
│   ├── chatController.js          # SSE streaming chat
│   └── documentController.js      # Upload / List / Delete
├── middleware/
│   ├── auth.js                    # JWT verification (protect)
│   ├── errorHandler.js            # Centralized error handling
│   ├── rateLimiter.js             # Brute-force protection
│   └── upload.js                  # Multer file upload
├── models/
│   ├── Conversation.js            # Chat history schema
│   ├── Document.js                # Document metadata schema
│   └── User.js                    # User schema (bcrypt)
├── repositories/
│   ├── conversationRepository.js
│   ├── documentRepository.js
│   ├── userRepository.js
│   └── vectorRepository.js        # Qdrant operations
├── routes/
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   └── documentRoutes.js
├── scripts/
│   └── initQdrant.js              # Initialize vector collections
├── services/
│   ├── authService.js             # Auth business logic
│   ├── chatService.js             # RAG pipeline orchestrator
│   ├── contextService.js          # Sliding window + summarization
│   ├── documentService.js         # Parse → Chunk → Embed → Store
│   ├── embeddingService.js        # Ollama embeddings
│   ├── guardrailService.js        # Input/output safety checks
│   ├── llmService.js              # Gemini Flash integration
│   └── ragService.js              # Semantic search + merge
├── utils/
│   ├── error.js                   # Custom AppError class
│   └── promptTemplates.js         # RAG prompt builder
├── .env
├── .gitignore
├── package.json
└── server.js
```

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally (or a MongoDB Atlas URI)
- **Docker** (for Qdrant)
- **Ollama** installed ([ollama.com](https://ollama.com))

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Copy and edit the `.env` file:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chatbot
JWT_SECRET=your-super-secret-key    # Change this!
JWT_EXPIRES_IN=7d
GOOGLE_AI_API_KEY=your-gemini-key
QDRANT_URL=http://localhost:6333
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
```

### 3. Start Qdrant

```bash
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

### 4. Pull the Embedding Model

```bash
ollama pull nomic-embed-text
```

### 5. Initialize Vector Collections

```bash
npm run init-qdrant
```

### 6. Start the Server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

## API Endpoints

### Auth (Public)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | `{ username, email, password }` | Register a new user |
| `POST` | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| `GET` | `/api/auth/me` | — | Get current user (JWT required) |

### Chat (JWT Required)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat` | `{ message, conversationId? }` | Send message (SSE stream) |
| `GET` | `/api/chat/conversations` | — | List all conversations |
| `GET` | `/api/chat/conversations/:id` | — | Get conversation details |

### Documents (JWT Required)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/documents` | `file` (multipart) | Upload & ingest (pdf/docx/csv/txt) |
| `GET` | `/api/documents` | — | List all documents |
| `DELETE` | `/api/documents/:id` | — | Delete document + vectors |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |

## Usage Example

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"rishabh","email":"rishabh@example.com","password":"password123"}'

# 2. Save the token from the response, then upload a document
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@./my-notes.pdf"

# 3. Chat with your documents
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the key points from my notes?"}'
```

## Key Features

- **RAG Pipeline** — Upload documents, they're parsed, chunked, embedded, and stored in Qdrant for semantic search
- **Streaming Responses** — Server-Sent Events for token-by-token LLM responses
- **Multi-Tenant Isolation** — Each user's documents are isolated via userId filtering in Qdrant
- **Context Management** — Sliding window + recursive summarization for long conversations
- **Security Guardrails** — Prompt injection detection, input sanitization, output validation
- **Rate Limiting** — Brute-force protection on auth endpoints

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start with nodemon (auto-restart) |
| `start` | `npm start` | Start with node (production) |
| `init-qdrant` | `npm run init-qdrant` | Initialize Qdrant collections |

## License

ISC
