# Bharat Mandi - AWS Services Architecture

## High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Bharat Mandi Platform"
        UI[Web/Mobile Interface]
        API[Express.js API Server]
    end
    
    subgraph "Core Features"
        CD[Crop Disease Diagnosis]
        MP[Marketplace]
        KM[Kisan Mitra Assistant]
        VI[Voice Interface]
    end
    
    subgraph "AWS AI/ML Services"
        BR[AWS Bedrock<br/>Nova Pro/Lite/Micro<br/>Claude Sonnet]
        LEX[AWS Lex<br/>Conversational AI]
        TR[AWS Translate<br/>10+ Languages]
        CO[AWS Comprehend<br/>Language Detection]
    end
    
    subgraph "AWS Voice Services"
        PO[AWS Polly<br/>Text-to-Speech]
        TS[AWS Transcribe<br/>Speech-to-Text]
    end
    
    subgraph "AWS Storage"
        S3C[S3: Crop Diagnosis<br/>bharat-mandi-crop-diagnosis]
        S3L[S3: Listings<br/>bharat-mandi-listings-testing]
        S3A[S3: Audio<br/>bharat-mandi-voice-ap-south-1]
    end
    
    subgraph "Local Storage & Cache"
        RD[Redis Cache<br/>Translations]
        SQ[SQLite Cache<br/>Audio Offline]
        LS[Local Storage<br/>Media Fallback]
    end
    
    UI --> API
    API --> CD
    API --> MP
    API --> KM
    API --> VI
    
    CD --> BR
    CD --> S3C
    CD --> CO
    
    MP --> S3L
    MP --> BR
    
    KM --> LEX
    KM --> BR
    KM --> TR
    
    VI --> PO
    VI --> TS
    VI --> S3A
    VI --> TR
    
    TR --> CO
    TR --> RD
    
    PO --> SQ
    TS --> S3A
    
    S3L -.Fallback.-> LS
    
    style BR fill:#FF9900
    style LEX fill:#FF9900
    style TR fill:#FF9900
    style CO fill:#FF9900
    style PO fill:#FF9900
    style TS fill:#FF9900
    style S3C fill:#569A31
    style S3L fill:#569A31
    style S3A fill:#569A31
```

## Feature-to-Service Mapping

```mermaid
graph LR
    subgraph "Crop Disease Diagnosis"
        CD1[Image Upload]
        CD2[AI Analysis]
        CD3[Disease Detection]
        CD4[Remedy Suggestions]
    end
    
    subgraph "AWS Services"
        BR1[Bedrock Nova Pro]
        S31[S3 Storage]
        CO1[Comprehend]
    end
    
    CD1 --> S31
    CD2 --> BR1
    CD3 --> BR1
    CD4 --> CO1
    
    style BR1 fill:#FF9900
    style S31 fill:#569A31
    style CO1 fill:#FF9900
```

```mermaid
graph LR
    subgraph "Voice Interface"
        VI1[Voice Input]
        VI2[Transcription]
        VI3[Processing]
        VI4[Speech Output]
    end
    
    subgraph "AWS Services"
        TS1[Transcribe]
        TR1[Translate]
        PO1[Polly]
        S3V[S3 Audio]
    end
    
    VI1 --> TS1
    VI2 --> TR1
    VI3 --> PO1
    VI4 --> S3V
    
    style TS1 fill:#FF9900
    style TR1 fill:#FF9900
    style PO1 fill:#FF9900
    style S3V fill:#569A31
```

```mermaid
graph LR
    subgraph "Kisan Mitra Chatbot"
        KM1[User Query]
        KM2[Intent Recognition]
        KM3[Handler Processing]
        KM4[Response Generation]
    end
    
    subgraph "AWS Services"
        LEX1[Lex V2]
        BR2[Bedrock Claude]
        TR2[Translate]
    end
    
    KM1 --> LEX1
    KM2 --> BR2
    KM3 --> TR2
    KM4 --> TR2
    
    style LEX1 fill:#FF9900
    style BR2 fill:#FF9900
    style TR2 fill:#FF9900
