import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Account } from '@app/_models/account';
import { AccountService } from '@app/_services/account.service';
import { AlertService } from '@app/_services/alert.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly accountService = inject(AccountService);
  private readonly alertService = inject(AlertService);

  protected loading = false;
  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    confirmPassword: ['']
  });

  ngOnInit(): void {
    this.accountService.getById('me').subscribe(account => this.patchForm(account));
  }

  submit(): void {
    const value = this.form.getRawValue();
    if (value.password && value.password !== value.confirmPassword) {
      this.alertService.error('Passwords must match');
      return;
    }

    this.loading = true;
    this.accountService.update('me', value).subscribe({
      next: () => {
        this.loading = false;
        this.form.patchValue({ password: '', confirmPassword: '' });
        this.alertService.success('Profile updated');
      },
      error: error => {
        this.loading = false;
        this.alertService.error(error.message);
      }
    });
  }

  private patchForm(account: Account): void {
    this.form.patchValue({
      title: account.title,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email
    });
  }
}
