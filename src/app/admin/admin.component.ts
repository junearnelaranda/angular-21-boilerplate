import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Account } from '@app/_models/account';
import { Role } from '@app/_models/role';
import { AccountService } from '@app/_services/account.service';
import { AlertService } from '@app/_services/alert.service';

@Component({
  imports: [NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly accountService = inject(AccountService);
  private readonly alertService = inject(AlertService);

  protected accounts: Account[] = [];
  protected selected?: Account;
  protected loading = false;
  protected readonly role = Role;
  protected readonly currentAccountId = this.accountService.accountValue?.id;
  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [Role.User, Validators.required]
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.accountService.getAll().subscribe({
      next: accounts => {
        this.accounts = accounts;
        this.selected ??= accounts[0];
        if (this.selected) {
          this.edit(this.selected);
        }
      },
      error: error => this.alertService.error(error.message)
    });
  }

  edit(account: Account): void {
    this.selected = account;
    this.form.patchValue(account);
  }

  save(): void {
    if (!this.selected) {
      return;
    }

    this.loading = true;
    this.accountService.update(this.selected.id, this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.alertService.success('Account updated');
        this.loadAccounts();
      },
      error: error => {
        this.loading = false;
        this.alertService.error(error.message);
      }
    });
  }

  delete(account: Account): void {
    if (!confirm(`Delete ${account.email}?`)) {
      return;
    }

    this.accountService.delete(account.id).subscribe({
      next: () => {
        this.alertService.success('Account deleted');
        this.selected = undefined;
        this.loadAccounts();
      },
      error: error => this.alertService.error(error.message)
    });
  }
}
