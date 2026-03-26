# Environment Variables Mapping - InvestWise AI Service

## Overview
This document maps environment variables from `docker-compose.yml` to their usage throughout the `ai-service` codebase.

---

## 1. OLLAMA Environment Variables

### Variables Defined
```yaml
OLLAMA_BASE_URL: http://ollama:11434
OLLAMA_MODEL: llama3.1:8b
OLLAMA_TIMEOUT: 120
```

### Config Loading
**File:** `ai-service/src/config/settings.py`
```python
class Settings(BaseSettings):
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OLLAMA_TIMEOUT: int = 120  # seconds
```

### Usage Locations

#### 1. **Main Service Initialization** (`ai-service/src/main.py:41-44`)
```python
llm_client = OllamaClient(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    timeout=settings.OLLAMA_TIMEOUT
)
```
- Creates the LLM client used by all agents

#### 2. **OllamaClient** (`ai-service/src/llm/ollama_client.py:25-27`)
```python
class OllamaClient:
    def __init__(
        self,
        base_url: str = None,
        model: str = None,
        timeout: int = None
    ):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT
```
- Fallback to settings if not provided in constructor
- Used by all agent classes (AnalystAgent, RiskAgent, ResearchAgent, OrchestratorAgent)

#### 3. **HTTP API Calls** (`ai-service/src/llm/ollama_client.py:56`)
```python
url = f"{self.base_url}/api/generate"

payload = {
    "model": self.model,
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": temperature,
        "num_predict": max_tokens,
    }
}

async with httpx.AsyncClient(timeout=self.timeout) as client:
    response = await client.post(url, json=payload)
```
- Makes async HTTP requests to Ollama with configurable timeout

#### 4. **Health Check Endpoint** (`ai-service/src/main.py:280-290`)
```python
@app.get("/ollama/health")
async def ollama_health():
    """Check if Ollama is available and list models"""
    is_healthy = await llm_client.health_check()
    models = []
    
    if is_healthy:
        models = await llm_client.list_models()
    
    return {
        "healthy": is_healthy,
        "base_url": settings.OLLAMA_BASE_URL,
        "configured_model": settings.OLLAMA_MODEL,
        "available_models": models,
        "model_available": settings.OLLAMA_MODEL in models if models else False
    }
```

#### 5. **Config Endpoint** (`ai-service/src/main.py:266-267`)
```python
"ollama": {
    "base_url": settings.OLLAMA_BASE_URL,
    "model": settings.OLLAMA_MODEL
}
```

---

## 2. KAFKA Environment Variables

### Variables Defined
```yaml
KAFKA_BOOTSTRAP_SERVERS: kafka:29092
KAFKA_GROUP_ID: ai-analysis-group
KAFKA_TOPIC_ANALYSIS_REQUESTS: portfolio.analysis.requests
KAFKA_TOPIC_ANALYSIS_RESULTS: portfolio.analysis.results
```

### Additional Kafka Settings
```python
# From settings.py
KAFKA_AUTO_OFFSET_RESET: str = "earliest"
KAFKA_ENABLE_AUTO_COMMIT: bool = False
KAFKA_MAX_POLL_RECORDS: int = 10
```

### Config Loading
**File:** `ai-service/src/config/settings.py:23-28`
```python
# Kafka Settings
KAFKA_BOOTSTRAP_SERVERS: str = "kafka:29092"
KAFKA_GROUP_ID: str = "ai-analysis-group"

# Kafka Topics
KAFKA_TOPIC_ANALYSIS_REQUESTS: str = "portfolio.analysis.requests"
KAFKA_TOPIC_ANALYSIS_RESULTS: str = "portfolio.analysis.results"

# Kafka Consumer Settings
KAFKA_AUTO_OFFSET_RESET: str = "earliest"
KAFKA_ENABLE_AUTO_COMMIT: bool = False
KAFKA_MAX_POLL_RECORDS: int = 10
```

### Usage Locations

