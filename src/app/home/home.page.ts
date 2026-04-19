import { Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SettingsService } from '../services/settings.service';
import { WakeLockService } from '../services/wake-lock.service';

interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<string>;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  azimuth = 0;       // 0-360 degrees (compass bearing)
  altitude = 0;      // -90 to +90 degrees (elevation)
  roll = 0;          // device roll
  compassAngle = 0;  // needle rotation for compass
  rightAscension = 0; // 0-24 hours
  declination = 0;    // -90 to +90 degrees

  isTracking = false;
  permissionDenied = false;
  browserSupport = true;
  hasLocation = false;
  locationLabel = 'Location unavailable';

  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private latitude = 0;
  private longitude = 0; // East positive

  // Smoothing buffers
  private azBuffer: number[] = [];
  private altBuffer: number[] = [];
  private readonly SMOOTH = 8;

  // Star field
  stars: { x: number; y: number; r: number; op: number }[] = [];
  private readonly zone = inject(NgZone);
  private readonly settings = inject(SettingsService);
  private readonly wakeLock = inject(WakeLockService);
  private settingsSub: Subscription | null = null;
  private keepScreenAwakeEnabled = false;

  constructor() {
    this.generateStars();
  }

  ngOnInit() {
    if (!window.DeviceOrientationEvent) {
      this.browserSupport = false;
    }
    this.settingsSub = this.settings.settings$.subscribe(s => {
      this.keepScreenAwakeEnabled = s.keepScreenAwake;
      void this.syncWakeLock();
    });
  }

  ngOnDestroy() {
    this.stopTracking();
    this.settingsSub?.unsubscribe();
    void this.wakeLock.disable();
  }

  ionViewDidEnter() {
    void this.syncWakeLock();
  }

  ionViewWillLeave() {
    void this.wakeLock.disable();
  }

  generateStars() {
    this.stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 1.5 + 0.3,
      op: Math.random() * 0.7 + 0.3,
    }));
  }

  async requestPermission() {
    const DevOr = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
    if (typeof DevOr.requestPermission === 'function') {
      try {
        const result = await DevOr.requestPermission();
        if (result === 'granted') {
          this.startTracking();
        } else {
          this.permissionDenied = true;
        }
      } catch {
        this.permissionDenied = true;
      }
    } else {
      this.startTracking();
    }
  }

  startTracking() {
    this.isTracking = true;
    this.captureLocation();
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      this.zone.run(() => this.handleOrientation(e));
    };
    window.addEventListener('deviceorientation', this.orientationHandler, true);
    void this.syncWakeLock();
  }

  stopTracking() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
      this.orientationHandler = null;
    }
    this.isTracking = false;
    void this.syncWakeLock();
  }

  private async syncWakeLock() {
    if (!this.keepScreenAwakeEnabled || !this.isTracking) {
      await this.wakeLock.disable();
      return;
    }
    await this.wakeLock.enable();
  }

  private handleOrientation(e: DeviceOrientationEvent) {
    const alpha = e.alpha ?? 0;  // compass heading 0-360
    const beta  = e.beta  ?? 0;  // front-back tilt -180 to 180
    const gamma = e.gamma ?? 0;  // left-right tilt -90 to 90

    // --- Azimuth from alpha (true compass bearing) ---
    const az = (360 - alpha) % 360;
    this.azBuffer.push(az);
    if (this.azBuffer.length > this.SMOOTH) this.azBuffer.shift();
    this.azimuth = this.circularMean(this.azBuffer);

    // --- Altitude from beta (phone lying flat = 0°, vertical = 90°) ---
    // Phone is mounted parallel to telescope tube (taped to side):
    // beta ≈ 0 means tube pointing at horizon, beta ≈ 90 means zenith
    let alt = beta;
    alt = Math.max(-90, Math.min(90, alt));
    this.altBuffer.push(alt);
    if (this.altBuffer.length > this.SMOOTH) this.altBuffer.shift();
    this.altitude = this.mean(this.altBuffer);

    this.roll = Math.round(gamma);

    // Compass needle points opposite to azimuth (needle points North)
    this.compassAngle = -this.azimuth;
    this.updateEquatorialCoordinates();
  }

  private mean(arr: number[]): number {
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  private circularMean(angles: number[]): number {
    const rad = angles.map(a => (a * Math.PI) / 180);
    const sinSum = rad.reduce((s, r) => s + Math.sin(r), 0);
    const cosSum = rad.reduce((s, r) => s + Math.cos(r), 0);
    let mean = Math.atan2(sinSum / angles.length, cosSum / angles.length) * (180 / Math.PI);
    if (mean < 0) mean += 360;
    return Math.round(mean);
  }

  get cardinalDirection(): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(this.azimuth / 22.5) % 16];
  }

  get altitudeLabel(): string {
    if (this.altitude > 75) return 'Near Zenith';
    if (this.altitude > 45) return 'High Sky';
    if (this.altitude > 20) return 'Mid Sky';
    if (this.altitude > 5)  return 'Low Sky';
    return 'Near Horizon';
  }

  get altitudeColor(): string {
    if (this.altitude > 45) return '#4fc3f7';
    if (this.altitude > 20) return '#81c784';
    if (this.altitude > 5)  return '#ffb74d';
    return '#ef5350';
  }

  get altitudeBarWidth(): number {
    return ((this.altitude + 90) / 180) * 100;
  }

  get azimuthBarWidth(): number {
    return (this.azimuth / 360) * 100;
  }

  formatDeg(val: number, decimals = 0): string {
    return val.toFixed(decimals) + '°';
  }

  formatDeclination(): string {
    const sign = this.declination >= 0 ? '+' : '-';
    return `${sign}${Math.abs(this.declination).toFixed(2)}°`;
  }

  formatRightAscension(): string {
    const totalSeconds = Math.round(this.normalizeHours(this.rightAscension) * 3600);
    const secDay = 24 * 3600;
    const wrapped = ((totalSeconds % secDay) + secDay) % secDay;
    const h = Math.floor(wrapped / 3600);
    const m = Math.floor((wrapped % 3600) / 60);
    const s = wrapped % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }

  private captureLocation() {
    if (!navigator.geolocation) {
      this.locationLabel = 'Geolocation not supported';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.zone.run(() => {
          this.latitude = coords.latitude;
          this.longitude = coords.longitude;
          this.hasLocation = true;
          this.locationLabel = `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`;
          this.updateEquatorialCoordinates();
        });
      },
      () => {
        this.zone.run(() => {
          this.locationLabel = 'Enable location for accurate RA/Dec';
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  private updateEquatorialCoordinates() {
    if (!this.hasLocation) {
      this.rightAscension = 0;
      this.declination = 0;
      return;
    }

    const latRad = this.degToRad(this.latitude);
    const altRad = this.degToRad(this.altitude);
    const azRad = this.degToRad(this.azimuth);

    const sinDec = (Math.sin(altRad) * Math.sin(latRad))
      + (Math.cos(altRad) * Math.cos(latRad) * Math.cos(azRad));
    const decRad = Math.asin(this.clamp(sinDec, -1, 1));

    const cosDec = Math.cos(decRad);
    if (Math.abs(cosDec) < 1e-6) {
      this.declination = this.radToDeg(decRad);
      this.rightAscension = 0;
      return;
    }

    const sinH = -(Math.sin(azRad) * Math.cos(altRad)) / cosDec;
    const cosH = (Math.sin(altRad) - (Math.sin(latRad) * Math.sin(decRad)))
      / (Math.cos(latRad) * cosDec);
    const hourAngleDeg = this.normalizeDegrees(this.radToDeg(Math.atan2(sinH, cosH)));
    const lstDeg = this.localSiderealTimeDegrees(new Date(), this.longitude);
    const raDeg = this.normalizeDegrees(lstDeg - hourAngleDeg);

    this.rightAscension = raDeg / 15;
    this.declination = this.radToDeg(decRad);
  }

  private localSiderealTimeDegrees(date: Date, longitudeDegEast: number): number {
    const d = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0, 0)) / 86400000;
    const t = d / 36525;
    const gmst = 280.46061837
      + (360.98564736629 * d)
      + (0.000387933 * t * t)
      - ((t * t * t) / 38710000);
    return this.normalizeDegrees(gmst + longitudeDegEast);
  }

  private normalizeDegrees(value: number): number {
    return ((value % 360) + 360) % 360;
  }

  private normalizeHours(value: number): number {
    return ((value % 24) + 24) % 24;
  }

  private degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // Pre-computed compass tick marks for SVG
  get compassTicks(): { x1: number; y1: number; x2: number; y2: number; major: boolean }[] {
    const ticks = [];
    for (let d = 0; d < 360; d += 10) {
      const major = d % 30 === 0;
      const outerR = 88;
      const innerR = major ? 70 : 78;
      const rad = (d * Math.PI) / 180;
      ticks.push({
        x1: 100 + outerR * Math.sin(rad),
        y1: 100 - outerR * Math.cos(rad),
        x2: 100 + innerR * Math.sin(rad),
        y2: 100 - innerR * Math.cos(rad),
        major,
      });
    }
    return ticks;
  }

  get compassLabels(): { x: number; y: number; text: string }[] {
    return [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(d => {
      const rad = (d * Math.PI) / 180;
      return {
        x: 100 + 60 * Math.sin(rad),
        y: 100 - 60 * Math.cos(rad) + 4,
        text: String(d),
      };
    });
  }

  // Template helpers
  sinDeg(deg: number): number {
    return Math.sin((deg * Math.PI) / 180);
  }

  cosDeg(deg: number): number {
    return Math.cos((deg * Math.PI) / 180);
  }

  // Altitude arc path (semicircle from W to E, 0=horizon at edges, 90=zenith at top)
  altArcPath(): string {
    const cx = 150, cy = 140, r = 120;
    const startAngle = 180; // West side
    const altClamped = Math.max(0, Math.min(90, this.altitude));
    const endAngle = 180 - altClamped; // maps 0->180deg (horizon) to 90->90deg (zenith)
    const rad = (endAngle * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    return `M 30 140 A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  altDotX(): number {
    const cx = 150, r = 120;
    const altClamped = Math.max(-10, Math.min(90, this.altitude));
    const angle = 180 - Math.max(0, altClamped);
    return cx + r * Math.cos((angle * Math.PI) / 180);
  }

  altDotY(): number {
    const cy = 140, r = 120;
    const altClamped = Math.max(-10, Math.min(90, this.altitude));
    const angle = 180 - Math.max(0, altClamped);
    return cy - r * Math.sin((angle * Math.PI) / 180);
  }

  get rollBarPos(): number {
    // Roll -90 to +90 mapped to 5%-95%
    return 50 + (Math.max(-90, Math.min(90, this.roll)) / 90) * 45;
  }
}
