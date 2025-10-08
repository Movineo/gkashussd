import axios, { AxiosInstance } from 'axios';
import { User, Account, Transaction, AccountType } from '../types';

export interface CreateUserRequest {
  name: string;
  phoneNumber: string;
  idNumber: string;
  pin: string;
}

export interface LoginRequest {
  phoneNumber: string;
  pin: string;
}

export interface CreateAccountRequest {
  userId: string;
  accountType: AccountType;
}

export interface TransactionRequest {
  accountId: string;
  amount: number;
  pin: string;
}

export class GKashService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.GKASH_API_URL || 'http://localhost:4000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('GKash API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'API request failed');
      }
    );
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<{ user: User; token?: string }> {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    try {
      const response = await this.client.get(`/users/phone/${phoneNumber}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const response = await this.client.post('/accounts', data);
    return response.data;
  }

  async deposit(data: TransactionRequest): Promise<Transaction> {
    const response = await this.client.post('/transactions/deposit', data);
    return response.data;
  }

  async withdraw(data: TransactionRequest): Promise<Transaction> {
    const response = await this.client.post('/transactions/withdraw', data);
    return response.data;
  }

  async getBalance(accountId: string): Promise<number> {
    const response = await this.client.get(`/accounts/${accountId}/balance`);
    return response.data.balance;
  }

  async getUserAccounts(userId: string): Promise<Account[]> {
    const response = await this.client.get(`/users/${userId}/accounts`);
    return response.data;
  }

  async getTransactionHistory(accountId: string, limit: number = 10): Promise<Transaction[]> {
    const response = await this.client.get(`/accounts/${accountId}/transactions`, {
      params: { limit }
    });
    return response.data;
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    try {
      const response = await this.client.post('/auth/verify-pin', { userId, pin });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  }
}
