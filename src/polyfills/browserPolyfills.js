// Additional polyfill configuration for Node.js modules
export const nodePolyfills = () => {
  if (typeof window !== 'undefined') {
    // Buffer polyfill
    window.Buffer = require('buffer').Buffer;

    // Stream polyfill
    if (!window.ReadableStream) {
      window.ReadableStream = class ReadableStream {
        constructor() {
          this.chunks = [];
        }

        pipe(destination) {
          return destination;
        }
      };
    }

    // Process polyfill
    window.process = window.process || {
      browser: true,
      version: 'v18.0.0',
      env: {
        NODE_ENV: 'development'
      }
    };
  }
};

export default nodePolyfills;