```

## Regional Distribution

```mermaid
graph TB
    subgraph "us-east-1 (N. Virginia)"
        BR_US[Bedrock<br/>Amazon Nova Models]
    end
    
    subgraph "ap-southeast-2 (Sydney)"
        BR_AU[Bedrock Claude]
        LEX_AU[Lex Chatbot]
        TS_AU[Transcribe]
        PO_AU[Polly]
    end
    
    subgraph "ap-south-1 (Mumbai)"
        S3_IN[S3 Buckets]
        TR_IN[Translate]
        CO_IN[Comprehend]
    end
    
    APP[Bharat Mandi<br/>Application]
    
    APP --> BR_US
    APP --> BR_AU
    APP --> LEX_AU
    APP --> TS_AU
    APP --> PO_AU
    APP --> S3_IN
    APP --> TR_IN
    APP --> CO_IN
    
    style BR_US fill:#FF9900
    style BR_AU fill:#FF9900
    style LEX_AU fill:#FF9900
    style TS_AU fill:#FF9900
    style PO_AU fill:#FF9900
    style S3_IN fill:#569A31
    style TR_IN fill:#FF9900
    style CO_IN fill:#FF9900
```

## Data Flow - Crop Disease Diagnosis

```mermaid
sequenceDiagram
    participant User
    participant API
    participant S3
    participant Bedrock
    participant Database
    
    User->>API: Upload crop image
    API->>API: Validate & compress image
    API->>S3: Store image (encrypted)
    S3-->>API: Return S3 key
    API->>Bedrock: Analyze image (Nova Pro)
    Bedrock-->>API: Disease detection results
    API->>Database: Store diagnosis
    API->>S3: Generate presigned URL
    S3-->>API: 24h presigned URL
    API-->>User: Diagnosis + image URL
```

## Data Flow - Voice Interface

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Transcribe
    participant Translate
    participant Polly
    participant S3
    participant Cache
    
    User->>API: Voice input (audio)
    API->>S3: Upload audio temporarily
    API->>Transcribe: Start transcription job
    Transcribe-->>API: Transcribed text
    API->>Translate: Detect language
    Translate-->>API: Language code
    API->>API: Process query
    API->>Translate: Translate response
    Translate-->>API: Translated text
    API->>Cache: Check audio cache
    Cache-->>API: Cache miss
    API->>Polly: Synthesize speech
    Polly-->>API: Audio stream
    API->>S3: Store audio
    API->>Cache: Cache audio locally
    API-->>User: Text + audio response
```

## Cost Optimization Strategy

```mermaid
graph TB
    subgraph "Caching Layers"
        L1[Redis Cache<br/>Translations<br/>24h TTL]
        L2[SQLite Cache<br/>Audio Files<br/>Offline Support]
        L3[In-Memory Cache<br/>S3 URLs<br/>Session Duration]
    end
    
    subgraph "Storage Optimization"
        O1[Image Compression<br/>Max 5MB]
        O2[S3 Lifecycle<br/>2-year retention]
        O3[Presigned URLs<br/>24h expiry]
    end
    
    subgraph "API Optimization"
        A1[Client Pooling<br/>Bedrock Connections]
        A2[Retry Logic<br/>Exponential Backoff]
        A3[Batch Processing<br/>25 concurrent max]
    end
    
    APP[Application]
    
    APP --> L1
    APP --> L2
    APP --> L3
    APP --> O1
    APP --> O2
    APP --> O3
    APP --> A1
    APP --> A2
    APP --> A3
    
    style L1 fill:#4CAF50
    style L2 fill:#4CAF50
    style L3 fill:#4CAF50
    style O1 fill:#2196F3
    style O2 fill:#2196F3
    style O3 fill:#2196F3
    style A1 fill:#FF9800
    style A2 fill:#FF9800
    style A3 fill:#FF9800
```

---

## How to Export These Diagrams

### Method 1: Using Mermaid Live Editor
1. Visit https://mermaid.live/
2. Copy any diagram code from above
3. Paste into the editor
4. Click "Download PNG" or "Download SVG"

### Method 2: Using VS Code Extension
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file in VS Code
3. Right-click on diagram → "Export to PNG"

### Method 3: Using CLI Tools
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i aws-services-overview.md -o architecture-diagram.png

# Convert to SVG
mmdc -i aws-services-overview.md -o architecture-diagram.svg
```

### Method 4: Using Online Tools
- **Mermaid Chart**: https://www.mermaidchart.com/
- **Kroki**: https://kroki.io/
- **Draw.io**: Import Mermaid diagrams

---

## Diagram Legend

- 🟠 Orange boxes: AWS AI/ML Services
- 🟢 Green boxes: AWS Storage Services
- 🔵 Blue boxes: Optimization Strategies
- 🟡 Yellow boxes: API Optimizations
