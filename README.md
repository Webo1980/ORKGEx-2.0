# ORKGEx 2.0

A Chrome extension for scholarly knowledge extraction with hybrid KG+LLM+VLM integration, section-aware RAG, table extraction, and interactive paper annotation tools.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://developer.chrome.com/docs/extensions/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-blue.svg)](https://openai.com/)
[![ORKG](https://img.shields.io/badge/ORKG-Integrated-orange.svg)](https://orkg.org/)

## Overview

ORKGEx 2.0 is the second version of the ORKG Browser Extension, designed to help researchers annotate scientific papers directly in the browser. It combines the Open Research Knowledge Graph (ORKG) with Large Language Models (LLMs) and Vision Language Models (VLMs) to provide intelligent property suggestions, automatic metadata extraction, and interactive highlighting.

### Key Features

- **Hybrid KG+LLM Integration**: Combines ORKG knowledge graph with OpenAI GPT-4 for intelligent suggestions
- **Vision Language Model (VLM)**: Extract information from figures and images using GPT-4 Vision
- **Section-Aware RAG**: Retrieval-augmented generation based on paper sections
- **Table Extraction**: Automatic extraction of tabular data from papers
- **Interactive Annotation**: Highlight text and assign properties with visual feedback
- **AI Property Suggestions**: Context-aware property recommendations
- **Multi-Source Metadata**: Extract metadata from Semantic Scholar, CrossRef, and arXiv
- **Paper Validation**: Quality scoring and content validation
- **Template Management**: Create, edit, import, and export annotation templates
- **Offline Support**: Cached data for offline functionality

## Installation

### Prerequisites

- Node.js >= 16.0.0
- Chrome browser (version 88+)
- OpenAI API key (for AI features)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Webo1980/ORKGEx-2.0.git
   cd ORKGEx-2.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # OpenAI Configuration (Required for AI features)
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_VISION_MODEL=gpt-4o
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=2000
   
   # HuggingFace Configuration (Optional)
   HUGGINGFACE_API_KEY=your_huggingface_key
   HUGGINGFACE_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
   
   # Semantic Scholar Configuration (Optional)
   SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key
   
   # ORKG Credentials (Required for saving to ORKG)
   ORKG_SERVER_URL=https://orkg.org
   ORKG_API_URL=https://orkg.org/api
   ORKG_USERNAME=your_orkg_username
   ORKG_PASSWORD=your_orkg_password
   
   # Debug Mode
   DEBUG_MODE=false
   ```

4. **Build the extension**
   ```bash
   # Build all bundles
   npm run build:all
   
   # Or build individually
   npm run build:content
   npm run build:background
   ```

5. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the extension folder

## Project Structure

```
ORKGEx-2.0/
├── src/
│   ├── content/
│   │   ├── modules/
│   │   │   ├── ContentScriptCore.js      # Core content script functionality
│   │   │   ├── PropertySelectionWindow.js # Property selection UI
│   │   │   ├── TextHighlighter.js        # Text highlighting functionality
│   │   │   ├── TextExtractor.js          # Text extraction from pages
│   │   │   ├── ImageExtractor.js         # Image/figure extraction
│   │   │   └── PropertyModal.js          # Property editing modal
│   │   └── content-script.js             # Built content script bundle
│   ├── core/
│   │   └── services/
│   │       └── ai/
│   │           ├── adapters/
│   │           │   ├── suggestionAdapter.js  # AI property suggestions
│   │           │   ├── generationAdapter.js  # Content generation
│   │           │   └── analysisAdapter.js    # Content analysis
│   │           └── providers/
│   │               └── openaiProvider.js     # OpenAI API integration
│   ├── background/
│   │   ├── background.js                 # Background service worker
│   │   └── orkg-background-service.js    # ORKG API service
│   ├── styles/
│   │   └── content/
│   │       ├── property-window.css       # Property window styles
│   │       ├── highlights.css            # Highlight styles
│   │       ├── markers.css               # Marker styles
│   │       └── modals.css                # Modal styles
│   └── config/
│       └── config.js                     # Extension configuration
├── scripts/
│   └── build-content-script-enhanced.js  # Build script
├── manifest.json                         # Chrome extension manifest
├── .env                                  # Environment variables
├── package.json
└── README.md
```

## Configuration

### API Keys

| Service | Required | How to Get |
|---------|----------|------------|
| OpenAI | Yes (for AI features) | [platform.openai.com](https://platform.openai.com/api-keys) |
| Semantic Scholar | Optional | [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api) |
| HuggingFace | Optional | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| ORKG | Yes (for saving) | Register at [orkg.org](https://orkg.org) |

### Configuration Options

The extension can be configured via `src/config/config.js`:

| Category | Options |
|----------|---------|
| **OpenAI** | model, temperature, maxTokens, timeout |
| **ORKG** | serverUrl, apiUrl, similarityThreshold |
| **Paper Validation** | minTitleLength, minAbstractLength, qualityThresholds |
| **Templates** | maxTemplatesPerBatch, maxPropertiesPerTemplate |
| **Performance** | batchSize, maxConcurrentRequests, workerPoolSize |
| **Cache** | ttl, maxSize, enabled |

## Usage

1. **Navigate to a research paper** (e.g., on arXiv, Semantic Scholar, or publisher websites)

2. **Click the ORKGEx icon** in the Chrome toolbar to activate

3. **Extract metadata** automatically or manually review extracted information

4. **Select text** to highlight and annotate with properties
   - AI suggestions appear in the green section
   - ORKG properties appear below
   - Use keyboard shortcut: `Ctrl+Shift+H`

5. **Assign properties** to highlighted text with color coding

6. **Extract tables** and figures using the VLM integration

7. **Save to ORKG** when annotation is complete

## Development

### Build Commands

```bash
# Install dev dependencies
npm install --save-dev nodemon

# Build all bundles
npm run build:all

# Build content script only
npm run build:content

# Build background script only
npm run build:background

# Watch mode (requires nodemon)
npm run watch
```

### Testing

1. Build the extension
2. Load unpacked in Chrome
3. Navigate to any research paper
4. Open Chrome DevTools (F12) to view console logs
5. Test functionality:
   - Text selection triggers property window
   - AI suggestions appear (green section)
   - Highlighting works with properties
   - Table extraction functions correctly

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Property window not showing | Check console for errors, verify content script injection |
| AI suggestions not working | Verify OpenAI API key in `.env`, check network tab |
| Build errors | Ensure all module files exist, check file paths |
| CSS not loading | Verify `bundle.css` was created during build |
| ORKG save failing | Check ORKG credentials, verify network connection |

## Related Projects

| Project | Description |
|---------|-------------|
| [smart-paper-analysis-backend](https://github.com/Webo1980/smart-paper-analysis-backend) | Backend API for SARAG system |
| [smart-paper-analysis-frontend](https://github.com/Webo1980/smart-paper-analysis-frontend) | Web application integrated with ORKG |
| [smart-paper-analysis-evaluation](https://github.com/Webo1980/smart-paper-analysis-evaluation) | Evaluation dashboard |
| [ORKGEx](https://github.com/Webo1980/ORKGEx) | Original ORKGEx version 1.0 |

## Version History

| Version | Description |
|---------|-------------|
| 2.0 | Hybrid KG+LLM+VLM integration, section-aware RAG, table extraction |
| 1.0 | Original ORKG browser extension ([ORKGEx](https://github.com/Webo1980/ORKGEx)) |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Open Research Knowledge Graph (ORKG)](https://orkg.org/)
- [TIB Leibniz Information Centre for Science and Technology](https://www.tib.eu/)
- [OpenAI](https://openai.com/)
- [Semantic Scholar](https://www.semanticscholar.org/)