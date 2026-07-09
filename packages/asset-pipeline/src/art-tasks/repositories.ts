import type {
  ArtTask,
  ArtTaskRepository,
  ArtTaskRepositories,
  ArtTaskStatus,
  GeneratedAsset,
  GeneratedAssetRepository,
  ProviderCall,
  ProviderCallRepository,
  ReviewDecision,
  ReviewDecisionRepository
} from './types.js';

export function createInMemoryArtTaskRepositories(): ArtTaskRepositories {
  return {
    artTasks: new InMemoryArtTaskRepository(),
    generatedAssets: new InMemoryGeneratedAssetRepository(),
    providerCalls: new InMemoryProviderCallRepository(),
    reviewDecisions: new InMemoryReviewDecisionRepository()
  };
}

class InMemoryArtTaskRepository implements ArtTaskRepository {
  private readonly records = new Map<string, ArtTask>();

  create(task: ArtTask): ArtTask {
    if (this.records.has(task.taskId)) {
      throw new Error(`ArtTask already exists: ${task.taskId}.`);
    }
    this.records.set(task.taskId, cloneTask(task));
    return cloneTask(task);
  }

  get(taskId: string): ArtTask | undefined {
    const task = this.records.get(taskId);
    return task === undefined ? undefined : cloneTask(task);
  }

  update(task: ArtTask): ArtTask {
    if (!this.records.has(task.taskId)) {
      throw new Error(`ArtTask not found: ${task.taskId}.`);
    }
    this.records.set(task.taskId, cloneTask(task));
    return cloneTask(task);
  }

  updateStatus(taskId: string, status: ArtTaskStatus): ArtTask {
    const task = this.get(taskId);
    if (task === undefined) {
      throw new Error(`ArtTask not found: ${taskId}.`);
    }
    return this.update({ ...task, status });
  }

  list(): ArtTask[] {
    return Array.from(this.records.values(), cloneTask);
  }
}

class InMemoryGeneratedAssetRepository implements GeneratedAssetRepository {
  private readonly records = new Map<string, GeneratedAsset>();

  create(asset: GeneratedAsset): GeneratedAsset {
    if (this.records.has(asset.assetId)) {
      throw new Error(`GeneratedAsset already exists: ${asset.assetId}.`);
    }
    this.records.set(asset.assetId, cloneAsset(asset));
    return cloneAsset(asset);
  }

  get(assetId: string): GeneratedAsset | undefined {
    const asset = this.records.get(assetId);
    return asset === undefined ? undefined : cloneAsset(asset);
  }

  update(asset: GeneratedAsset): GeneratedAsset {
    if (!this.records.has(asset.assetId)) {
      throw new Error(`GeneratedAsset not found: ${asset.assetId}.`);
    }
    this.records.set(asset.assetId, cloneAsset(asset));
    return cloneAsset(asset);
  }

  listByTaskId(taskId: string): GeneratedAsset[] {
    return this.list().filter((asset) => asset.taskId === taskId);
  }

  list(): GeneratedAsset[] {
    return Array.from(this.records.values(), cloneAsset);
  }
}

class InMemoryProviderCallRepository implements ProviderCallRepository {
  private readonly records = new Map<string, ProviderCall>();

  create(call: ProviderCall): ProviderCall {
    if (this.records.has(call.callId)) {
      throw new Error(`ProviderCall already exists: ${call.callId}.`);
    }
    this.records.set(call.callId, cloneProviderCall(call));
    return cloneProviderCall(call);
  }

  get(callId: string): ProviderCall | undefined {
    const call = this.records.get(callId);
    return call === undefined ? undefined : cloneProviderCall(call);
  }

  update(call: ProviderCall): ProviderCall {
    if (!this.records.has(call.callId)) {
      throw new Error(`ProviderCall not found: ${call.callId}.`);
    }
    this.records.set(call.callId, cloneProviderCall(call));
    return cloneProviderCall(call);
  }

  listByTaskId(taskId: string): ProviderCall[] {
    return this.list().filter((call) => call.taskId === taskId);
  }

  list(): ProviderCall[] {
    return Array.from(this.records.values(), cloneProviderCall);
  }
}

class InMemoryReviewDecisionRepository implements ReviewDecisionRepository {
  private readonly records = new Map<string, ReviewDecision>();

  create(decision: ReviewDecision): ReviewDecision {
    if (this.records.has(decision.reviewId)) {
      throw new Error(`ReviewDecision already exists: ${decision.reviewId}.`);
    }
    this.records.set(decision.reviewId, cloneReviewDecision(decision));
    return cloneReviewDecision(decision);
  }

  listByTaskId(taskId: string): ReviewDecision[] {
    return this.list().filter((decision) => decision.taskId === taskId);
  }

  list(): ReviewDecision[] {
    return Array.from(this.records.values(), cloneReviewDecision);
  }
}

function cloneTask(task: ArtTask): ArtTask {
  return {
    ...task,
    outputSpec: { ...task.outputSpec },
    ...(task.providerSelection === undefined ? {} : { providerSelection: { ...task.providerSelection } })
  };
}

function cloneAsset(asset: GeneratedAsset): GeneratedAsset {
  return { ...asset };
}

function cloneProviderCall(call: ProviderCall): ProviderCall {
  return {
    ...call,
    outputAssetIds: [...call.outputAssetIds],
    ...(call.error === undefined ? {} : { error: { ...call.error } })
  };
}

function cloneReviewDecision(decision: ReviewDecision): ReviewDecision {
  return { ...decision };
}
