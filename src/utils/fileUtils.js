/**
 * Converts a file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} A promise that resolves with the base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validates if a file is of an allowed type
 * @param {File} file - The file to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if the file type is allowed
 */
export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

/**
 * Validates if a file is within the allowed size
 * @param {File} file - The file to validate
 * @param {number} maxSizeInMB - Maximum allowed size in MB
 * @returns {boolean} True if the file size is within the limit
 */
export const validateFileSize = (file, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * Extracts the file extension from a filename
 * @param {string} filename - The filename
 * @returns {string} The file extension (without the dot)
 */
export const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

/**
 * Formats file size to human readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Downloads a file from a URL or data URL
 * @param {string} url - The URL or data URL of the file
 * @param {string} filename - The name to save the file as
 */
export const downloadFile = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Reads a file as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} A promise that resolves with the file content as text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

/**
 * Converts a base64 string to a Blob
 * @param {string} base64 - The base64 string
 * @param {string} type - The MIME type of the file
 * @returns {Blob} The Blob object
 */
export const base64ToBlob = (base64, type = '') => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type });
};

/**
 * Creates a preview URL for an image file
 * @param {File} file - The image file
 * @returns {Promise<string>} A promise that resolves with the preview URL
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Gets the MIME type from a file extension
 * @param {string} extension - The file extension (without dot)
 * @returns {string} The corresponding MIME type or 'application/octet-stream' if unknown
 */
export const getMimeType = (extension) => {
  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};
