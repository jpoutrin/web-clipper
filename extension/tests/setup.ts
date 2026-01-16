// Chrome API mocks for testing

const mockStorage: Record<string, unknown> = {};

const chromeMock = {
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn().mockResolvedValue({}),
    getURL: jest.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys: string[]) => {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => {
          if (mockStorage[key]) {
            result[key] = mockStorage[key];
          }
        });
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, title: 'Test Tab', url: 'https://example.com' }]),
    sendMessage: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 2 }),
  },
};

// Assign to global
(global as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});
