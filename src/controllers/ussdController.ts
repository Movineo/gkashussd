import { Request, Response } from 'express';
import { USSDRequest, USSDState, AccountType } from '../types';
import { SessionService } from '../services/sessionService';
import { GKashService } from '../services/gkashService';
import { TiaraConnectService } from '../services/tiaraConnectService';

export class USSDController {
  private sessionService = new SessionService();
  private gkashService = new GKashService();
  private tiaraService = new TiaraConnectService();

  async handleUSSDRequest(req: Request, res: Response): Promise<void> {
    try {
      const ussdRequest: USSDRequest = {
        sessionId: req.body.sessionId || req.body.SessionId || '',
        phoneNumber: req.body.phoneNumber || req.body.msisdn || '',
        text: req.body.text || req.body.Text || ''
      };

      if (!ussdRequest.phoneNumber || !ussdRequest.sessionId) {
        res.send('END Invalid request');
        return;
      }

      const response = await this.processUSSD(ussdRequest);
      res.set('Content-Type', 'text/plain');
      res.send(response);

    } catch (error: any) {
      console.error('USSD Error:', error);
      res.send(`END Error: ${error.message}`);
    }
  }

  private async processUSSD(request: USSDRequest): Promise<string> {
    const { sessionId, phoneNumber, text } = request;
    const input = text.trim();

    let session = this.sessionService.getSession(sessionId);
    if (!session) {
      session = this.sessionService.createSession(sessionId, phoneNumber);
    }

    try {
      switch (session.currentState) {
        case USSDState.WELCOME:
          return await this.handleWelcome(sessionId, input);
        case USSDState.CREATE_NAME:
          return this.handleCreateName(sessionId, input);
        case USSDState.CREATE_PHONE:
          return this.handleCreatePhone(sessionId, input);
        case USSDState.CREATE_ID:
          return this.handleCreateId(sessionId, input);
        case USSDState.CREATE_PIN:
          return this.handleCreatePin(sessionId, input);
        case USSDState.SELECT_ACCOUNT_TYPE:
          return await this.handleSelectAccountType(sessionId, input);
        case USSDState.MAIN_MENU:
          return await this.handleMainMenu(sessionId, input);
        case USSDState.WITHDRAW_AMOUNT:
          return this.handleWithdrawAmount(sessionId, input);
        case USSDState.WITHDRAW_PIN:
          return await this.handleWithdrawPin(sessionId, input);
        case USSDState.DEPOSIT_AMOUNT:
          return this.handleDepositAmount(sessionId, input);
        case USSDState.DEPOSIT_PIN:
          return await this.handleDepositPin(sessionId, input);
        case USSDState.BALANCE_PIN:
          return await this.handleBalancePin(sessionId, input);
        case USSDState.TRACK_ACCOUNTS:
          return await this.handleTrackAccounts(sessionId, input);
        case USSDState.TRANSACTION_HISTORY:
          return await this.handleTransactionHistory(sessionId, input);
        default:
          return 'END Invalid session';
      }
    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Welcome menu
  private async handleWelcome(sessionId: string, input: string): Promise<string> {
    if (!input) {
      return `CON Welcome to GKash Fund Manager
1. Create Account
2. Main Menu
3. Help`;
    }

    switch (input) {
      case '1':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.CREATE_NAME });
        return 'CON Enter your full name:';
      case '2':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.MAIN_MENU });
        return await this.handleMainMenu(sessionId, '');
      case '3':
        this.sessionService.clearSession(sessionId);
        return `END GKash Help

Available Services:
• Create Account - Set up new fund account
• Deposit - Add money to your account
• Withdraw - Take money from account
• Check Balance - View account balance
• Track Accounts - View all your accounts

Support: Call 0700-GKASH`;
      default:
        return `CON Invalid option. Choose:
1. Create Account
2. Main Menu
3. Help`;
    }
  }

  private handleHelp(sessionId: string): string {
    this.sessionService.clearSession(sessionId);
    return `END GKash Help

Available Services:
• Create Account - Set up new fund account
• Deposit - Add money to your account
• Withdraw - Take money from account
• Check Balance - View account balance
• Track Accounts - View all your accounts

Support: Call 0700-GKASH`;
  }

  // Create account flow
  private handleCreateName(sessionId: string, input: string): string {
    if (!input || input.length < 2) {
      return 'CON Invalid name. Enter your full name:';
    }

    this.sessionService.setTempData(sessionId, 'name', input);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.CREATE_PHONE });
    return 'CON Enter your phone number:';
  }

  private handleCreatePhone(sessionId: string, input: string): string {
    if (!this.validatePhone(input)) {
      return 'CON Invalid phone number. Enter phone (e.g. 0712345678):';
    }

    const formattedPhone = this.formatPhone(input);
    this.sessionService.setTempData(sessionId, 'phoneNumber', formattedPhone);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.CREATE_ID });
    return 'CON Enter your ID number (8 digits):';
  }

  private handleCreateId(sessionId: string, input: string): string {
    if (!/^\d{8}$/.test(input)) {
      return 'CON Invalid ID. Enter 8-digit ID number:';
    }

    this.sessionService.setTempData(sessionId, 'idNumber', input);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.CREATE_PIN });
    return 'CON Create 4-digit PIN:';
  }

  private handleCreatePin(sessionId: string, input: string): string {
    if (!this.validatePin(input)) {
      return 'CON Invalid PIN. Create 4-digit PIN (not 0000, 1234, etc):';
    }

    this.sessionService.setTempData(sessionId, 'pin', input);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.SELECT_ACCOUNT_TYPE });

    const accountTypes = this.getAllAccountTypes();
    let menu = 'CON Select Account Type:\n';
    accountTypes.forEach((type, index) => {
      menu += `${index + 1}. ${type.name} (Min: KES ${type.minBalance})\n`;
    });
    return menu.trimEnd();
  }

  private async handleSelectAccountType(sessionId: string, input: string): Promise<string> {
    const accountTypes = this.getAllAccountTypes();
    const selectedIndex = parseInt(input) - 1;

    if (selectedIndex < 0 || selectedIndex >= accountTypes.length) {
      return 'CON Invalid selection. Choose 1-4:';
    }

    try {
      const name = this.sessionService.getTempData(sessionId, 'name');
      const phoneNumber = this.sessionService.getTempData(sessionId, 'phoneNumber');
      const idNumber = this.sessionService.getTempData(sessionId, 'idNumber');
      const pin = this.sessionService.getTempData(sessionId, 'pin');
      const accountType = accountTypes[selectedIndex].type;

      // Create user via GKash API
      const user = await this.gkashService.createUser({
        name,
        phoneNumber,
        idNumber,
        pin
      });
      
      // Create account via GKash API
      const account = await this.gkashService.createAccount({
        userId: user.id!,
        accountType
      });

      // Send SMS notification via TiaraConnect
      await this.tiaraService.sendAccountCreationNotification(
        phoneNumber,
        accountTypes[selectedIndex].name
      );

      this.sessionService.clearSession(sessionId);
      return `END Account Created Successfully!

Name: ${name}
Account: ${account.accountNumber}
Type: ${accountTypes[selectedIndex].name}

You can now deposit, withdraw, and check balance.

Welcome to GKash!`;

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Main menu
  private async handleMainMenu(sessionId: string, input: string): Promise<string> {
    if (!input) {
      return `CON GKash Main Menu
1. Deposit Money
2. Withdraw Money  
3. Check Balance
4. Track Accounts
0. Exit`;
    }

    switch (input) {
      case '1':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.DEPOSIT_AMOUNT });
        return 'CON Enter amount to deposit:';
      case '2':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.WITHDRAW_AMOUNT });
        return 'CON Enter amount to withdraw:';
      case '3':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.BALANCE_PIN });
        return 'CON Enter your PIN:';
      case '4':
        this.sessionService.updateSession(sessionId, { currentState: USSDState.TRACK_ACCOUNTS });
        return await this.handleTrackAccounts(sessionId, '');
      case '0':
        this.sessionService.clearSession(sessionId);
        return 'END Thank you for using GKash!';
      default:
        return `CON Invalid option. Choose 1-4 or 0:`;
    }
  }

  // Deposit flow
  private handleDepositAmount(sessionId: string, input: string): string {
    const amount = parseFloat(input);
    if (!amount || amount <= 0) {
      return 'CON Invalid amount. Enter amount to deposit:';
    }

    this.sessionService.setTempData(sessionId, 'amount', amount);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.DEPOSIT_PIN });
    return `CON Confirm deposit of KES ${amount}
Enter your PIN:`;
  }

  private async handleDepositPin(sessionId: string, input: string): Promise<string> {
    try {
      const session = this.sessionService.getSession(sessionId)!;
      const amount = this.sessionService.getTempData(sessionId, 'amount');
      
      // Login via GKash API to authenticate
      const { user } = await this.gkashService.login({
        phoneNumber: session.phoneNumber,
        pin: input
      });
      
      // Get user accounts from GKash API
      const accounts = await this.gkashService.getUserAccounts(user.id!);
      
      if (accounts.length === 0) {
        return 'END No accounts found. Please create an account first.';
      }

      // Deposit to first account via GKash API
      const transaction = await this.gkashService.deposit({
        accountId: accounts[0].id,
        amount,
        pin: input
      });
      
      // Send SMS notification
      await this.tiaraService.sendTransactionNotification(
        session.phoneNumber,
        'Deposit',
        amount,
        transaction.balance
      );
      
      this.sessionService.clearSession(sessionId);
      return `END Deposit Successful!

Amount: KES ${transaction.amount}
New Balance: KES ${transaction.balance}
Account: ${accounts[0].accountNumber}
Time: ${transaction.timestamp.toLocaleString()}`;

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Withdraw flow
  private handleWithdrawAmount(sessionId: string, input: string): string {
    const amount = parseFloat(input);
    if (!amount || amount <= 0) {
      return 'CON Invalid amount. Enter amount to withdraw:';
    }

    this.sessionService.setTempData(sessionId, 'amount', amount);
    this.sessionService.updateSession(sessionId, { currentState: USSDState.WITHDRAW_PIN });
    return `CON Confirm withdrawal of KES ${amount}
Enter your PIN:`;
  }

  private async handleWithdrawPin(sessionId: string, input: string): Promise<string> {
    try {
      const session = this.sessionService.getSession(sessionId)!;
      const amount = this.sessionService.getTempData(sessionId, 'amount');
      
      // Login via GKash API
      const { user } = await this.gkashService.login({
        phoneNumber: session.phoneNumber,
        pin: input
      });
      const accounts = await this.gkashService.getUserAccounts(user.id!);
      
      if (accounts.length === 0) {
        return 'END No accounts found.';
      }

      // Withdraw via GKash API
      const transaction = await this.gkashService.withdraw({
        accountId: accounts[0].id,
        amount,
        pin: input
      });
      
      // Send SMS notification
      await this.tiaraService.sendTransactionNotification(
        session.phoneNumber,
        'Withdrawal',
        amount,
        transaction.balance
      );
      
      this.sessionService.clearSession(sessionId);
      return `END Withdrawal Successful!

Amount: KES ${transaction.amount}
New Balance: KES ${transaction.balance}
Account: ${accounts[0].accountNumber}
Time: ${transaction.timestamp.toLocaleString()}`;

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Balance check
  private async handleBalancePin(sessionId: string, input: string): Promise<string> {
    try {
      const session = this.sessionService.getSession(sessionId)!;
      
      // Login via GKash API
      const { user } = await this.gkashService.login({
        phoneNumber: session.phoneNumber,
        pin: input
      });
      const accounts = await this.gkashService.getUserAccounts(user.id!);
      
      if (accounts.length === 0) {
        return 'END No accounts found.';
      }

      let balanceText = 'END Account Balances:\n\n';
      accounts.forEach((account: any) => {
        const typeInfo = this.getAccountTypeInfo(account.type);
        balanceText += `${typeInfo.name}
Account: ${account.accountNumber}
Balance: KES ${account.balance}

`;
      });

      this.sessionService.clearSession(sessionId);
      return balanceText + `Updated: ${new Date().toLocaleString()}`;

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Track accounts
  private async handleTrackAccounts(sessionId: string, input: string): Promise<string> {
    if (!input) {
      this.sessionService.updateSession(sessionId, { currentState: USSDState.BALANCE_PIN });
      return 'CON Enter PIN to view accounts:';
    }

    try {
      const session = this.sessionService.getSession(sessionId)!;
      
      // Login via GKash API
      const { user } = await this.gkashService.login({
        phoneNumber: session.phoneNumber,
        pin: input
      });
      const accounts = await this.gkashService.getUserAccounts(user.id!);
      
      if (accounts.length === 0) {
        return 'END No accounts found.';
      }

      let accountList = 'CON Your Accounts:\n';
      accounts.forEach((account: any, index: number) => {
        const typeInfo = this.getAccountTypeInfo(account.type);
        accountList += `${index + 1}. ${typeInfo.name} - KES ${account.balance}\n`;
      });
      accountList += `${accounts.length + 1}. View Transaction History\n0. Main Menu`;

      this.sessionService.updateSession(sessionId, { currentState: USSDState.TRANSACTION_HISTORY });
      return accountList;

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Transaction history
  private async handleTransactionHistory(sessionId: string, input: string): Promise<string> {
    try {
      const session = this.sessionService.getSession(sessionId)!;
      
      // Get user by phone
      const user = await this.gkashService.getUserByPhone(session.phoneNumber);
      if (!user) {
        return 'END User not found.';
      }
      
      const accounts = await this.gkashService.getUserAccounts(user.id!);
      
      if (input === '0') {
        this.sessionService.updateSession(sessionId, { currentState: USSDState.MAIN_MENU });
        return await this.handleMainMenu(sessionId, '');
      }

      const selectedIndex = parseInt(input) - 1;
      if (selectedIndex >= 0 && selectedIndex < accounts.length) {
        const transactions = await this.gkashService.getTransactionHistory(accounts[selectedIndex].id);
        
        if (transactions.length === 0) {
          return 'END No transactions found for this account.';
        }

        let historyText = 'END Transaction History:\n\n';
        transactions.slice(0, 5).forEach((tx: any) => {
          historyText += `${tx.type.toUpperCase()} - KES ${tx.amount}
Balance: KES ${tx.balance}
Date: ${tx.timestamp.toLocaleDateString()}

`;
        });

        this.sessionService.clearSession(sessionId);
        return historyText + (transactions.length > 5 ? '... and more' : '');
      }

      if (parseInt(input) === accounts.length + 1) {
        return this.handleTransactionHistory(sessionId, '1');
      }

      return 'CON Invalid selection. Try again:';

    } catch (error: any) {
      this.sessionService.clearSession(sessionId);
      return `END Error: ${error.message}`;
    }
  }

  // Utility methods
  private validatePhone(phone: string): boolean {
    const phoneRegex = /^(\+?254|0)[17]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  private formatPhone(phone: string): string {
    phone = phone.replace(/\s/g, '');
    if (phone.startsWith('0')) {
      return '+254' + phone.substring(1);
    }
    if (phone.startsWith('254')) {
      return '+' + phone;
    }
    return phone;
  }

  private validatePin(pin: string): boolean {
    if (!/^\d{4}$/.test(pin)) {
      return false;
    }

    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', 
                       '6666', '7777', '8888', '9999', '1234', '4321'];
    return !weakPins.includes(pin);
  }

  private getAllAccountTypes() {
    return [
      { type: 'balanced_fund' as AccountType, name: 'Balanced Fund', minBalance: 1000 },
      { type: 'fixed_income' as AccountType, name: 'Fixed Income', minBalance: 5000 },
      { type: 'money_market' as AccountType, name: 'Money Market', minBalance: 10000 },
      { type: 'stock_market' as AccountType, name: 'Stock Market', minBalance: 20000 }
    ];
  }

  private getAccountTypeInfo(type: AccountType) {
    const types = this.getAllAccountTypes();
    return types.find(t => t.type === type) || types[0];
  }

}