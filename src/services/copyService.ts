/**
 * VAIURE Client-Side Copy Service
 * Calls server-side Gemini 3.8 Flash Copy Engine & Firestore replication APIs.
 * Never calls Gemini directly in client code.
 */

import {
  CopyGenerateRequest,
  CopyGenerateResponse,
  CopyPolishRequest,
  CopyPolishResponse,
  CopyCinemaRequest,
  CopyCinemaResponse,
  CopyTranslateRequest,
  CopyTranslateResponse,
  CopyDuplicateResponse,
  CopyArchiveExportResponse,
  CopyShareLinkResponse,
} from '../types/copy';

export async function generateEditorialCopy(req: CopyGenerateRequest): Promise<CopyGenerateResponse> {
  const res = await fetch('/api/copy/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate copy' }));
    throw new Error(err.error || 'Server error generating editorial copy');
  }

  return res.json();
}

export async function polishDraftCopy(req: CopyPolishRequest): Promise<CopyPolishResponse> {
  const res = await fetch('/api/copy/polish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to polish copy' }));
    throw new Error(err.error || 'Server error polishing draft');
  }

  return res.json();
}

export async function generateCinemaCopy(req: CopyCinemaRequest): Promise<CopyCinemaResponse> {
  const res = await fetch('/api/copy/cinema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate cinema copy' }));
    throw new Error(err.error || 'Server error generating cinema copy');
  }

  return res.json();
}

export async function translateEditorialCopy(req: CopyTranslateRequest): Promise<CopyTranslateResponse> {
  const res = await fetch('/api/copy/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to translate copy' }));
    throw new Error(err.error || 'Server error translating copy');
  }

  return res.json();
}

export async function duplicatePost(
  postId: string,
  newAuthorUid: string,
  customTitle?: string
): Promise<CopyDuplicateResponse> {
  const res = await fetch(`/api/copy/post/${encodeURIComponent(postId)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newAuthorUid, customTitle }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to duplicate post' }));
    throw new Error(err.error || 'Server error duplicating post');
  }

  return res.json();
}

export async function duplicateThread(
  threadId: string,
  newAuthorUid: string
): Promise<CopyDuplicateResponse> {
  const res = await fetch(`/api/copy/thread/${encodeURIComponent(threadId)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newAuthorUid }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to duplicate thread' }));
    throw new Error(err.error || 'Server error duplicating thread');
  }

  return res.json();
}

export async function exportUserArchiveCopy(uid: string): Promise<CopyArchiveExportResponse> {
  const res = await fetch(`/api/copy/export/${encodeURIComponent(uid)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to export archive' }));
    throw new Error(err.error || 'Server error exporting user archive copy');
  }

  return res.json();
}

export async function generateCopyShareLink(
  type: 'post' | 'thread' | 'cinema' | 'profile',
  id: string,
  title?: string,
  description?: string
): Promise<CopyShareLinkResponse> {
  const res = await fetch('/api/copy/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id, title, description }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create copy link' }));
    throw new Error(err.error || 'Server error generating copy link');
  }

  return res.json();
}

/**
 * Stream editorial copy via Server-Sent Events (SSE)
 */
export async function streamEditorialCopy(
  prompt: string,
  tone: string = 'luxury-editorial',
  category: string = 'COUTURE',
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const res = await fetch('/api/copy/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, tone, category }),
    });

    if (!res.ok) {
      onError('Failed to initiate stream');
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('Stream reader not available');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.error) {
              onError(data.error);
              return;
            }
            if (data.chunk) {
              onChunk(data.chunk);
            }
            if (data.done) {
              onDone();
              return;
            }
          } catch {
            // ignore partial parse
          }
        }
      }
    }
  } catch (err: any) {
    onError(err.message || 'Stream connection error');
  }
}
