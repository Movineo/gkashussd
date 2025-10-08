import axios, { AxiosInstance } from 'axios';

export interface SendSMSRequest {
  phoneNumber: string;
  message: string;
}

export interface USSDResponseData {
  sessionId: string;
  msisdn: string;
  response: string;
  continueSession?: boolean;
}

export class TiaraConnectService {
  private client: AxiosInstance;
  private shortcode: string;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.TIARA_CONNECT_BASE_URL || 'https://api.tiaraconnect.io/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TIARA_CONNECT_API_KEY || ''}`
      }
    });

    this.shortcode = process.env.TIARA_CONNECT_SHORTCODE || '*123#';

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('TiaraConnect API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'TiaraConnect request failed');
      }
    );
  }

  /**
   * Send SMS notification to user
   */
  async sendSMS(data: SendSMSRequest): Promise<void> {
    try {
      await this.client.post('/sms/send', {
        to: data.phoneNumber,
        from: this.shortcode,
        message: data.message
      });
      console.log(`SMS sent to ${data.phoneNumber}`);
    } catch (error: any) {
      console.error('Failed to send SMS:', error.message);
      // Don't throw error - SMS failures shouldn't break the flow
    }
  }

  /**
   * Send USSD response back to TiaraConnect
   */
  async sendUSSDResponse(data: USSDResponseData): Promise<void> {
    await this.client.post('/ussd/respond', {
      sessionId: data.sessionId,
      msisdn: data.msisdn,
      message: data.response,
      continueSession: data.continueSession ?? data.response.startsWith('CON')
    });
  }

  /**
   * Format USSD response for TiaraConnect
   */
  formatUSSDResponse(message: string, continueSession: boolean = true): string {
    // TiaraConnect expects responses to start with CON (continue) or END (terminate)
    const prefix = continueSession ? 'CON' : 'END';
    
    // If message already has prefix, return as is
    if (message.startsWith('CON ') || message.startsWith('END ')) {
      return message;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Send transaction notification SMS
   */
  async sendTransactionNotification(phoneNumber: string, type: string, amount: number, balance: number): Promise<void> {
    const message = `GKash: ${type} of KES ${amount.toFixed(2)} successful. New balance: KES ${balance.toFixed(2)}`;
    await this.sendSMS({ phoneNumber, message });
  }

  /**
   * Send account creation notification
   */
  async sendAccountCreationNotification(phoneNumber: string, accountType: string): Promise<void> {
    const message = `GKash: Your ${accountType} account has been created successfully. Dial ${this.shortcode} to access your account.`;
    await this.sendSMS({ phoneNumber, message });
  }

  /**
   * Get shortcode for display purposes
   */
  getShortcode(): string {
    return this.shortcode;
  }
}
