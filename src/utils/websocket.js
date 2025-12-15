/**
 * WebSocket client for receiving real-time code execution results
 * 
 * The WebSocket connection is established when the user enters the interview interface.
 * Results are received asynchronously after code submission.
 */

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

if (!WEBSOCKET_URL) {
  console.warn(
    'VITE_WEBSOCKET_URL is not set. WebSocket connection for real-time results will not work.'
  );
}

/**
 * Creates and manages a WebSocket connection to the AWS API Gateway WebSocket API
 */
export class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = new Map();
    this.connectionId = null;
    this.isConnecting = false;
    this.isConnected = false;
    this.userId = null;
  }

  /**
   * Connect to WebSocket
   * @param {string} userId - The user ID to associate with this connection
   * @returns {Promise<void>}
   */
  connect(userId) {
    if (!WEBSOCKET_URL) {
      console.warn('WebSocket URL is not configured (VITE_WEBSOCKET_URL). WebSocket features will be disabled.');
      return Promise.resolve(); // Don't throw, just skip connection
    }

    if (this.isConnecting || this.isConnected) {
      console.log('WebSocket already connecting or connected');
      return Promise.resolve();
    }

    this.userId = userId;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Convert HTTPS URL to WSS URL and add userId as query parameter
        const wsUrl = WEBSOCKET_URL.replace('https://', 'wss://');
        const wsUrlWithParams = `${wsUrl}?userId=${encodeURIComponent(userId)}`;
        this.ws = new WebSocket(wsUrlWithParams);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Connection established - userId is already sent via query string
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.connectionId = null;
          
          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId).catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Send a message through the WebSocket
   * @param {object} message - The message to send
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {object} message - The parsed message
   */
  handleMessage(message) {
    console.log('WebSocket message received:', message);

    // Handle connection ID assignment
    if (message.type === 'connectionId') {
      this.connectionId = message.connectionId;
      this.emit('connectionId', message.connectionId);
      return;
    }

    // Handle code execution results
    if (message.type === 'result' || message.type === 'testResult') {
      this.emit('result', message);
      return;
    }

    // Emit generic message event
    this.emit('message', message);
  }

  /**
   * Register a listener for a specific event type
   * @param {string} event - Event type ('result', 'connectionId', 'message')
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Remove a listener
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionId = null;
    this.listeners.clear();
  }

  /**
   * Get the current connection status
   * @returns {boolean}
   */
  get connected() {
    return this.isConnected;
  }

  /**
   * Get the connection ID
   * @returns {string|null}
   */
  getConnectionId() {
    return this.connectionId;
  }
}

// Singleton instance
let wsClientInstance = null;

/**
 * Get the singleton WebSocket client instance
 * @returns {WebSocketClient}
 */
export const getWebSocketClient = () => {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient();
  }
  return wsClientInstance;
};

