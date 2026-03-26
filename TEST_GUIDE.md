# InvestWise Test Suite

This document describes how to run tests for both the Backend (Node.js) and AI Service (Python).

## Quick Start

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies (including test dependencies)
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch
```

### AI Service Tests

```bash
# Navigate to ai-service directory
cd ai-service

# Create virtual environment (if not exists)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_tools.py -v
```

---

## Backend Test Suite

### Test Structure

```
backend/
├── tests/
│   ├── setup.js              # Global test setup
│   ├── mocks/
│   │   ├── mockDb.js         # MongoDB in-memory mock
│   │   ├── mockRedis.js      # Redis mock
│   │   └── mockKafka.js      # Kafka producer/consumer mock
│   ├── api/
│   │   ├── auth.test.js      # Authentication API tests
│   │   ├── portfolio.test.js # Portfolio CRUD tests
│   │   └── analysis.test.js  # Analysis API tests
│   └── services/
│       └── kafka.test.js     # Kafka integration tests
├── jest.config.js            # Jest configuration
└── package.json              # npm scripts
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:api` | Run API tests only |
| `npm run test:coverage` | Run with coverage report |
| `npm run test:watch` | Run in watch mode |
| `npm run test:ci` | Run for CI/CD (with exit code) |

### Test Categories

#### Authentication Tests (`auth.test.js`)
- User registration (valid/invalid inputs)
- User login (success/failure)
- JWT token validation
- Password update
- Protected route access

#### Portfolio Tests (`portfolio.test.js`)
- Portfolio CRUD operations
- Holdings management
- Authorization (user can only access own portfolios)
- Calculation verification

#### Analysis Tests (`analysis.test.js`)
- Trigger analysis endpoint
- Analysis status checking
- Kafka message verification
- Error handling

#### Kafka Tests (`kafka.test.js`)
- Producer message sending
- Consumer message processing
- Batch processing
- Result storage

### Running Specific Tests

```bash
# Run single test file
npm test -- tests/api/auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register"

# Run with verbose output
npm test -- --verbose
```

---

## AI Service Test Suite

### Test Structure

```
ai-service/
├── tests/
│   ├── conftest.py           # Pytest fixtures and config
│   ├── __init__.py
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_tools.py     # CalculatorTool, PortfolioTool tests
│   │   ├── test_agents.py    # Agent tests (Analyst, Risk, Orchestrator)
│   │   └── test_models.py    # Pydantic model tests
│   └── integration/
│       ├── __init__.py
│       ├── test_kafka.py     # Kafka consumer/producer tests
│       └── test_api.py       # FastAPI endpoint tests
├── pytest.ini                # Pytest configuration
├── requirements.txt          # Main dependencies
└── requirements-test.txt     # Test dependencies
```

### Available Commands

| Command | Description |
|---------|-------------|
| `pytest` | Run all tests |
| `pytest tests/unit/` | Run unit tests only |
| `pytest tests/integration/` | Run integration tests only |
| `pytest --cov=src` | Run with coverage |
| `pytest -v` | Verbose output |
| `pytest -x` | Stop on first failure |
| `pytest -m "not slow"` | Skip slow tests |

### Test Categories

#### Tool Tests (`test_tools.py`)
- CalculatorTool calculations
- PortfolioTool operations
- Input validation
- Error handling

#### Agent Tests (`test_agents.py`)
- BaseAgent functionality
- AnalystAgent portfolio analysis
- RiskAgent risk assessment
- Orchestrator multi-agent coordination
- Tool execution flow

#### Model Tests (`test_models.py`)
- Pydantic model validation
- Enum value tests
- Serialization/deserialization
- Field constraints

#### Kafka Integration Tests (`test_kafka.py`)
- Consumer message processing
- Producer result sending
- End-to-end flow
- Error handling

#### API Tests (`test_api.py`)
- Health endpoint
- CORS configuration
- Error handling

### Running Specific Tests

```bash
# Run single test file
pytest tests/unit/test_tools.py -v

# Run single test function
pytest tests/unit/test_tools.py::TestCalculatorTool::test_portfolio_return_calculation -v

# Run tests with markers
pytest -m unit
pytest -m "not integration"

# Run with specific verbosity
pytest -v --tb=short
pytest -vv --tb=long
```

---

## Fixtures

### Backend Fixtures (setup.js)

```javascript
// Access via global.testUtils
const { generateObjectId, createMockUser, createMockPortfolio } = global.testUtils;

const mockUser = createMockUser({ email: 'custom@test.com' });
const mockPortfolio = createMockPortfolio(mockUser._id, { name: 'Test' });
```

### AI Service Fixtures (conftest.py)

```python
# Automatically injected by pytest
def test_example(sample_portfolio, mock_ollama_client):
    # sample_portfolio = sample portfolio data
    # mock_ollama_client = mocked LLM client
    pass
```

---

## Coverage Reports

### Backend Coverage
```bash
npm run test:coverage
# Report: coverage/lcov-report/index.html
```

### AI Service Coverage
```bash
pytest --cov=src --cov-report=html
# Report: coverage_html/index.html
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# Backend tests
- name: Run Backend Tests
  working-directory: backend
  run: |
    npm install
    npm run test:ci

# AI Service tests
- name: Run AI Service Tests
  working-directory: ai-service
  run: |
    pip install -r requirements.txt
    pip install -r requirements-test.txt
    pytest --cov=src --cov-fail-under=50
```

---

## Troubleshooting

### Common Issues

**MongoDB Connection Error**
```bash
# Ensure mongodb-memory-server is installed
npm install --save-dev mongodb-memory-server
```

**Python Import Errors**
```bash
# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**Async Test Issues**
```python
# Mark async tests with decorator
@pytest.mark.asyncio
async def test_async_function():
    pass
```

**Jest Timeout**
```bash
# Increase timeout in test or config
jest.setTimeout(30000);
```
