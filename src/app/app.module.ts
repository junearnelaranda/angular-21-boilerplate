import { NgModule, APP_INITIALIZER } from '@angular/core'; 
import { BrowserModule } from '@angular/platform-browser'; 
import { ReactiveFormsModule } from '@angular/forms'; 
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'; 

// used to create fake backend 
import { fakeBackendProvider } from './_helpers/fake-backend'; 

import { AppRoutingModule } from './app-routing.module'; 
import { environment } from '@environments/environment';
import { JwtInterceptor } from './_helpers/jwt.interceptor';
import { ErrorInterceptor } from './_helpers/error.interceptor';
import { appInitializer } from './_helpers/app.initializer';
import { AccountService } from './_services'; 
import { AppComponent } from './app.component'; 
import { AlertComponent } from './_components'; 

@NgModule({ 
    imports: [ 
        BrowserModule, 
        ReactiveFormsModule, 
        HttpClientModule, 
        AppRoutingModule 
    ], 
    declarations: [ 
        AppComponent, 
        AlertComponent 
    ], 
    providers: [ 
        { provide: APP_INITIALIZER, useFactory: appInitializer, multi: true, deps: [AccountService] }, 
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }, 
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }, 

        // provider used to create fake backend 
        ...(environment.production ? [] : [fakeBackendProvider])
    ], 
    bootstrap: [AppComponent] 
}) 
export class AppModule { }
