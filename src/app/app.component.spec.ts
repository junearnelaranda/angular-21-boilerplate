import { BehaviorSubject } from 'rxjs';

import { AppComponent } from './app.component';
import { Account } from './_models';

describe('AppComponent', () => {
  it('creates the app component', () => {
    const accountService = {
      account: new BehaviorSubject<Account | null>(null),
      logout: jasmine.createSpy('logout')
    };

    const component = new AppComponent(accountService as any);

    expect(component).toBeTruthy();
  });
});
