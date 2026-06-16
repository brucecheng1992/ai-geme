import type { SemanticPatchGuard } from './patch-validator.js';
import type { SemanticPatchValidationIssue } from './types.js';

const semanticTargetExistsGuard: SemanticPatchGuard = Object.freeze({
  id: 'semantic-target-exists',
  validate({ patch, semanticIndex }) {
    if (semanticIndex.resolve(patch.target) !== null) {
      return [];
    }

    return [
      {
        severity: 'error',
        code: 'SEMANTIC_PATCH_TARGET_NOT_FOUND',
        guardId: 'semantic-target-exists',
        target: patch.target,
        intentId: patch.intentId,
        message: 'Semantic patch target was not found in SemanticIndex.'
      }
    ];
  }
});

const semanticTraceabilityGuard: SemanticPatchGuard = Object.freeze({
  id: 'semantic-traceability',
  validate({ patch, intent }) {
    const issues: SemanticPatchValidationIssue[] = [];

    if (patch.intentId !== intent.id) {
      issues.push({
        severity: 'error',
        code: 'PATCH_INTENT_MISMATCH',
        guardId: 'semantic-traceability',
        intentId: intent.id,
        target: patch.target,
        message: 'Semantic patch intentId does not match intent.id.'
      });
    }

    if (patch.target !== intent.target) {
      issues.push({
        severity: 'error',
        code: 'PATCH_TARGET_MISMATCH',
        guardId: 'semantic-traceability',
        intentId: intent.id,
        target: patch.target,
        message: 'Semantic patch target does not match intent.target.'
      });
    }

    if (intent.reason.message.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'MISSING_TRACEABILITY_REASON',
        guardId: 'semantic-traceability',
        intentId: intent.id,
        target: intent.target,
        message: 'Semantic edit intent reason.message is required for traceability.'
      });
    }

    return issues;
  }
});

const semanticPatchLifecycleGuard: SemanticPatchGuard = Object.freeze({
  id: 'semantic-patch-lifecycle',
  validate({ patch }) {
    const issues: SemanticPatchValidationIssue[] = [];

    if (patch.status !== 'proposed') {
      issues.push({
        severity: 'error',
        code: 'PATCH_STATUS_NOT_PROPOSED',
        guardId: 'semantic-patch-lifecycle',
        intentId: patch.intentId,
        target: patch.target,
        message: 'Semantic patch must be proposed before validation.'
      });
    }

    if (patch.afterHash !== undefined) {
      issues.push({
        severity: 'error',
        code: 'PATCH_AFTER_HASH_SET_BEFORE_APPLY',
        guardId: 'semantic-patch-lifecycle',
        intentId: patch.intentId,
        target: patch.target,
        message: 'Semantic patch afterHash must not be set before apply.'
      });
    }

    if (patch.operations.length === 0) {
      issues.push({
        severity: 'error',
        code: 'EMPTY_SEMANTIC_PATCH_OPERATIONS',
        guardId: 'semantic-patch-lifecycle',
        intentId: patch.intentId,
        target: patch.target,
        message: 'Semantic patch must contain at least one operation.'
      });
    }

    return issues;
  }
});

const semanticOperationPathGuard: SemanticPatchGuard = Object.freeze({
  id: 'semantic-operation-path',
  validate({ patch }) {
    return patch.operations.flatMap((operation, operationIndex) =>
      isValidSemanticOperationPath(operation.path)
        ? []
        : [
            {
              severity: 'error' as const,
              code: 'INVALID_SEMANTIC_OPERATION_PATH',
              guardId: 'semantic-operation-path',
              intentId: patch.intentId,
              target: patch.target,
              path: operation.path,
              operationIndex,
              message: 'Semantic patch operation path is invalid.'
            }
          ]
    );
  }
});

const noGeneratedCodeEditGuard: SemanticPatchGuard = Object.freeze({
  id: 'no-generated-code-edit',
  validate({ patch }) {
    return patch.operations.flatMap((operation, operationIndex) =>
      isGeneratedCodePath(operation.path)
        ? [
            {
              severity: 'error' as const,
              code: 'GENERATED_CODE_EDIT_FORBIDDEN',
              guardId: 'no-generated-code-edit',
              intentId: patch.intentId,
              target: patch.target,
              path: operation.path,
              operationIndex,
              message: 'Semantic patch operation path must not target generated code or source files.'
            }
          ]
        : []
    );
  }
});

export const defaultSemanticPatchGuards: readonly SemanticPatchGuard[] = Object.freeze([
  semanticTargetExistsGuard,
  semanticTraceabilityGuard,
  semanticPatchLifecycleGuard,
  semanticOperationPathGuard,
  noGeneratedCodeEditGuard
]);

function isValidSemanticOperationPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.startsWith('/') &&
    !path.includes('\\') &&
    !path.includes('\0') &&
    !path.includes('//') &&
    !path.includes('/../') &&
    !path.endsWith('/..') &&
    !path.includes('/./') &&
    !path.endsWith('/.')
  );
}

function isGeneratedCodePath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const forbiddenSegments = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
  const hasForbiddenSegment = lowerPath
    .split('/')
    .filter((segment) => segment.length > 0)
    .some((segment) => forbiddenSegments.has(segment));
  return hasForbiddenSegment || ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].some((extension) => lowerPath.endsWith(extension));
}
