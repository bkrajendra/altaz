import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  keepScreenAwake = false;

  private readonly settings = inject(SettingsService);
  private sub: Subscription | null = null;

  ngOnInit() {
    this.sub = this.settings.settings$.subscribe(s => {
      this.keepScreenAwake = s.keepScreenAwake;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onKeepAwakeChanged(value: boolean) {
    this.settings.update({ keepScreenAwake: value });
  }
}

