import { Component, OnInit } from '@angular/core'; 
import { Router, ActivatedRoute } from '@angular/router'; 
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { of } from 'rxjs';
import { catchError, first, timeout } from 'rxjs/operators'; 

import { AccountService, AlertService } from '@app/_services'; 
import { MustMatch } from '@app/_helpers'; 

enum TokenStatus { 
    Validating, 
    Valid, 
    Invalid 
} 

@Component({ templateUrl: 'reset-password.component.html', standalone: false }) 
export class ResetPasswordComponent implements OnInit { 
    TokenStatus = TokenStatus; 
    tokenStatus = TokenStatus.Validating; 
    token?: string; 
    form!: FormGroup; 
    loading = false; 
    submitted = false; 

    constructor( 
        private formBuilder: FormBuilder, 
        private route: ActivatedRoute, 
        private router: Router, 
        private accountService: AccountService, 
        private alertService: AlertService 
    ) {} 

    ngOnInit() { 
        this.form = this.formBuilder.group({ 
            password: ['', [Validators.required, Validators.minLength(6)]], 
            confirmPassword: ['', Validators.required] 
        }, { 
            validator: MustMatch('password', 'confirmPassword') 
        }); 

        const token = this.route.snapshot.queryParamMap.get('token'); 

        if (!token) {
            console.warn('Reset password token missing from URL');
            this.tokenStatus = TokenStatus.Invalid;
            return;
        }

        // remove token from url to prevent http referer leakage 
        this.router.navigate([], { relativeTo: this.route, replaceUrl: true }); 

        this.accountService.validateResetToken(token) 
            .pipe(
                first(),
                timeout(10000),
                catchError(error => {
                    console.error('Reset token validation failed:', error);
                    return of(null);
                })
            ) 
            .subscribe(result => { 
                if (result) {
                    this.token = token; 
                    this.tokenStatus = TokenStatus.Valid; 
                } else {
                    this.tokenStatus = TokenStatus.Invalid; 
                } 
            }); 
    } 

    // convenience getter for easy access to form fields 
    get f() { return this.form.controls; } 

    onSubmit() { 
        this.submitted = true; 

        // reset alerts on submit 
        this.alertService.clear(); 

        // stop here if form is invalid 
        if (this.form.invalid) { 
            return; 
        } 

        this.loading = true; 
        this.accountService.resetPassword(this.token!, this.f['password'].value, this.f['confirmPassword'].value) 
            .pipe(first()) 
            .subscribe({ 
                next: () => { 
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true }); 
                    this.router.navigate(['../login'], { relativeTo: this.route }); 
                }, 
                error: error => { 
                    this.alertService.error(error); 
                    this.loading = false; 
                } 
            }); 
    } 
}
