/**
 * Provider Registry Service
 * Resolves any active ProviderId to its standardized VideoProviderAdapter
 * and manages public provider/model capabilities and admin configurations.
 */

import {
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
} from '../../../types/multiProvider';
import { providerConfigStore } from '../config/provider.config';
import { byteDanceProviderAdapter } from '../providers/bytedance.provider';
import { muapiProviderAdapter } from '../providers/muapi.provider';
import { VideoProviderAdapter } from '../providers/provider.types';

class ProviderService {
  getAdapter(providerId: ProviderId): VideoProviderAdapter {
    if (providerId === 'bytedance') {
      return byteDanceProviderAdapter;
    }
    if (providerId === 'muapi') {
      return muapiProviderAdapter;
    }
    const cfg = providerConfigStore.getInternalProvider(providerId);
    if (!cfg) {
      throw new Error(`Unsupported or unknown AI video provider "${providerId}".`);
    }
    // Custom MUAPI-compatible providers reuse the clean REST JSON adapter contract
    return muapiProviderAdapter;
  }

  listProviders(includeDisabled = false): ProviderConfigPublic[] {
    return providerConfigStore.listPublicProviders(includeDisabled);
  }

  resolveProviderAndModel(
    providerId: ProviderId,
    modelId: string
  ): {
    provider: ProviderConfigPublic;
    model: ProviderModelDefinition;
    adapter: VideoProviderAdapter;
  } {
    const found = providerConfigStore.findModel(providerId, modelId);
    if (!found) {
      throw new Error(`Model "${modelId}" is not registered under provider "${providerId}".`);
    }
    const pubProvider = providerConfigStore.toPublicConfig(found.provider);
    if (!pubProvider.enabled) {
      throw new Error(`Provider "${pubProvider.displayName}" is currently disabled.`);
    }
    if (!found.model.enabled) {
      throw new Error(`Model "${found.model.displayName}" is currently disabled.`);
    }
    return {
      provider: pubProvider,
      model: found.model,
      adapter: this.getAdapter(providerId),
    };
  }
}

export const providerService = new ProviderService();
