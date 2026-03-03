import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MarketingHeaderComponent } from '../header/marketing-header.component';
import { MarketingFooterComponent } from '../footer/marketing-footer.component';

@Component({
  selector: 'os-marketing-layout',
  standalone: true,
  imports: [RouterOutlet, MarketingHeaderComponent, MarketingFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <os-marketing-header />
    <main class="mkt-main">
      <router-outlet />
    </main>
    <os-marketing-footer />
  `,
  styles: [`
    :host { display: block; }

    .mkt-main {
      min-height: 100vh;
      padding-top: 64px;
    }
  `],
})
export class MarketingLayoutComponent {}
