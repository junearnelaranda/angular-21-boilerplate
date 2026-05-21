import { Component } from '@angular/core'; 
import { Router } from '@angular/router'; 

import { AccountService } from '@app/_services'; 

@Component({ selector: 'app-account-layout', templateUrl: 'layout.component.html', standalone: false }) 
export class LayoutComponent { 
    constructor( 
        private router: Router, 
        private accountService: AccountService 
    ) { 
        const publicTokenPath = this.router.url.startsWith('/account/reset-password') || this.router.url.startsWith('/account/verify-email');

        // redirect to home if already logged in, except for token-based account pages
        if (this.accountService.accountValue && !publicTokenPath) { 
            this.router.navigate(['/']); 
        } 
    } 
}
