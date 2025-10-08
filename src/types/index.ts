// Core USSD Interface
export interface USSDRequest {
  sessionId: string;
  phoneNumber: string;
  text: string;
  serviceCode?: string;
}

// User Management
export interface User {
  id?: string;
  name: string;
  phoneNumber: string;
  idNumber: string;
  pin: string;
  createdAt?: Date;
}

// Account Types
export type AccountType = 'balanced_fund' | 'fixed_income' | 'money_market' | 'stock_market';

export interface Account {
  id: string;
  userId: string;
  type: AccountType;
  balance: number;
  accountNumber: string;
  createdAt: Date;
}

// Transaction Management
export interface Transaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  balance: number;
  timestamp: Date;
}

// Session Management
export interface Session {
  sessionId: string;
  phoneNumber: string;
  currentState: USSDState;
  tempData: Record<string, any>;
  lastActivity: Date;
  authToken?: string;
  userId?: string;
}

// API Response
export interface AuthResponse {
  token: string;
  user: User;
}

// Simplified USSD States
export enum USSDState {
  WELCOME = 'WELCOME',
  
  // Account Creation
  CREATE_NAME = 'CREATE_NAME',
  CREATE_PHONE = 'CREATE_PHONE',
  CREATE_ID = 'CREATE_ID',
  CREATE_PIN = 'CREATE_PIN',
  SELECT_ACCOUNT_TYPE = 'SELECT_ACCOUNT_TYPE',
  
  // Main Menu
  MAIN_MENU = 'MAIN_MENU',
  
  // Operations
  WITHDRAW_AMOUNT = 'WITHDRAW_AMOUNT',
  WITHDRAW_PIN = 'WITHDRAW_PIN',
  DEPOSIT_AMOUNT = 'DEPOSIT_AMOUNT',
  DEPOSIT_PIN = 'DEPOSIT_PIN',
  BALANCE_PIN = 'BALANCE_PIN',
  
  // Account Management
  TRACK_ACCOUNTS = 'TRACK_ACCOUNTS',
  TRANSACTION_HISTORY = 'TRANSACTION_HISTORY'
}