import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '@services/device';
import { PlatformService } from '@services/platform';
import { PrinterService } from '@services/printer';
import { StationService } from '@services/station';
import { MenuService } from '@services/menu';
import { PaymentConnectService, ConnectStatus } from '@services/payment-connect';
import { PrinterSettings } from '../printer-settings';
import { StationSettings } from '../station-settings';
import {
  DeviceHubTab,
  DeviceType,
  DeviceFormData,
  Device,
  DeviceMode,
  DeviceModeFormData,
  DeviceModeSettings,
  PrinterProfile,
  PrinterProfileFormData,
  PrintJobType,
  PrintRoutingRule,
  PeripheralType,
  PeripheralConnectionType,
  PeripheralDevice,
  KioskProfile,
  KioskProfileFormData,
  CustomerDisplayConfig,
  HardwareProduct,
  HardwareCategory,
  HardwareChecklist,
  defaultModeSettings,
  defaultModeSettingsForPosMode,
  defaultCustomerDisplayConfig,
} from '@models/index';
import type { DevicePosMode } from '@models/index';

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  pos_terminal: 'POS Terminal',
  kds_station: 'KDS Station',
  kiosk: 'Kiosk',
  order_pad: 'Order Pad',
  printer_station: 'Printer Station',
};

const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
  pos_terminal: 'bi-tv',
  kds_station: 'bi-display',
  kiosk: 'bi-phone',
  order_pad: 'bi-tablet',
  printer_station: 'bi-printer',
};

const PRINT_JOB_LABELS: Record<PrintJobType, string> = {
  customer_receipt: 'Customer Receipt',
  kitchen_ticket: 'Kitchen Ticket',
  bar_ticket: 'Bar Ticket',
  expo_ticket: 'Expo Ticket',
  order_summary: 'Order Summary',
  close_of_day: 'Close of Day',
};

const PERIPHERAL_TYPE_LABELS: Record<PeripheralType, string> = {
  cash_drawer: 'Cash Drawer',
  barcode_scanner: 'Barcode Scanner',
  card_reader: 'Card Reader',
  customer_display: 'Customer Display',
  scale: 'Scale',
};

const PERIPHERAL_TYPE_ICONS: Record<PeripheralType, string> = {
  cash_drawer: 'bi-box-seam',
  barcode_scanner: 'bi-upc-scan',
  card_reader: 'bi-credit-card',
  customer_display: 'bi-display',
  scale: 'bi-speedometer',
};

const HARDWARE_CATEGORY_LABELS: Record<HardwareCategory, string> = {
  tablet: 'Tablets & Terminals',
  card_reader: 'Card Readers',
  receipt_printer: 'Receipt Printers',
  cash_drawer: 'Cash Drawers',
  kitchen_display: 'Kitchen Displays',
  barcode_scanner: 'Barcode Scanners',
  label_printer: 'Label Printers',
  customer_display: 'Customer Displays',
};

const HARDWARE_CATEGORY_ICONS: Record<HardwareCategory, string> = {
  tablet: 'bi-tablet-landscape',
  card_reader: 'bi-credit-card',
  receipt_printer: 'bi-printer',
  cash_drawer: 'bi-box-seam',
  kitchen_display: 'bi-display',
  barcode_scanner: 'bi-upc-scan',
  label_printer: 'bi-tag',
  customer_display: 'bi-tv',
};

