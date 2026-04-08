/**
 * Retry + Circuit Breaker utilities for external API calls.
 */

async function withRetry(fn, options = {}) {
  const { maxAttempts = 3, backoffMs = 1000, backoffMultiplier = 2, log } = options;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = backoffMs * Math.pow(backoffMultiplier, attempt - 1);
        if (log) log('warn', 'Retry', `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`, { error: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'closed';
    this.failures = 0;
    this.lastFailure = 0;
    this.log = options.log || (() => {});
  }

  async fire(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        this.log('info', 'CircuitBreaker', `${this.name}: half-open, testing`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is open`);
      }
    }
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        this.log('info', 'CircuitBreaker', `${this.name}: closed (recovered)`);
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        this.log('warn', 'CircuitBreaker', `${this.name}: OPEN after ${this.failures} failures`, { error: err.message });
      }
      throw err;
    }
  }
}

module.exports = { withRetry, CircuitBreaker };
