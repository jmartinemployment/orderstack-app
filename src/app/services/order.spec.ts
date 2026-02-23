import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderService } from './order';
import { AuthService } from './auth';
import { SocketService } from './socket';
import type { OrderTemplate, OrderTemplateItem } from '@models/order.model';

type OrderHarness = {
  service: OrderService;
};

function createHarness(): OrderHarness {
  const httpMock = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const authMock = {
    selectedRestaurantId: vi.fn(() => 'r-1'),
    isAuthenticated: signal(true).asReadonly(),
  };

  const socketMock = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onOrderEvent: vi.fn(),
    isOnline: signal(true),
  };

  TestBed.configureTestingModule({
    providers: [
      OrderService,
      { provide: HttpClient, useValue: httpMock },
      { provide: AuthService, useValue: authMock },
      { provide: SocketService, useValue: socketMock },
    ],
  });

  const service = TestBed.inject(OrderService);
  return { service };
}

describe('OrderService — applyOrderTemplate', () => {
  const templateItems: OrderTemplateItem[] = [
    { menuItemId: 'mi-1', quantity: 2, modifiers: ['mod-a'] },
    { menuItemId: 'mi-2', quantity: 1, modifiers: [] },
  ];

  const template: OrderTemplate = {
    id: 'tmpl-1',
    restaurantId: 'r-1',
    name: 'Lunch Special',
    items: templateItems,
    createdBy: 'admin',
    createdAt: '2026-02-23T10:00:00Z',
  };

  it('returns template items for valid ID', async () => {
    const { service } = createHarness();

    // Seed the templates signal by accessing it through the public readonly
    // The _templates signal is private, so we load via the service's internal state.
    // We can work around this by calling applyOrderTemplate after loading templates.
    // Since loadTemplates calls HTTP which we mocked, let's directly test the logic:
    // applyOrderTemplate reads from _templates signal. We need to seed it.
    // Use the public templates signal to verify, and trigger loading via mocked HTTP.

    // Directly inject template by using loadTemplates with mocked HTTP
    const httpMock = TestBed.inject(HttpClient) as any;
    const { of } = await import('rxjs');
    httpMock.get.mockReturnValue(of([template]));

    await service.loadTemplates();
    expect(service.templates()).toHaveLength(1);

    const result = await service.applyOrderTemplate('tmpl-1');
    expect(result).toEqual(templateItems);
  });

  it('returns empty array for unknown ID', async () => {
    const { service } = createHarness();
    const result = await service.applyOrderTemplate('nonexistent');
    expect(result).toEqual([]);
  });
});
