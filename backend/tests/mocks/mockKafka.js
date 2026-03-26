/**
 * Mock Kafka Client for Testing
 */

class MockKafkaProducer {
  constructor() {
    this.messages = [];
    this.connected = false;
  }
  
  async connect() {
    this.connected = true;
  }
  
  async disconnect() {
    this.connected = false;
  }
  
  async send({ topic, messages }) {
    for (const msg of messages) {
      this.messages.push({
        topic,
        key: msg.key,
        value: msg.value,
        timestamp: Date.now(),
      });
    }
    return [{ topicName: topic, partition: 0, errorCode: 0 }];
  }
  
  // Test helpers
  getMessages() {
    return this.messages;
  }
  
  getMessagesByTopic(topic) {
    return this.messages.filter(m => m.topic === topic);
  }
  
  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }
  
  clear() {
    this.messages = [];
  }
}

class MockKafkaConsumer {
  constructor({ groupId }) {
    this.groupId = groupId;
    this.subscriptions = [];
    this.messages = [];
    this.running = false;
    this.messageHandler = null;
  }
  
  async connect() {
    this.connected = true;
  }
  
  async disconnect() {
    this.connected = false;
    this.running = false;
  }
  
  async subscribe({ topic, fromBeginning = false }) {
    this.subscriptions.push({ topic, fromBeginning });
  }
  
  async run({ eachMessage, eachBatch }) {
    this.running = true;
    this.messageHandler = eachMessage;
    this.batchHandler = eachBatch;
  }
  
  async stop() {
    this.running = false;
  }
  
  // Test helpers - simulate receiving a message
  async simulateMessage(topic, key, value, partition = 0) {
    if (!this.running) {
      throw new Error('Consumer not running');
    }
    
    const message = {
      topic,
      partition,
      message: {
        key: Buffer.from(key),
        value: Buffer.from(JSON.stringify(value)),
        timestamp: Date.now().toString(),
        offset: this.messages.length.toString(),
      },
    };
    
    this.messages.push(message);
    
    if (this.messageHandler) {
      await this.messageHandler(message);
    }
    
    return message;
  }
  
  async simulateBatch(topic, messages, partition = 0) {
    if (!this.running || !this.batchHandler) {
      throw new Error('Consumer not running or no batch handler');
    }
    
    const batch = {
      batch: {
        topic,
        partition,
        messages: messages.map((msg, i) => ({
          key: Buffer.from(msg.key),
          value: Buffer.from(JSON.stringify(msg.value)),
          timestamp: Date.now().toString(),
          offset: (this.messages.length + i).toString(),
        })),
      },
      resolveOffset: jest.fn(),
      heartbeat: jest.fn(),
      commitOffsetsIfNecessary: jest.fn(),
      isRunning: () => this.running,
      isStale: () => false,
    };
    
    await this.batchHandler(batch);
    return batch;
  }
  
  getSubscriptions() {
    return this.subscriptions;
  }
  
  clear() {
    this.messages = [];
    this.subscriptions = [];
  }
}

class MockKafka {
  constructor() {
    this.producers = [];
    this.consumers = [];
  }
  
  producer() {
    const producer = new MockKafkaProducer();
    this.producers.push(producer);
    return producer;
  }
  
  consumer({ groupId }) {
    const consumer = new MockKafkaConsumer({ groupId });
    this.consumers.push(consumer);
    return consumer;
  }
  
  // Test helpers
  getLastProducer() {
    return this.producers[this.producers.length - 1];
  }
  
  getLastConsumer() {
    return this.consumers[this.consumers.length - 1];
  }
  
  getAllMessages() {
    return this.producers.flatMap(p => p.getMessages());
  }
  
  clear() {
    this.producers.forEach(p => p.clear());
    this.consumers.forEach(c => c.clear());
  }
}

module.exports = {
  MockKafka,
  MockKafkaProducer,
  MockKafkaConsumer,
};
