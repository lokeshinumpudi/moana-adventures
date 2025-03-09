// Mock for socket.io-client
const socketMock = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  removeAllListeners: jest.fn(),
  id: 'test-socket-id'
};

export const io = jest.fn().mockImplementation(() => socketMock); 