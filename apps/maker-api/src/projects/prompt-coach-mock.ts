export type MockPromptCoachFields = {
  optimizedPrompt: string;
  intentSummary: string;
  dslFitWarnings: string[];
  unsupportedRequests: string[];
  suggestedQuestions: string[];
  capabilitiesUsed: string[];
};

export function buildMockPromptCoachFields(originalPrompt: string): MockPromptCoachFields {
  return {
    optimizedPrompt: buildOptimizedPrompt(originalPrompt),
    intentSummary: `Prepare a DSL-friendly 2D game brief from: ${originalPrompt}`,
    dslFitWarnings: detectDslFitWarnings(originalPrompt),
    unsupportedRequests: detectUnsupportedRequests(originalPrompt),
    suggestedQuestions: [
      'What is the player objective in one sentence?',
      'Which 2D camera style should the game use?',
      'What obstacle, enemy, or collectible should appear first?'
    ],
    capabilitiesUsed: ['deterministic-whitespace-normalization', 'dsl-friendly-brief-structure', 'unsupported-request-detection']
  };
}

function buildOptimizedPrompt(originalPrompt: string): string {
  return [
    originalPrompt,
    '',
    'DSL-friendly constraints:',
    '- Describe a 2D game loop with player objective, camera style, controls, obstacles or enemies, collectibles, and win/lose condition.',
    '- Keep mechanics expressible by the supported game_dsl.v1 contract.',
    '- Prefer concrete entities and measurable objectives over implementation details.'
  ].join('\n');
}

function detectDslFitWarnings(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const warnings: string[] = [];
  if (/\b3d\b|三维|3维/.test(normalized)) {
    warnings.push('complex_3d_request_detected');
  }
  if (/multiplayer|多人|联机/.test(normalized)) {
    warnings.push('multiplayer_request_detected');
  }
  if (/leaderboard|排行榜|online/.test(normalized)) {
    warnings.push('online_leaderboard_request_detected');
  }
  if (/physics|物理/.test(normalized)) {
    warnings.push('advanced_physics_request_detected');
  }
  return warnings;
}

function detectUnsupportedRequests(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const unsupported: string[] = [];
  if (/\b3d\b|三维|3维/.test(normalized)) {
    unsupported.push('complex_3d');
  }
  if (/multiplayer|多人|联机/.test(normalized)) {
    unsupported.push('multiplayer');
  }
  if (/leaderboard|排行榜|online/.test(normalized)) {
    unsupported.push('online_leaderboard');
  }
  if (/physics|物理/.test(normalized)) {
    unsupported.push('advanced_physics');
  }
  return unsupported;
}
