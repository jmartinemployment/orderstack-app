import { Component, inject, output, signal, computed, ChangeDetectionStrategy, ElementRef, viewChild, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '@services/cart';
import { AuthService } from '@services/auth';
import { SocketService } from '@services/socket';
import { PaymentService } from '@services/payment';
import { DeliveryService } from '@services/delivery';
import { OrderService } from '@services/order';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { LoyaltyService } from '@services/loyalty';
import { GiftCardService } from '@services/gift-card';
import { Modifier, CustomerInfo, Course, LoyaltyProfile, LoyaltyReward, DeliveryQuote, GiftCardBalanceCheck, getTierLabel, getTierColor, tierMeetsMinimum } from '@models/index';
import {
  DiningOptionType,
  DINING_OPTIONS,
  getDiningOption,
  validateDiningRequirements,
  DeliveryInfo,
  CurbsideInfo,
  CateringInfo,
} from '@models/dining-option.model';
@Component({
  selector: 'os-checkout-modal',
  imports: [CurrencyPipe],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutModal implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly paymentService = inject(PaymentService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly orderService = inject(OrderService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly giftCardService = inject(GiftCardService);

  orderPlaced = output<string>();

  // --- Existing signals ---
  private readonly _isSubmitting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _orderId = signal<string | null>(null);
  private readonly _orderNumber = signal<string | null>(null);
  private readonly _paymentUIReady = signal(false);

  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly error = this._error.asReadonly();
  readonly orderId = this._orderId.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly paymentUIReady = this._paymentUIReady.asReadonly();

  readonly paymentStep = this.paymentService.paymentStep;
  readonly isProcessingPayment = this.paymentService.isProcessing;
  readonly paymentError = this.paymentService.error;

  readonly isOpen = this.cartService.isOpen;
  readonly items = this.cartService.items;
  readonly isEmpty = this.cartService.isEmpty;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly tax = this.cartService.tax;
  readonly tip = this.cartService.tip;
  readonly total = this.cartService.total;

  readonly needsExplicitConfirm = computed(() => this.paymentService.needsExplicitConfirm());

  readonly stripeMount = viewChild<ElementRef>('stripeMount');

  // --- Loyalty ---
  private readonly _loyaltyProfile = signal<LoyaltyProfile | null>(null);
  private readonly _isLookingUpLoyalty = signal(false);
  private readonly _loyaltyLookupDone = signal(false);
  private readonly _pointsToRedeem = signal(0);
  private readonly _loyaltyPhone = signal('');
  private _phoneLookupTimeout: ReturnType<typeof setTimeout> | undefined;

  readonly loyaltyProfile = this._loyaltyProfile.asReadonly();
  readonly isLookingUpLoyalty = this._isLookingUpLoyalty.asReadonly();
  readonly loyaltyLookupDone = this._loyaltyLookupDone.asReadonly();
  readonly pointsToRedeem = this._pointsToRedeem.asReadonly();
  readonly loyaltyPhone = this._loyaltyPhone.asReadonly();

  readonly loyaltyEnabled = computed(() => this.loyaltyService.config().enabled);
  readonly loyaltyDiscount = this.cartService.loyaltyDiscount;

  readonly estimatedPointsEarned = computed(() =>
    this.loyaltyService.calculatePointsForOrder(this.subtotal())
  );

  readonly availableRewards = computed(() => {
    const profile = this._loyaltyProfile();
    if (!profile) return [] as LoyaltyReward[];
    return this.loyaltyService.rewards().filter(r =>
      r.isActive && tierMeetsMinimum(profile.tier, r.minTier) && r.pointsCost <= profile.points
    );
  });

  readonly showLoyaltyPhoneField = computed(() =>
    this.loyaltyEnabled() && !this.selectedDiningOption().requiresCustomer
  );

  // --- Delivery DaaS ---
  private readonly _deliveryQuote = signal<DeliveryQuote | null>(null);
  private readonly _isDispatchingDelivery = signal(false);
  private readonly _deliveryDispatched = signal(false);
  readonly deliveryQuote = this._deliveryQuote.asReadonly();
  readonly isDispatchingDelivery = this._isDispatchingDelivery.asReadonly();
  readonly deliveryDispatched = this._deliveryDispatched.asReadonly();
  readonly deliveryError = this.deliveryService.error;

  // --- Gift Card ---
  private readonly _giftCardCode = signal('');
  private readonly _giftCardBalance = signal<GiftCardBalanceCheck | null>(null);
  private readonly _giftCardAmount = signal(0);
  private readonly _isCheckingGiftCard = signal(false);
  private readonly _giftCardApplied = signal(false);

  readonly giftCardCode = this._giftCardCode.asReadonly();
  readonly giftCardBalance = this._giftCardBalance.asReadonly();
  readonly giftCardAmount = this._giftCardAmount.asReadonly();
  readonly isCheckingGiftCard = this._isCheckingGiftCard.asReadonly();
  readonly giftCardApplied = this._giftCardApplied.asReadonly();

  readonly giftCardDiscount = computed(() => this._giftCardApplied() ? this._giftCardAmount() : 0);

  readonly totalAfterGiftCard = computed(() =>
    Math.max(0, this.total() - this.giftCardDiscount())
  );

  readonly tierLabel = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierLabel(profile.tier) : '';
  });

  readonly tierColor = computed(() => {
    const profile = this._loyaltyProfile();
    return profile ? getTierColor(profile.tier) : '';
  });

  async ngOnInit(): Promise<void> {
    await this.settingsService.loadSettings();

    const processorType = this.settingsService.paymentSettings().processor;
    this.paymentService.setProcessorType(processorType);
    const deliveryProvider = this.settingsService.deliverySettings().provider;
    this.deliveryService.setProviderType(deliveryProvider);
    if (deliveryProvider === 'doordash' || deliveryProvider === 'uber') {
      await this.deliveryService.loadConfigStatus();
    }
    this.loyaltyService.loadConfig();
    this.loyaltyService.loadRewards();
  }

  // --- Dining option ---
  private readonly _diningType = signal<DiningOptionType>('dine-in');
  readonly diningType = this._diningType.asReadonly();

  readonly selectedDiningOption = computed(() => getDiningOption(this._diningType()));

  readonly diningOptionTypes: { type: DiningOptionType; label: string }[] = [
    { type: 'dine-in', label: 'Dine In' },
    { type: 'takeout', label: 'Takeout' },
    { type: 'curbside', label: 'Curbside' },
    { type: 'delivery', label: 'Delivery' },
    { type: 'catering', label: 'Catering' },
  ];

  // --- Dine-in ---
  private readonly _tableNumber = signal('');
  readonly tableNumber = this._tableNumber.asReadonly();

  // --- Customer info ---
  private readonly _firstName = signal('');
  private readonly _lastName = signal('');
  private readonly _phone = signal('');
  private readonly _email = signal('');
  readonly firstName = this._firstName.asReadonly();
  readonly lastName = this._lastName.asReadonly();
  readonly phone = this._phone.asReadonly();
  readonly email = this._email.asReadonly();

  // --- Delivery info ---
  private readonly _address = signal('');
  private readonly _address2 = signal('');
  private readonly _city = signal('');
  private readonly _state = signal('');
  private readonly _zip = signal('');
  private readonly _deliveryNotes = signal('');
  readonly address = this._address.asReadonly();
  readonly address2 = this._address2.asReadonly();
  readonly city = this._city.asReadonly();
  readonly state = this._state.asReadonly();
  readonly zip = this._zip.asReadonly();
  readonly deliveryNotes = this._deliveryNotes.asReadonly();

  // --- Curbside info ---
  private readonly _vehicleDescription = signal('');
  private readonly _vehicleMake = signal('');
  private readonly _vehicleModel = signal('');
  private readonly _vehicleColor = signal('');
  readonly vehicleDescription = this._vehicleDescription.asReadonly();
  readonly vehicleMake = this._vehicleMake.asReadonly();
  readonly vehicleModel = this._vehicleModel.asReadonly();
  readonly vehicleColor = this._vehicleColor.asReadonly();

  // --- Catering info ---
  private readonly _eventDate = signal('');
  private readonly _eventTime = signal('');
  private readonly _headcount = signal(0);
  private readonly _eventType = signal('');
  private readonly _setupRequired = signal(false);
  private readonly _depositAmount = signal(0);
  readonly eventDate = this._eventDate.asReadonly();
  readonly eventTime = this._eventTime.asReadonly();
  readonly headcount = this._headcount.asReadonly();
  readonly eventType = this._eventType.asReadonly();
  readonly setupRequired = this._setupRequired.asReadonly();
  readonly depositAmount = this._depositAmount.asReadonly();

  // --- Scheduled orders ---
  private readonly _promisedDate = signal('');
  readonly promisedDate = this._promisedDate.asReadonly();

  // --- Course assignment (dine-in only) ---
  private readonly _courseAssignments = signal<Map<string, string>>(new Map());
  readonly courseAssignments = this._courseAssignments.asReadonly();

  readonly courseOptions: { value: string; label: string }[] = [
    { value: '', label: 'No Course' },
    { value: 'course-1', label: 'Course 1' },
    { value: 'course-2', label: 'Course 2' },
    { value: 'course-3', label: 'Course 3' },
  ];

  readonly showCourseAssignment = computed(() =>
    this._diningType() === 'dine-in' && !this.isEmpty()
  );

  getCourseForItem(itemId: string): string {
    return this._courseAssignments().get(itemId) ?? '';
  }

  onCourseAssign(itemId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this._courseAssignments.update(map => {
      const updated = new Map(map);
      if (value) {
        updated.set(itemId, value);
      } else {
        updated.delete(itemId);
      }
      return updated;
    });
  }

  private buildCourses(): Course[] {
    const assignments = this._courseAssignments();
    const courseMap = new Map<string, Course>();

    for (const [, courseValue] of assignments) {
      if (courseValue && !courseMap.has(courseValue)) {
        const opt = this.courseOptions.find(o => o.value === courseValue);
        const sortOrder = courseValue === 'course-1' ? 1 : courseValue === 'course-2' ? 2 : 3;
        courseMap.set(courseValue, {
          guid: courseValue,
          name: opt?.label ?? courseValue,
          sortOrder,
          fireStatus: sortOrder === 1 ? 'FIRED' : 'PENDING',
        });
      }
    }

    return [...courseMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // --- Validation ---
  private readonly _showValidation = signal(false);
  readonly showValidation = this._showValidation.asReadonly();

  readonly validationResult = computed(() => {
    const type = this._diningType();
    const customer: CustomerInfo | undefined =
      this.selectedDiningOption().requiresCustomer
        ? { firstName: this._firstName().trim(), lastName: this._lastName().trim(), phone: this._phone().trim(), email: this._email().trim() }
        : undefined;

    const deliveryInfo: DeliveryInfo | undefined =
      this.selectedDiningOption().requiresAddress
        ? { address: this._address().trim(), address2: this._address2().trim(), city: this._city().trim(), state: this._state().trim(), zip: this._zip().trim(), deliveryNotes: this._deliveryNotes().trim(), deliveryState: 'PREPARING' }
        : undefined;

    const curbsideInfo: CurbsideInfo | undefined =
      this.selectedDiningOption().requiresVehicle
        ? { vehicleDescription: this._vehicleDescription().trim() }
        : undefined;

    const cateringInfo: CateringInfo | undefined =
      type === 'catering'
        ? { eventDate: this._eventDate() ? new Date(this._eventDate()) : undefined as unknown as Date, eventTime: this._eventTime(), headcount: this._headcount(), setupRequired: this._setupRequired(), depositPaid: false }
        : undefined;

    return validateDiningRequirements(type, {
      tableGuid: type === 'dine-in' ? this._tableNumber().trim() || undefined : undefined,
      customer,
      deliveryInfo,
      curbsideInfo,
      cateringInfo,
    });
  });

  readonly canSubmit = computed(() => {
    if (this.isEmpty()) return false;
    if (this._isSubmitting()) return false;
    return this.validationResult().valid;
  });

  // --- Actions ---

  setDiningType(type: DiningOptionType): void {
    this._diningType.set(type);
    this._error.set(null);
    this._showValidation.set(false);
  }

  close(): void {
    if (this.paymentStep() === 'paying') return;
    this.paymentService.reset();
    this.cartService.close();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._paymentUIReady.set(false);
    this._error.set(null);
    this._showValidation.set(false);
  }

  incrementQuantity(itemId: string): void {
    this.cartService.incrementQuantity(itemId);
  }

  decrementQuantity(itemId: string): void {
    this.cartService.decrementQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  formatModifiers(modifiers: Modifier[]): string {
    return modifiers.map(m => m.name).join(', ');
  }

  // --- Form input handlers ---

  onTableNumberInput(event: Event): void {
    this._tableNumber.set((event.target as HTMLInputElement).value);
    this._error.set(null);
  }

  onFieldInput(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._error.set(null);
    switch (field) {
      case 'firstName': this._firstName.set(value); break;
      case 'lastName': this._lastName.set(value); break;
      case 'phone': this._phone.set(value); this.debouncedLoyaltyLookup(value); break;
      case 'email': this._email.set(value); break;
      case 'address': this._address.set(value); break;
      case 'address2': this._address2.set(value); break;
      case 'city': this._city.set(value); break;
      case 'state': this._state.set(value); break;
      case 'zip': this._zip.set(value); break;
      case 'deliveryNotes': this._deliveryNotes.set(value); break;
      case 'vehicleDescription': this._vehicleDescription.set(value); break;
      case 'vehicleMake': this._vehicleMake.set(value); break;
      case 'vehicleModel': this._vehicleModel.set(value); break;
      case 'vehicleColor': this._vehicleColor.set(value); break;
      case 'eventDate': this._eventDate.set(value); break;
      case 'eventTime': this._eventTime.set(value); break;
      case 'headcount': this._headcount.set(Number.parseInt(value, 10) || 0); break;
      case 'eventType': this._eventType.set(value); break;
      case 'depositAmount': this._depositAmount.set(Number.parseFloat(value) || 0); break;
      case 'promisedDate': this._promisedDate.set(value); break;
    }
  }

  onSetupRequiredChange(event: Event): void {
    this._setupRequired.set((event.target as HTMLInputElement).checked);
  }

  hasValidationError(field: string): boolean {
    if (!this._showValidation()) return false;
    return this.validationResult().missingFields.includes(field);
  }

  // --- Loyalty methods ---

  onLoyaltyPhoneInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._loyaltyPhone.set(value);
    this.debouncedLoyaltyLookup(value);
  }

  onPointsToRedeemInput(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 0;
    const maxPoints = this._loyaltyProfile()?.points ?? 0;
    const clamped = Math.max(0, Math.min(value, maxPoints));
    this._pointsToRedeem.set(clamped);
    const discount = this.loyaltyService.calculateRedemptionDiscount(clamped);
    this.cartService.setLoyaltyRedemption(clamped, discount);
  }

  redeemReward(reward: LoyaltyReward): void {
    this._pointsToRedeem.set(reward.pointsCost);
    const discount = reward.discountType === 'percentage'
      ? Math.round(this.subtotal() * (reward.discountValue / 100) * 100) / 100
      : reward.discountValue;
    this.cartService.setLoyaltyRedemption(reward.pointsCost, discount);
  }

  clearRedemption(): void {
    this._pointsToRedeem.set(0);
    this.cartService.clearLoyaltyRedemption();
  }

  private debouncedLoyaltyLookup(phone: string): void {
    if (this._phoneLookupTimeout) clearTimeout(this._phoneLookupTimeout);
    this._loyaltyProfile.set(null);
    this._loyaltyLookupDone.set(false);
    this._pointsToRedeem.set(0);
    this.cartService.clearLoyaltyRedemption();

    const digits = phone.replaceAll(/\D/g, '');
    if (digits.length < 10) return;

    this._phoneLookupTimeout = setTimeout(async () => {
      this._isLookingUpLoyalty.set(true);
      try {
        const customer = await this.loyaltyService.lookupCustomerByPhone(digits);
        if (customer) {
          const profile = await this.loyaltyService.getCustomerLoyalty(customer.id);
          this._loyaltyProfile.set(profile);
          this.cartService.setEstimatedPointsEarned(this.estimatedPointsEarned());
        }
      } finally {
        this._isLookingUpLoyalty.set(false);
        this._loyaltyLookupDone.set(true);
      }
    }, 500);
  }

  // --- Gift Card methods ---

  onGiftCardCodeInput(event: Event): void {
    this._giftCardCode.set((event.target as HTMLInputElement).value);
    this._giftCardBalance.set(null);
    this._giftCardApplied.set(false);
    this._giftCardAmount.set(0);
  }

  async lookupGiftCard(): Promise<void> {
    const code = this._giftCardCode().trim();
    if (!code) return;

    this._isCheckingGiftCard.set(true);
    const result = await this.giftCardService.checkBalance(code);
    this._isCheckingGiftCard.set(false);

    if (result && result.status === 'active' && result.currentBalance > 0) {
      this._giftCardBalance.set(result);
      const maxApply = Math.min(result.currentBalance, this.total());
      this._giftCardAmount.set(Math.round(maxApply * 100) / 100);
    } else {
      this._giftCardBalance.set(null);
    }
  }

  applyGiftCard(): void {
    if (!this._giftCardBalance()) return;
    this._giftCardApplied.set(true);
  }

  clearGiftCard(): void {
    this._giftCardCode.set('');
    this._giftCardBalance.set(null);
    this._giftCardAmount.set(0);
    this._giftCardApplied.set(false);
  }

  onGiftCardAmountInput(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    const maxBalance = this._giftCardBalance()?.currentBalance ?? 0;
    const maxTotal = this.total();
    this._giftCardAmount.set(Math.max(0, Math.min(value, maxBalance, maxTotal)));
  }

  // --- Submit ---

  async submitOrder(): Promise<void> {
    if (this._isSubmitting()) return;

    this._showValidation.set(true);

    if (!this.validationResult().valid) {
      this._error.set('Please fill in all required fields');
      return;
    }

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const restaurantId = this.authService.selectedRestaurantId();
      const type = this._diningType();
      const option = this.selectedDiningOption();

      // Build course data if dine-in with assignments
      const courses = type === 'dine-in' ? this.buildCourses() : [];
      const courseAssignments = this._courseAssignments();

      // Base order data
      const orderData: Record<string, unknown> = {
        orderType: type === 'takeout' ? 'pickup' : type,
        orderSource: 'pos',
        sourceDeviceId: this.socketService.deviceId(),
        items: this.items().map(item => {
          const courseValue = courseAssignments.get(item.id);
          const course = courseValue ? courses.find(c => c.guid === courseValue) : undefined;
          return {
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
            modifiers: item.selectedModifiers.map(m => ({ modifierId: m.id })),
            ...(course ? { course: { guid: course.guid, name: course.name, sortOrder: course.sortOrder } } : {}),
          };
        }),
      };

      // Include courses array if any were assigned
      if (courses.length > 0) {
        orderData['courses'] = courses;
      }

      // Dine-in: table number
      if (type === 'dine-in') {
        orderData['tableNumber'] = this._tableNumber().trim();
      }

      // Customer info
      if (option.requiresCustomer) {
        orderData['customer'] = {
          firstName: this._firstName().trim(),
          lastName: this._lastName().trim(),
          phone: this._phone().trim(),
          email: this._email().trim(),
        };
      }

      // Delivery info
      if (option.requiresAddress) {
        const deliveryInfo: DeliveryInfo = {
          address: this._address().trim(),
          city: this._city().trim(),
          state: this._state().trim(),
          zip: this._zip().trim(),
          deliveryState: 'PREPARING',
        };
        if (this._address2().trim()) deliveryInfo.address2 = this._address2().trim();
        if (this._deliveryNotes().trim()) deliveryInfo.deliveryNotes = this._deliveryNotes().trim();
        orderData['deliveryInfo'] = deliveryInfo;
      }

      // Curbside info
      if (option.requiresVehicle) {
        const curbsideInfo: CurbsideInfo = {
          vehicleDescription: this._vehicleDescription().trim(),
        };
        if (this._vehicleMake().trim()) curbsideInfo.vehicleMake = this._vehicleMake().trim();
        if (this._vehicleModel().trim()) curbsideInfo.vehicleModel = this._vehicleModel().trim();
        if (this._vehicleColor().trim()) curbsideInfo.vehicleColor = this._vehicleColor().trim();
        orderData['curbsideInfo'] = curbsideInfo;
      }

      // Catering info
      if (type === 'catering') {
        const cateringInfo: CateringInfo = {
          eventDate: new Date(this._eventDate()),
          eventTime: this._eventTime(),
          headcount: this._headcount(),
          setupRequired: this._setupRequired(),
          depositPaid: false,
        };
        if (this._eventType().trim()) cateringInfo.eventType = this._eventType().trim();
        if (this._depositAmount() > 0) cateringInfo.depositAmount = this._depositAmount();
        orderData['cateringInfo'] = cateringInfo;
        orderData['approvalStatus'] = 'NEEDS_APPROVAL';
      }

      // Promised date (scheduled orders)
      if (this._promisedDate()) {
        orderData['promisedDate'] = this._promisedDate();
      }

      // Dining option object
      orderData['diningOption'] = option;

      // Loyalty redemption
      if (this._pointsToRedeem() > 0) {
        orderData['loyaltyPointsRedeemed'] = this._pointsToRedeem();
      }

      // Gift card
      if (this._giftCardApplied() && this._giftCardAmount() > 0) {
        orderData['giftCardCode'] = this._giftCardCode().trim();
        orderData['giftCardAmount'] = this._giftCardAmount();
      }

      const order = await this.orderService.createOrder(orderData);

      if (order) {
        this._orderId.set(order.guid);
        this._orderNumber.set(order.orderNumber);
        this.orderPlaced.emit(order.orderNumber);

        // Redeem gift card after order creation
        if (this._giftCardApplied() && this._giftCardAmount() > 0) {
          await this.giftCardService.redeemGiftCard(
            this._giftCardCode().trim(),
            this._giftCardAmount(),
            order.guid
          );
        }

        // DaaS: request quote + auto-dispatch if delivery order with DaaS configured
        if (type === 'delivery' && this.deliveryService.isConfigured()) {
          if (await this.deliveryService.ensureSelectedProviderConfigured()) {
            await this.handleDeliveryDispatch(order.guid);
          }
        }

        if (this.paymentService.isConfigured()) {
          this.resetForm();
          this.cartService.clear();
          await this.initiatePayment(order.guid, this.total());
        } else {
          this.resetForm();
          this.cartService.clear();
          this.close();
        }
      } else {
        this._error.set('Failed to place order. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as any)?.error?.error ?? 'An error occurred. Please try again.';
      this._error.set(message);
    } finally {
      this._isSubmitting.set(false);
    }
  }

  async confirmPayment(): Promise<void> {
    const success = await this.paymentService.confirmPayment();
    const oId = this._orderId();

    if (success && oId) {
      this.orderPlaced.emit(this._orderNumber() ?? oId);
      this.resetForm();
      this.cartService.clear();
    }
  }

  private async initiatePayment(orderId: string, amount: number): Promise<void> {
    const initiated = await this.paymentService.initiatePayment(orderId, amount);
    if (!initiated) return;

    // Wait one tick for the DOM to render the payment container
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const mountEl = this.stripeMount()?.nativeElement;
    if (mountEl) {
      const mounted = await this.paymentService.mountPaymentUI(mountEl);
      this._paymentUIReady.set(mounted);

      // PayPal: auto-call confirmPayment (blocks until onApprove fires)
      if (!this.paymentService.needsExplicitConfirm()) {
        await this.confirmPayment();
      }
    }
  }

  async cancelPayment(): Promise<void> {
    const oId = this._orderId();
    if (!oId) return;

    await this.paymentService.cancelPayment(oId);
    this.paymentService.reset();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._paymentUIReady.set(false);
  }

  retryPayment(): void {
    this.paymentService.clearError();
    this.paymentService.setStep('paying');

    setTimeout(async () => {
      const mountEl = this.stripeMount()?.nativeElement;
      if (mountEl) {
        const mounted = await this.paymentService.mountPaymentUI(mountEl);
        this._paymentUIReady.set(mounted);

        if (!this.paymentService.needsExplicitConfirm()) {
          await this.confirmPayment();
        }
      }
    }, 50);
  }

  private async handleDeliveryDispatch(orderId: string): Promise<void> {
    const quote = await this.deliveryService.requestQuote(orderId);
    if (!quote) {
      this._error.set('Delivery quote unavailable — driver not dispatched. You can retry from the KDS.');
      return;
    }
    this._deliveryQuote.set(quote);

    const autoDispatch = this.settingsService.deliverySettings().autoDispatch;
    if (autoDispatch) {
      await this.dispatchDelivery(orderId, quote.quoteId);
    }
  }

  async dispatchDelivery(orderId?: string, quoteId?: string): Promise<void> {
    const oId = orderId ?? this._orderId();
    const qId = quoteId ?? this._deliveryQuote()?.quoteId;
    if (!oId || !qId) return;

    this._isDispatchingDelivery.set(true);
    const result = await this.deliveryService.acceptQuote(oId, qId);
    this._isDispatchingDelivery.set(false);

    if (result) {
      this._deliveryDispatched.set(true);
      this._deliveryQuote.set(null);
    }
  }

  private resetForm(): void {
    this._tableNumber.set('');
    this._diningType.set('dine-in');
    this._firstName.set('');
    this._lastName.set('');
    this._phone.set('');
    this._email.set('');
    this._address.set('');
    this._address2.set('');
    this._city.set('');
    this._state.set('');
    this._zip.set('');
    this._deliveryNotes.set('');
    this._vehicleDescription.set('');
    this._vehicleMake.set('');
    this._vehicleModel.set('');
    this._vehicleColor.set('');
    this._eventDate.set('');
    this._eventTime.set('');
    this._headcount.set(0);
    this._eventType.set('');
    this._setupRequired.set(false);
    this._depositAmount.set(0);
    this._promisedDate.set('');
    this._courseAssignments.set(new Map());
    this._showValidation.set(false);
    this._loyaltyProfile.set(null);
    this._loyaltyLookupDone.set(false);
    this._pointsToRedeem.set(0);
    this._loyaltyPhone.set('');
    this.cartService.clearLoyaltyRedemption();
    this._deliveryQuote.set(null);
    this._isDispatchingDelivery.set(false);
    this._deliveryDispatched.set(false);
    this.deliveryService.reset();
    this._giftCardCode.set('');
    this._giftCardBalance.set(null);
    this._giftCardAmount.set(0);
    this._giftCardApplied.set(false);
  }
}
