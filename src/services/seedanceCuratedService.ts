/**
 * VAIURE — SEEDANCE LAB CURATED GALLERY CLIENT SERVICE
 * Interfaces with /api/curated/* with verified Firebase Bearer auth for private
 * creations, collections, submissions, curator moderation, and public engagement.
 */

import { getAuthHeaders } from './authTokenHelper';
import {
  CreationAnalytics,
  CreationCollection,
  CreationComment,
  CreationTag,
  CuratedCategoryOption,
  CuratedMediaType,
  CurationPolicyChecklist,
  CurationReview,
  CurationSubmission,
  PublicCreationReport,
  PublicGallerySort,
  PublishedCreation,
  UserCreation,
} from '../types/seedanceCurated';

async function parseCuratedResponse<T = any>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || fallback);
  }
  return data as T;
}

export const seedanceCuratedService = {
  async getMeta(): Promise<{
    categories: CuratedCategoryOption[];
    viewerIsCurator: boolean;
  }> {
    const headers = await getAuthHeaders(false);
    const res = await fetch('/api/curated/meta', { headers });
    return parseCuratedResponse(res, 'Failed to fetch curated gallery metadata.');
  },

  async ingestCreation(payload: {
    sourceJobId: string;
    generationGroupId?: string;
    sourcePipeline: UserCreation['sourcePipeline'];
    projectId?: string;
    projectName?: string;
    title?: string;
    mediaType?: CuratedMediaType;
    outputUrls: string[];
    thumbnailUrl?: string;
    aiModel: string;
    modelCategory?: string;
    aspectRatio?: string;
    resolution?: string;
    durationSeconds?: number;
    prompt: string;
    negativePrompt?: string;
    parameters?: Record<string, unknown>;
    referenceImageCount?: number;
  }): Promise<UserCreation[]> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/curated/ingest', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await parseCuratedResponse<{ creations: UserCreation[] }>(
      res,
      'Failed to save creation to private library.'
    );
    return data.creations;
  },

  // MY PRIVATE CURATES
  async listPrivateCreations(filters?: {
    mediaType?: 'ALL' | CuratedMediaType;
    collectionId?: string;
    projectId?: string;
    status?: string;
    search?: string;
  }): Promise<{
    creations: UserCreation[];
    collections: CreationCollection[];
    submissions: CurationSubmission[];
  }> {
    const params = new URLSearchParams();
    if (filters?.mediaType) params.set('mediaType', filters.mediaType);
    if (filters?.collectionId) params.set('collectionId', filters.collectionId);
    if (filters?.projectId) params.set('projectId', filters.projectId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const headers = await getAuthHeaders(false);
    const res = await fetch(`/api/curated/private?${params.toString()}`, { headers });
    return parseCuratedResponse(res, 'Failed to load My Private Curates.');
  },

  async updatePrivateCreation(
    creationId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      projectId?: string;
      projectName?: string;
    }
  ): Promise<UserCreation> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(`/api/curated/private/${encodeURIComponent(creationId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await parseCuratedResponse<{ creation: UserCreation }>(
      res,
      'Failed to update creation details.'
    );
    return data.creation;
  },

  async deletePrivateCreation(creationId: string): Promise<void> {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`/api/curated/private/${encodeURIComponent(creationId)}`, {
      method: 'DELETE',
      headers,
    });
    await parseCuratedResponse(res, 'Failed to delete creation.');
  },

  // COLLECTIONS
  async createCollection(name: string, description = ''): Promise<CreationCollection> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/curated/collections', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    });
    const data = await parseCuratedResponse<{ collection: CreationCollection }>(
      res,
      'Failed to create collection.'
    );
    return data.collection;
  },

  async renameCollection(
    collectionId: string,
    name: string,
    description?: string
  ): Promise<CreationCollection> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(`/api/curated/collections/${encodeURIComponent(collectionId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, description }),
    });
    const data = await parseCuratedResponse<{ collection: CreationCollection }>(
      res,
      'Failed to update collection.'
    );
    return data.collection;
  },

  async deleteCollection(collectionId: string): Promise<void> {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`/api/curated/collections/${encodeURIComponent(collectionId)}`, {
      method: 'DELETE',
      headers,
    });
    await parseCuratedResponse(res, 'Failed to delete collection.');
  },

  async assignToCollection(
    collectionId: string,
    creationId: string,
    inCollection: boolean
  ): Promise<CreationCollection> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/collections/${encodeURIComponent(collectionId)}/items`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ creationId, inCollection }),
      }
    );
    const data = await parseCuratedResponse<{ collection: CreationCollection }>(
      res,
      'Failed to update collection item.'
    );
    return data.collection;
  },

  // SUBMISSIONS
  async submitForCuration(payload: {
    creationId: string;
    proposedTitle: string;
    proposedDescription: string;
    category: string;
    tags: string[];
    creativeCredits?: string;
    projectName?: string;
    showCreatorProfile: boolean;
    showAiModel: boolean;
    showPromptAndParams: boolean;
  }): Promise<CurationSubmission> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/curated/submissions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await parseCuratedResponse<{ submission: CurationSubmission }>(
      res,
      'Failed to submit creation for curation.'
    );
    return data.submission;
  },

  async withdrawSubmission(submissionId: string): Promise<{
    submission: CurationSubmission;
    creation: UserCreation;
  }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/submissions/${encodeURIComponent(submissionId)}/withdraw`,
      {
        method: 'POST',
        headers,
      }
    );
    return parseCuratedResponse(res, 'Failed to withdraw curation submission.');
  },

  // PUBLIC CURATED GALLERY DISCOVERY
  async listPublicCreations(options?: {
    mediaType?: 'ALL' | CuratedMediaType;
    category?: string;
    search?: string;
    sort?: PublicGallerySort;
    favoritesOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    categories: CuratedCategoryOption[];
    creations: PublishedCreation[];
    total: number;
    page: number;
    totalPages: number;
    tags: CreationTag[];
  }> {
    const params = new URLSearchParams();
    if (options?.mediaType) params.set('mediaType', options.mediaType);
    if (options?.category) params.set('category', options.category);
    if (options?.search) params.set('search', options.search);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.favoritesOnly) params.set('favoritesOnly', 'true');
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    const headers = await getAuthHeaders(false);
    const res = await fetch(`/api/curated/public?${params.toString()}`, { headers });
    return parseCuratedResponse(res, 'Failed to load public curated gallery.');
  },

  async getPublicCreationDetail(
    publishedId: string,
    trackView = true
  ): Promise<{
    creation: PublishedCreation;
    comments: CreationComment[];
    analytics?: CreationAnalytics;
  }> {
    const headers = await getAuthHeaders(false);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}?trackView=${trackView ? 'true' : 'false'}`,
      { headers }
    );
    return parseCuratedResponse(res, 'Failed to load creation detail.');
  },

  async updatePublishedByCreator(
    publishedId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      category?: string;
      creativeCredits?: string;
      commentsEnabled?: boolean;
      showCreatorProfile?: boolean;
      showAiModel?: boolean;
      showPromptAndParams?: boolean;
      action?: 'unpublish';
    }
  ): Promise<PublishedCreation> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(`/api/curated/public/${encodeURIComponent(publishedId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await parseCuratedResponse<{ creation: PublishedCreation }>(
      res,
      'Failed to update published creation.'
    );
    return data.creation;
  },

  async toggleAppreciation(publishedId: string): Promise<{
    appreciated: boolean;
    appreciationsCount: number;
  }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/appreciate`,
      { method: 'POST', headers }
    );
    return parseCuratedResponse(res, 'Failed to update appreciation.');
  },

  async toggleFavorite(publishedId: string): Promise<{
    favorited: boolean;
    favoritesCount: number;
  }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/favorite`,
      { method: 'POST', headers }
    );
    return parseCuratedResponse(res, 'Failed to save to favorites.');
  },

  async recordShare(publishedId: string): Promise<{ sharesCount: number }> {
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/share`,
      { method: 'POST' }
    );
    return parseCuratedResponse(res, 'Failed to record share.');
  },

  async addComment(
    publishedId: string,
    content: string
  ): Promise<{ comment: CreationComment; commentsCount: number }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/comments`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      }
    );
    return parseCuratedResponse(res, 'Failed to post comment.');
  },

  async deleteComment(
    publishedId: string,
    commentId: string
  ): Promise<{ commentsCount: number }> {
    const headers = await getAuthHeaders(false);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE', headers }
    );
    return parseCuratedResponse(res, 'Failed to delete comment.');
  },

  async reportPublicCreation(
    publishedId: string,
    reason: string,
    details = ''
  ): Promise<void> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/public/${encodeURIComponent(publishedId)}/report`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, details }),
      }
    );
    await parseCuratedResponse(res, 'Failed to submit report.');
  },

  // CURATOR REVIEW DASHBOARD
  async listCuratorSubmissions(status?: string): Promise<{
    submissions: CurationSubmission[];
    reviews: CurationReview[];
    reports: PublicCreationReport[];
  }> {
    const headers = await getAuthHeaders(false);
    const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/curated/curator/submissions${q}`, { headers });
    return parseCuratedResponse(res, 'Failed to load curator review queue.');
  },

  async reviewSubmission(
    submissionId: string,
    payload: {
      decision: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_REVISION';
      internalNotes?: string;
      creatorFeedback?: string;
      curatorBadge?: string;
      policyChecklist?: Partial<CurationPolicyChecklist>;
    }
  ): Promise<{
    submission: CurationSubmission;
    review: CurationReview;
    published?: PublishedCreation;
    message?: string;
  }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/curator/submissions/${encodeURIComponent(submissionId)}/review`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    );
    return parseCuratedResponse(res, 'Failed to submit curation review.');
  },

  async moderatePublishedCreation(
    publishedId: string,
    payload: {
      action: 'REMOVE_PUBLIC' | 'DISMISS_REPORTS';
      reason: string;
      reportId?: string;
    }
  ): Promise<void> {
    const headers = await getAuthHeaders(true);
    const res = await fetch(
      `/api/curated/curator/published/${encodeURIComponent(publishedId)}/moderate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }
    );
    await parseCuratedResponse(res, 'Failed to apply moderation action.');
  },
};
