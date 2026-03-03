import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { SocialProofBarComponent } from '../../shared/social-proof-bar.component';
import { PainPointsComponent } from '../../shared/pain-points.component';
import { FeatureHighlightsComponent } from '../../shared/feature-highlights.component';
import { StatsStripComponent } from '../../shared/stats-strip.component';
import { HowItWorksComponent } from '../../shared/how-it-works.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { LANDING_HERO } from '../../marketing.config';

@Component({
  selector: 'os-landing',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    SocialProofBarComponent,
    PainPointsComponent,
    FeatureHighlightsComponent,
    StatsStripComponent,
    HowItWorksComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  readonly hero = LANDING_HERO;
}