#### 1. **Consumer Connection** (`ai-service/src/consumers/analysis_consumer.py:36-41`)
```python
async def connect(self, max_retries: int = 5, retry_delay: int = 5) -> bool:
    for attempt in range(max_retries):
        try:
            self.consumer = AIOKafkaConsumer(
                settings.KAFKA_TOPIC_ANALYSIS_REQUESTS,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id=settings.KAFKA_GROUP_ID,
                auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
                enable_auto_commit=settings.KAFKA_ENABLE_AUTO_COMMIT,
                max_poll_records=settings.KAFKA_MAX_POLL_RECORDS,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
            )
            
            await self.consumer.start()
```
- Subscribes to `portfolio.analysis.requests` topic
- Connects to Kafka broker at `kafka:29092`
- Uses `ai-analysis-group` consumer group for offset management

#### 2. **Consumer Startup** (`ai-service/src/consumers/analysis_consumer.py:95`)
```python
async def consume(self):
    self.running = True
    logger.info("kafka_consumer_started", topic=settings.KAFKA_TOPIC_ANALYSIS_REQUESTS)
```

#### 3. **Producer Connection** (`ai-service/src/producers/result_producer.py:34`)
```python
async def connect(self, max_retries: int = 5, retry_delay: int = 5) -> bool:
    for attempt in range(max_retries):
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                acks='all',  # Wait for all replicas
            )
            
            await self.producer.start()
```

#### 4. **Sending Results** (`ai-service/src/producers/result_producer.py:101`)
```python
async def send_result(
    self,
    portfolio_id: str,
    user_id: str,
    analysis_result: Dict[str, Any]
) -> bool:
    message = {
        "portfolioId": portfolio_id,
        "userId": user_id,
        "analysis": analysis_result,
        "timestamp": asyncio.get_event_loop().time(),
        "status": "completed"
    }
    
    try:
        await self.producer.send_and_wait(
            topic=settings.KAFKA_TOPIC_ANALYSIS_RESULTS,
            value=message,
            key=portfolio_id
        )
```
- Publishes analysis results to `portfolio.analysis.results` topic

#### 5. **Config Endpoint** (`ai-service/src/main.py:259-263`)
```python
{
    "kafka_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
    "kafka_group_id": settings.KAFKA_GROUP_ID,
    "topics": {
        "requests": settings.KAFKA_TOPIC_ANALYSIS_REQUESTS,
        "results": settings.KAFKA_TOPIC_ANALYSIS_RESULTS
    }
}
```

---

## 3. SERPER API Key

### Variable Defined
```yaml
SERPER_API_KEY: 95c10436304622fd09aaf7d2a4263f3eeac56a6b
```

### Config Loading
**File:** `ai-service/src/config/settings.py:40-41`
```python
# Serper API Settings (for web search)
SERPER_API_KEY: str = "95c10436304622fd09aaf7d2a4263f3eeac56a6b"  # Get from https://serper.dev
```

### Usage Locations

#### 1. **SerperSearchTool Initialization** (`ai-service/src/tools/serper_tool.py:20-21`)
```python
class SerperSearchTool(BaseTool):
    """Tool for performing web searches using Serper.dev API"""
    
    def __init__(self):
        self.api_key = settings.SERPER_API_KEY
        self.base_url = "https://google.serper.dev"
```

#### 2. **Web Search Execution** (`ai-service/src/tools/serper_tool.py:77`)
```python
async def execute(
    self,
    query: str,
    search_type: str = "search",
    num_results: int = 5,
    **kwargs
) -> ToolResult:
    """
    Execute web search via Serper API.
    """
    if not self.api_key:
        return ToolResult(
            status=ToolResultStatus.ERROR,
            data=None,
            error="SERPER_API_KEY not configured"
        )
    
    # Makes HTTP request to Serper API with headers containing the API key
```