const HARDWARE_CATALOG: HardwareProduct[] = [
  // --- Tablets ---
  {
    id: 'ipad-10',
    name: 'iPad (10th generation)',
    category: 'tablet',
    tier: 'better',
    price: 349,
    description: '10.9" Retina display, A14 chip, USB-C. The most popular POS tablet.',
    whyRecommended: 'Best all-around tablet for POS, KDS, and customer display',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    icon: 'bi-tablet-landscape',
  },
  {
    id: 'ipad-mini',
    name: 'iPad mini (7th generation)',
    category: 'tablet',
    tier: 'best',
    price: 499,
    description: '8.3" Liquid Retina, A17 Pro chip. Compact and powerful for tableside service.',
    whyRecommended: 'Perfect for servers taking orders tableside',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad-mini',
    icon: 'bi-tablet',
  },
  {
    id: 'galaxy-tab-a9',
    name: 'Samsung Galaxy Tab A9+',
    category: 'tablet',
    tier: 'good',
    price: 219,
    description: '11" LCD, 4GB RAM, long battery life. Budget-friendly Android option.',
    whyRecommended: 'Affordable option for businesses on a budget',
    processorCompat: 'universal',
    buyUrl: 'https://www.samsung.com/us/tablets/galaxy-tab-a9-plus/',
    icon: 'bi-tablet-landscape',
  },
  {
    id: 'fire-hd-10',
    name: 'Amazon Fire HD 10',
    category: 'tablet',
    tier: 'good',
    price: 139,
    description: '10.1" display, octa-core, 3GB RAM. Great for dedicated KDS screens.',
    whyRecommended: 'Best value for a dedicated kitchen display or kiosk',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BHZT5S12',
    icon: 'bi-display',
  },
  // --- Card Readers ---
  {
    id: 'stripe-s700',
    name: 'Stripe Reader S700',
    category: 'card_reader',
    tier: 'best',
    price: 349,
    description: 'Countertop reader with touchscreen. Tap, chip, and swipe. WiFi + Ethernet.',
    whyRecommended: 'Full-featured countertop terminal with built-in display for tips',
    processorCompat: 'stripe',
    buyUrl: 'https://stripe.com/terminal/readers/s700',
    icon: 'bi-credit-card',
  },
  {
    id: 'stripe-m2',
    name: 'Stripe Reader M2',
    category: 'card_reader',
    tier: 'good',
    price: 59,
    description: 'Mobile Bluetooth reader. Tap and chip. Compact and portable.',
    whyRecommended: 'Portable and affordable — great for tableside, events, or food trucks',
    processorCompat: 'stripe',
    buyUrl: 'https://stripe.com/terminal/readers/m2',
    icon: 'bi-credit-card',
  },
  {
    id: 'zettle-reader-2',
    name: 'PayPal Zettle Reader 2',
    category: 'card_reader',
    tier: 'good',
    price: 29,
    description: 'Bluetooth card reader. Tap, chip, and contactless. Accepts PayPal and Venmo.',
    whyRecommended: 'Lowest cost reader — accepts PayPal, Venmo, Apple Pay, Google Pay',
    processorCompat: 'paypal',
    buyUrl: 'https://www.zettle.com/us/card-reader',
    icon: 'bi-credit-card',
  },
  {
    id: 'zettle-terminal',
    name: 'PayPal Zettle Terminal',
    category: 'card_reader',
    tier: 'better',
    price: 199,
    description: 'Standalone terminal with 5.5" touchscreen, receipt printer, and barcode scanner.',
    whyRecommended: 'All-in-one terminal — no tablet needed for simple setups',
    processorCompat: 'paypal',
    buyUrl: 'https://www.zettle.com/us/terminal',
    icon: 'bi-phone',
  },
  // --- Receipt Printers ---
  {
    id: 'star-tsp143iv',
    name: 'Star Micronics TSP143IV',
    category: 'receipt_printer',
    tier: 'best',
    price: 399,
    description: 'WiFi + USB thermal receipt printer. 250mm/sec print speed. Auto-cutter.',
    whyRecommended: 'Industry standard — fast, reliable, supports WebSocket printing',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0C2QH5B8T',
    icon: 'bi-printer',
  },
  {
    id: 'epson-tm-m30iii',
    name: 'Epson TM-m30III',
    category: 'receipt_printer',
    tier: 'better',
    price: 349,
    description: 'Compact WiFi/Bluetooth thermal printer. 200mm/sec. Top or front exit.',
    whyRecommended: 'Compact design — fits tight counter spaces',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BNKXT7JF',
    icon: 'bi-printer',
  },
  {
    id: 'star-sm-l200',
    name: 'Star Micronics SM-L200',
    category: 'receipt_printer',
    tier: 'good',
    price: 259,
    description: 'Portable Bluetooth thermal printer. 2" receipts. Rechargeable battery.',
    whyRecommended: 'Portable — great for tableside, food trucks, and catering',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B071RDNCWJ',
    icon: 'bi-printer',
  },
  // --- Cash Drawers ---
  {
    id: 'apg-vasario-1616',
    name: 'APG Vasario 1616',
    category: 'cash_drawer',
    tier: 'better',
    price: 99,
    description: '16" x 16" steel cash drawer. 5 bill / 5 coin slots. Printer-driven kick.',
    whyRecommended: 'Compact and reliable — auto-opens when receipt prints',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00ECCMLIS',
    icon: 'bi-box-seam',
  },
  {
    id: 'star-smd2',
    name: 'Star Micronics SMD2',
    category: 'cash_drawer',
    tier: 'good',
    price: 79,
    description: '13" compact cash drawer. 4 bill / 4 coin slots. DK port connection.',
    whyRecommended: 'Budget-friendly for small counters',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00F3N9GTS',
    icon: 'bi-box-seam',
  },
  {
    id: 'apg-vasario-1820',
    name: 'APG Vasario 1820',
    category: 'cash_drawer',
    tier: 'best',
    price: 139,
    description: '18" x 20" full-size cash drawer. 5 bill / 8 coin slots. Heavy duty.',
    whyRecommended: 'Full-size drawer for high-volume cash businesses',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00ECCLYLQ',
    icon: 'bi-box-seam',
  },
  // --- Kitchen Displays ---
  {
    id: 'fire-tv-stick',
    name: 'Amazon Fire TV Stick 4K + Any TV',
    category: 'kitchen_display',
    tier: 'good',
    price: 49,
    description: 'Run KDS on any TV or monitor via Fire TV Stick in kiosk mode.',
    whyRecommended: 'Cheapest option — use any existing TV as a kitchen display',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0CX5168R2',
    icon: 'bi-display',
  },
  {
    id: 'elo-touch-15',
    name: 'Elo 15" I-Series Touchscreen',
    category: 'kitchen_display',
    tier: 'best',
    price: 899,
    description: '15.6" commercial-grade touchscreen with Android. IP54 rated for kitchen use.',
    whyRecommended: 'Commercial-grade — designed for hot, greasy kitchen environments',
    processorCompat: 'universal',
    buyUrl: 'https://www.elotouch.com/i-series-4',
    icon: 'bi-display',
  },
  {
    id: 'lg-monitor-24',
    name: 'LG 24" IPS Monitor',
    category: 'kitchen_display',
    tier: 'better',
    price: 149,
    description: '24" IPS display, HDMI. Wall-mountable. Pair with Fire TV Stick or mini PC.',
    whyRecommended: 'Good mid-range option — large screen, easy wall mount',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BX2GJG3V',
    icon: 'bi-display',
  },
  // --- Barcode Scanners ---
  {
    id: 'socket-s740',
    name: 'Socket Mobile S740',
    category: 'barcode_scanner',
    tier: 'best',
    price: 399,
    description: 'Bluetooth 1D/2D barcode scanner. iOS/Android/Windows. All-day battery.',
    whyRecommended: 'Premium scanner — fast, accurate, works with any device',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BQ62BKM8',
    icon: 'bi-upc-scan',
  },
  {
    id: 'tera-hw0002',
    name: 'Tera HW0002 USB Scanner',
    category: 'barcode_scanner',
    tier: 'good',
    price: 39,
    description: 'Wired USB 1D/2D barcode scanner. Plug and play. Ergonomic design.',
    whyRecommended: 'Budget-friendly — plug in and start scanning',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B083QK93CL',
    icon: 'bi-upc-scan',
  },
  {
    id: 'netum-c750',
    name: 'NETUM C750 Bluetooth Scanner',
    category: 'barcode_scanner',
    tier: 'better',
    price: 59,
    description: 'Wireless Bluetooth 1D/2D scanner. 100m range. USB charging.',
    whyRecommended: 'Wireless freedom at a budget price',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B08HCBZYDB',
    icon: 'bi-upc-scan',
  },
  // --- Label Printers ---
  {
    id: 'dymo-450',
    name: 'DYMO LabelWriter 450',
    category: 'label_printer',
    tier: 'good',
    price: 79,
    description: 'Direct thermal label printer. USB. Prints up to 51 labels/minute.',
    whyRecommended: 'Great for product labels and price tags',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B01DPC4BIG',
    icon: 'bi-tag',
  },
  {
    id: 'zebra-zd421',
    name: 'Zebra ZD421',
    category: 'label_printer',
    tier: 'best',
    price: 399,
    description: 'Commercial thermal label printer. WiFi/Bluetooth/USB. 4" labels.',
    whyRecommended: 'Commercial-grade — fast, supports barcode and shelf labels',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B09SZHCLYP',
    icon: 'bi-tag',
  },
  // --- Customer Displays ---
  {
    id: 'ipad-customer-display',
    name: 'iPad (10th gen) + Stand',
    category: 'customer_display',
    tier: 'better',
    price: 399,
    description: 'Use a second iPad as a customer-facing display with checkout and tip prompt.',
    whyRecommended: 'Dual-screen setup — customers see their order and tip on a separate screen',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    icon: 'bi-tv',
  },
  {
    id: 'elo-customer-facing',
    name: 'Elo 10" Customer-Facing Display',
    category: 'customer_display',
    tier: 'best',
    price: 549,
    description: '10.1" touchscreen, pole-mounted. Shows order, loyalty, and tip prompt.',
    whyRecommended: 'Purpose-built customer display — pole-mounted for countertop use',
    processorCompat: 'universal',
    buyUrl: 'https://www.elotouch.com/customer-facing-display',
    icon: 'bi-tv',
  },
];

