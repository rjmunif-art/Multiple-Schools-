/**
 * Utility to pick image from phone memory/gallery/camera and compress for offline storage
 */

export async function pickImageFromFileMemory(options?: { maxWidth?: number; maxHeight?: number; quality?: number; capture?: boolean }): Promise<string> {
  const { maxWidth = 640, maxHeight = 640, quality = 0.68, capture = false } = options || {};

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) {
      input.setAttribute('capture', 'environment');
    }

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const compressedBase64 = await compressImageFile(file, maxWidth, maxHeight, quality);
        resolve(compressedBase64);
      } catch (err) {
        reject(err);
      }
    };

    input.oncancel = () => {
      reject(new Error('User cancelled file selection'));
    };

    // Trigger phone memory / gallery picker
    input.click();
  });
}

export function compressImageFile(file: File, maxWidth = 640, maxHeight = 640, quality = 0.68): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to raw data url if canvas fails
        resolve(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
