import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentService } from '../../services/document.service';
import { DocumentSummary } from '../../models/document';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-list.component.html',
  styleUrl: './document-list.component.css',
})
export class DocumentListComponent implements OnInit {
  private readonly documents = inject(DocumentService);

  readonly items = signal<DocumentSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<number | null>(null);

  private readonly acceptedTypes = ['.txt', '.pdf', '.docx'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.documents.list().subscribe({
      next: (docs) => {
        this.items.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.describe(err));
        this.loading.set(false);
      },
    });
  }

  remove(doc: DocumentSummary): void {
    if (!confirm(`Delete "${doc.fileName}" and its ${doc.chunkCount} chunks?`)) {
      return;
    }
    this.deletingId.set(doc.documentID);
    this.documents.remove(doc.documentID).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.items.update((list: DocumentSummary[]) =>
          list.filter((d: DocumentSummary) => d.documentID !== doc.documentID),
        );
      },
      error: (err) => {
        this.deletingId.set(null);
        this.error.set(this.describe(err));
      },
    });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  formatSize(chunks: number): string {
    return chunks.toLocaleString();
  }

  isSupported(type: string): boolean {
    return this.acceptedTypes.includes(type.toLowerCase());
  }

  private describe(err: unknown): string {
    if (err instanceof Error) {
      return err.message || 'Request failed';
    }
    return 'Request failed';
  }
}

