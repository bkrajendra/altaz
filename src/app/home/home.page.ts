import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';

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

  isTracking = false;
  permissionDenied = false;
  browserSupport = true;

  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  // Smoothing buffers
  private azBuffer: number[] = [];
  private altBuffer: number[] = [];
  private readonly SMOOTH = 8;

  // Star field
  stars: { x: number; y: number; r: number; op: number }[] = [];

  constructor(private zone: NgZone) {
    this.generateStars();
  }

  ngOnInit() {
    if (!window.DeviceOrientationEvent) {
      this.browserSupport = false;
    }
  }

  ngOnDestroy() {
    this.stopTracking();
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
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      this.zone.run(() => this.handleOrientation(e));
    };
    window.addEventListener('deviceorientation', this.orientationHandler, true);
  }

  stopTracking() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
      this.orientationHandler = null;
    }
    this.isTracking = false;
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
