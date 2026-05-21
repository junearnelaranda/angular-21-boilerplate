import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const publicAccountEndpoints = [
                '/accounts/authenticate',
                '/accounts/register',
                '/accounts/forgot-password',
                '/accounts/validate-reset-token',
                '/accounts/reset-password',
                '/accounts/verify-email',
                '/accounts/refresh-token'
            ];
            const isPublicAccountEndpoint = request.url.startsWith(environment.apiUrl)
                && publicAccountEndpoints.some(endpoint => request.url.endsWith(endpoint));

            if ([401, 403].includes(err.status) && this.accountService.accountValue && !isPublicAccountEndpoint) {
                // auto logout if 401 or 403 response returned from api
                this.accountService.logout();
            }

            const error = (err && err.error && err.error.message) || err.statusText;
            console.error(err);
            return throwError(() => error);
        }))
    }
}
