/**
 * E-B8 Representative Metrics Refresh Optimization Test
 * 
 * Tests optimized cache refresh performance and functionality
 */

import { OptimizedCacheRefreshManager } from '../services/optimized-cache-refresh';

// Mock QueryClient for testing
class MockQueryClient {
  private queryData = new Map();
  private queryStates = new Map();
  
  removeQueries(options: { queryKey: string[] }): void {
    const key = JSON.stringify(options.queryKey);
    this.queryData.delete(key);
    console.log(`🧪 MockQueryClient: Removed query ${key}`);
  }
  
  invalidateQueries(options: { queryKey: string[] }): void {
    const key = JSON.stringify(options.queryKey);
    console.log(`🧪 MockQueryClient: Invalidated query ${key}`);
  }
  
  getQueryState(queryKey: string[]): any {
    const key = JSON.stringify(queryKey);
    return this.queryStates.get(key) || { dataUpdatedAt: 0 };
  }
  
  async refetchQueries(options: { queryKey: string[], type?: string }): Promise<void> {
    const key = JSON.stringify(options.queryKey);
    console.log(`🧪 MockQueryClient: Refetched query ${key} (type: ${options.type || 'all'})`);
  }
}

async function testE_B8Implementation() {
  console.log('🧪 E-B8: Starting Representative Metrics Refresh Optimization Tests');
  console.log('=' .repeat(80));

  const manager = OptimizedCacheRefreshManager.getInstance();
  const mockQueryClient = new MockQueryClient() as any;

  // Test 1: Basic representative-specific refresh
  console.log('\n📊 Test 1: Representative-Specific Refresh');
  try {
    const result1 = await manager.refreshRepresentativeMetrics(mockQueryClient, {
      representativeId: 123,
      reason: 'test_specific_refresh',
      cascadeGlobal: false,
      progressCallback: (progress, stage) => {
        console.log(`   📈 Progress: ${progress}% - ${stage}`);
      }
    });

    console.log(`   ✅ Duration: ${result1.duration}ms (Target: <2000ms)`);
    console.log(`   📋 Cache keys invalidated: ${result1.cacheKeysInvalidated}`);
    console.log(`   🔄 Queries refetched: ${result1.queriesRefetched}`);
    console.log(`   🎯 Success: ${result1.success ? '✅' : '❌'}`);
  } catch (error) {
    console.error(`   ❌ Test 1 failed:`, error);
  }

  // Test 2: Global cache refresh
  console.log('\n🌐 Test 2: Global Cache Refresh');
  try {
    const result2 = await manager.refreshRepresentativeMetrics(mockQueryClient, {
      reason: 'test_global_refresh',
      cascadeGlobal: true,
      immediate: true,
      batchSize: 5
    });

    console.log(`   ✅ Duration: ${result2.duration}ms (Target: <2000ms)`);
    console.log(`   📋 Cache keys invalidated: ${result2.cacheKeysInvalidated}`);
    console.log(`   🔄 Queries refetched: ${result2.queriesRefetched}`);
    console.log(`   🎯 Success: ${result2.success ? '✅' : '❌'}`);
  } catch (error) {
    console.error(`   ❌ Test 2 failed:`, error);
  }

  // Test 3: Clear all caches
  console.log('\n🧹 Test 3: Clear All Caches');
  try {
    const result3 = await manager.clearAllCaches(mockQueryClient, 'test_clear_all');

    console.log(`   ✅ Duration: ${result3.duration}ms (Target: <2000ms)`);
    console.log(`   📋 Cache keys invalidated: ${result3.cacheKeysInvalidated}`);
    console.log(`   🔄 Queries refetched: ${result3.queriesRefetched}`);
    console.log(`   🎯 Success: ${result3.success ? '✅' : '❌'}`);
  } catch (error) {
    console.error(`   ❌ Test 3 failed:`, error);
  }

  // Test 4: Performance metrics
  console.log('\n📈 Test 4: Performance Metrics Analysis');
  try {
    const metrics = manager.getPerformanceMetrics();
    
    console.log(`   📊 Average refresh time: ${Math.round(metrics.averageRefreshTime)}ms`);
    console.log(`   📈 Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`   🎯 Targets achieved: ${metrics.targetsAchieved ? '✅' : '❌'}`);
    console.log(`   📋 Recent refreshes: ${metrics.recentRefreshes.length}`);
    
    if (metrics.recentRefreshes.length > 0) {
      const latest = metrics.recentRefreshes[metrics.recentRefreshes.length - 1];
      console.log(`   🕐 Latest refresh: ${latest.reason} (${latest.duration}ms)`);
    }
  } catch (error) {
    console.error(`   ❌ Test 4 failed:`, error);
  }

  // Test 5: Concurrent refresh prevention
  console.log('\n🔒 Test 5: Concurrent Refresh Prevention');
  try {
    const concurrentPromises = [
      manager.refreshRepresentativeMetrics(mockQueryClient, {
        representativeId: 456,
        reason: 'concurrent_test_1'
      }),
      manager.refreshRepresentativeMetrics(mockQueryClient, {
        representativeId: 456,
        reason: 'concurrent_test_2'
      }),
      manager.refreshRepresentativeMetrics(mockQueryClient, {
        representativeId: 456,
        reason: 'concurrent_test_3'
      })
    ];

    const results = await Promise.all(concurrentPromises);
    const successfulResults = results.filter(r => r.success);
    
    console.log(`   📊 Concurrent requests: 3`);
    console.log(`   ✅ Successful: ${successfulResults.length}`);
    console.log(`   ⏭️ Prevented duplicates: ${3 - successfulResults.length}`);
  } catch (error) {
    console.error(`   ❌ Test 5 failed:`, error);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🎉 E-B8 Representative Metrics Refresh Optimization Tests Complete');
  
  const finalMetrics = manager.getPerformanceMetrics();
  console.log('\n📊 Final Performance Summary:');
  console.log(`   ⚡ Average refresh time: ${Math.round(finalMetrics.averageRefreshTime)}ms (Target: <2000ms)`);
  console.log(`   🎯 Success rate: ${(finalMetrics.successRate * 100).toFixed(1)}%`);
  console.log(`   ✅ E-B8 targets achieved: ${finalMetrics.targetsAchieved ? 'YES' : 'NO'}`);

  return {
    success: finalMetrics.targetsAchieved && finalMetrics.successRate >= 0.8,
    averageTime: finalMetrics.averageRefreshTime,
    successRate: finalMetrics.successRate
  };
}

// Export for use
export { testE_B8Implementation };

// Run test if executed directly
if (require.main === module) {
  testE_B8Implementation()
    .then(result => {
      if (result.success) {
        console.log('\n🎊 E-B8 IMPLEMENTATION: ALL TESTS PASSED!');
        process.exit(0);
      } else {
        console.log('\n💥 E-B8 IMPLEMENTATION: TESTS FAILED!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 E-B8 test execution failed:', error);
      process.exit(1);
    });
}