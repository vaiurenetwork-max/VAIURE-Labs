/**
 * Client-side Video Frame Extraction Utility for VaiByte Canvas Studio
 * Samples keyframes for AI Vision Prompt Reading and captures the exact final
 * frame for zero-mistake Seedance 2.5 Next-Scene Continuity.
 */

export async function extractVideoKeyframes(
  videoSrc: string,
  sampleCount = 4
): Promise<{ frames: string[]; lastFrameDataUrl: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;
    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const fail = (err: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err));
    };

    const timeout = setTimeout(() => {
      fail('Timed out decoding video frames. Ensure URL allows CORS or upload a local MP4/WebM clip.');
    }, 15000);

    video.onerror = () => {
      clearTimeout(timeout);
      fail('Unable to read video stream. Try uploading a local MP4/WebM file.');
    };

    video.onloadedmetadata = async () => {
      try {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
        const w = Math.min(960, video.videoWidth || 640);
        const h = Math.round((w / (video.videoWidth || 16)) * (video.videoHeight || 9));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(240, w);
        canvas.height = Math.max(135, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable.');

        const timestamps: number[] = [];
        const steps = Math.max(2, sampleCount);
        for (let i = 0; i < steps - 1; i++) {
          timestamps.push((dur * i) / steps);
        }
        // Final timestamp tightly near end for continuity frame-0 lock
        const endTimestamp = Math.max(0, dur - 0.05);
        timestamps.push(endTimestamp);

        const captured: string[] = [];
        for (const t of timestamps) {
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                captured.push(canvas.toDataURL('image/jpeg', 0.86));
              } catch {
                // Skip frame if canvas is tainted by strict cross-origin headers
              }
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = Math.min(dur, Math.max(0, t));
          });
        }

        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        cleanup();

        const lastFrameDataUrl = captured[captured.length - 1] || '';
        resolve({
          frames: captured,
          lastFrameDataUrl,
          duration: dur,
        });
      } catch (err: unknown) {
        clearTimeout(timeout);
        fail(err instanceof Error ? err.message : 'Frame extraction failed.');
      }
    };

    video.src = videoSrc;
  });
}

export async function extractExactLastFrame(videoSrc: string): Promise<string> {
  const res = await extractVideoKeyframes(videoSrc, 2);
  if (!res.lastFrameDataUrl) {
    throw new Error('Could not capture final frame from video (CORS or stream restricted).');
  }
  return res.lastFrameDataUrl;
}
