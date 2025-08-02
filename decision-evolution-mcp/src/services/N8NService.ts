import axios from 'axios';
import { config } from '../config.js';

export class N8NService {
  private webhookBase: string;
  
  constructor() {
    this.webhookBase = config.n8n.webhook;
  }
  
  /**
   * Trigger decision capture workflow
   */
  async captureDecision(decision: {
    what: string;
    why: string;
    alternatives: string[];
    context: any;
  }) {
    try {
      const response = await axios.post(
        `${this.webhookBase}${config.n8n.endpoints.captureDecision}`,
        {
          timestamp: new Date().toISOString(),
          decision,
          source: 'mcp-manual'
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error triggering N8N workflow:', error);
      throw error;
    }
  }
  
  /**
   * Trigger pattern analysis workflow
   */
  async analyzePatterns(data: {
    decisions: any[];
    timeframe: string;
  }) {
    try {
      const response = await axios.post(
        `${this.webhookBase}${config.n8n.endpoints.analyzePattern}`,
        {
          timestamp: new Date().toISOString(),
          data,
          requestType: 'pattern-analysis'
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error triggering pattern analysis:', error);
      throw error;
    }
  }
  
  /**
   * Trigger alert for similar failed decisions
   */
  async triggerAlert(alert: {
    currentDecision: any;
    similarFailures: any[];
    riskScore: number;
  }) {
    try {
      const response = await axios.post(
        `${this.webhookBase}${config.n8n.endpoints.triggerAlert}`,
        {
          timestamp: new Date().toISOString(),
          alert,
          severity: alert.riskScore > 0.7 ? 'high' : 'medium'
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error triggering alert:', error);
      // Don't throw - alerts are non-critical
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Setup automated capture webhooks
   */
  async setupAutomatedCapture(sources: {
    git?: boolean;
    jira?: boolean;
    slack?: boolean;
    documents?: boolean;
  }) {
    const enabledSources = Object.entries(sources)
      .filter(([_, enabled]) => enabled)
      .map(([source]) => source);
    
    try {
      const response = await axios.post(
        `${this.webhookBase}/setup-capture`,
        {
          sources: enabledSources,
          callback: `${this.webhookBase}${config.n8n.endpoints.captureDecision}`
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error setting up automated capture:', error);
      throw error;
    }
  }
}