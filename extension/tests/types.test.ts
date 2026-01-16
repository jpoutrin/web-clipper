import {
  ServerConfig,
  ClipPayload,
  ClipResponse,
  AuthState,
  ImagePayload,
} from '../src/types';

describe('Type Definitions', () => {
  describe('AuthState', () => {
    it('should allow null tokens', () => {
      const state: AuthState = {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        serverUrl: '',
      };
      expect(state.accessToken).toBeNull();
    });

    it('should allow string tokens', () => {
      const state: AuthState = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        serverUrl: 'https://example.com',
      };
      expect(state.accessToken).toBe('test-token');
    });
  });

  describe('ServerConfig', () => {
    it('should have required image config', () => {
      const config: ServerConfig = {
        clipDirectory: '/clips',
        defaultFormat: 'markdown',
        images: {
          maxSizeBytes: 5242880,
          maxDimensionPx: 2048,
          maxTotalBytes: 26214400,
          convertToWebp: false,
        },
      };
      expect(config.images.maxSizeBytes).toBe(5242880);
    });
  });

  describe('ClipPayload', () => {
    it('should have all required fields', () => {
      const payload: ClipPayload = {
        title: 'Test Title',
        url: 'https://example.com',
        markdown: '# Test',
        tags: ['tag1', 'tag2'],
        notes: 'Some notes',
        images: [],
      };
      expect(payload.title).toBe('Test Title');
      expect(payload.tags).toHaveLength(2);
    });

    it('should allow images with base64 data', () => {
      const image: ImagePayload = {
        filename: 'test.jpg',
        data: 'base64encodeddata',
        originalUrl: 'https://example.com/image.jpg',
      };
      const payload: ClipPayload = {
        title: 'Test',
        url: 'https://example.com',
        markdown: '# Test',
        tags: [],
        notes: '',
        images: [image],
      };
      expect(payload.images).toHaveLength(1);
      expect(payload.images[0].filename).toBe('test.jpg');
    });
  });

  describe('ClipResponse', () => {
    it('should indicate success with path', () => {
      const response: ClipResponse = {
        success: true,
        path: 'web-clips/20260116/test.md',
      };
      expect(response.success).toBe(true);
      expect(response.path).toBeDefined();
    });

    it('should indicate failure with error', () => {
      const response: ClipResponse = {
        success: false,
        error: 'Something went wrong',
      };
      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });
});