@Component({
  selector: 'os-device-hub',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, CurrencyPipe, FormsModule, PrinterSettings, StationSettings],
  templateUrl: './device-hub.html',
  styleUrl: './device-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHub implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly printerService = inject(PrinterService);
  private readonly stationService = inject(StationService);
  private readonly menuService = inject(MenuService);
  private readonly connectService = inject(PaymentConnectService);

  // --- Tab state ---
  readonly activeTab = signal<DeviceHubTab>('devices');

  // --- Data from services ---
  readonly devices = this.deviceService.devices;
  readonly modes = this.deviceService.modes;
  readonly printerProfiles = this.deviceService.printerProfiles;
  readonly peripherals = this.deviceService.peripherals;
  readonly kioskProfiles = this.deviceService.kioskProfiles;
  readonly printers = this.printerService.printers;
  readonly stations = this.stationService.stations;
  readonly categories = this.menuService.categories;
  readonly isLoading = this.deviceService.isLoading;
  readonly error = this.deviceService.error;

  // --- Computed ---
  readonly activeDevices = this.deviceService.activeDevices;
  readonly pendingDevices = this.deviceService.pendingDevices;
  readonly healthSummary = this.deviceService.deviceHealthSummary;

  readonly showKioskTab = computed(() => {
    const profile = this.platformService.merchantProfile();
    if (!profile) return true;
    return profile.verticals.some(v => v === 'food_and_drink' || v === 'retail');
  });

  readonly tabs = computed<{ key: DeviceHubTab; label: string; icon: string }[]>(() => {
    const base: { key: DeviceHubTab; label: string; icon: string }[] = [
      { key: 'devices', label: 'Devices', icon: 'bi-cpu' },
      { key: 'modes', label: 'Modes', icon: 'bi-sliders' },
      { key: 'printer-profiles', label: 'Printer Profiles', icon: 'bi-printer' },
      { key: 'peripherals', label: 'Peripherals', icon: 'bi-usb-drive' },
    ];
    if (this.showKioskTab()) {
      base.push({ key: 'kiosk-profiles', label: 'Kiosk Profiles', icon: 'bi-phone' });
    }
    base.push({ key: 'hardware-recs', label: 'Recommended Hardware', icon: 'bi-bag-check' });
    return base;
  });

  readonly kdsDevices = computed(() =>
    this.activeDevices().filter(d => d.deviceType === 'kds_station')
  );

  readonly unassignedStations = computed(() =>
    this.stations().filter(s => !s.boundDeviceId)
  );

  // --- Hardware Recommendations ---

  readonly stripeStatus = this.connectService.stripeStatus;
  readonly paypalStatus = this.connectService.paypalStatus;

  readonly connectedProcessor = computed<'stripe' | 'paypal' | 'none'>(() => {
    if (this.stripeStatus() === 'connected') return 'stripe';
    if (this.paypalStatus() === 'connected') return 'paypal';
    return 'none';
  });

  readonly hwFilterCategory = signal<HardwareCategory | 'all'>('all');

  readonly hardwareChecklist = computed<HardwareChecklist[]>(() => {
    const isRetail = this.platformService.isRetailMode();
    const isService = this.platformService.isServiceMode();
    const isRestaurant = this.platformService.isRestaurantMode();
    const mode = this.platformService.currentDeviceMode();

    const checklist: HardwareChecklist[] = [
      { category: 'tablet', label: 'Tablet or terminal', icon: 'bi-tablet-landscape', required: true },
      { category: 'card_reader', label: 'Card reader', icon: 'bi-credit-card', required: true },
      { category: 'receipt_printer', label: 'Receipt printer', icon: 'bi-printer', required: true },
    ];

    if (isRetail || mode === 'quick_service') {
      checklist.push({ category: 'cash_drawer', label: 'Cash drawer', icon: 'bi-box-seam', required: false });
    }

    if (isRestaurant && (mode === 'full_service' || mode === 'bar')) {
      checklist.push({ category: 'kitchen_display', label: 'Kitchen display', icon: 'bi-display', required: false });
      checklist.push({ category: 'customer_display', label: 'Customer display', icon: 'bi-tv', required: false });
    }

    if (mode === 'quick_service') {
      checklist.push({ category: 'customer_display', label: 'Customer display', icon: 'bi-tv', required: false });
    }

    if (isRetail) {
      checklist.push({ category: 'barcode_scanner', label: 'Barcode scanner', icon: 'bi-upc-scan', required: false });
      checklist.push({ category: 'label_printer', label: 'Label printer', icon: 'bi-tag', required: false });
    }

    if (isService) {
      // Services mode: minimal setup — just tablet + card reader + printer (already in base)
    }

    return checklist;
  });

  readonly relevantCategories = computed<HardwareCategory[]>(() =>
    this.hardwareChecklist().map(c => c.category)
  );

  readonly filteredProducts = computed<HardwareProduct[]>(() => {
    const processor = this.connectedProcessor();
    const relevant = this.relevantCategories();
    const filterCat = this.hwFilterCategory();

    return HARDWARE_CATALOG.filter(p => {
      // Filter by relevant categories for this mode
      if (!relevant.includes(p.category)) return false;

      // Filter by selected category
      if (filterCat !== 'all' && p.category !== filterCat) return false;

      // Filter by processor compatibility
      if (processor !== 'none' && p.processorCompat !== 'universal' && p.processorCompat !== 'both' && p.processorCompat !== processor) {
        return false;
      }

      return true;
    });
  });

  readonly productsByCategory = computed(() => {
    const products = this.filteredProducts();
    const groups: { category: HardwareCategory; label: string; icon: string; products: HardwareProduct[] }[] = [];

    for (const cat of this.relevantCategories()) {
      const catProducts = products.filter(p => p.category === cat);
      if (catProducts.length > 0) {
        groups.push({
          category: cat,
          label: HARDWARE_CATEGORY_LABELS[cat],
          icon: HARDWARE_CATEGORY_ICONS[cat],
          products: catProducts.sort((a, b) => {
            const tierOrder = { good: 0, better: 1, best: 2 };
            return tierOrder[a.tier] - tierOrder[b.tier];
          }),
        });
      }
    }

    return groups;
  });

  readonly hwCategoryLabels = HARDWARE_CATEGORY_LABELS;
  readonly hwCategoryIcons = HARDWARE_CATEGORY_ICONS;

  setHwFilter(category: HardwareCategory | 'all'): void {
    this.hwFilterCategory.set(category);
  }

  getTierLabel(tier: 'good' | 'better' | 'best'): string {
    return tier === 'good' ? 'Good' : tier === 'better' ? 'Better' : 'Best';
  }

  getTierClass(tier: 'good' | 'better' | 'best'): string {
    return `tier-${tier}`;
  }

  getCompatLabel(compat: string): string {
    if (compat === 'stripe') return 'Stripe';
    if (compat === 'paypal') return 'PayPal';
    if (compat === 'both') return 'Stripe & PayPal';
    return 'Any Processor';
  }

  // --- Device code generation ---
  readonly showCodeForm = signal(false);
  readonly newDeviceName = signal('');
  readonly newDeviceType = signal<DeviceType>('pos_terminal');
  readonly generatedCode = signal<string | null>(null);
  readonly codeExpiry = signal<string | null>(null);

  // --- Mode editing ---
  readonly showModeForm = signal(false);
  readonly editingMode = signal<DeviceMode | null>(null);
  readonly modeFormName = signal('');
  readonly modeFormType = signal<DeviceType>('pos_terminal');
  readonly modeFormSettings = signal<DeviceModeSettings>(defaultModeSettings());
  readonly modeFormPosMode = signal<DevicePosMode>('full_service');

  // --- Printer profile editing ---
  readonly showProfileForm = signal(false);
  readonly editingProfile = signal<PrinterProfile | null>(null);
  readonly profileFormName = signal('');
  readonly profileFormRules = signal<PrintRoutingRule[]>([]);

  // --- Peripheral registration ---
  readonly showPeripheralForm = signal(false);
  readonly peripheralParentDevice = signal('');
  readonly peripheralType = signal<PeripheralType>('cash_drawer');
  readonly peripheralName = signal('');
  readonly peripheralConnection = signal<PeripheralConnectionType>('usb');

  // --- Peripheral config ---
  readonly peripheralTestResult = signal<{ id: string; result: string } | null>(null);

  // --- Kiosk profile editing ---
  readonly showKioskForm = signal(false);
  readonly editingKiosk = signal<KioskProfile | null>(null);
  readonly kioskFormName = signal('');
  readonly kioskFormWelcome = signal('Welcome! Place your order here.');
  readonly kioskFormShowImages = signal(true);
  readonly kioskFormRequireName = signal(false);
  readonly kioskFormTimeout = signal(120);
  readonly kioskFormAccessibility = signal(false);
  readonly kioskFormPrimaryColor = signal('#006aff');
  readonly kioskFormAccentColor = signal('#22c55e');
  readonly kioskFormCategories = signal<string[]>([]);
  readonly kioskFormCategoryOrder = signal<string[]>([]);
  readonly showKioskPreview = signal(false);

  // --- Confirm dialogs ---
  readonly confirmRevokeId = signal<string | null>(null);
  readonly confirmDeleteModeId = signal<string | null>(null);

  // --- Labels ---
  readonly deviceTypeLabels = DEVICE_TYPE_LABELS;
  readonly deviceTypeIcons = DEVICE_TYPE_ICONS;
  readonly printJobLabels = PRINT_JOB_LABELS;
  readonly peripheralTypeLabels = PERIPHERAL_TYPE_LABELS;
  readonly peripheralTypeIcons = PERIPHERAL_TYPE_ICONS;
  readonly deviceTypes: DeviceType[] = ['pos_terminal', 'kds_station', 'kiosk', 'order_pad', 'printer_station'];
  readonly printJobTypes: PrintJobType[] = ['customer_receipt', 'kitchen_ticket', 'bar_ticket', 'expo_ticket', 'order_summary', 'close_of_day'];
  readonly peripheralTypes: PeripheralType[] = ['cash_drawer', 'barcode_scanner', 'card_reader', 'customer_display', 'scale'];
  readonly connectionTypes: PeripheralConnectionType[] = ['usb', 'bluetooth', 'network'];
  readonly availableModes = this.platformService.availableModes;

  ngOnInit(): void {
    this.deviceService.loadDevices();
    this.deviceService.loadModes();
    this.deviceService.loadPrinterProfiles();
    this.deviceService.loadPeripherals();
    this.deviceService.loadKioskProfiles();
    this.stationService.loadStations();
    this.menuService.loadMenu();
  }

  setTab(tab: DeviceHubTab): void {
    this.activeTab.set(tab);
  }

  // === Device Code Generation ===

  openCodeForm(): void {
    this.showCodeForm.set(true);
    this.newDeviceName.set('');
    this.newDeviceType.set('pos_terminal');
    this.generatedCode.set(null);
    this.codeExpiry.set(null);
  }

  closeCodeForm(): void {
    this.showCodeForm.set(false);
  }

  async generateCode(): Promise<void> {
    const data: DeviceFormData = {
      deviceName: this.newDeviceName() || 'New Device',
      deviceType: this.newDeviceType(),
    };
    const device = await this.deviceService.generateDeviceCode(data);
    if (device) {
      this.generatedCode.set(device.deviceCode);
      this.codeExpiry.set(device.expiresAt);
    }
  }

  copyCode(): void {
    const code = this.generatedCode();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  // === Device Actions ===

  confirmRevoke(id: string): void {
    this.confirmRevokeId.set(id);
  }

  cancelRevoke(): void {
    this.confirmRevokeId.set(null);
  }

  async revokeDevice(): Promise<void> {
    const id = this.confirmRevokeId();
    if (!id) return;
    await this.deviceService.revokeDevice(id);
    this.confirmRevokeId.set(null);
  }

  // === Station-Device Binding (Step 11) ===

  getStationForDevice(deviceId: string): string {
    const station = this.stations().find(s => s.boundDeviceId === deviceId);
    return station?.id ?? '';
  }

  async assignStation(deviceId: string, stationId: string): Promise<void> {
    const oldStation = this.stations().find(s => s.boundDeviceId === deviceId);
    if (oldStation) {
      await this.stationService.updateStation(oldStation.id, { boundDeviceId: null });
    }
    if (stationId) {
      await this.stationService.updateStation(stationId, { boundDeviceId: deviceId });
    }
  }

  // === Mode CRUD ===

  openModeForm(mode?: DeviceMode): void {
    this.showModeForm.set(true);
    if (mode) {
      this.editingMode.set(mode);
      this.modeFormName.set(mode.name);
      this.modeFormType.set(mode.deviceType);
      this.modeFormSettings.set(structuredClone(mode.settings));
    } else {
      this.editingMode.set(null);
      this.modeFormName.set('');
      this.modeFormType.set('pos_terminal');
      this.modeFormSettings.set(defaultModeSettings());
    }
  }

  closeModeForm(): void {
    this.showModeForm.set(false);
    this.editingMode.set(null);
  }

  onPosModeChange(posMode: DevicePosMode): void {
    this.modeFormPosMode.set(posMode);
    this.modeFormSettings.set(defaultModeSettingsForPosMode(posMode));
  }

  async saveMode(): Promise<void> {
    const data: DeviceModeFormData = {
      name: this.modeFormName(),
      deviceType: this.modeFormType(),
      settings: this.modeFormSettings(),
    };

    const existing = this.editingMode();
    if (existing) {
      await this.deviceService.updateMode(existing.id, data);
    } else {
      await this.deviceService.createMode(data);
    }
    this.closeModeForm();
  }

  confirmDeleteMode(id: string): void {
    this.confirmDeleteModeId.set(id);
  }

  cancelDeleteMode(): void {
    this.confirmDeleteModeId.set(null);
  }

  async deleteMode(): Promise<void> {
    const id = this.confirmDeleteModeId();
    if (!id) return;
    await this.deviceService.deleteMode(id);
    this.confirmDeleteModeId.set(null);
  }

  // === Printer Profile CRUD ===

  openProfileForm(profile?: PrinterProfile): void {
    this.showProfileForm.set(true);
    if (profile) {
      this.editingProfile.set(profile);
      this.profileFormName.set(profile.name);
      this.profileFormRules.set(structuredClone(profile.routingRules));
    } else {
      this.editingProfile.set(null);
      this.profileFormName.set('');
      this.profileFormRules.set(
        this.printJobTypes.map(jobType => ({
          jobType,
          printerId: '',
          copies: 1,
          enabled: false,
        }))
      );
    }
  }

  closeProfileForm(): void {
    this.showProfileForm.set(false);
    this.editingProfile.set(null);
  }

  updateRule(index: number, field: keyof PrintRoutingRule, value: unknown): void {
    this.profileFormRules.update(rules => {
      const updated = [...rules];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async saveProfile(): Promise<void> {
    const data: PrinterProfileFormData = {
      name: this.profileFormName(),
      routingRules: this.profileFormRules(),
    };

    const existing = this.editingProfile();
    if (existing) {
      await this.deviceService.updatePrinterProfile(existing.id, data);
    } else {
      await this.deviceService.createPrinterProfile(data);
    }
    this.closeProfileForm();
  }

  async deleteProfile(id: string): Promise<void> {
    await this.deviceService.deletePrinterProfile(id);
  }

  // === Peripheral Registration ===

  openPeripheralForm(): void {
    this.showPeripheralForm.set(true);
    this.peripheralParentDevice.set('');
    this.peripheralType.set('cash_drawer');
    this.peripheralName.set('');
    this.peripheralConnection.set('usb');
  }

  closePeripheralForm(): void {
    this.showPeripheralForm.set(false);
  }

  async registerPeripheral(): Promise<void> {
    await this.deviceService.registerPeripheral({
      parentDeviceId: this.peripheralParentDevice(),
      type: this.peripheralType(),
      name: this.peripheralName() || this.peripheralTypeLabels[this.peripheralType()],
      connectionType: this.peripheralConnection(),
    });
    this.closePeripheralForm();
  }

  async removePeripheral(id: string): Promise<void> {
    await this.deviceService.removePeripheral(id);
  }

  // === Peripheral Config (Step 12) ===

  testPeripheral(peripheral: PeripheralDevice): void {
    this.peripheralTestResult.set({ id: peripheral.id, result: 'testing' });
    setTimeout(() => {
      this.peripheralTestResult.set({ id: peripheral.id, result: 'success' });
      setTimeout(() => this.peripheralTestResult.set(null), 3000);
    }, 1500);
  }

  getTestResult(peripheralId: string): string | null {
    const result = this.peripheralTestResult();
    if (result?.id === peripheralId) return result.result;
    return null;
  }

  getPeripheralIcon(type: PeripheralType): string {
    return this.peripheralTypeIcons[type];
  }

  // === Kiosk Profile CRUD (Step 13) ===

  openKioskForm(profile?: KioskProfile): void {
    this.showKioskForm.set(true);
    if (profile) {
      this.editingKiosk.set(profile);
      this.kioskFormName.set(profile.name);
      this.kioskFormWelcome.set(profile.welcomeMessage);
      this.kioskFormShowImages.set(profile.showImages);
      this.kioskFormRequireName.set(profile.requireNameForOrder);
      this.kioskFormTimeout.set(profile.maxIdleSeconds);
      this.kioskFormAccessibility.set(profile.enableAccessibility);
      this.kioskFormPrimaryColor.set(profile.brandingPrimaryColor);
      this.kioskFormAccentColor.set(profile.brandingAccentColor);
      this.kioskFormCategories.set([...profile.enabledCategories]);
      this.kioskFormCategoryOrder.set([...profile.categoryDisplayOrder]);
    } else {
      this.editingKiosk.set(null);
      this.kioskFormName.set('');
      this.kioskFormWelcome.set('Welcome! Place your order here.');
      this.kioskFormShowImages.set(true);
      this.kioskFormRequireName.set(false);
      this.kioskFormTimeout.set(120);
      this.kioskFormAccessibility.set(false);
      this.kioskFormPrimaryColor.set('#006aff');
      this.kioskFormAccentColor.set('#22c55e');
      this.kioskFormCategories.set(this.categories().map(c => c.id));
      this.kioskFormCategoryOrder.set(this.categories().map(c => c.id));
    }
  }

  closeKioskForm(): void {
    this.showKioskForm.set(false);
    this.editingKiosk.set(null);
    this.showKioskPreview.set(false);
  }

  toggleKioskCategory(categoryId: string): void {
    this.kioskFormCategories.update(ids => {
      if (ids.includes(categoryId)) {
        return ids.filter(id => id !== categoryId);
      }
      return [...ids, categoryId];
    });
  }

  moveCategoryUp(index: number): void {
    if (index <= 0) return;
    this.kioskFormCategoryOrder.update(order => {
      const updated = [...order];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
  }

  moveCategoryDown(index: number): void {
    const order = this.kioskFormCategoryOrder();
    if (index >= order.length - 1) return;
    this.kioskFormCategoryOrder.update(o => {
      const updated = [...o];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? 'Unknown';
  }

  toggleKioskPreview(): void {
    this.showKioskPreview.update(v => !v);
  }

  async saveKioskProfile(): Promise<void> {
    const data: KioskProfileFormData = {
      name: this.kioskFormName(),
      welcomeMessage: this.kioskFormWelcome(),
      showImages: this.kioskFormShowImages(),
      requireNameForOrder: this.kioskFormRequireName(),
      maxIdleSeconds: this.kioskFormTimeout(),
      enableAccessibility: this.kioskFormAccessibility(),
      brandingPrimaryColor: this.kioskFormPrimaryColor(),
      brandingAccentColor: this.kioskFormAccentColor(),
      enabledCategories: this.kioskFormCategories(),
      categoryDisplayOrder: this.kioskFormCategoryOrder(),
    };

    const existing = this.editingKiosk();
    if (existing) {
      await this.deviceService.updateKioskProfile(existing.id, data);
    } else {
      await this.deviceService.createKioskProfile(data);
    }
    this.closeKioskForm();
  }

  async deleteKioskProfile(id: string): Promise<void> {
    await this.deviceService.deleteKioskProfile(id);
  }

  // === Device Health (Step 14) ===

  getRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  getLastSeenClass(dateStr: string | null): string {
    if (!dateStr) return 'text-secondary';
    const minutes = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (minutes < 10) return 'text-success';
    if (minutes < 60) return 'text-warning';
    return 'text-danger';
  }

  // === Helpers ===

  hasPeripherals(deviceId: string): boolean {
    return this.peripherals().some(p => p.parentDeviceId === deviceId);
  }

  getPeripheralsForDevice(deviceId: string): PeripheralDevice[] {
    return this.peripherals().filter(p => p.parentDeviceId === deviceId);
  }

  updateCheckoutSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      checkout: { ...s.checkout, [key]: value },
    }));
  }

  updateReceiptSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      receipt: { ...s.receipt, [key]: value },
    }));
  }

  updateSecuritySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      security: { ...s.security, [key]: value },
    }));
  }

  updateDisplaySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      display: { ...s.display, [key]: value },
    }));
  }

  getModeName(modeId: string | null): string {
    if (!modeId) return 'None';
    return this.modes().find(m => m.id === modeId)?.name ?? 'Unknown';
  }

  getDeviceName(deviceId: string): string {
    return this.devices().find(d => d.id === deviceId)?.deviceName ?? 'Unknown';
  }

  clearError(): void {
    this.deviceService.clearError();
  }

  // --- Customer-Facing Display Config (GAP-R10) ---

  private readonly _customerDisplayConfig = signal<CustomerDisplayConfig>(defaultCustomerDisplayConfig());
  readonly customerDisplayConfig = this._customerDisplayConfig.asReadonly();

  updateCustomerDisplayConfig(field: keyof CustomerDisplayConfig, value: unknown): void {
    this._customerDisplayConfig.update(cfg => ({ ...cfg, [field]: value }));
  }

  updateTipPreset(index: number, value: string): void {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    this._customerDisplayConfig.update(cfg => {
      const presets = [...cfg.tipPresets];
      presets[index] = num;
      return { ...cfg, tipPresets: presets };
    });
  }
}
