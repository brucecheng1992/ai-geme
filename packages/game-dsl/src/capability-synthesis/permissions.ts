import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_KIND = 'capability_synthesis_permissions_report';
export const CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_SCHEMA_VERSION = 'step36.capability-synthesis-permissions.v1';

export const CAPABILITY_SYNTHESIS_ROLES = [
  'creator',
  'capability_reviewer',
  'capability_maintainer',
  'runtime_code_owner',
  'security_reviewer',
  'registry_admin'
] as const;

export const CAPABILITY_SYNTHESIS_ACTIONS = [
  'submit_design_request',
  'view_design_gap',
  'view_candidate_source',
  'request_changes',
  'approve_r1',
  'approve_r2',
  'install_registry',
  'rollback_registry'
] as const;

export type CapabilitySynthesisRole = (typeof CAPABILITY_SYNTHESIS_ROLES)[number];
export type CapabilitySynthesisAction = (typeof CAPABILITY_SYNTHESIS_ACTIONS)[number];

export type CapabilitySynthesisPermissionReport = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_SCHEMA_VERSION;
  cells: Array<{
    role: CapabilitySynthesisRole;
    action: CapabilitySynthesisAction;
    allowed: boolean;
    scope: 'none' | 'own_project' | 'all_projects';
  }>;
  invariants: readonly string[];
  reportHash: string;
};

const ROLE_ACTIONS: Record<CapabilitySynthesisRole, ReadonlySet<CapabilitySynthesisAction>> = {
  creator: new Set(['submit_design_request', 'view_design_gap']),
  capability_reviewer: new Set(['submit_design_request', 'view_design_gap', 'view_candidate_source', 'request_changes']),
  capability_maintainer: new Set(['submit_design_request', 'view_design_gap', 'view_candidate_source', 'request_changes', 'approve_r1', 'approve_r2']),
  runtime_code_owner: new Set(['submit_design_request', 'view_design_gap', 'view_candidate_source', 'request_changes', 'approve_r2']),
  security_reviewer: new Set(['submit_design_request', 'view_design_gap', 'view_candidate_source', 'request_changes']),
  registry_admin: new Set(['submit_design_request', 'view_design_gap', 'view_candidate_source', 'install_registry', 'rollback_registry'])
};

export function buildCapabilitySynthesisPermissionsReport(): CapabilitySynthesisPermissionReport {
  const payload: Omit<CapabilitySynthesisPermissionReport, 'reportHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_PERMISSIONS_REPORT_SCHEMA_VERSION,
    cells: CAPABILITY_SYNTHESIS_ROLES.flatMap((role) =>
      CAPABILITY_SYNTHESIS_ACTIONS.map((action) => ({
        role,
        action,
        allowed: canCapabilitySynthesisRolePerform(role, action),
        scope: permissionScope(role, action)
      }))
    ),
    invariants: [
      'creator_cannot_view_candidate_source_by_default',
      'creator_cannot_approve_or_install',
      'maintainer_can_approve_but_cannot_install',
      'registry_admin_can_install_but_cannot_approve_candidate',
      'step34_accept_and_workbench_local_state_cannot_install_registry'
    ]
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function canCapabilitySynthesisRolePerform(role: CapabilitySynthesisRole, action: CapabilitySynthesisAction): boolean {
  return ROLE_ACTIONS[role].has(action);
}

export function canAnyCapabilitySynthesisRolePerform(roles: readonly CapabilitySynthesisRole[], action: CapabilitySynthesisAction): boolean {
  return roles.some((role) => canCapabilitySynthesisRolePerform(role, action));
}

export function requiredCapabilitySynthesisActionForTransition(toState: string): CapabilitySynthesisAction | undefined {
  if (toState === 'APPROVED') {
    return 'approve_r2';
  }
  if (toState === 'INSTALLING') {
    return 'install_registry';
  }
  if (toState === 'ROLLED_BACK') {
    return 'rollback_registry';
  }
  if (toState === 'REJECTED' || toState === 'REPAIRING') {
    return 'request_changes';
  }
  return undefined;
}

function permissionScope(role: CapabilitySynthesisRole, action: CapabilitySynthesisAction): 'none' | 'own_project' | 'all_projects' {
  if (!canCapabilitySynthesisRolePerform(role, action)) {
    return 'none';
  }
  return role === 'creator' && action === 'view_design_gap' ? 'own_project' : 'all_projects';
}
