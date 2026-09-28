# VectorSearch Web

Angular 19 frontend for the VectorSearch RAG backend. Standalone components, signals for state, plain CSS.

## Quick start

```powershell
npm install
npm start
```

Open <http://localhost:4200>.

The dev server proxies `/api` to the backend, so no CORS configuration is needed on either side.

## Backend requirements

The backend must be running and reachable at the URL in `proxy.conf.json`.

| Backend state | Proxy target in `proxy.conf.json` |
| --- | --- |
| `dotnet run` (default, HTTP) | `http://localhost:5000` |
| `dotnet run --launch-profile https` | `https://localhost:44347` |
| IIS Express | `http://localhost:56716` |

If the backend moves, edit `proxy.conf.json` and restart `npm start` — the proxy config is not hot-reloaded.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Dev server on port 4200 with proxy |
| `npm run build` | Production build to `dist/vector-search.web` |
| `npm run watch` | Rebuild on change |

## Structure

```
src/
├── app/
│   ├── app.component.ts / .html / .css     # Shell: sidebar nav, backend status
│   ├── app.config.ts                       # Router + HttpClient providers
│   ├── app.routes.ts                       # /documents, /upload, /chat
│   ├── models/document.ts                  # API response types
│   ├── services/document.service.ts        # All 5 endpoints
│   └── components/
│       ├── document-list/                  # Table, refresh, delete
│       ├── upload/                         # Drag-and-drop, validation, progress
│       └── chat/                           # Conversation, sources, timing
├── index.html
├── styles.css                              # Design tokens + global reset
└── proxy.conf.json                         # Dev proxy target
```

## Pages

**Documents** — lists every indexed file with its type, chunk count and upload date. Rows with zero chunks
are flagged `empty`. Delete asks for confirmation and removes the document plus its vectors.

**Upload** — drag-and-drop or browse. Accepts `.txt`, `.pdf`, `.docx` up to 50 MB; anything else is rejected
before it leaves the browser. Shows a progress bar and a link back to the list on success.

**Chat** — asks a question and shows the answer, the retrieved chunks (collapsible) and total latency.
Enter sends, Shift+Enter inserts a newline. Suggested prompts appear when the conversation is empty, and a
warning shows if no document has any indexed chunks.

## API contract

All requests go to `/api/Documents`. The backend returns PascalCase JSON.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/Documents` | — | `DocumentSummary[]` |
| `GET` | `/api/Documents/{id}` | — | `DocumentDetail` |
| `POST` | `/api/Documents/upload` | `multipart/form-data`, field `file` | `DocumentDetail` |
| `DELETE` | `/api/Documents/{id}` | — | `{ message }` |
| `POST` | `/api/Documents/chat` | `{ question }` | `{ answer, retrievedSources, timing }` |

```typescript
interface DocumentSummary {
  documentID: number;
  fileName: string;
  fileType: string;
  uploadDate: string;
  chunkCount: number;
}

interface ChatResponse {
  answer: string;
  retrievedSources: string[];
  timing: { totalTimeMs: number };
}
```

## Notes

- Uploads are synchronous on the backend and CPU-bound, so a large document keeps the request open for
  minutes. The UI shows progress but cannot cancel an in-flight upload.
- The answer is buffered, not streamed.
- There is no authentication — the app assumes the backend is only reachable from localhost.
