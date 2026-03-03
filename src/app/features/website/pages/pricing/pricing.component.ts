import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { PlanCardsComponent } from '../../shared/plan-cards.component';
import { ProcessingRatesComponent } from '../../shared/processing-rates.component';
import { CompetitorComparisonComponent } from '../../shared/competitor-comparison.component';
import { PricingFaqComponent } from '../../shared/pricing-faq.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { PRICING_HERO } from '../../marketing.config';

@Component({
  selector: 'os-pricing-page',
  standalone: true,
  imports: [
    MarketingSectionComponent,
    MarketingHeroComponent,
    PlanCardsComponent,
    ProcessingRatesComponent,
    CompetitorComparisonComponent,
    PricingFaqComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingPageComponent {
  readonly hero = PRICING_HERO;
}
