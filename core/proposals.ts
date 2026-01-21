// ============================================================
// All Management + All OS - Proposal Generation
// Rule-based proposal generation (No AI, pure rules)
// ============================================================

import {
  DomainEvent,
  Proposal,
  ProposalType,
  ExceptionItem,
  TimeBand,
  Menu,
  PrepItem,
  Role,
} from './types';
import { deriveExceptions, deriveLaborMetrics, derivePrepMetrics, deriveDailySalesMetrics } from './derive';

const generateProposalId = (): string =>
  `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ------------------------------------------------------------
// Proposal Templates
// ------------------------------------------------------------

interface ProposalTemplate {
  type: ProposalType;
  title: string;
  description: string;
  reason: string;
  priority: Proposal['priority'];
  defaultRoles: string[];
}

const PROPOSAL_TEMPLATES: Record<string, ProposalTemplate> = {
  'delivery-delay-menu-restriction': {
    type: 'menu-restriction',
    title: 'メニュー制限の提案',
    description: '配送遅延により、一部メニューの提供を一時停止することを推奨します。',
    reason: '配送遅延による材料不足',
    priority: 'high',
    defaultRoles: ['kitchen', 'floor'],
  },
  'delivery-delay-prep-reorder': {
    type: 'prep-reorder',
    title: '仕込み順序変更の提案',
    description: '配送遅延に対応するため、仕込み順序の変更を推奨します。',
    reason: '配送遅延への対応',
    priority: 'medium',
    defaultRoles: ['kitchen'],
  },
  'staff-shortage-help-request': {
    type: 'help-request',
    title: 'ヘルプ要請の提案',
    description: '人員不足のため、他店舗からのヘルプ要請を推奨します。',
    reason: '人員不足',
    priority: 'high',
    defaultRoles: ['manager'],
  },
  'staff-shortage-scope-reduction': {
    type: 'scope-reduction',
    title: '提供範囲縮小の提案',
    description: '人員不足のため、一部メニューの提供停止を推奨します。',
    reason: '人員不足への対応',
    priority: 'medium',
    defaultRoles: ['kitchen', 'floor'],
  },
  'demand-surge-high-margin': {
    type: 'high-margin-priority',
    title: '高単価メニュー優先の提案',
    description: '需要急増に対応するため、高単価メニューを優先して提供することを推奨します。',
    reason: '需要急増への対応',
    priority: 'high',
    defaultRoles: ['kitchen', 'floor'],
  },
  'demand-surge-extra-prep': {
    type: 'extra-prep',
    title: '追加仕込みの提案',
    description: '需要急増に対応するため、追加の仕込みを推奨します。',
    reason: '需要急増への対応',
    priority: 'high',
    defaultRoles: ['kitchen'],
  },
  'prep-behind-reorder': {
    type: 'prep-reorder',
    title: '仕込み優先順位の見直し',
    description: '仕込みが遅延しているため、優先順位の見直しを推奨します。',
    reason: '仕込み遅延',
    priority: 'medium',
    defaultRoles: ['kitchen'],
  },
};

// ------------------------------------------------------------
// Rule-based Proposal Generation
// ------------------------------------------------------------

export const generateProposalsFromExceptions = (
  exceptions: ExceptionItem[],
  storeId: string,
  timeBand: TimeBand,
  menus: Menu[],
  prepItems: PrepItem[],
  roles: Role[]
): Proposal[] => {
  const proposals: Proposal[] = [];
  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  for (const exception of exceptions) {
    switch (exception.type) {
      case 'delivery-delay': {
        // Generate menu restriction proposal
        const menuRestriction = PROPOSAL_TEMPLATES['delivery-delay-menu-restriction'];
        proposals.push({
          id: generateProposalId(),
          type: menuRestriction.type,
          title: menuRestriction.title,
          description: `${exception.description} - ${menuRestriction.description}`,
          reason: menuRestriction.reason,
          triggeredBy: exception.relatedEventId,
          priority: exception.severity === 'critical' ? 'critical' : menuRestriction.priority,
          createdAt: now,
          targetMenuIds: menus.slice(0, 3).map((m) => m.id), // Suggest first 3 menus as candidates
          targetPrepItemIds: [],
          quantity: 0,
          distributedToRoles: roles
            .filter((r) => menuRestriction.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });

        // Also generate prep reorder proposal
        const prepReorder = PROPOSAL_TEMPLATES['delivery-delay-prep-reorder'];
        proposals.push({
          id: generateProposalId(),
          type: prepReorder.type,
          title: prepReorder.title,
          description: `${exception.description} - ${prepReorder.description}`,
          reason: prepReorder.reason,
          triggeredBy: exception.relatedEventId,
          priority: prepReorder.priority,
          createdAt: now,
          targetMenuIds: [],
          targetPrepItemIds: prepItems.slice(0, 2).map((p) => p.id),
          quantity: 0,
          distributedToRoles: roles
            .filter((r) => prepReorder.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });
        break;
      }

      case 'staff-shortage': {
        // Generate help request proposal
        const helpRequest = PROPOSAL_TEMPLATES['staff-shortage-help-request'];
        proposals.push({
          id: generateProposalId(),
          type: helpRequest.type,
          title: helpRequest.title,
          description: `${exception.description} - ${helpRequest.description}`,
          reason: helpRequest.reason,
          triggeredBy: exception.relatedEventId,
          priority: exception.severity === 'critical' ? 'critical' : helpRequest.priority,
          createdAt: now,
          targetMenuIds: [],
          targetPrepItemIds: [],
          quantity: exception.severity === 'critical' ? 2 : 1, // Number of staff needed
          distributedToRoles: roles
            .filter((r) => helpRequest.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });

        // Also generate scope reduction proposal
        const scopeReduction = PROPOSAL_TEMPLATES['staff-shortage-scope-reduction'];
        proposals.push({
          id: generateProposalId(),
          type: scopeReduction.type,
          title: scopeReduction.title,
          description: `${exception.description} - ${scopeReduction.description}`,
          reason: scopeReduction.reason,
          triggeredBy: exception.relatedEventId,
          priority: scopeReduction.priority,
          createdAt: now,
          targetMenuIds: menus.filter((m) => m.prepTimeMinutes > 15).map((m) => m.id).slice(0, 2),
          targetPrepItemIds: [],
          quantity: 0,
          distributedToRoles: roles
            .filter((r) => scopeReduction.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });
        break;
      }

      case 'demand-surge': {
        // Generate high margin priority proposal
        const highMargin = PROPOSAL_TEMPLATES['demand-surge-high-margin'];
        const highMarginMenus = [...menus].sort((a, b) => b.price - a.price).slice(0, 3);
        proposals.push({
          id: generateProposalId(),
          type: highMargin.type,
          title: highMargin.title,
          description: `${exception.description} - ${highMargin.description}`,
          reason: highMargin.reason,
          triggeredBy: exception.relatedEventId,
          priority: exception.severity === 'critical' ? 'critical' : highMargin.priority,
          createdAt: now,
          targetMenuIds: highMarginMenus.map((m) => m.id),
          targetPrepItemIds: [],
          quantity: 0,
          distributedToRoles: roles
            .filter((r) => highMargin.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });

        // Generate extra prep proposal
        const extraPrep = PROPOSAL_TEMPLATES['demand-surge-extra-prep'];
        proposals.push({
          id: generateProposalId(),
          type: extraPrep.type,
          title: extraPrep.title,
          description: `${exception.description} - ${extraPrep.description}`,
          reason: extraPrep.reason,
          triggeredBy: exception.relatedEventId,
          priority: extraPrep.priority,
          createdAt: now,
          targetMenuIds: [],
          targetPrepItemIds: prepItems.slice(0, 3).map((p) => p.id),
          quantity: 10, // Default extra prep quantity
          distributedToRoles: roles
            .filter((r) => extraPrep.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });
        break;
      }

      case 'prep-behind': {
        const prepReorder = PROPOSAL_TEMPLATES['prep-behind-reorder'];
        proposals.push({
          id: generateProposalId(),
          type: prepReorder.type,
          title: prepReorder.title,
          description: `${exception.description} - ${prepReorder.description}`,
          reason: prepReorder.reason,
          triggeredBy: exception.relatedEventId,
          priority: exception.severity === 'critical' ? 'high' : prepReorder.priority,
          createdAt: now,
          targetMenuIds: [],
          targetPrepItemIds: prepItems.map((p) => p.id),
          quantity: 0,
          distributedToRoles: roles
            .filter((r) => prepReorder.defaultRoles.includes(r.code))
            .map((r) => r.id),
          deadline,
          storeId,
          timeBand,
        });
        break;
      }
    }
  }

  return proposals;
};

// ------------------------------------------------------------
// Main Proposal Generation Function
// ------------------------------------------------------------

export const generateProposals = (
  events: DomainEvent[],
  storeId: string,
  date: string,
  timeBand: TimeBand,
  menus: Menu[],
  prepItems: PrepItem[],
  roles: Role[]
): Proposal[] => {
  // Get current exceptions
  const exceptions = deriveExceptions(events, storeId, date);

  // Generate proposals from exceptions
  const proposals = generateProposalsFromExceptions(
    exceptions,
    storeId,
    timeBand,
    menus,
    prepItems,
    roles
  );

  // Remove duplicates by type (keep highest priority)
  const uniqueProposals = new Map<ProposalType, Proposal>();
  const priorityOrder: Record<Proposal['priority'], number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  for (const proposal of proposals) {
    const existing = uniqueProposals.get(proposal.type);
    if (!existing || priorityOrder[proposal.priority] > priorityOrder[existing.priority]) {
      uniqueProposals.set(proposal.type, proposal);
    }
  }

  return Array.from(uniqueProposals.values()).sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
  );
};
