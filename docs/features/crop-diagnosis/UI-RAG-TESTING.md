# UI RAG Testing Guide

## Overview

The crop diagnosis UI now displays RAG enhancements including:
- ✨ AI Enhanced badge when RAG is active
- 📚 Scientific references with citations
- 🔍 AI enhancement metadata (retrieval/generation times)
- Research-backed remedy indicators
- Clickable citation links

## UI Components Added

### 1. RAG Enhancement Badge
- Appears next to crop type when `ragEnhanced: true`
- Purple gradient badge with sparkle icon
- Indicates AI-enhanced diagnosis

### 2. Remedy Source Indicators
- **Research-backed** badge for RAG-enhanced remedies
- **Basic** badge for standard remedies
- Citation links `[cite-1]` that scroll to references

### 3. Scientific References Section
- Shows all citations used in the diagnosis
- Displays relevance scores
- Shows excerpts from source documents
- Includes source metadata (author, publication)

### 4. AI Enhancement Details
- Retrieval time (ms)
- Generation time (ms)
- Documents retrieved count
- Similarity threshold used
- Cache hit/miss status

## Testing Steps

### Step 1: Start the Application

```bash
# Ensure Docker PostgreSQL is running
docker-compose ps

# Start the application
npm run dev
```

### Step 2: Open the UI

Navigate to: `http://localhost:3000/crop-diagnosis.html`

### Step 3: Test with Known Disease

Upload an image of a crop with a disease that's in the knowledge base:

**Diseases in Knowledge Base (22 total):**
- Late Blight (tomato, potato)
- Powdery Mildew (tomato, wheat, brinjal, chili)
- Rust (wheat, maize, sugarcane)
- Bacterial Wilt (tomato, potato, brinjal, chili)
- Aphids (cotton, chili, tomato, brinjal, wheat)
- And 17 more...

### Step 4: Verify RAG UI Elements

After diagnosis completes, check for:

1. **✨ AI Enhanced Badge**
   - Should appear next to crop name
   - Purple gradient with sparkle icon

2. **Research-backed Remedies**
   - Look for blue "📚 Research-backed" badges
   - Citation links like `[cite-1]` next to remedies

3. **Scientific References Section**
   - Should appear below remedies
   - Shows citation cards with:
     - Citation ID (cite-1, cite-2, etc.)
     - Document title
     - Relevance score
     - Excerpt from source
     - Source metadata

4. **AI Enhancement Details**
   - Shows performance metrics
   - Retrieval and generation times
   - Number of documents retrieved
   - Cache status

### Step 5: Test Citation Links

Click on a citation link `[cite-1]` in a remedy:
- Should scroll to the corresponding citation
- Citation card should highlight briefly (blue background)
- Smooth scroll animation

## Expected UI Behavior

### With RAG Enhancement (ragEnhanced: true)

```
┌─────────────────────────────────────┐
│ 📊 Diagnosis Results                │
├─────────────────────────────────────┤
│ Tomato ✨ AI Enhanced               │
│                                     │
│ ┌─ Late Blight ─────────────────┐  │
│ │ Phytophthora infestans        │  │
│ │ Type: Fungal | Severity: High │  │
│ │ Confidence: 95%               │  │
│ └───────────────────────────────┘  │
│                                     │
│ 🧪 Chemical Remedies                │
│ • Mancozeb 📚 Research-backed       │
│   [cite-1] [cite-2]                 │
│   Dosage: 2g/L                      │
│                                     │
│ 📚 Scientific References            │
│ ┌─ cite-1 ─────────────────────┐   │
│ │ Knowledge Base - fungal       │   │
│ │ Relevance: 89%                │   │
│ │ "Disease: Late Blight..."     │   │
│ │ Source: ICAR                  │   │
│ └───────────────────────────────┘   │
│                                     │
│ 🔍 AI Enhancement Details           │
│ Retrieval Time: 450ms               │
│ Generation Time: 1800ms             │
│ Documents Retrieved: 3              │
│ Cache Status: ✗ Miss                │
└─────────────────────────────────────┘
```

