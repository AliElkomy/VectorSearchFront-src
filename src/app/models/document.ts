export interface DocumentSummary {
  documentID: number;
  fileName: string;
  fileType: string;
  uploadDate: string;
  chunkCount: number;
}

export interface DocumentChunk {
  chunkID: number;
  chunkContent: string;
}

export interface DocumentDetail extends DocumentSummary {
  chunks: DocumentChunk[];
}

export interface ChatResponse {
  answer: string;
  retrievedSources: string[];
  timing: {
    totalTimeMs: number;
  };
}

export interface ChatStreamChunk {
  delta?: string;
  sources?: string[];
  totalTimeMs?: number;
  done?: boolean;
}
