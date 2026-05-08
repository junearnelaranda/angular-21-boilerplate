import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Account, RegisterRequest } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;
type MessageResponse = { message: string };

@Injectable({ providedIn: 'root' })
export class AccountService {
  private accountSubject: BehaviorSubject<Account | null>;
  public account: Observable<Account | null>;
  public account$: Observable<Account | null>;

  private refreshTokenTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    const account = localStorage.getItem('account');
    this.accountSubject = new BehaviorSubject<Account | null>(account ? JSON.parse(account) as Account : null);
    this.account = this.accountSubject.asObservable();
    this.account$ = this.account;

    if (account) {
      this.startRefreshTokenTimer();
    }
  }

  public get accountValue() {
    return this.accountSubject.value;
  }

  login(email: string, password: string): Observable<Account> {
    return this.http.post<Account>(`${baseUrl}/authenticate`, { email, password }, { withCredentials: true })
      .pipe(map(account => {
        this.setAccount(account);
        return account;
      }));
  }

  logout(): void {
    this.http.post(`${baseUrl}/revoke-token`, {}, { withCredentials: true }).subscribe({ error: () => undefined });
    this.stopRefreshTokenTimer();
    this.accountSubject.next(null);
    localStorage.removeItem('account');
    this.router.navigate(['/account/login']);
  }

  refreshToken(): Observable<Account> {
    return this.http.post<Account>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
      .pipe(map(account => {
        this.setAccount(account);
        return account;
      }));
  }

  register(account: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${baseUrl}/register`, account);
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${baseUrl}/verify-email`, { token });
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${baseUrl}/forgot-password`, { email });
  }

  validateResetToken(token: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${baseUrl}/validate-reset-token`, { token });
  }

  resetPassword(token: string, password: string, confirmPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${baseUrl}/reset-password`, { token, password, confirmPassword });
  }

  getAll() {
    return this.http.get<Account[]>(baseUrl);
  }

  getById(id: number | 'me') {
    return this.http.get<Account>(`${baseUrl}/${id}`);
  }

  create(params: Partial<Account> & { password?: string; confirmPassword?: string }) {
    return this.http.post(baseUrl, params);
  }

  update(id: number | 'me', params: Partial<Account> & { password?: string; confirmPassword?: string }) {
    return this.http.put<Account>(`${baseUrl}/${id}`, params)
      .pipe(map(account => {
        // update the current account if it was updated
        if (id === 'me' || account.id === this.accountValue?.id) {
          // publish updated account to subscribers
          account = { ...this.accountValue, ...account, jwtToken: this.accountValue?.jwtToken } as Account;
          this.setAccount(account);
        }
        return account;
      }));
  }

  delete(id: number) {
    return this.http.delete(`${baseUrl}/${id}`)
      .pipe(finalize(() => {
        // auto logout if the logged in account was deleted
        if (id === this.accountValue?.id) {
          this.logout();
        }
      }));
  }

  // helper methods

  private setAccount(account: Account): void {
    this.accountSubject.next(account);
    localStorage.setItem('account', JSON.stringify(account));
    this.startRefreshTokenTimer();
  }

  private startRefreshTokenTimer(): void {
    const jwtToken = this.accountValue?.jwtToken;
    if (!jwtToken) {
      return;
    }

    // parse json object from base64 encoded jwt token
    const jwtBase64 = jwtToken.split('.')[1];
    const jwtTokenPayload = JSON.parse(atob(jwtBase64));

    // set a timeout to refresh the token a minute before it expires
    const expires = new Date(jwtTokenPayload.exp * 1000);
    const timeout = expires.getTime() - Date.now() - (60 * 1000);
    this.stopRefreshTokenTimer();
    this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), Math.max(timeout, 1000));
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }
}
