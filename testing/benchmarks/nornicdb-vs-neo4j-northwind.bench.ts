/**
 * NornicDB vs Neo4j Benchmark Suite - Northwind Dataset
 * 
 * Compares performance between:
 * - NornicDB (drop-in replacement): bolt://localhost:7687
 * - Neo4j: bolt://localhost:7688
 * 
 * Uses the Northwind retail dataset with Products, Categories, Suppliers, Customers, Orders.
 * 
 * Run with: npm run bench:compare-dbs
 * 
 * Configuration (environment variables):
 *   NORNICDB_URI=bolt://localhost:7687
 *   NORNICDB_USER=admin
 *   NORNICDB_PASSWORD=admin
 *   
 *   NEO4J_URI=bolt://localhost:7688
 *   NEO4J_USER=neo4j
 *   NEO4J_PASSWORD=password
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import neo4j, { Driver, Session } from 'neo4j-driver';

// ============================================================================
// CONFIGURATION
// ============================================================================

// NornicDB (your drop-in replacement)
const NORNICDB_URI = process.env.NORNICDB_URI || 'bolt://localhost:7687';
const NORNICDB_USER = process.env.NORNICDB_USER || 'admin';
const NORNICDB_PASSWORD = process.env.NORNICDB_PASSWORD || 'admin';

// Neo4j (original for comparison)
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7688';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

let nornicdbDriver: Driver;
let nornicdbSession: Session;
let neo4jDriver: Driver;
let neo4jSession: Session;

// ============================================================================
// NORTHWIND DATASET (Retail data model)
// ============================================================================

async function loadNorthwindDataset(session: Session): Promise<void> {
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('  → Cleared existing data');
  } catch (clearErr) {
    console.log('  → Database already empty or clear not supported', clearErr);
  }
  // Clear existing data
  await session.run('MATCH (n) DETACH DELETE n');
  
  // Create Categories
  await session.run(`
    CREATE (c1:Category {categoryID: 1, categoryName: 'Beverages', description: 'Soft drinks, coffees, teas, beers, and ales'})
    CREATE (c2:Category {categoryID: 2, categoryName: 'Condiments', description: 'Sweet and savory sauces, relishes, spreads, and seasonings'})
    CREATE (c3:Category {categoryID: 3, categoryName: 'Confections', description: 'Desserts, candies, and sweet breads'})
    CREATE (c4:Category {categoryID: 4, categoryName: 'Dairy Products', description: 'Cheeses'})
    CREATE (c5:Category {categoryID: 5, categoryName: 'Grains/Cereals', description: 'Breads, crackers, pasta, and cereal'})
    CREATE (c6:Category {categoryID: 6, categoryName: 'Meat/Poultry', description: 'Prepared meats'})
    CREATE (c7:Category {categoryID: 7, categoryName: 'Produce', description: 'Dried fruit and bean curd'})
    CREATE (c8:Category {categoryID: 8, categoryName: 'Seafood', description: 'Seaweed and fish'})
  `);
  
  // Create Suppliers
  await session.run(`
    CREATE (s1:Supplier {supplierID: 1, companyName: 'Exotic Liquids', contactName: 'Charlotte Cooper', address: '49 Gilbert St.', city: 'London', country: 'UK'})
    CREATE (s2:Supplier {supplierID: 2, companyName: 'New Orleans Cajun Delights', contactName: 'Shelley Burke', address: 'P.O. Box 78934', city: 'New Orleans', country: 'USA'})
    CREATE (s3:Supplier {supplierID: 3, companyName: "Grandma Kelly's Homestead", contactName: 'Regina Murphy', address: '707 Oxford Rd.', city: 'Ann Arbor', country: 'USA'})
    CREATE (s4:Supplier {supplierID: 4, companyName: 'Tokyo Traders', contactName: 'Yoshi Nagase', address: '9-8 Sekimai Musashino-shi', city: 'Tokyo', country: 'Japan'})
    CREATE (s5:Supplier {supplierID: 5, companyName: 'Cooperativa de Quesos Las Cabras', contactName: 'Antonio del Valle Saavedra', address: 'Calle del Rosal 4', city: 'Oviedo', country: 'Spain'})
    CREATE (s6:Supplier {supplierID: 6, companyName: 'Mayumis', contactName: 'Mayumi Ohno', address: '92 Setsuko Chuo-ku', city: 'Osaka', country: 'Japan'})
    CREATE (s7:Supplier {supplierID: 7, companyName: 'Pavlova Ltd.', contactName: 'Ian Devling', address: '74 Rose St. Moonie Ponds', city: 'Melbourne', country: 'Australia'})
    CREATE (s8:Supplier {supplierID: 8, companyName: 'Specialty Biscuits Ltd.', contactName: 'Peter Wilson', address: '29 Kings Way', city: 'Manchester', country: 'UK'})
  `);
  
  // Create Products with SUPPLIES relationships (separate queries for Neo4j compatibility)
  // Neo4j requires WITH between CREATE and MATCH, so we use separate session.run() calls
  
  await session.run(`CREATE (p:Product {productID: 1, productName: 'Chai', unitPrice: 18.0, unitsInStock: 39})`);
  await session.run(`MATCH (p:Product {productID: 1}), (c:Category {categoryID: 1}) CREATE (p)-[:PART_OF]->(c)`);
  await session.run(`MATCH (p:Product {productID: 1}), (s:Supplier {supplierID: 1}) CREATE (s)-[:SUPPLIES]->(p)`);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 1}), (c:Category {categoryID: 1})
    CREATE (p:Product {productID: 2, productName: 'Chang', unitPrice: 19.0, unitsInStock: 17})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 2}), (c:Category {categoryID: 2})
    CREATE (p:Product {productID: 3, productName: 'Aniseed Syrup', unitPrice: 10.0, unitsInStock: 13})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 2}), (c:Category {categoryID: 2})
    CREATE (p:Product {productID: 4, productName: 'Chef Anton Cajun Seasoning', unitPrice: 22.0, unitsInStock: 53})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 3}), (c:Category {categoryID: 2})
    CREATE (p:Product {productID: 5, productName: 'Chef Anton Gumbo Mix', unitPrice: 21.35, unitsInStock: 0})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 3}), (c:Category {categoryID: 2})
    CREATE (p:Product {productID: 6, productName: "Grandma's Boysenberry Spread", unitPrice: 25.0, unitsInStock: 120})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 4}), (c:Category {categoryID: 7})
    CREATE (p:Product {productID: 7, productName: 'Uncle Bob Organic Dried Pears', unitPrice: 30.0, unitsInStock: 15})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 4}), (c:Category {categoryID: 2})
    CREATE (p:Product {productID: 8, productName: 'Northwoods Cranberry Sauce', unitPrice: 40.0, unitsInStock: 6})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 5}), (c:Category {categoryID: 4})
    CREATE (p:Product {productID: 9, productName: 'Queso Cabrales', unitPrice: 21.0, unitsInStock: 22})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 5}), (c:Category {categoryID: 4})
    CREATE (p:Product {productID: 10, productName: 'Queso Manchego La Pastora', unitPrice: 38.0, unitsInStock: 86})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 6}), (c:Category {categoryID: 8})
    CREATE (p:Product {productID: 11, productName: 'Konbu', unitPrice: 6.0, unitsInStock: 24})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 6}), (c:Category {categoryID: 8})
    CREATE (p:Product {productID: 12, productName: 'Tofu', unitPrice: 23.25, unitsInStock: 35})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 7}), (c:Category {categoryID: 3})
    CREATE (p:Product {productID: 13, productName: 'Pavlova', unitPrice: 17.45, unitsInStock: 29})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 7}), (c:Category {categoryID: 6})
    CREATE (p:Product {productID: 14, productName: 'Alice Mutton', unitPrice: 39.0, unitsInStock: 0})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 8}), (c:Category {categoryID: 3})
    CREATE (p:Product {productID: 15, productName: 'Chocolate Biscuits', unitPrice: 9.20, unitsInStock: 38})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  await session.run(`
    MATCH (s:Supplier {supplierID: 8}), (c:Category {categoryID: 3})
    CREATE (p:Product {productID: 16, productName: 'Scones', unitPrice: 7.75, unitsInStock: 61})
    CREATE (p)-[:PART_OF]->(c)
    CREATE (s)-[:SUPPLIES]->(p)
  `);
  
  // Create Customers
  await session.run(`
    CREATE (cu1:Customer {customerID: 'ALFKI', companyName: 'Alfreds Futterkiste', contactName: 'Maria Anders', city: 'Berlin', country: 'Germany'})
    CREATE (cu2:Customer {customerID: 'ANATR', companyName: 'Ana Trujillo Emparedados y helados', contactName: 'Ana Trujillo', city: 'México D.F.', country: 'Mexico'})
    CREATE (cu3:Customer {customerID: 'ANTON', companyName: 'Antonio Moreno Taquería', contactName: 'Antonio Moreno', city: 'México D.F.', country: 'Mexico'})
    CREATE (cu4:Customer {customerID: 'AROUT', companyName: 'Around the Horn', contactName: 'Thomas Hardy', city: 'London', country: 'UK'})
    CREATE (cu5:Customer {customerID: 'BERGS', companyName: 'Berglunds snabbköp', contactName: 'Christina Berglund', city: 'Luleå', country: 'Sweden'})
    CREATE (cu6:Customer {customerID: 'BLAUS', companyName: 'Blauer See Delikatessen', contactName: 'Hanna Moos', city: 'Mannheim', country: 'Germany'})
    CREATE (cu7:Customer {customerID: 'BLONP', companyName: 'Blondesddsl père et fils', contactName: 'Frédérique Citeaux', city: 'Strasbourg', country: 'France'})
    CREATE (cu8:Customer {customerID: 'BOLID', companyName: 'Bólido Comidas preparadas', contactName: 'Martín Sommer', city: 'Madrid', country: 'Spain'})
  `);
  
  // Create Orders with PURCHASED relationships (separate queries for Neo4j compatibility)
  await session.run(`
    MATCH (cu:Customer {customerID: 'ALFKI'})
    CREATE (o:Order {orderID: 10643, orderDate: '1997-08-25', shipCountry: 'Germany', shipCity: 'Berlin'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'ANATR'})
    CREATE (o:Order {orderID: 10308, orderDate: '1996-09-18', shipCountry: 'Mexico', shipCity: 'México D.F.'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'ANTON'})
    CREATE (o:Order {orderID: 10365, orderDate: '1996-11-27', shipCountry: 'Mexico', shipCity: 'México D.F.'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'AROUT'})
    CREATE (o:Order {orderID: 10355, orderDate: '1996-11-15', shipCountry: 'UK', shipCity: 'London'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'BERGS'})
    CREATE (o:Order {orderID: 10278, orderDate: '1996-08-12', shipCountry: 'Sweden', shipCity: 'Luleå'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'BLAUS'})
    CREATE (o:Order {orderID: 10501, orderDate: '1997-04-09', shipCountry: 'Germany', shipCity: 'Mannheim'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'BLONP'})
    CREATE (o:Order {orderID: 10265, orderDate: '1996-07-25', shipCountry: 'France', shipCity: 'Strasbourg'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  await session.run(`
    MATCH (cu:Customer {customerID: 'BOLID'})
    CREATE (o:Order {orderID: 10326, orderDate: '1996-10-10', shipCountry: 'Spain', shipCity: 'Madrid'})
    CREATE (cu)-[:PURCHASED]->(o)
  `);
  
  // Create Order -> Product relationships (separate queries for Neo4j compatibility)
  await session.run(`
    MATCH (o:Order {orderID: 10643}), (p:Product {productID: 1})
    CREATE (o)-[:ORDERS {quantity: 15}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10643}), (p:Product {productID: 9})
    CREATE (o)-[:ORDERS {quantity: 18}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10308}), (p:Product {productID: 2})
    CREATE (o)-[:ORDERS {quantity: 10}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10308}), (p:Product {productID: 11})
    CREATE (o)-[:ORDERS {quantity: 21}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10365}), (p:Product {productID: 3})
    CREATE (o)-[:ORDERS {quantity: 60}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10365}), (p:Product {productID: 4})
    CREATE (o)-[:ORDERS {quantity: 20}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10355}), (p:Product {productID: 5})
    CREATE (o)-[:ORDERS {quantity: 25}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10355}), (p:Product {productID: 6})
    CREATE (o)-[:ORDERS {quantity: 30}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10278}), (p:Product {productID: 7})
    CREATE (o)-[:ORDERS {quantity: 16}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10278}), (p:Product {productID: 8})
    CREATE (o)-[:ORDERS {quantity: 15}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10501}), (p:Product {productID: 10})
    CREATE (o)-[:ORDERS {quantity: 20}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10501}), (p:Product {productID: 12})
    CREATE (o)-[:ORDERS {quantity: 10}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10265}), (p:Product {productID: 13})
    CREATE (o)-[:ORDERS {quantity: 40}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10265}), (p:Product {productID: 14})
    CREATE (o)-[:ORDERS {quantity: 35}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10326}), (p:Product {productID: 15})
    CREATE (o)-[:ORDERS {quantity: 8}]->(p)
  `);
  
  await session.run(`
    MATCH (o:Order {orderID: 10326}), (p:Product {productID: 16})
    CREATE (o)-[:ORDERS {quantity: 70}]->(p)
  `);
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

beforeAll(async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║      NornicDB vs Neo4j - Northwind Dataset Benchmarks             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  // Connect to NornicDB
  console.log(`Connecting to NornicDB at ${NORNICDB_URI}...`);
  try {
    nornicdbDriver = neo4j.driver(NORNICDB_URI, neo4j.auth.basic(NORNICDB_USER, NORNICDB_PASSWORD));
    nornicdbSession = nornicdbDriver.session();
    await nornicdbSession.run('RETURN 1');
    console.log('✓ Connected to NornicDB');
    
    console.log('Loading Northwind dataset into NornicDB...');
    await loadNorthwindDataset(nornicdbSession);
    const result1 = await nornicdbSession.run('MATCH (n) RETURN count(n) as count');
    console.log(`  → ${result1.records[0].get('count')} nodes created in NornicDB`);
    
    // Test that aggregation bug is fixed: COUNT(r) should work properly
    const relResult1 = await nornicdbSession.run('MATCH ()-[r]->() RETURN count(r) as count');
    console.log(`  → ${relResult1.records[0].get('count')} relationships created in NornicDB`);
    
    // Detailed relationship breakdown using GROUP BY
    const relTypes = await nornicdbSession.run('MATCH ()-[r]->() RETURN type(r) as type, count(*) as count ORDER BY count DESC');
    if (relTypes.records.length > 0) {
      console.log('  → Relationship types:');
      for (const rec of relTypes.records) {
        console.log(`     • ${rec.get('type')}: ${rec.get('count')}`);
      }
    }
  } catch (error) {
    console.error(`✗ Failed to connect to NornicDB: ${error}`);
  }
  
  // Connect to Neo4j
  console.log(`\nConnecting to Neo4j at ${NEO4J_URI}...`);
  try {
    neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    neo4jSession = neo4jDriver.session();
    await neo4jSession.run('RETURN 1');
    console.log('✓ Connected to Neo4j');
    
    console.log('Loading Northwind dataset into Neo4j...');
    await loadNorthwindDataset(neo4jSession);
    const result2 = await neo4jSession.run('MATCH (n) RETURN count(n) as count');
    console.log(`  → ${result2.records[0].get('count')} nodes created in Neo4j`);
    
    const relResult2 = await neo4jSession.run('MATCH ()-[r]->() RETURN count(r) as count');
    console.log(`  → ${relResult2.records[0].get('count')} relationships created in Neo4j`);
    
    // Detailed relationship breakdown using GROUP BY
    const relTypes2 = await neo4jSession.run('MATCH ()-[r]->() RETURN type(r) as type, count(*) as count ORDER BY count DESC');
    if (relTypes2.records.length > 0) {
      console.log('  → Relationship types:');
      for (const rec of relTypes2.records) {
        console.log(`     • ${rec.get('type')}: ${rec.get('count')}`);
      }
    }
  } catch (error) {
    console.error(`✗ Failed to connect to Neo4j: ${error}`);
  }
  
  console.log('\n' + '─'.repeat(72) + '\n');
});

afterAll(async () => {
  console.log('\n' + '─'.repeat(72));
  console.log('Cleaning up...');
  
  if (nornicdbSession) {
    await nornicdbSession.run('MATCH (n) DETACH DELETE n').catch(() => {});
    await nornicdbSession.close();
  }
  if (nornicdbDriver) await nornicdbDriver.close();
  
  if (neo4jSession) {
    await neo4jSession.run('MATCH (n) DETACH DELETE n').catch(() => {});
    await neo4jSession.close();
  }
  if (neo4jDriver) await neo4jDriver.close();
  
  console.log('✓ Cleanup complete\n');
});

// ============================================================================
// NORNICDB BENCHMARKS
// ============================================================================

describe('NornicDB Benchmarks (Northwind)', () => {
  // Basic reads
  bench('Count all nodes', async () => {
    await nornicdbSession.run('MATCH (n) RETURN count(n)');
  });
  
  bench('Count all relationships', async () => {
    await nornicdbSession.run('MATCH ()-[r]->() RETURN count(r)');
  });
  
  bench('Get all products', async () => {
    await nornicdbSession.run('MATCH (p:Product) RETURN p.productName, p.unitPrice, p.unitsInStock');
  });
  
  bench('Get all categories', async () => {
    await nornicdbSession.run('MATCH (c:Category) RETURN c.categoryName, c.description');
  });
  
  bench('Get all customers', async () => {
    await nornicdbSession.run('MATCH (c:Customer) RETURN c.companyName, c.city, c.country');
  });
  
  // Lookup by property
  bench('Find product by name', async () => {
    await nornicdbSession.run("MATCH (p:Product {productName: 'Chai'}) RETURN p");
  });
  
  bench('Find category by name', async () => {
    await nornicdbSession.run("MATCH (c:Category {categoryName: 'Beverages'}) RETURN c");
  });
  
  bench('Find customer by ID', async () => {
    await nornicdbSession.run("MATCH (c:Customer {customerID: 'ALFKI'}) RETURN c");
  });
  
  // Relationship traversal (1 hop)
  bench('Products in Beverages category', async () => {
    await nornicdbSession.run(`
      MATCH (c:Category {categoryName: 'Beverages'})<-[:PART_OF]-(p:Product)
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Products supplied by Exotic Liquids', async () => {
    await nornicdbSession.run(`
      MATCH (s:Supplier {companyName: 'Exotic Liquids'})-[:SUPPLIES]->(p:Product)
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Orders by customer ALFKI', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer {customerID: 'ALFKI'})-[:PURCHASED]->(o:Order)
      RETURN o.orderID, o.orderDate, o.shipCity
    `);
  });
  
  bench('Products in order 10643', async () => {
    await nornicdbSession.run(`
      MATCH (o:Order {orderID: 10643})-[r:ORDERS]->(p:Product)
      RETURN p.productName, r.quantity
    `);
  });
  
  // Relationship traversal (2 hops)
  bench('Supplier to category through products', async () => {
    await nornicdbSession.run(`
      MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)-[:PART_OF]->(c:Category)
      RETURN s.companyName, c.categoryName, count(p) as products
      ORDER BY products DESC
    `);
  });
  
  bench('Customer orders to products', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer {customerID: 'ALFKI'})-[:PURCHASED]->(o:Order)-[r:ORDERS]->(p:Product)
      RETURN p.productName, r.quantity, o.orderDate
    `);
  });
  
  // Relationship traversal (3 hops)
  bench('Customer to category through orders and products', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:ORDERS]->(p:Product)-[:PART_OF]->(cat:Category)
      RETURN c.companyName, cat.categoryName, count(DISTINCT o) as orders
      ORDER BY orders DESC
      LIMIT 10
    `);
  });
  
  bench('Customer to supplier through orders and products', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:ORDERS]->(p:Product)<-[:SUPPLIES]-(s:Supplier)
      RETURN c.companyName, s.companyName, count(DISTINCT o) as orders
      ORDER BY orders DESC
      LIMIT 10
    `);
  });
  
  // Aggregations
  bench('Products per category', async () => {
    await nornicdbSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, count(p) as productCount
      ORDER BY productCount DESC
    `);
  });
  
  bench('Average price per category', async () => {
    await nornicdbSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, avg(p.unitPrice) as avgPrice, count(p) as products
      ORDER BY avgPrice DESC
    `);
  });
  
  bench('Total quantity ordered per product', async () => {
    await nornicdbSession.run(`
      MATCH (p:Product)<-[r:ORDERS]-(:Order)
      RETURN p.productName, sum(r.quantity) as totalOrdered
      ORDER BY totalOrdered DESC
      LIMIT 10
    `);
  });
  
  bench('Orders per customer', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)
      RETURN c.companyName, count(o) as orderCount
      ORDER BY orderCount DESC
    `);
  });
  
  bench('Products per supplier', async () => {
    await nornicdbSession.run(`
      MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)
      RETURN s.companyName, count(p) as productCount
      ORDER BY productCount DESC
    `);
  });
  
  // Complex patterns
  bench('Top products by revenue (price * quantity)', async () => {
    await nornicdbSession.run(`
      MATCH (p:Product)<-[r:ORDERS]-(:Order)
      WITH p, sum(p.unitPrice * r.quantity) as revenue
      RETURN p.productName, revenue
      ORDER BY revenue DESC
      LIMIT 10
    `);
  });
  
  bench('Products out of stock', async () => {
    await nornicdbSession.run(`
      MATCH (p:Product)
      WHERE p.unitsInStock = 0
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Expensive products (price > 30)', async () => {
    await nornicdbSession.run(`
      MATCH (p:Product)
      WHERE p.unitPrice > 30
      RETURN p.productName, p.unitPrice, p.unitsInStock
      ORDER BY p.unitPrice DESC
    `);
  });
  
  // WITH and COLLECT
  bench('Categories with product lists', async () => {
    await nornicdbSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, collect(p.productName) as products
    `);
  });
  
  bench('Customers with order lists', async () => {
    await nornicdbSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)
      RETURN c.companyName, collect(o.orderID) as orders
    `);
  });
  
  // OPTIONAL MATCH
  bench('Products with or without orders', async () => {
    await nornicdbSession.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)<-[r:ORDERS]-(o:Order)
      RETURN p.productName, count(o) as orderCount
      ORDER BY orderCount DESC
    `);
  });
  
  // Write operations
  bench('Create and delete product node', async () => {
    await nornicdbSession.run(`
      CREATE (p:Product {productID: 999, productName: 'Test Product', unitPrice: 99.99, unitsInStock: 0})
      WITH p
      DELETE p
      RETURN count(p)
    `);
  });
  
  bench('Create and delete relationship', async () => {
    await nornicdbSession.run(`
      MATCH (s:Supplier {supplierID: 1}), (p:Product {productID: 1})
      CREATE (s)-[r:TEST_REL]->(p)
      WITH r
      DELETE r
      RETURN count(r)
    `);
  });
});

// ============================================================================
// NEO4J BENCHMARKS
// ============================================================================

describe('Neo4j Benchmarks (Northwind)', () => {
  // Basic reads
  bench('Count all nodes', async () => {
    await neo4jSession.run('MATCH (n) RETURN count(n)');
  });
  
  bench('Count all relationships', async () => {
    await neo4jSession.run('MATCH ()-[r]->() RETURN count(r)');
  });
  
  bench('Get all products', async () => {
    await neo4jSession.run('MATCH (p:Product) RETURN p.productName, p.unitPrice, p.unitsInStock');
  });
  
  bench('Get all categories', async () => {
    await neo4jSession.run('MATCH (c:Category) RETURN c.categoryName, c.description');
  });
  
  bench('Get all customers', async () => {
    await neo4jSession.run('MATCH (c:Customer) RETURN c.companyName, c.city, c.country');
  });
  
  // Lookup by property
  bench('Find product by name', async () => {
    await neo4jSession.run("MATCH (p:Product {productName: 'Chai'}) RETURN p");
  });
  
  bench('Find category by name', async () => {
    await neo4jSession.run("MATCH (c:Category {categoryName: 'Beverages'}) RETURN c");
  });
  
  bench('Find customer by ID', async () => {
    await neo4jSession.run("MATCH (c:Customer {customerID: 'ALFKI'}) RETURN c");
  });
  
  // Relationship traversal (1 hop)
  bench('Products in Beverages category', async () => {
    await neo4jSession.run(`
      MATCH (c:Category {categoryName: 'Beverages'})<-[:PART_OF]-(p:Product)
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Products supplied by Exotic Liquids', async () => {
    await neo4jSession.run(`
      MATCH (s:Supplier {companyName: 'Exotic Liquids'})-[:SUPPLIES]->(p:Product)
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Orders by customer ALFKI', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer {customerID: 'ALFKI'})-[:PURCHASED]->(o:Order)
      RETURN o.orderID, o.orderDate, o.shipCity
    `);
  });
  
  bench('Products in order 10643', async () => {
    await neo4jSession.run(`
      MATCH (o:Order {orderID: 10643})-[r:ORDERS]->(p:Product)
      RETURN p.productName, r.quantity
    `);
  });
  
  // Relationship traversal (2 hops)
  bench('Supplier to category through products', async () => {
    await neo4jSession.run(`
      MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)-[:PART_OF]->(c:Category)
      RETURN s.companyName, c.categoryName, count(p) as products
      ORDER BY products DESC
    `);
  });
  
  bench('Customer orders to products', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer {customerID: 'ALFKI'})-[:PURCHASED]->(o:Order)-[r:ORDERS]->(p:Product)
      RETURN p.productName, r.quantity, o.orderDate
    `);
  });
  
  // Relationship traversal (3 hops)
  bench('Customer to category through orders and products', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:ORDERS]->(p:Product)-[:PART_OF]->(cat:Category)
      RETURN c.companyName, cat.categoryName, count(DISTINCT o) as orders
      ORDER BY orders DESC
      LIMIT 10
    `);
  });
  
  bench('Customer to supplier through orders and products', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:ORDERS]->(p:Product)<-[:SUPPLIES]-(s:Supplier)
      RETURN c.companyName, s.companyName, count(DISTINCT o) as orders
      ORDER BY orders DESC
      LIMIT 10
    `);
  });
  
  // Aggregations
  bench('Products per category', async () => {
    await neo4jSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, count(p) as productCount
      ORDER BY productCount DESC
    `);
  });
  
  bench('Average price per category', async () => {
    await neo4jSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, avg(p.unitPrice) as avgPrice, count(p) as products
      ORDER BY avgPrice DESC
    `);
  });
  
  bench('Total quantity ordered per product', async () => {
    await neo4jSession.run(`
      MATCH (p:Product)<-[r:ORDERS]-(:Order)
      RETURN p.productName, sum(r.quantity) as totalOrdered
      ORDER BY totalOrdered DESC
      LIMIT 10
    `);
  });
  
  bench('Orders per customer', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)
      RETURN c.companyName, count(o) as orderCount
      ORDER BY orderCount DESC
    `);
  });
  
  bench('Products per supplier', async () => {
    await neo4jSession.run(`
      MATCH (s:Supplier)-[:SUPPLIES]->(p:Product)
      RETURN s.companyName, count(p) as productCount
      ORDER BY productCount DESC
    `);
  });
  
  // Complex patterns
  bench('Top products by revenue (price * quantity)', async () => {
    await neo4jSession.run(`
      MATCH (p:Product)<-[r:ORDERS]-(:Order)
      WITH p, sum(p.unitPrice * r.quantity) as revenue
      RETURN p.productName, revenue
      ORDER BY revenue DESC
      LIMIT 10
    `);
  });
  
  bench('Products out of stock', async () => {
    await neo4jSession.run(`
      MATCH (p:Product)
      WHERE p.unitsInStock = 0
      RETURN p.productName, p.unitPrice
    `);
  });
  
  bench('Expensive products (price > 30)', async () => {
    await neo4jSession.run(`
      MATCH (p:Product)
      WHERE p.unitPrice > 30
      RETURN p.productName, p.unitPrice, p.unitsInStock
      ORDER BY p.unitPrice DESC
    `);
  });
  
  // WITH and COLLECT
  bench('Categories with product lists', async () => {
    await neo4jSession.run(`
      MATCH (c:Category)<-[:PART_OF]-(p:Product)
      RETURN c.categoryName, collect(p.productName) as products
    `);
  });
  
  bench('Customers with order lists', async () => {
    await neo4jSession.run(`
      MATCH (c:Customer)-[:PURCHASED]->(o:Order)
      RETURN c.companyName, collect(o.orderID) as orders
    `);
  });
  
  // OPTIONAL MATCH
  bench('Products with or without orders', async () => {
    await neo4jSession.run(`
      MATCH (p:Product)
      OPTIONAL MATCH (p)<-[r:ORDERS]-(o:Order)
      RETURN p.productName, count(o) as orderCount
      ORDER BY orderCount DESC
    `);
  });
  
  // Write operations
  bench('Create and delete product node', async () => {
    await neo4jSession.run(`
      CREATE (p:Product {productID: 999, productName: 'Test Product', unitPrice: 99.99, unitsInStock: 0})
      WITH p
      DELETE p
      RETURN count(p)
    `);
  });
  
  bench('Create and delete relationship', async () => {
    await neo4jSession.run(`
      MATCH (s:Supplier {supplierID: 1}), (p:Product {productID: 1})
      CREATE (s)-[r:TEST_REL]->(p)
      WITH r
      DELETE r
      RETURN count(r)
    `);
  });
});
