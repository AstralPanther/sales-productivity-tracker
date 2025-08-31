// Jest setup file
global.console = {
    ...console,
    // Suppress console.log during tests, but keep errors and warnings
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
};

// Mock localStorage for tests
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Electron APIs
global.window = {
    electronAPI: {
        getData: jest.fn(),
        updatePoints: jest.fn(),
        updateSettings: jest.fn(),
        clearSetupCache: jest.fn()
    }
};

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
});