import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'os-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-layout">
      <div class="auth-brand">
        <i class="bi bi-stack"></i>
        <span>OrderStack</span>
      </div>
      <div class="auth-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      padding: 24px;
    }

    .auth-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a2e;

      i {
        color: #006aff;
        font-size: 2rem;
      }
    }

    .auth-content {
      width: 100%;
      max-width: 440px;
    }
  `],
})
export class AuthLayoutComponent {}
