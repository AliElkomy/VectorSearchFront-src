import { Injectable } from '@angular/core';

export type ChatStreamEvent =
  | { type: 'sources'; sources: string[] }
  | { type: 'token'; token: string }
  | { type: 'done'; totalTimeMs: number }
  | { type: 'error'; message: string };

/**
 * Streams the chat answer over Server-Sent Events (POST /api/Documents/chat/stream).
 * EventSource cannot POST and HttpClient does not expose partial bodies,
 * so this uses fetch + ReadableStream and parses the SSE frames manually.
 */
@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  private readonly url = '/api/Documents/chat/stream';

  async *stream(question: string, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ question }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat request failed (${response.status})`);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;

        // An SSE frame ends with a blank line.
        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const event = this.parseFrame(frame);
          if (event) yield event;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseFrame(frame: string): ChatStreamEvent | null {
    let name = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length === 0) return null;
    const data = JSON.parse(dataLines.join('\n'));

    switch (name) {
      case 'sources':
        return { type: 'sources', sources: data as string[] };
      case 'token':
        return { type: 'token', token: data as string };
      case 'done':
        return { type: 'done', totalTimeMs: data.totalTimeMs as number };
      case 'error':
        return { type: 'error', message: data.message as string };
      default:
        return null;
    }
  }
}
