// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
  window.process = {
    browser: true,
    version: 'v18.0.0',
    env: {
      NODE_ENV: import.meta.env.MODE || 'development'
    }
  };
}

// Stream polyfill for blob-stream
if (typeof window !== 'undefined' && !window.BlobStream) {
  window.BlobStream = class BlobStream {
    constructor() {
      this.chunks = [];
      this.length = 0;
    }

    write(chunk) {
      if (chunk) {
        this.chunks.push(chunk);
        this.length += chunk.length || chunk.size || 0;
      }
      return true;
    }

    end() {
      // This would normally emit 'finish' event
      setTimeout(() => {
        if (this.onfinish) {
          this.onfinish();
        }
      }, 0);
    }

    pipe(destination) {
      return destination;
    }

    toBlob(mimeType = 'application/octet-stream') {
      return new Blob(this.chunks, { type: mimeType });
    }

    on(event, callback) {
      if (event === 'finish') {
        this.onfinish = callback;
      }
      return this;
    }
  };
}

// Stream polyfill
import { Readable as ReadableStream, Writable as WritableStream, Transform as TransformStream, Duplex as DuplexStream } from 'stream-browserify';

if (typeof window !== 'undefined') {
  // Make stream classes available globally
  window.ReadableStream = ReadableStream;
  window.WritableStream = WritableStream;
  window.TransformStream = TransformStream;
  window.DuplexStream = DuplexStream;

  // Also provide the stream module interface that blob-stream expects
  window.stream = {
    Readable: ReadableStream,
    Writable: WritableStream,
    Transform: TransformStream,
    Duplex: DuplexStream
  };
}

export default {};
