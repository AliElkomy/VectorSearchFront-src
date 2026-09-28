import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DocumentService } from '../../services/document.service';
import { ChatResponse } from '../../models/document';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timingMs?: number;
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

  ask(text?: string): void {
    const q = (text ?? this.question()).trim();
    if (!q || this.sending()) {
      return;
    }

    this.messages.update((list) => [...list, { role: 'user', text: q }]);
    this.question.set('');
    this.sending.set(true);
    this.error.set(null);

    this.documents.chat(q).subscribe({
      next: (res: ChatResponse) => {
        this.sending.set(false);
        this.messages.update((list) => [
          ...list,
          {
            role: 'assistant',
            text: res.answer,
            sources: res.retrievedSources,
            timingMs: res.timing.totalTimeMs,
          },
        ]);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(this.describe(err));
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.ask();
    }
  }

  clear(): void {
    this.messages.set([]);
    this.error.set(null);
  }

  formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
  }

  private describe(err: unknown): string {
    if (err instanceof Error) {
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }
}
