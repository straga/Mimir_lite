// Quick test script for Neo4j connection
import { createGraphManager } from './build/managers/index.js';

async function test() {
  console.log('🧪 Testing Neo4j Connection...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    console.log('\n📊 Environment:');
    console.log(`   NEO4J_URI: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`);
    console.log(`   NEO4J_USER: ${process.env.NEO4J_USER || 'neo4j'}`);
    console.log(`   NEO4J_PASSWORD: ${process.env.NEO4J_PASSWORD ? '***' : 'password'}`);
    
    console.log('\n🔌 Connecting to Neo4j...');
    const manager = await createGraphManager();
    
    console.log('\n✅ Connected successfully!');
    
    console.log('\n📈 Getting stats...');
    const stats = await manager.getStats();
    console.log(`   Nodes: ${stats.nodeCount}`);
    console.log(`   Edges: ${stats.edgeCount}`);
    console.log(`   Types: ${JSON.stringify(stats.types, null, 2)}`);
    
    console.log('\n🧪 Testing basic operations...');
    
    // Test 1: Create a node
    console.log('\n  Test 1: Creating a test TODO node...');
    const node = await manager.addNode('todo', {
      title: 'Test Connection',
      status: 'pending',
      priority: 'high',
      description: 'Testing Neo4j connection'
    });
    console.log(`  ✅ Created node: ${node.id}`);
    
    // Test 2: Query nodes
    console.log('\n  Test 2: Querying TODO nodes...');
    const todos = await manager.queryNodes('todo');
    console.log(`  ✅ Found ${todos.length} TODO(s)`);
    
    // Test 3: Get node
    console.log('\n  Test 3: Getting node by ID...');
    const retrieved = await manager.getNode(node.id);
    console.log(`  ✅ Retrieved: ${retrieved?.properties.title}`);
    
    // Test 4: Update node
    console.log('\n  Test 4: Updating node...');
    const updated = await manager.updateNode(node.id, { status: 'completed' });
    console.log(`  ✅ Updated status: ${updated.properties.status}`);
    
    // Test 5: Delete node
    console.log('\n  Test 5: Deleting test node...');
    await manager.deleteNode(node.id);
    console.log(`  ✅ Deleted successfully`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await manager.close?.();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nDetails:', error.stack);
    process.exit(1);
  }
}

test();
