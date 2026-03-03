import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MarketingSectionComponent } from '../../shared/marketing-section.component';
import { MarketingHeroComponent } from '../../shared/marketing-hero.component';
import { FinalCtaComponent } from '../../shared/final-cta.component';
import { BlogService } from '../../services/blog.service';
import { BLOG_HERO, BLOG_CATEGORIES } from '../../marketing.config';

@Component({
  selector: 'os-blog-page',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MarketingSectionComponent,
    MarketingHeroComponent,
    FinalCtaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss',
})
export class BlogPageComponent {
  private readonly blogService = inject(BlogService);

  readonly hero = BLOG_HERO;
  readonly categories = BLOG_CATEGORIES;
  readonly activeCategory = signal('all');

  readonly featuredPost = computed(() => {
    const featured = this.blogService.getFeaturedPosts();
    return featured.length > 0 ? featured[0] : null;
  });

  readonly filteredPosts = computed(() => {
    const cat = this.activeCategory();
    const all = this.blogService.getAllPosts();
    const featured = this.featuredPost();
    const nonFeatured = featured ? all.filter(p => p.slug !== featured.slug) : all;
    if (cat === 'all') return nonFeatured;
    return nonFeatured.filter(p => p.category === cat);
  });

  onCategoryChange(categoryId: string): void {
    this.activeCategory.set(categoryId);
  }
}
