import { Component, inject, signal, computed, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { ChatService } from '@services/chat';
import { AuthService } from '@services/auth';
import { ChatMessage } from '@models/index';

@Component({
  selector: 'os-ai-chat',
  imports: [],
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAssistant {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _inputValue = signal('');
  readonly inputValue = this._inputValue.asReadonly();

  readonly messages = this.chatService.messages;
  readonly isTyping = this.chatService.isTyping;
  readonly error = this.chatService.error;

  readonly hasMessages = computed(() => this.messages().length > 0);

  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly suggestedQueries = [
    'How did we do today?',
    'Which menu items should I cut?',
    'What inventory is running low?',
    'Show me our top sellers this week',
    'What\'s our average profit margin?',
    'Any critical alerts I should know about?',
  ];

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._inputValue.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async send(): Promise<void> {
    const value = this._inputValue().trim();
    if (!value || this.isTyping()) return;

    this._inputValue.set('');
    await this.chatService.sendMessage(value);
    this.scrollToBottom();
  }

  async sendSuggested(query: string): Promise<void> {
    if (this.isTyping()) return;
    await this.chatService.sendMessage(query);
    this.scrollToBottom();
  }

  clearChat(): void {
    this.chatService.clearConversation();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
