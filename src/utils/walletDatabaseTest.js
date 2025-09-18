/**
 * Wallet Database Integration Test Utility
 * This utility helps test and verify wallet functionality end-to-end
 */

import { supabase } from '../lib/supabaseClient';

export const walletDatabaseTest = {
  /**
   * Test wallet address saving to database
   * @param {string} userId - User ID
   * @param {string} walletAddress - Wallet address to test
   * @returns {Promise<Object>} Test result
   */
  async testWalletSave(userId, walletAddress) {
    console.log('🧪 Testing wallet save to database...');
    
    try {
      // Test direct database update
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress,
          wallet_connected_at: new Date().toISOString(),
          wallet_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, wallet_address, wallet_connected_at, wallet_verified')
        .single();

      if (error) {
        console.error('❌ Wallet save test failed:', error);
        return {
          success: false,
          error: error.message,
          step: 'database_update'
        };
      }

      console.log('✅ Wallet save test successful:', data);
      return {
        success: true,
        data,
        walletAddress: data.wallet_address,
        connectedAt: data.wallet_connected_at,
        verified: data.wallet_verified
      };
    } catch (error) {
      console.error('❌ Wallet save test error:', error);
      return {
        success: false,
        error: error.message,
        step: 'exception'
      };
    }
  },

  /**
   * Test wallet address retrieval from database
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Test result
   */
  async testWalletRetrieve(userId) {
    console.log('🧪 Testing wallet retrieval from database...');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, wallet_address, wallet_connected_at, wallet_verified, email, full_name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Wallet retrieve test failed:', error);
        return {
          success: false,
          error: error.message,
          step: 'database_select'
        };
      }

      const result = {
        success: true,
        data,
        hasWallet: !!data.wallet_address,
        walletAddress: data.wallet_address,
        connectedAt: data.wallet_connected_at,
        verified: data.wallet_verified
      };

      console.log('✅ Wallet retrieve test successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Wallet retrieve test error:', error);
      return {
        success: false,
        error: error.message,
        step: 'exception'
      };
    }
  },

  /**
   * Test wallet API endpoints
   * @param {string} authToken - User auth token
   * @param {string} walletAddress - Wallet address to test
   * @returns {Promise<Object>} Test result
   */
  async testWalletAPI(authToken, walletAddress) {
    console.log('🧪 Testing wallet API endpoints...');
    
    const apiBaseUrl = process.env.REACT_APP_WALLET_API_URL || 'http://localhost:3001';
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    try {
      // Test GET /wallet
      console.log('Testing GET /wallet...');
      const getResponse = await fetch(`${apiBaseUrl}/wallet`, {
        method: 'GET',
        headers
      });

      const getResult = await getResponse.json();
      console.log('GET /wallet result:', getResult);

      // Test POST /wallet
      if (walletAddress) {
        console.log('Testing POST /wallet...');
        const postResponse = await fetch(`${apiBaseUrl}/wallet`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ walletAddress })
        });

        const postResult = await postResponse.json();
        console.log('POST /wallet result:', postResult);

        return {
          success: true,
          getResult,
          postResult,
          apiAvailable: true
        };
      }

      return {
        success: true,
        getResult,
        apiAvailable: true
      };
    } catch (error) {
      console.error('❌ Wallet API test error:', error);
      return {
        success: false,
        error: error.message,
        apiAvailable: false
      };
    }
  },

  /**
   * Test project-wallet association
   * @param {string} userId - User ID
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Object>} Test result
   */
  async testProjectWalletAssociation(userId, walletAddress) {
    console.log('🧪 Testing project-wallet association...');
    
    try {
      // Create a test project with wallet association
      const testProject = {
        user_id: userId,
        title: 'Test Wallet Association Project',
        description: 'This is a test project to verify wallet association',
        location: 'Test Location',
        ecosystem_type: 'mangrove',
        project_area: 100,
        estimated_credits: 500,
        organization_name: 'Test Organization',
        organization_email: 'test@example.com',
        wallet_address: walletAddress, // This is the key association
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([testProject])
        .select()
        .single();

      if (error) {
        console.error('❌ Project-wallet association test failed:', error);
        return {
          success: false,
          error: error.message,
          step: 'project_creation'
        };
      }

      console.log('✅ Project-wallet association test successful:', data);

      // Clean up test project
      await supabase
        .from('projects')
        .delete()
        .eq('id', data.id);

      return {
        success: true,
        data,
        projectId: data.id,
        associatedWallet: data.wallet_address
      };
    } catch (error) {
      console.error('❌ Project-wallet association test error:', error);
      return {
        success: false,
        error: error.message,
        step: 'exception'
      };
    }
  },

  /**
   * Test project wallet address retrieval
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Test result
   */
  async testProjectWalletRetrieval(userId) {
    console.log('🧪 Testing project wallet address retrieval...');
    
    try {
      // Get user's projects with wallet addresses
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, wallet_address, user_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Project wallet retrieval test failed:', error);
        return {
          success: false,
          error: error.message,
          step: 'database_select'
        };
      }

      const projectsWithWallet = (data || []).filter(project => project.wallet_address);
      const projectsWithoutWallet = (data || []).filter(project => !project.wallet_address);
      
      const result = {
        success: true,
        totalProjects: data?.length || 0,
        projectsWithWallet: projectsWithWallet.length,
        projectsWithoutWallet: projectsWithoutWallet.length,
        walletAddresses: projectsWithWallet.map(p => ({
          projectId: p.id,
          title: p.title,
          walletAddress: p.wallet_address
        })),
        projectsWithoutWallet_Details: projectsWithoutWallet.map(p => ({
          projectId: p.id,
          title: p.title,
          created_at: p.created_at
        }))
      };

      console.log('✅ Project wallet retrieval test successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Project wallet retrieval test error:', error);
      return {
        success: false,
        error: error.message,
        step: 'exception'
      };
    }
  },

  /**
   * Debug project wallet addresses for minting issues
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Debug result
   */
  async debugProjectWallets(userId) {
    console.log('🔎 Debugging project wallet addresses for minting...');
    
    try {
      // Get projects with profile join (similar to AdminDashboard query)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, title, user_id, status, wallet_address, 
          estimated_credits, calculated_credits, created_at,
          profiles:user_id (
            full_name, email, wallet_address
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Project wallet debug failed:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const debugResults = (data || []).map(project => {
        const projectWallet = project.wallet_address;
        const profileWallet = project.profiles?.wallet_address;
        const hasWallet = !!(projectWallet || profileWallet);
        const walletSource = projectWallet ? 'project' : profileWallet ? 'profile' : 'none';
        const effectiveWallet = projectWallet || profileWallet;
        
        return {
          projectId: project.id,
          title: project.title,
          status: project.status,
          hasWallet,
          walletSource,
          effectiveWallet,
          projectWallet,
          profileWallet,
          userInfo: {
            name: project.profiles?.full_name,
            email: project.profiles?.email
          },
          mintable: hasWallet && (project.estimated_credits > 0 || project.calculated_credits > 0),
          credits: {
            estimated: project.estimated_credits,
            calculated: project.calculated_credits
          },
          created_at: project.created_at
        };
      });

      const summary = {
        totalProjects: debugResults.length,
        withWallet: debugResults.filter(p => p.hasWallet).length,
        withoutWallet: debugResults.filter(p => !p.hasWallet).length,
        mintableProjects: debugResults.filter(p => p.mintable).length,
        walletSources: {
          project: debugResults.filter(p => p.walletSource === 'project').length,
          profile: debugResults.filter(p => p.walletSource === 'profile').length,
          none: debugResults.filter(p => p.walletSource === 'none').length
        }
      };

      const result = {
        success: true,
        summary,
        projects: debugResults,
        issuesFound: debugResults.filter(p => !p.hasWallet || !p.mintable)
      };

      console.log('✅ Project wallet debug completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Project wallet debug error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Run comprehensive wallet functionality test
   * @param {string} userId - User ID
   * @param {string} authToken - Auth token
   * @param {string} testWalletAddress - Test wallet address
   * @returns {Promise<Object>} Complete test results
   */
  async runFullTest(userId, authToken, testWalletAddress) {
    console.log('🚀 Running comprehensive wallet functionality test...');
    
    const results = {
      timestamp: new Date().toISOString(),
      userId,
      testWalletAddress,
      tests: {}
    };

    try {
      // Test 1: Database retrieval (current state)
      results.tests.initialRetrieval = await this.testWalletRetrieve(userId);

      // Test 2: API endpoints
      results.tests.apiTest = await this.testWalletAPI(authToken, testWalletAddress);

      // Test 3: Database save
      if (testWalletAddress) {
        results.tests.databaseSave = await this.testWalletSave(userId, testWalletAddress);
      }

      // Test 4: Database retrieval after save
      results.tests.postSaveRetrieval = await this.testWalletRetrieve(userId);

      // Test 5: Project-wallet association
      if (testWalletAddress) {
        results.tests.projectAssociation = await this.testProjectWalletAssociation(userId, testWalletAddress);
      }

      // Test 6: Project wallet address retrieval
      results.tests.projectWalletRetrieval = await this.testProjectWalletRetrieval(userId);

      // Test 7: Debug project wallets for minting
      results.tests.projectWalletDebug = await this.debugProjectWallets(userId);

      // Analyze results
      const passedTests = Object.values(results.tests).filter(test => test.success).length;
      const totalTests = Object.keys(results.tests).length;
      
      results.summary = {
        passed: passedTests,
        total: totalTests,
        success: passedTests === totalTests,
        percentage: Math.round((passedTests / totalTests) * 100)
      };

      console.log('🏁 Wallet functionality test completed:', results.summary);
      return results;
    } catch (error) {
      console.error('❌ Full wallet test failed:', error);
      results.error = error.message;
      results.summary = { success: false, error: error.message };
      return results;
    }
  }
};

export default walletDatabaseTest;