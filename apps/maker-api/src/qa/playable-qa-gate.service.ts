import qaGate from '../../../../packages/runtime-core/src/qa/playable-qa-gate-v0.1.json' with { type: 'json' };
import { Injectable } from '@nestjs/common';
import type { QaGateEvaluation, QaGenre, QaRequiredEvents } from './qa.types.js';

type QaGateFile = typeof qaGate;

@Injectable()
export class PlayableQaGateService {
  getRequiredEvents(genre: QaGenre): QaRequiredEvents {
    const genreGate = (qaGate as QaGateFile).genre_required_events[genre];

    return {
      all: unique([...(qaGate as QaGateFile).common_required_events_all, ...genreGate.all]),
      any_groups: genreGate.any_groups.map((group) => unique(group))
    };
  }

  evaluate(observedEvents: string[], requiredEvents: QaRequiredEvents): QaGateEvaluation {
    const observed = new Set(observedEvents);
    const missingEvents = requiredEvents.all.filter((event) => !observed.has(event));
    const missingAnyGroups = requiredEvents.any_groups.filter((group) => !group.some((event) => observed.has(event)));

    return {
      passed: missingEvents.length === 0 && missingAnyGroups.length === 0,
      missing_events: missingEvents,
      missing_any_groups: missingAnyGroups
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
