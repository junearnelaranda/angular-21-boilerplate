import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Alert, AlertType } from '@app/_models';
import { AlertService } from '@app/_services';

@Component({
  selector: 'app-alert',
  imports: [NgFor, NgIf],
  templateUrl: './alert.component.html'
})
export class AlertComponent implements OnInit, OnDestroy {
  @Input() id = 'default-alert';
  @Input() fade = true;

  alerts: Alert[] = [];
  private alertSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.alertSubscription = this.alertService.onAlert(this.id).subscribe(alert => {
      if (!alert.message) {
        this.alerts = this.alerts.filter(x => x.keepAfterRouteChange);
        this.alerts.forEach(x => delete x.keepAfterRouteChange);
        this.scheduleDetectChanges();
        return;
      }

      this.alerts.push(alert);
      this.scheduleDetectChanges();

      if (alert.autoClose) {
        setTimeout(() => this.removeAlert(alert), 3000);
      }
    });

    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.alertService.clear(this.id);
        this.scheduleDetectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.alertSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  removeAlert(alert: Alert): void {
    if (!this.alerts.includes(alert)) {
      return;
    }

    if (this.fade) {
      alert.fade = true;
      this.scheduleDetectChanges();

      setTimeout(() => {
        this.alerts = this.alerts.filter(x => x !== alert);
        this.scheduleDetectChanges();
      }, 250);
    } else {
      this.alerts = this.alerts.filter(x => x !== alert);
      this.scheduleDetectChanges();
    }
  }

  cssClasses(alert: Alert): string {
    const classes = ['alert', 'alert-dismissible', 'mt-4', 'container'];
    const alertTypeClass = {
      [AlertType.Success]: 'alert-success',
      [AlertType.Error]: 'alert-danger',
      [AlertType.Info]: 'alert-info',
      [AlertType.Warning]: 'alert-warning'
    };

    if (alert.type !== undefined) {
      classes.push(alertTypeClass[alert.type]);
    }

    if (alert.fade) {
      classes.push('fade');
    }

    return classes.join(' ');
  }

  private scheduleDetectChanges(): void {
    setTimeout(() => this.cdr.detectChanges());
  }
}
