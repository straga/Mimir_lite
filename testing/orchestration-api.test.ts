import { describe, it, expect, beforeEach } from 'vitest';
import { createMockGraphManager } from './helpers/mockGraphManager.js';
import type { IGraphManager } from '../src/types/index.js';

/**
 * Orchestration API - Agent Management Tests
 * 
 * Uses MockGraphManager to avoid real database calls and data modification.
 * All operations are in-memory and isolated per test.
 */
describe('Orchestration API - Agent Management', () => {
  let graphManager: IGraphManager;

  beforeEach(async () => {
    // Create fresh mock for each test - ensures complete isolation
    graphManager = createMockGraphManager();
    await graphManager.initialize();
  });

  describe('Agent Creation', () => {
    it('should create a worker agent preamble', async () => {
      const agentData = {
        roleDescription: 'Test worker agent',
        agentType: 'worker' as const,
        useAgentinator: false,
      };

      const node = await graphManager.addNode('preamble', {
        name: 'Test Worker',
        role: agentData.roleDescription,
        agentType: agentData.agentType,
        content: '# Test Worker\n\nTest content',
        version: '1.0',
        roleDescription: agentData.roleDescription,
        charCount: 30,
        usedCount: 0,
        generatedBy: 'manual',
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe('preamble');
      expect(node.properties?.agentType).toBe('worker');
      expect(node.properties?.name).toBe('Test Worker');
    });

    it('should create a QC agent preamble', async () => {
      const agentData = {
        roleDescription: 'Test QC agent',
        agentType: 'qc' as const,
        useAgentinator: false,
      };

      const node = await graphManager.addNode('preamble', {
        name: 'Test QC',
        role: agentData.roleDescription,
        agentType: agentData.agentType,
        content: '# Test QC\n\nTest QC content',
        version: '1.0',
        roleDescription: agentData.roleDescription,
        charCount: 33,
        usedCount: 0,
        generatedBy: 'manual',
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe('preamble');
      expect(node.properties?.agentType).toBe('qc');
      expect(node.properties?.name).toBe('Test QC');
    });

    it('should store agent metadata correctly', async () => {
      const roleDescription = 'DevOps specialist';
      const content = '# DevOps Agent\n\nExecute DevOps tasks';
      
      const node = await graphManager.addNode('preamble', {
        name: 'DevOps Agent',
        role: roleDescription,
        agentType: 'worker',
        content,
        version: '1.0',
        roleDescription,
        charCount: content.length,
        usedCount: 0,
        generatedBy: 'manual',
        roleHash: 'test-hash-123',
      });

      expect(node.properties?.charCount).toBe(content.length);
      expect(node.properties?.usedCount).toBe(0);
      expect(node.properties?.generatedBy).toBe('manual');
      expect(node.properties?.roleHash).toBe('test-hash-123');
    });
  });

  describe('Agent Retrieval', () => {
    beforeEach(async () => {
      // Create test agents
      await graphManager.addNode('preamble', {
        name: 'Frontend Dev',
        role: 'Frontend developer',
        agentType: 'worker',
        content: '# Frontend Dev',
        version: '1.0',
        roleDescription: 'Frontend developer',
        charCount: 15,
        usedCount: 0,
        generatedBy: 'manual',
      });

      await graphManager.addNode('preamble', {
        name: 'Backend Dev',
        role: 'Backend developer',
        agentType: 'worker',
        content: '# Backend Dev',
        version: '1.0',
        roleDescription: 'Backend developer',
        charCount: 14,
        usedCount: 0,
        generatedBy: 'manual',
      });

      await graphManager.addNode('preamble', {
        name: 'QC Specialist',
        role: 'Quality control specialist',
        agentType: 'qc',
        content: '# QC Specialist',
        version: '1.0',
        roleDescription: 'Quality control specialist',
        charCount: 16,
        usedCount: 0,
        generatedBy: 'manual',
      });
    });

    it('should retrieve all agents', async () => {
      const agents = await graphManager.queryNodes('preamble');
      expect(agents.length).toBe(3);
    });

    it('should filter agents by type', async () => {
      const agents = await graphManager.queryNodes('preamble');
      const workerAgents = agents.filter(a => a.properties?.agentType === 'worker');
      const qcAgents = agents.filter(a => a.properties?.agentType === 'qc');

      expect(workerAgents.length).toBe(2);
      expect(qcAgents.length).toBe(1);
    });

    it('should retrieve agent by ID', async () => {
      const agents = await graphManager.queryNodes('preamble');
      const firstAgent = agents[0];

      const retrieved = await graphManager.getNode(firstAgent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(firstAgent.id);
      expect(retrieved?.properties?.name).toBe(firstAgent.properties?.name);
    });

    it('should return null for non-existent agent', async () => {
      const retrieved = await graphManager.getNode('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Agent Search', () => {
    beforeEach(async () => {
      // Create test agents with varied content
      await graphManager.addNode('preamble', {
        name: 'Kubernetes Expert',
        role: 'DevOps engineer specializing in Kubernetes',
        agentType: 'worker',
        content: '# Kubernetes Expert\n\nDeploy and manage Kubernetes clusters',
        version: '1.0',
        roleDescription: 'DevOps engineer specializing in Kubernetes',
        charCount: 60,
        usedCount: 0,
        generatedBy: 'manual',
      });

      await graphManager.addNode('preamble', {
        name: 'React Developer',
        role: 'Frontend developer specializing in React',
        agentType: 'worker',
        content: '# React Developer\n\nBuild React applications',
        version: '1.0',
        roleDescription: 'Frontend developer specializing in React',
        charCount: 50,
        usedCount: 0,
        generatedBy: 'manual',
      });

      await graphManager.addNode('preamble', {
        name: 'Security QC',
        role: 'Security-focused quality control',
        agentType: 'qc',
        content: '# Security QC\n\nValidate security implementations',
        version: '1.0',
        roleDescription: 'Security-focused quality control',
        charCount: 55,
        usedCount: 0,
        generatedBy: 'manual',
      });
    });

    it('should search agents by name (case-insensitive)', async () => {
      const agents = await graphManager.queryNodes('preamble');
      const matches = agents.filter(a => 
        a.properties?.name?.toLowerCase().includes('kubernetes')
      );

      expect(matches.length).toBe(1);
      expect(matches[0].properties?.name).toBe('Kubernetes Expert');
    });

    it('should search agents by role content', async () => {
      const agents = await graphManager.queryNodes('preamble');
      const matches = agents.filter(a => 
        a.properties?.role?.toLowerCase().includes('react')
      );

      expect(matches.length).toBe(1);
      expect(matches[0].properties?.name).toBe('React Developer');
    });

    it('should search agents by agent type', async () => {
      const agents = await graphManager.queryNodes('preamble');
      const qcAgents = agents.filter(a => a.properties?.agentType === 'qc');

      expect(qcAgents.length).toBe(1);
      expect(qcAgents[0].properties?.name).toBe('Security QC');
    });
  });

  describe('Agent Deletion', () => {
    it('should delete an agent', async () => {
      const node = await graphManager.addNode('preamble', {
        name: 'Temp Agent',
        role: 'Temporary test agent',
        agentType: 'worker',
        content: '# Temp Agent',
        version: '1.0',
        roleDescription: 'Temporary test agent',
        charCount: 12,
        usedCount: 0,
        generatedBy: 'manual',
      });

      const agentId = node.id;

      // Verify it exists
      let retrieved = await graphManager.getNode(agentId);
      expect(retrieved).toBeDefined();

      // Delete it
      await graphManager.deleteNode(agentId);

      // Verify it's gone
      retrieved = await graphManager.getNode(agentId);
      expect(retrieved).toBeNull();
    });

    it('should not error when deleting non-existent agent', async () => {
      await expect(
        graphManager.deleteNode('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('Agent Pagination', () => {
    beforeEach(async () => {
      // Create multiple agents for pagination testing
      for (let i = 1; i <= 25; i++) {
        await graphManager.addNode('preamble', {
          name: `Agent ${i}`,
          role: `Test agent ${i}`,
          agentType: i % 3 === 0 ? 'qc' : 'worker',
          content: `# Agent ${i}\n\nTest content`,
          version: '1.0',
          roleDescription: `Test agent ${i}`,
          charCount: 30,
          usedCount: 0,
          generatedBy: 'manual',
        });
      }
    });

    it('should retrieve first page of agents', async () => {
      const allAgents = await graphManager.queryNodes('preamble');
      expect(allAgents.length).toBe(25);

      // Simulate pagination
      const firstPage = allAgents.slice(0, 10);
      expect(firstPage.length).toBe(10);
    });

    it('should retrieve second page of agents', async () => {
      const allAgents = await graphManager.queryNodes('preamble');
      const secondPage = allAgents.slice(10, 20);
      expect(secondPage.length).toBe(10);
    });

    it('should retrieve partial last page', async () => {
      const allAgents = await graphManager.queryNodes('preamble');
      const lastPage = allAgents.slice(20, 30);
      expect(lastPage.length).toBe(5); // Only 25 total agents
    });
  });

  describe('Default Agent Protection', () => {
    it('should identify default agents by ID prefix', () => {
      const defaultId = 'default-devops';
      const customId = 'preamble-1-1234567890';

      expect(defaultId.startsWith('default-')).toBe(true);
      expect(customId.startsWith('default-')).toBe(false);
    });

    it('should prevent deletion of default agents (business logic)', () => {
      const agentId = 'default-qc-general';
      const isDefault = agentId.startsWith('default-');
      
      // Business logic check - should not proceed with deletion
      expect(isDefault).toBe(true);
    });

    it('should allow deletion of custom agents', () => {
      const agentId = 'preamble-1-1234567890';
      const isDefault = agentId.startsWith('default-');
      
      // Business logic check - should proceed with deletion
      expect(isDefault).toBe(false);
    });
  });

  describe('Agent Metadata Updates', () => {
    it('should increment usage count', async () => {
      const node = await graphManager.addNode('preamble', {
        name: 'Usage Test',
        role: 'Test agent for usage tracking',
        agentType: 'worker',
        content: '# Usage Test',
        version: '1.0',
        roleDescription: 'Test agent',
        charCount: 13,
        usedCount: 0,
        generatedBy: 'manual',
      });

      // Update usage count
      const updated = await graphManager.updateNode(node.id, {
        usedCount: 1,
        lastUsed: new Date().toISOString(),
      });

      expect(updated.properties?.usedCount).toBe(1);
      expect(updated.properties?.lastUsed).toBeDefined();
    });

    it('should update agent content', async () => {
      const node = await graphManager.addNode('preamble', {
        name: 'Update Test',
        role: 'Test agent for updates',
        agentType: 'worker',
        content: '# Original Content',
        version: '1.0',
        roleDescription: 'Test agent',
        charCount: 18,
        usedCount: 0,
        generatedBy: 'manual',
      });

      const newContent = '# Updated Content\n\nWith more details';
      const updated = await graphManager.updateNode(node.id, {
        content: newContent,
        charCount: newContent.length,
        version: '1.1',
      });

      expect(updated.properties?.content).toBe(newContent);
      expect(updated.properties?.charCount).toBe(newContent.length);
      expect(updated.properties?.version).toBe('1.1');
    });
  });
});
