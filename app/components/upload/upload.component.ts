import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent implements OnInit {
  private readonly documents = inject(DocumentService);
  private readonly router = inject(Router);

  readonly accepted = '.txt,.pdf,.docx';
  readonly maxSizeMb = 50;

  readonly selected = signal<File | null>(null);
  readonly dragOver = signal(false);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly error = signal<string | null>(null);
  readonly done = signal<string | null>(null);

  private readonly acceptedTypes = ['.txt', '.pdf', '.docx'];
  readonly acceptedLabel = this.acceptedTypes.join('  ');

  ngOnInit(): void {
    this.documents.list().subscribe({
      error: () => this.error.set('Could not reach the API. Is the backend running?'),
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.select(file);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.select(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  select(file: File | null): void {
    this.error.set(null);
    this.done.set(null);
    this.progress.set(0);

    if (!file) {
      return;
    }

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!this.acceptedTypes.includes(ext)) {
      this.error.set(`Unsupported file type "${ext}". Accepted: ${this.acceptedTypes.join(', ')}`);
      this.selected.set(null);
      return;
    }

    if (file.size > this.maxSizeMb * 1024 * 1024) {
      this.error.set(`File is larger than ${this.maxSizeMb} MB.`);
      this.selected.set(null);
      return;
    }

    this.selected.set(file);
  }

  upload(): void {
    const file = this.selected();
    if (!file || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.done.set(null);
    this.progress.set(0);

    this.documents.upload(file).subscribe({
      next: (doc) => {
        this.uploading.set(false);
        this.progress.set(100);
        this.done.set(`Indexed "${doc.fileName}" — ${doc.chunkCount} chunks.`);
        this.selected.set(null);
      },
      error: (err) => {
        this.uploading.set(false);
        this.progress.set(0);
        this.error.set(this.describe(err));
      },
    });
  }

  readonly canUpload = () => this.selected() !== null && !this.uploading();

  private describe(err: unknown): string {
    if (err instanceof Error) {
      return err.message || 'Upload failed';
    }
    return 'Upload failed';
  }
}
