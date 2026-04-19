import { Injectable } from '@angular/core';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
};

type WakeLockLike = {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
};

@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private sentinel: WakeLockSentinelLike | null = null;
  private wantsLock = false;
  private visibilityHandlerAttached = false;

  private get wakeLock(): WakeLockLike | null {
    const anyNav = navigator as unknown as { wakeLock?: WakeLockLike };
    return anyNav.wakeLock ?? null;
  }

  isSupported(): boolean {
    return Boolean(this.wakeLock);
  }

  async enable() {
    this.wantsLock = true;
    this.attachVisibilityHandler();
    await this.requestIfPossible();
  }

  async disable() {
    this.wantsLock = false;
    await this.release();
  }

  async release() {
    const s = this.sentinel;
    this.sentinel = null;
    if (s && !s.released) {
      try {
        await s.release();
      } catch {
        // ignore
      }
    }
  }

  private attachVisibilityHandler() {
    if (this.visibilityHandlerAttached) return;
    this.visibilityHandlerAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.requestIfPossible();
      }
    });
  }

  private async requestIfPossible() {
    if (!this.wantsLock) return;
    if (document.visibilityState !== 'visible') return;
    if (this.sentinel && !this.sentinel.released) return;
    const wl = this.wakeLock;
    if (!wl) return;
    try {
      this.sentinel = await wl.request('screen');
    } catch {
      // ignore: not allowed / not supported / requires user gesture
    }
  }
}

