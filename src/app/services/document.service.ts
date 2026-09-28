import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DocumentSummary, DocumentDetail, ChatResponse } from '../models/document';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/Documents';

  list(): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(this.base);
  }

  get(id: number): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.base}/${id}`);
  }

  upload(file: File): Observable<DocumentDetail> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<DocumentDetail>(`${this.base}/upload`, form);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  chat(question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/chat`, { question });
  }
}
