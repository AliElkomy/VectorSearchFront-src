import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DocumentService } from '../../services/document.service';
import { ChatStreamService } from '../../services/chat-stream.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timingMs?: number;
  streaming?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit {
  private readonly documents = inject(DocumentService);
  private readonly chatStream = inject(ChatStreamService);
  private abort?: AbortController;

  readonly question = signal('');
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly hasIndex = signal<boolean | null>(null);

  readonly suggestions = [
    'What is the partition replication model?',
    'Summarise the main topics',
    'What are the key takeaways?',
  ];

  ngOnInit(): void {
    this.documents.list().subscribe({
      next: (docs) => this.hasIndex.set(docs.some((d) => d.chunkCount > 0)),
      error: () => this.hasIndex.set(null),
    });
  }

  async ask(text?: string): Promise<void> {
    const q = (text ?? this.question()).trim();
    if (!q || this.sending()) {
      return;
    }

    // The assistant bubble is added immediately and filled in token by token.
    this.messages.update((list) => [
      ...list,
      { role: 'user', text: q },
      { role: 'assistant', text: '', streaming: true },
    ]);
    this.question.set('');
    this.sending.set(true);
    this.error.set(null);
    this.abort = new AbortController();

    try {
      for await (const event of this.chatStream.stream(q, this.abort.signal)) {
        switch (event.type) {
          case 'sources':
            this.patchLast({ sources: event.sources });
            break;
          case 'token':
            this.appendToLast(event.token);
            break;
          case 'done':
            this.patchLast({ timingMs: event.totalTimeMs });
            break;
          case 'error':
            this.error.set(event.message);
            break;
        }
      }
    } catch (err) {
      // Stop aborts the fetch on purpose; anything else is a real error.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        this.error.set(this.describe(err));
      }
    } finally {
      this.finishLast();
      this.sending.set(false);
      this.abort = undefined;
    }
  }

  stop(): void {
    this.abort?.abort();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.ask();
    }
  }

  clear(): void {
    this.messages.set([]);
    this.error.set(null);
  }

  formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
  }

  private patchLast(patch: Partial<ChatMessage>): void {
    this.messages.update((list) => {
      const copy = [...list];
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });
  }

  private appendToLast(token: string): void {
    this.messages.update((list) => {
      const copy = [...list];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, text: last.text + token };
      return copy;
    });
  }

  /** Ends streaming; drops the assistant bubble if nothing at all arrived (error case). */
  private finishLast(): void {
    this.messages.update((list) => {
      const last = list[list.length - 1];
      if (!last || last.role !== 'assistant') {
        return list;
      }
      if (!last.text && !last.sources?.length) {
        return list.slice(0, -1);
      }
      return [...list.slice(0, -1), { ...last, streaming: false }];
    });
  }

  private describe(err: unknown): string {
    if (err instanceof Error) {
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }
}
