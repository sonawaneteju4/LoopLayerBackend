import logger from '../utils/logger.js';

class SSEService {
  constructor() {
    this.clients = new Set();
    this.heartbeatInterval = null;
    this.startHeartbeat();
  }

  /**
   * Adds an authenticated admin client connection to the SSE pool.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {Object} [metadata]
   */
  addClient(req, res, metadata = {}) {
    // Set headers for SSE stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, Render)
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    res.flushHeaders?.();

    const client = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      res,
      adminId: req.admin?._id || metadata.adminId || 'unknown',
      connectedAt: new Date(),
    };

    this.clients.add(client);
    logger.info(`[SSE] Admin client connected: ${client.id} (total active: ${this.clients.size})`);

    // Initial greeting / handshake
    client.res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId: client.id, timestamp: new Date().toISOString() })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(client);
      logger.info(`[SSE] Admin client disconnected: ${client.id} (remaining active: ${this.clients.size})`);
    });
  }

  /**
   * Broadcast an event and payload to all connected admin clients.
   *
   * @param {string} event - Event name (e.g. 'NEW_EMAIL', 'INBOX_STATS_UPDATED')
   * @param {Object} data - Payload data
   */
  broadcast(event, data = {}) {
    if (this.clients.size === 0) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const client of this.clients) {
      try {
        client.res.write(message);
      } catch (err) {
        logger.warn(`[SSE] Failed to write to client ${client.id}, removing: ${err.message}`);
        this.clients.delete(client);
      }
    }
  }

  /**
   * 25-second keep-alive comment to prevent cloud proxy disconnects
   */
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) return;
      for (const client of this.clients) {
        try {
          client.res.write(': ping\n\n');
        } catch {
          this.clients.delete(client);
        }
      }
    }, 25000);

    // Prevent keep-alive timer from blocking node process shutdown
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

const sseService = new SSEService();
export default sseService;

