import { Routes } from '@angular/router';

import { DocumentListComponent } from './components/document-list/document-list.component';
import { UploadComponent } from './components/upload/upload.component';
import { ChatComponent } from './components/chat/chat.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'documents' },
  { path: 'documents', component: DocumentListComponent, title: 'Documents' },
  { path: 'upload', component: UploadComponent, title: 'Upload' },
  { path: 'chat', component: ChatComponent, title: 'Chat' },
  { path: '**', redirectTo: 'documents' },
];
