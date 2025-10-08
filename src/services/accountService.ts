import { Account, AccountType, Transaction, User, AuthResponse } from '../types';

export class AccountService {
  private users: Map<string, User> = new Map(); // phoneNumber -> User
  private accounts: Map<string, Account[]> = new Map(); // userId -> Account[]
  private transactions: Map<string, Transaction[]> = new Map(); // accountId -> Transaction[]

  // Account type configurations
  private accountTypes: Record<AccountType, { name: string; minBalance: number }> = {
    balanced_fund: { name: 'Balanced Fund', minBalance: 1000 },
    fixed_income: { name: 'Fixed Income Fund', minBalance: 5000 },
    money_market: { name: 'Money Market Fund', minBalance: 10000 },
    stock_market: { name: 'Stock Market Fund', minBalance: 20000 }
  };

  // Create new user account
  createUser(name: string, phoneNumber: string, idNumber: string, pin: string): AuthResponse {
    // Check if user already exists
    if (this.users.has(phoneNumber)) {
      throw new Error('Account already exists with this phone number');
    }

    const user: User = {
      id: this.generateId(),
      name,
      phoneNumber,
      idNumber,
      pin,
      createdAt: new Date()
    };

    this.users.set(phoneNumber, user);
    this.accounts.set(user.id!, []);

    return {
      token: this.generateToken(user.id!),
      user
    };
  }

  // Login user
  login(phoneNumber: string, pin: string): AuthResponse {
    const user = this.users.get(phoneNumber);
    if (!user || user.pin !== pin) {
      throw new Error('Invalid phone number or PIN');
    }

    return {
      token: this.generateToken(user.id!),
      user
    };
  }

  // Create account of specific type
  createAccount(userId: string, type: AccountType): Account {
    const userAccounts = this.accounts.get(userId) || [];
    
    // Check if user already has this account type
    if (userAccounts.some(acc => acc.type === type)) {
      throw new Error(`You already have a ${this.accountTypes[type].name} account`);
    }

    const account: Account = {
      id: this.generateId(),
      userId,
      type,
      balance: 0,
      accountNumber: this.generateAccountNumber(type),
      createdAt: new Date()
    };

    userAccounts.push(account);
    this.accounts.set(userId, userAccounts);
    this.transactions.set(account.id, []);

    return account;
  }

  // Get user accounts
  getUserAccounts(userId: string): Account[] {
    return this.accounts.get(userId) || [];
  }

  // Get account by ID
  getAccount(accountId: string): Account | undefined {
    for (const accounts of this.accounts.values()) {
      const account = accounts.find(acc => acc.id === accountId);
      if (account) return account;
    }
    return undefined;
  }

  // Deposit money
  deposit(accountId: string, amount: number, pin: string): Transaction {
    const account = this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const user = Array.from(this.users.values()).find(u => u.id === account.userId);
    if (!user || user.pin !== pin) throw new Error('Invalid PIN');

    if (amount <= 0) throw new Error('Amount must be positive');

    // Update balance
    account.balance += amount;

    // Create transaction
    const transaction: Transaction = {
      id: this.generateId(),
      accountId,
      type: 'deposit',
      amount,
      balance: account.balance,
      timestamp: new Date()
    };

    const accountTransactions = this.transactions.get(accountId) || [];
    accountTransactions.push(transaction);
    this.transactions.set(accountId, accountTransactions);

    return transaction;
  }

  // Withdraw money
  withdraw(accountId: string, amount: number, pin: string): Transaction {
    const account = this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const user = Array.from(this.users.values()).find(u => u.id === account.userId);
    if (!user || user.pin !== pin) throw new Error('Invalid PIN');

    if (amount <= 0) throw new Error('Amount must be positive');

    const minBalance = this.accountTypes[account.type].minBalance;
    if (account.balance - amount < minBalance) {
      throw new Error(`Insufficient funds. Minimum balance required: KES ${minBalance}`);
    }

    // Update balance
    account.balance -= amount;

    // Create transaction
    const transaction: Transaction = {
      id: this.generateId(),
      accountId,
      type: 'withdraw',
      amount,
      balance: account.balance,
      timestamp: new Date()
    };

    const accountTransactions = this.transactions.get(accountId) || [];
    accountTransactions.push(transaction);
    this.transactions.set(accountId, accountTransactions);

    return transaction;
  }

  // Get account balance
  getBalance(accountId: string, pin: string): number {
    const account = this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const user = Array.from(this.users.values()).find(u => u.id === account.userId);
    if (!user || user.pin !== pin) throw new Error('Invalid PIN');

    return account.balance;
  }

  // Get transaction history
  getTransactionHistory(accountId: string): Transaction[] {
    const transactions = this.transactions.get(accountId) || [];
    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get account type info
  getAccountTypeInfo(type: AccountType) {
    return this.accountTypes[type];
  }

  // Get all account types
  getAllAccountTypes(): Array<{ type: AccountType; name: string; minBalance: number }> {
    return Object.entries(this.accountTypes).map(([type, info]) => ({
      type: type as AccountType,
      name: info.name,
      minBalance: info.minBalance
    }));
  }

  // Validate PIN
  validatePin(pin: string): boolean {
    return /^\d{4}$/.test(pin) && !['0000', '1234', '1111', '2222', '3333', '4444'].includes(pin);
  }

  // Validate phone number
  validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^(\+254|254|0)?[17]\d{8}$/.test(cleaned);
  }

  // Format phone number
  formatPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) return '+254' + cleaned.slice(1);
    if (cleaned.startsWith('254')) return '+' + cleaned;
    if (cleaned.startsWith('+254')) return cleaned;
    return '+254' + cleaned;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private generateToken(userId: string): string {
    return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  }

  private generateAccountNumber(type: AccountType): string {
    const prefixes = {
      balanced_fund: 'BF',
      fixed_income: 'FI', 
      money_market: 'MM',
      stock_market: 'SM'
    };
    return prefixes[type] + Date.now().toString().slice(-8);
  }
}