### Without RAG Enhancement (ragEnhanced: false)

```
┌─────────────────────────────────────┐
│ 📊 Diagnosis Results                │
├─────────────────────────────────────┤
│ Tomato                              │
│                                     │
│ ┌─ Late Blight ─────────────────┐  │
│ │ Phytophthora infestans        │  │
│ │ Type: Fungal | Severity: High │  │
│ │ Confidence: 95%               │  │
│ └───────────────────────────────┘  │
│                                     │
│ 🧪 Chemical Remedies                │
│ • Mancozeb Basic                    │
│   Dosage: 2g/L                      │
│                                     │
│ (No citations section)              │
│ (No RAG metadata)                   │
└─────────────────────────────────────┘
```

## Fallback Scenarios

The UI gracefully handles RAG failures:

1. **No Documents Retrieved**
   - Shows basic diagnosis without RAG badge
   - No citations section
   - Remedies marked as "Basic"

2. **Timeout**
   - Falls back to basic diagnosis
   - No RAG indicators shown

3. **Generation Error**
   - Shows basic diagnosis
   - Logs error in console

## Testing Checklist

- [ ] RAG badge appears when enhanced
- [ ] Research-backed badges on RAG remedies
- [ ] Citation links are clickable
- [ ] Citations section displays correctly
- [ ] Citation cards show all metadata
- [ ] Relevance scores display
- [ ] RAG metadata section shows performance metrics
- [ ] Clicking citation link scrolls and highlights
- [ ] Fallback mode shows basic diagnosis without RAG UI
- [ ] UI works on mobile (responsive)

## Browser Console Debugging

Check console for RAG-related logs:

```javascript
// Look for these log messages
[Diagnosis] API Response: { success: true, data: { ragEnhanced: true, ... } }
```

## Troubleshooting

### RAG Badge Not Showing
- Check if `data.ragEnhanced` is true in console
- Verify API response includes RAG data
- Check if knowledge base has relevant documents

### Citations Not Displaying
- Verify `data.citations` array exists and has items
- Check console for JavaScript errors
- Ensure citation IDs match between remedies and citations

### Citation Links Not Working
- Check if citation IDs are correctly formatted
- Verify `scrollToCitation()` function is defined
- Check browser console for errors

### RAG Metadata Not Showing
- Verify `data.ragMetadata` exists in response
- Check if section is hidden (display: none)
- Ensure metadata has valid values

## Next Steps

After verifying UI works:
1. Test with various disease images
2. Test fallback scenarios (disable RAG temporarily)
3. Test on mobile devices
4. Gather user feedback on citation display
5. Consider adding citation export/share features

## API Response Format

The UI expects this structure:

```json
{
  "success": true,
  "data": {
    "diagnosisId": "...",
    "cropType": "tomato",
    "diseases": [...],
    "remedies": [
      {
        "name": "Mancozeb",
        "type": "chemical",
        "source": "rag",
        "citationIds": ["cite-1", "cite-2"],
        "dosage": "2g/L",
        "applicationMethod": "Foliar spray",
        "frequency": "Every 7-10 days"
      }
    ],
    "ragEnhanced": true,
    "citations": [
      {
        "citationId": "cite-1",
        "documentId": "doc_123",
        "title": "Knowledge Base - fungal",
        "excerpt": "Disease: Late Blight...",
        "source": "ICAR",
        "author": "ICAR",
        "relevanceScore": 0.89
      }
    ],
    "ragMetadata": {
      "retrievalTimeMs": 450,
      "generationTimeMs": 1800,
      "documentsRetrieved": 3,
      "similarityThreshold": 0.7,
      "cacheHit": false
    }
  }
}
```

## Support

For issues or questions:
- Check browser console for errors
- Verify API response structure
- Review `RAG-TESTING-GUIDE.md` for backend testing
- Check `RAG-READY.md` for system status
