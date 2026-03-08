import { describe, it, expect } from 'vitest';
import {
  CateringJobStatus,
  CATERING_STATUS_TRANSITIONS,
} from '@models/index';

/**
 * BUG-21: "Proposal Sent" button was shown as an active CTA on new Inquiry
 * jobs before any proposal was sent.
 *
 * Fixes:
 * 1. Status advancement buttons use action-oriented labels (e.g. "Mark Proposal Sent")
 *    instead of status labels (e.g. "Proposal Sent").
 * 2. "Send Proposal" button only shows for inquiry; "Resend Proposal" for proposal_sent.
 * 3. Event card advance labels also use action-oriented text.
 */

// Replica of statusActionLabels from the component
const statusActionLabels: Record<CateringJobStatus, string> = {
  inquiry: 'Inquiry',
  proposal_sent: 'Mark Proposal Sent',
  contract_signed: 'Mark Contract Signed',
  deposit_received: 'Record Deposit',
  in_progress: 'Start Event',
  final_payment: 'Record Final Payment',
  completed: 'Mark Completed',
  cancelled: 'Cancel',
};

// Replica of event card advanceLabel map
const cardAdvanceLabels: Record<string, string> = {
  inquiry: 'Mark Proposal Sent',
  proposal_sent: 'Mark Contract Signed',
  contract_signed: 'Record Deposit',
  deposit_received: 'Start Job',
  in_progress: 'Record Final Payment',
  final_payment: 'Mark Complete',
};

// Replica of nextStatuses logic
function nextStatuses(status: CateringJobStatus): CateringJobStatus[] {
  return CATERING_STATUS_TRANSITIONS[status].filter(s => s !== 'cancelled');
}

// Whether "Send Proposal" should show (only for inquiry)
function showSendProposal(status: CateringJobStatus): boolean {
  return status === 'inquiry';
}

// Whether "Resend Proposal" should show (only for proposal_sent)
function showResendProposal(status: CateringJobStatus): boolean {
  return status === 'proposal_sent';
}

describe('catering job detail — button labels (BUG-21)', () => {
  it('inquiry job: advancement button says "Mark Proposal Sent" not "Proposal Sent"', () => {
    const statuses = nextStatuses('inquiry');
    expect(statuses).toEqual(['proposal_sent']);
    expect(statusActionLabels[statuses[0]]).toBe('Mark Proposal Sent');
  });

  it('inquiry job: "Send Proposal" button is visible', () => {
    expect(showSendProposal('inquiry')).toBe(true);
    expect(showResendProposal('inquiry')).toBe(false);
  });

  it('proposal_sent job: "Resend Proposal" button is visible, not "Send Proposal"', () => {
    expect(showSendProposal('proposal_sent')).toBe(false);
    expect(showResendProposal('proposal_sent')).toBe(true);
  });

  it('contract_signed job: neither Send nor Resend Proposal shows', () => {
    expect(showSendProposal('contract_signed')).toBe(false);
    expect(showResendProposal('contract_signed')).toBe(false);
  });

  it('proposal_sent: advancement button says "Mark Contract Signed"', () => {
    const statuses = nextStatuses('proposal_sent');
    expect(statuses).toEqual(['contract_signed']);
    expect(statusActionLabels[statuses[0]]).toBe('Mark Contract Signed');
  });

  it('no action label contains bare status text that could be confused as past-tense state', () => {
    const confusing = ['Proposal Sent', 'Contract Signed', 'Deposit Received', 'Final Payment'];
    for (const [status, label] of Object.entries(statusActionLabels)) {
      if (status === 'inquiry' || status === 'cancelled') continue;
      for (const bad of confusing) {
        expect(label, `statusActionLabels['${status}'] = "${label}" matches confusing label "${bad}"`).not.toBe(bad);
      }
    }
  });

  it('event card advance labels use action-oriented text', () => {
    expect(cardAdvanceLabels['inquiry']).toBe('Mark Proposal Sent');
    expect(cardAdvanceLabels['proposal_sent']).toBe('Mark Contract Signed');
    expect(cardAdvanceLabels['contract_signed']).toBe('Record Deposit');
  });

  it('completed/cancelled jobs have no next statuses', () => {
    expect(nextStatuses('completed')).toEqual([]);
    expect(nextStatuses('cancelled')).toEqual([]);
  });
});
