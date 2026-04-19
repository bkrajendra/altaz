import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  keepScreenAwake: boolean;
}

const STORAGE_KEY = 'dobzeye.settings.v1';

const DEFAULT_SETTINGS: AppSettings = {
  keepScreenAwake: false,
};

function safeParseSettings(raw: string | null): AppSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      keepScreenAwake: Boolean(parsed.keepScreenAwake),
    };
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  readonly settings$ = this.settingsSubject.asObservable();

  constructor() {
    const stored = safeParseSettings(localStorage.getItem(STORAGE_KEY));
    if (stored) this.settingsSubject.next(stored);
  }

  get snapshot(): AppSettings {
    return this.settingsSubject.value;
  }

  update(partial: Partial<AppSettings>) {
    const next: AppSettings = { ...this.settingsSubject.value, ...partial };
    this.settingsSubject.next(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

