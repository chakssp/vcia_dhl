/**
 * RingBuffer.js
 * Lock-free ring buffer for high-performance event buffering
 */

export class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    
    // For thread-safe operations (if using SharedArrayBuffer)
    this.useShared = typeof SharedArrayBuffer !== 'undefined';
    
    if (this.useShared) {
      // Use SharedArrayBuffer for multi-threaded access
      this.indices = new SharedArrayBuffer(16);
      this.headIndex = new Int32Array(this.indices, 0, 1);
      this.tailIndex = new Int32Array(this.indices, 4, 1);
      this.sizeIndex = new Int32Array(this.indices, 8, 1);
      
      Atomics.store(this.headIndex, 0, 0);
      Atomics.store(this.tailIndex, 0, 0);
      Atomics.store(this.sizeIndex, 0, 0);
    }
  }
  
  /**
   * Push item to buffer
   */
  push(item) {
    if (this.isFull()) {
      // Overwrite oldest item
      this.pop();
    }
    
    if (this.useShared) {
      const tail = Atomics.load(this.tailIndex, 0);
      this.buffer[tail] = item;
      
      const newTail = (tail + 1) % this.capacity;
      Atomics.store(this.tailIndex, 0, newTail);
      Atomics.add(this.sizeIndex, 0, 1);
    } else {
      this.buffer[this.tail] = item;
      this.tail = (this.tail + 1) % this.capacity;
      this.size++;
    }
    
    return true;
  }
  
  /**
   * Pop item from buffer
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    
    let item;
    
    if (this.useShared) {
      const head = Atomics.load(this.headIndex, 0);
      item = this.buffer[head];
      
      const newHead = (head + 1) % this.capacity;
      Atomics.store(this.headIndex, 0, newHead);
      Atomics.sub(this.sizeIndex, 0, 1);
    } else {
      item = this.buffer[this.head];
      this.buffer[this.head] = undefined; // Help GC
      this.head = (this.head + 1) % this.capacity;
      this.size--;
    }
    
    return item;
  }
  
  /**
   * Peek at head without removing
   */
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    
    if (this.useShared) {
      const head = Atomics.load(this.headIndex, 0);
      return this.buffer[head];
    } else {
      return this.buffer[this.head];
    }
  }
  
  /**
   * Consume multiple items at once
   */
  consume(count) {
    const items = [];
    const toConsume = Math.min(count, this.getSize());
    
    for (let i = 0; i < toConsume; i++) {
      const item = this.pop();
      if (item !== null) {
        items.push(item);
      }
    }
    
    return items;
  }
  
  /**
   * Check if buffer is empty
   */
  isEmpty() {
    if (this.useShared) {
      return Atomics.load(this.sizeIndex, 0) === 0;
    } else {
      return this.size === 0;
    }
  }
  
  /**
   * Check if buffer is full
   */
  isFull() {
    if (this.useShared) {
      return Atomics.load(this.sizeIndex, 0) >= this.capacity;
    } else {
      return this.size >= this.capacity;
    }
  }
  
  /**
   * Get current size
   */
  getSize() {
    if (this.useShared) {
      return Atomics.load(this.sizeIndex, 0);
    } else {
      return this.size;
    }
  }
  
  /**
   * Get buffer usage percentage
   */
  usage() {
    return this.getSize() / this.capacity;
  }
  
  /**
   * Clear buffer
   */
  clear() {
    if (this.useShared) {
      Atomics.store(this.headIndex, 0, 0);
      Atomics.store(this.tailIndex, 0, 0);
      Atomics.store(this.sizeIndex, 0, 0);
    } else {
      this.head = 0;
      this.tail = 0;
      this.size = 0;
    }
    
    // Clear references for GC
    this.buffer.fill(undefined);
  }
  
  /**
   * Get all items without removing
   */
  toArray() {
    const items = [];
    const size = this.getSize();
    
    if (size === 0) return items;
    
    if (this.useShared) {
      let index = Atomics.load(this.headIndex, 0);
      for (let i = 0; i < size; i++) {
        items.push(this.buffer[index]);
        index = (index + 1) % this.capacity;
      }
    } else {
      let index = this.head;
      for (let i = 0; i < this.size; i++) {
        items.push(this.buffer[index]);
        index = (index + 1) % this.capacity;
      }
    }
    
    return items;
  }
  
  /**
   * Get buffer statistics
   */
  getStats() {
    const size = this.getSize();
    return {
      capacity: this.capacity,
      size: size,
      usage: (size / this.capacity) * 100,
      available: this.capacity - size,
      head: this.useShared ? Atomics.load(this.headIndex, 0) : this.head,
      tail: this.useShared ? Atomics.load(this.tailIndex, 0) : this.tail
    };
  }
}

export default RingBuffer;