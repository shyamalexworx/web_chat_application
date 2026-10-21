/**
 * Image Compression & Safe LocalStorage Manager
 * Prevents browser QuotaExceededError by downscaling images to crisp thumbnails (~10-25KB)
 * and safely handling localStorage operations with automatic cleanup.
 */

/**
 * Compresses an image File or Blob using HTML5 Canvas into a lightweight data URL
 */
export function compressImageFile(
  file: File | Blob,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    // SVG images are already vector and lightweight
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an existing base64 DataURL if it is unnecessarily large
 */
export function compressDataUrl(
  dataUrl: string,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    // Keep SVGs or already compact dataURLs (< 35KB) intact
    if (dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 35000) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Clean up oversized raw items from localStorage to instantly reclaim quota
 */
export function cleanLocalStorageQuota(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToEvict: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (!value) continue;

      // Check for raw uncompressed avatar strings (> 150KB)
      if (
        (key.startsWith('pulsechat_custom_channel_avatar_') ||
          key.startsWith('pulsechat_custom_workspace_avatar_') ||
          key.startsWith('pulsechat_custom_avatar_')) &&
        value.length > 150 * 1024
      ) {
        keysToEvict.push(key);
      }
    }

    keysToEvict.forEach((k) => {
      try {
        localStorage.removeItem(k);
        console.warn(`[Storage] Evicted oversized raw key "${k}" to free localStorage quota.`);
      } catch (e) {}
    });
  } catch (err) {
    console.warn('[Storage] Quota cleanup inspection notice:', err);
  }
}

/**
 * Safely writes to localStorage, automatically catching QuotaExceededError and cleaning up
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] localStorage.setItem failed for key "${key}". Running quota recovery...`, err);
    try {
      cleanLocalStorageQuota();
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] Could not persist key "${key}" after quota cleanup. Skipping gracefully.`, retryErr);
      return false;
    }
  }
}

