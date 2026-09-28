import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DocumentService } from './services/document.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly navItems = [
    { path: '/documents', label: 'Documents', icon: '▤' },
    { path: '/upload', label: 'Upload', icon: '⬆' },
    { path: '/chat', label: 'Chat', icon: '💬' },
  ];

  backendOnline = false;

  private readonly documents = inject(DocumentService);

  ngOnInit(): void {
    this.documents.list().subscribe({
      next: () => (this.backendOnline = true),
      error: () => (this.backendOnline = false),
    });
  }
}
