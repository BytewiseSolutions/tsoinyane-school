import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationStateService {
  private readonly refreshRequestedSource = new Subject<void>();

  readonly refreshRequested$ = this.refreshRequestedSource.asObservable();

  requestRefresh(): void {
    this.refreshRequestedSource.next();
  }
}