#### 3. **Research Agent Usage** (`ai-service/src/agents/research_agent.py:25`)
```python
class ResearchAgent(BaseAgent):
    """
    Research Agent - Gathers market intelligence and news.
    """
    
    def __init__(self, llm: OllamaClient = None):
        tools = [SerperSearchTool()]
        super().__init__(llm=llm, tools=tools, max_iterations=5)
```

---

## 4. Other Environment Variables

### ENABLE_RESEARCH_AGENT
**File:** `ai-service/src/config/settings.py:46`
```python
ENABLE_RESEARCH_AGENT: bool = True  # Set to False for faster analysis without web search
```

**Usage** (`ai-service/src/main.py:50`):
```python
orchestrator = OrchestratorAgent(
    llm=llm_client,
    enable_research=settings.ENABLE_RESEARCH_AGENT
)
```

### AGENT_MAX_ITERATIONS
**File:** `ai-service/src/config/settings.py:47`
```python
AGENT_MAX_ITERATIONS: int = 10
```

**Usage** (`ai-service/src/main.py:271`):
```python
"agents": {
    "research_enabled": settings.ENABLE_RESEARCH_AGENT,
    "max_iterations": settings.AGENT_MAX_ITERATIONS
}
```

### DEBUG
**File:** `ai-service/src/config/settings.py:12`
```python
DEBUG: bool = False
```

**Usage** (`ai-service/src/main.py:300`):
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
```

### MONGODB_URI
**File:** `ai-service/src/config/settings.py:48`
```python
MONGODB_URI: str = "mongodb://investwise_admin:investwise_secret_123@mongodb:27017/investwise?authSource=admin"
```

---

## 5. Configuration Files Summary

### Main Settings File
**Path:** `ai-service/src/config/settings.py`

Uses Pydantic's `BaseSettings` which automatically loads from:
1. Environment variables
2. `.env` file (if exists)

```python
class Settings(BaseSettings):
    class Config:
        env_file = ".env"
        case_sensitive = True

# Singleton instance
settings = Settings()
```

### Import Pattern
All modules that need settings use:
```python
from src.config.settings import settings
```

Then reference env vars as:
```python
settings.OLLAMA_BASE_URL
settings.KAFKA_BOOTSTRAP_SERVERS
settings.SERPER_API_KEY
# etc.
```

---

## 6. Usage Flow Summary

```
docker-compose.yml (env vars)
        ↓
    Container
        ↓
src/config/settings.py
(loads via Pydantic BaseSettings)
        ↓
    settings singleton
        ↓
    Used by all modules:
    ├── src/main.py (initialization)
    ├── src/llm/ollama_client.py (LLM calls)
    ├── src/consumers/analysis_consumer.py (Kafka consumer)
    ├── src/producers/result_producer.py (Kafka producer)
    ├── src/tools/serper_tool.py (Web search)
    └── src/agents/* (all agents)
```

---

## Key Insights

1. **Centralized Configuration**: All env vars are loaded at startup into a Pydantic `Settings` object
2. **Type Safety**: Pydantic provides type validation for all environment variables
3. **Default Values**: All vars have sensible defaults that match docker-compose.yml
4. **Health Checks**: Ollama and Kafka connectivity is verified at startup
5. **Graceful Fallbacks**: Components can be initialized with override values if needed
6. **Logging**: All connections and API calls are logged using structlog

---

## Files Modified by Environment

| File | Purpose | Env Vars Used |
|------|---------|---------------|
| `src/config/settings.py` | Central configuration | All env vars |
| `src/main.py` | Service initialization | OLLAMA_*, KAFKA_*, SERPER_*, ENABLE_RESEARCH_AGENT, DEBUG |
| `src/llm/ollama_client.py` | LLM API client | OLLAMA_* |
| `src/consumers/analysis_consumer.py` | Kafka consumer | KAFKA_* |
| `src/producers/result_producer.py` | Kafka producer | KAFKA_* |
| `src/tools/serper_tool.py` | Web search tool | SERPER_API_KEY |
| `src/agents/research_agent.py` | Market research agent | (uses SerperSearchTool) |
