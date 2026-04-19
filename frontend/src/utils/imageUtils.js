/**
 * Comprime uma imagem para base64 reduzida.
 * Reduz automaticamente qualidade até atingir o tamanho alvo.
 * @param {File|Blob} file - arquivo de imagem
 * @param {number} maxSize - dimensão máxima (px) — padrão 1200
 * @param {number} quality - qualidade inicial JPEG 0-1 — padrão 0.75
 * @param {number} maxBytes - tamanho máximo em bytes do base64 — padrão 300KB
 */
export async function compressImage(file, maxSize = 1200, quality = 0.75, maxBytes = 300 * 1024) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 1. Calcular dimensões mantendo proporção
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Tentar comprimir iterativamente até atingir maxBytes
        let q = quality;
        let result = canvas.toDataURL('image/jpeg', q);

        // Cada passagem reduz qualidade em 10% se ainda for grande
        while (result.length > maxBytes * 1.37 && q > 0.2) {
          q = Math.round((q - 0.1) * 10) / 10;
          result = canvas.toDataURL('image/jpeg', q);
        }

        // 3. Se ainda for grande, reduzir resolução também
        if (result.length > maxBytes * 1.37) {
          const scale = 0.75;
          const canvas2 = document.createElement('canvas');
          canvas2.width  = Math.round(width  * scale);
          canvas2.height = Math.round(height * scale);
          const ctx2 = canvas2.getContext('2d');
          ctx2.drawImage(img, 0, 0, canvas2.width, canvas2.height);
          result = canvas2.toDataURL('image/jpeg', Math.max(q, 0.3));
        }

        resolve(result);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiplas imagens em paralelo.
 */
export async function compressImages(files, maxSize, quality, maxBytes) {
  return Promise.all(Array.from(files).map(f => compressImage(f, maxSize, quality, maxBytes)));
}
