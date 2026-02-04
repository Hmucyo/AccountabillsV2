import axios from 'axios';

class MarqetaService {
  constructor() {
    this.baseURL = process.env.MARQETA_BASE_URL || 'https://sandbox-api.marqeta.com/v3';
    this.applicationToken = process.env.MARQETA_APPLICATION_TOKEN;
    this.adminAccessToken = process.env.MARQETA_ADMIN_ACCESS_TOKEN;
    
    // Create axios instance with Basic Auth
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.applicationToken,
        password: this.adminAccessToken,
      },
    });
  }

  // Create a new user
  async createUser(userData) {
    const response = await this.client.post('/users', {
      first_name: userData.first_name || userData.firstName,
      last_name: userData.last_name || userData.lastName,
      email: userData.email,
      active: true,
    });
    return response.data;
  }

  // Get user by token
  async getUser(userToken) {
    const response = await this.client.get(`/users/${userToken}`);
    return response.data;
  }

  // Find user by email (for recovering existing users)
  async findUserByEmail(email) {
    // Search for user by email - don't limit fields so we get the token
    const response = await this.client.get(`/users?email=${encodeURIComponent(email)}`);
    if (response.data?.data?.length > 0) {
      return response.data.data[0]; // Return the first matching user
    }
    return null;
  }

  // List all users
  async listUsers() {
    const response = await this.client.get('/users?count=100');
    return response.data;
  }

  // Get all card products
  async listCardProducts() {
    const response = await this.client.get('/cardproducts');
    return response.data;
  }

  // Create a card for a user
  async createCard(userToken, cardProductToken) {
    try {
      // Try to create with full PAN/CVV visible
      const response = await this.client.post('/cards?show_pan=true&show_cvv_number=true', {
        user_token: userToken,
        card_product_token: cardProductToken,
      });
      return response.data;
    } catch (error) {
      // If permission denied for full PAN, create without and fetch basic details
      if (error.response?.status === 403 || error.response?.data?.error_message?.includes('permission')) {
        const response = await this.client.post('/cards', {
          user_token: userToken,
          card_product_token: cardProductToken,
        });
        return response.data;
      }
      throw error;
    }
  }

  // Get cards for a user
  async getCardsForUser(userToken) {
    const response = await this.client.get(`/cards/user/${userToken}`);
    return response.data;
  }

  // Get a single card with full details (PAN, CVV)
  // Falls back to basic details if full PAN permission not available
  async getCardDetails(cardToken, showSensitive = true) {
    try {
      if (showSensitive) {
        const response = await this.client.get(`/cards/${cardToken}?show_pan=true&show_cvv_number=true`);
        return response.data;
      }
    } catch (error) {
      // If permission denied for full PAN, fall back to basic details
      if (error.response?.status === 403 || error.response?.data?.error_message?.includes('permission')) {
        console.log('[Marqeta] Full PAN permission denied, fetching basic card details');
      } else {
        throw error;
      }
    }
    // Fallback: get basic card details without PAN/CVV
    const response = await this.client.get(`/cards/${cardToken}`);
    return response.data;
  }

  // Fund user's GPA (General Purpose Account)
  async fundGPA(userToken, amount, memo = 'Payment request approved') {
    const response = await this.client.post('/gpaorders', {
      user_token: userToken,
      amount: amount,
      currency_code: 'USD',
      memo: memo,
      funding_source_token: 'sandbox_program_funding', // Sandbox funding source
    });
    return response.data;
  }

  // Get user's GPA balance
  async getGPABalance(userToken) {
    const response = await this.client.get(`/balances/${userToken}`);
    return response.data;
  }

  // Simulate an authorization (test spending)
  async simulateAuthorization(cardToken, amount, mid = 'TEST_MERCHANT') {
    const response = await this.client.post('/simulate/authorization', {
      card_token: cardToken,
      amount: amount,
      mid: mid,
    });
    return response.data;
  }

  // Simulate clearing a transaction
  async simulateClearing(transactionToken) {
    const response = await this.client.post('/simulate/clearing', {
      original_transaction_token: transactionToken,
    });
    return response.data;
  }

  // Get transactions for a user
  async getTransactions(userToken) {
    const response = await this.client.get(`/transactions/user/${userToken}?count=50`);
    return response.data;
  }

  // Get program funding source info (sandbox has unlimited funds)
  async getFundingSourceInfo() {
    try {
      // Try to get the sandbox program funding source
      const response = await this.client.get('/fundingsources/program/sandbox_program_funding');
      return response.data;
    } catch (error) {
      // If specific source not found, list all program funding sources
      const response = await this.client.get('/fundingsources/program');
      return response.data;
    }
  }

  // Check if we're in sandbox mode
  async checkSandboxStatus() {
    const isSandbox = this.baseURL.includes('sandbox');
    let fundingInfo = null;
    
    try {
      fundingInfo = await this.getFundingSourceInfo();
    } catch (error) {
      console.log('Could not fetch funding source info:', error.message);
    }

    return {
      isSandbox,
      baseUrl: this.baseURL,
      fundingSource: isSandbox ? 'sandbox_program_funding' : 'production',
      fundingInfo,
      unlimitedFunds: isSandbox // Sandbox has unlimited funds
    };
  }
}

export default new MarqetaService();
