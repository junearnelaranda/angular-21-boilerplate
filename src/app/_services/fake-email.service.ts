import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FakeEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  action: string;
  link: string;
}

@Injectable({ providedIn: 'root' })
export class FakeEmailService {
  private readonly emailsSubject = new BehaviorSubject<FakeEmail[]>([]);
  readonly emails$ = this.emailsSubject.asObservable();
  private nextId = 1;

  send(email: Omit<FakeEmail, 'id'>): void {
    this.emailsSubject.next([{ id: this.nextId++, ...email }, ...this.emailsSubject.value]);
  }

  dismiss(id: number): void {
    this.emailsSubject.next(this.emailsSubject.value.filter(email => email.id !== id));
  }
}
