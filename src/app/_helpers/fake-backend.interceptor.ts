import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, dematerialize, materialize, of, throwError } from 'rxjs';

import { Account } from '@app/_models/account';
import { RegisterRequest } from '@app/_models/register';
import { Role } from '@app/_models/role';
import { FakeEmailService } from '@app/_services/fake-email.service';
import { environment } from '@environments/environment';

interface StoredAccount extends Account {
  password: string;
  verificationToken?: string;
  resetToken?: string;
  refreshTokens: string[];
}

interface LoginBody {
  email: string;
  password: string;
}

interface TokenBody {
  token: string;
}

interface EmailBody {
  email: string;
}

interface ResetPasswordBody extends TokenBody {
  password: string;
}

const accountsKey = 'angular-21-auth-accounts';
const refreshCookie = 'fakeRefreshToken';

export const fakeBackendInterceptor: HttpInterceptorFn = (request, next) => {
  const fakeEmailService = inject(FakeEmailService);
  const { url, method } = request;
  const path = url.replace(environment.apiUrl, '');

  if (!url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  return handleRoute().pipe(materialize(), delay(350), dematerialize());

  function handleRoute() {
    switch (true) {
      case path === '/accounts/authenticate' && method === 'POST':
        return authenticate();
      case path === '/accounts/refresh-token' && method === 'POST':
        return refreshToken();
      case path === '/accounts/revoke-token' && method === 'POST':
        return revokeToken();
      case path === '/accounts/register' && method === 'POST':
        return register();
      case path === '/accounts/verify-email' && method === 'POST':
        return verifyEmail();
      case path === '/accounts/forgot-password' && method === 'POST':
        return forgotPassword();
      case path === '/accounts/validate-reset-token' && method === 'POST':
        return validateResetToken();
      case path === '/accounts/reset-password' && method === 'POST':
        return resetPassword();
      case path === '/accounts' && method === 'GET':
        return getAllAccounts();
      case /^\/accounts\/\d+$/.test(path) && method === 'GET':
        return getAccountById(Number(path.split('/').pop()));
      case path === '/accounts/me' && method === 'GET':
        return getAccountById(currentAccount().id);
      case /^\/accounts\/(\d+|me)$/.test(path) && method === 'PUT':
        return updateAccount(path.split('/').pop()!);
      case /^\/accounts\/\d+$/.test(path) && method === 'DELETE':
        return deleteAccount(Number(path.split('/').pop()));
      default:
        return next(request);
    }
  }

  function authenticate() {
    const { email, password } = body<LoginBody>(request);
    const accounts = getAccounts();
    const account = accounts.find(x => x.email === email && x.password === password);

    if (!account) {
      return error('Email or password is incorrect', 400);
    }

    if (!account.verified) {
      return error('Account is not verified. Click the fake verification email first.', 400);
    }

    const refreshTokenValue = newToken();
    account.refreshTokens.push(refreshTokenValue);
    saveAccounts(accounts);
    setRefreshTokenCookie(refreshTokenValue);
    return ok(withJwtToken(account));
  }

  function refreshToken() {
    const token = getRefreshTokenCookie();
    const account = getAccounts().find(x => x.refreshTokens.includes(token));

    if (!account) {
      return unauthorized();
    }

    return ok(withJwtToken(account));
  }

  function revokeToken() {
    const token = getRefreshTokenCookie();
    const accounts = getAccounts();
    const account = accounts.find(x => x.refreshTokens.includes(token));

    if (account) {
      account.refreshTokens = account.refreshTokens.filter(x => x !== token);
      saveAccounts(accounts);
    }

    document.cookie = `${refreshCookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    return ok({ message: 'Token revoked' });
  }

  function register() {
    const body = request.body as RegisterRequest;
    const accounts = getAccounts();

    if (accounts.some(x => x.email === body.email)) {
      return error(`Email "${body.email}" is already registered`, 400);
    }

    const verificationToken = newToken();
    const account: StoredAccount = {
      id: nextAccountId(accounts),
      title: body.title,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
      role: accounts.length === 0 ? Role.Admin : Role.User,
      verificationToken,
      refreshTokens: []
    };

    accounts.push(account);
    saveAccounts(accounts);
    fakeEmailService.send({
      to: account.email,
      subject: 'Verify your Angular 21 Auth account',
      body: `Welcome ${account.firstName}. Click the verification link to activate your account.`,
      action: 'Verify account',
      link: `/account/verify-email?token=${verificationToken}`
    });

    return ok({ message: 'Registration successful. Check the fake email displayed on screen to verify your account.' });
  }

  function verifyEmail() {
    const { token } = body<TokenBody>(request);
    const accounts = getAccounts();
    const account = accounts.find(x => x.verificationToken === token);

    if (!account) {
      return error('Verification failed', 400);
    }

    account.verified = new Date().toISOString();
    delete account.verificationToken;
    saveAccounts(accounts);
    return ok({ message: 'Verification successful. You can now login.' });
  }

  function forgotPassword() {
    const { email } = body<EmailBody>(request);
    const accounts = getAccounts();
    const account = accounts.find(x => x.email === email);

    if (account) {
      account.resetToken = newToken();
      saveAccounts(accounts);
      fakeEmailService.send({
        to: account.email,
        subject: 'Reset your Angular 21 Auth password',
        body: `Hi ${account.firstName}. Use this reset link to choose a new password.`,
        action: 'Reset password',
        link: `/account/reset-password?token=${account.resetToken}`
      });
    }

    return ok({ message: 'If the email exists, a fake password reset email is displayed on screen.' });
  }

  function validateResetToken() {
    const { token } = body<TokenBody>(request);
    const account = getAccounts().find(x => x.resetToken === token);
    return account ? ok({ message: 'Token is valid' }) : error('Invalid token', 400);
  }

  function resetPassword() {
    const { token, password } = body<ResetPasswordBody>(request);
    const accounts = getAccounts();
    const account = accounts.find(x => x.resetToken === token);

    if (!account) {
      return error('Invalid token', 400);
    }

    account.password = password;
    delete account.resetToken;
    saveAccounts(accounts);
    return ok({ message: 'Password reset successful. You can now login.' });
  }

  function getAllAccounts() {
    authorize(Role.Admin);
    return ok(getAccounts().map(stripPrivate));
  }

  function getAccountById(id: number) {
    authorizeSelfOrAdmin(id);
    const account = getAccounts().find(x => x.id === id);
    return account ? ok(stripPrivate(account)) : error('Account not found', 404);
  }

  function updateAccount(idParam: string) {
    const account = idParam === 'me' ? currentAccount() : getAccounts().find(x => x.id === Number(idParam));

    if (!account) {
      return error('Account not found', 404);
    }

    authorizeSelfOrAdmin(account.id);
    const accounts = getAccounts();
    const target = accounts.find(x => x.id === account.id)!;
    const body = request.body as Partial<StoredAccount>;

    if (body.email && accounts.some(x => x.email === body.email && x.id !== target.id)) {
      return error(`Email "${body.email}" is already taken`, 400);
    }

    Object.assign(target, {
      title: body.title ?? target.title,
      firstName: body.firstName ?? target.firstName,
      lastName: body.lastName ?? target.lastName,
      email: body.email ?? target.email,
      role: body.role ?? target.role
    });

    if (body.password) {
      target.password = body.password;
    }

    saveAccounts(accounts);
    return ok(stripPrivate(target));
  }

  function deleteAccount(id: number) {
    authorize(Role.Admin);
    const accounts = getAccounts();
    saveAccounts(accounts.filter(x => x.id !== id));
    return ok({ message: 'Account deleted' });
  }

  function authorize(requiredRole?: Role): void {
    const account = currentAccount();
    if (requiredRole && account.role !== requiredRole) {
      throw new HttpErrorResponse({ status: 403, error: { message: 'Forbidden' } });
    }
  }

  function authorizeSelfOrAdmin(id: number): void {
    const account = currentAccount();
    if (account.id !== id && account.role !== Role.Admin) {
      throw new HttpErrorResponse({ status: 403, error: { message: 'Forbidden' } });
    }
  }

  function currentAccount(): StoredAccount {
    const header = request.headers.get('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    const accountId = token ? Number(JSON.parse(atob(token.split('.')[1]))['id']) : 0;
    const account = getAccounts().find(x => x.id === accountId);

    if (!account) {
      throw new HttpErrorResponse({ status: 401, error: { message: 'Unauthorized' } });
    }

    return account;
  }
};

function ok(body?: unknown) {
  return of(new HttpResponse({ status: 200, body }));
}

function body<T>(request: HttpRequest<unknown>): T {
  return request.body as T;
}

function error(message: string, status = 400) {
  return throwError(() => new HttpErrorResponse({ status, error: { message } }));
}

function unauthorized() {
  return error('Unauthorized', 401);
}

function getAccounts(): StoredAccount[] {
  return JSON.parse(localStorage.getItem(accountsKey) || '[]') as StoredAccount[];
}

function saveAccounts(accounts: StoredAccount[]): void {
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function nextAccountId(accounts: StoredAccount[]): number {
  return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
}

function stripPrivate(account: StoredAccount): Account {
  const { password: _password, verificationToken: _verificationToken, resetToken: _resetToken, refreshTokens: _refreshTokens, ...publicAccount } = account;
  return publicAccount;
}

function withJwtToken(account: StoredAccount): Account {
  return { ...stripPrivate(account), jwtToken: createJwtToken(account) };
}

function createJwtToken(account: StoredAccount): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: account.id,
    role: account.role,
    exp: Math.floor(Date.now() / 1000) + 15 * 60
  }));
  return `${header}.${payload}.fake-signature`;
}

function newToken(): string {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16)).join('');
}

function setRefreshTokenCookie(token: string): void {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${refreshCookie}=${token}; expires=${expires}; path=/; SameSite=Strict`;
}

function getRefreshTokenCookie(): string {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${refreshCookie}=`))
    ?.split('=')[1] || '';
}
