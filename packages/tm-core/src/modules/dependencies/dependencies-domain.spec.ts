/**
 * @fileoverview Tests for DependenciesDomain
 */

import { DependenciesDomain } from './dependencies-domain.js';
import type { IStorage } from '../../common/interfaces/storage.interface.js';
import type { Task } from '../../common/types/index.js';

// Mock storage implementation
class MockStorage implements Partial<IStorage> {
	private tasks: Task[] = [];

	async loadTasks(): Promise<Task[]> {
		return this.tasks;
	}

	async saveTasks(tasks: Task[]): Promise<void> {
		this.tasks = tasks;
	}

	setTasks(tasks: Task[]): void {
		this.tasks = tasks;
	}
}

describe('DependenciesDomain', () => {
	let storage: MockStorage;
	let domain: DependenciesDomain;

	beforeEach(() => {
		storage = new MockStorage();
		domain = new DependenciesDomain(storage as IStorage);
	});

	describe('validate', () => {
		it('should return valid for tasks with no dependencies', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{ id: '2', title: 'Task 2', status: 'pending' } as Task
			]);

			const result = await domain.validate();

			expect(result.valid).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect self-dependencies', async () => {
			storage.setTasks([
				{
					id: '1',
					title: 'Task 1',
					status: 'pending',
					dependencies: ['1']
				} as Task
			]);

			const result = await domain.validate();

			expect(result.valid).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].type).toBe('self');
			expect(result.issues[0].taskId).toBe('1');
		});

		it('should detect missing dependencies', async () => {
			storage.setTasks([
				{
					id: '1',
					title: 'Task 1',
					status: 'pending',
					dependencies: ['999']
				} as Task
			]);

			const result = await domain.validate();

			expect(result.valid).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].type).toBe('missing');
			expect(result.issues[0].dependencyId).toBe('999');
		});

		it('should detect circular dependencies', async () => {
			storage.setTasks([
				{
					id: '1',
					title: 'Task 1',
					status: 'pending',
					dependencies: ['2']
				} as Task,
				{
					id: '2',
					title: 'Task 2',
					status: 'pending',
					dependencies: ['1']
				} as Task
			]);

			const result = await domain.validate();

			expect(result.valid).toBe(false);
			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.issues.some((issue) => issue.type === 'circular')).toBe(
				true
			);
		});
	});

	describe('add', () => {
		it('should add a dependency between two tasks', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{ id: '2', title: 'Task 2', status: 'pending' } as Task
			]);

			await domain.add('2', '1');

			const tasks = await storage.loadTasks();
			const task2 = tasks.find((t) => String(t.id) === '2');

			expect(task2?.dependencies).toContain('1');
		});

		it('should prevent self-dependencies', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task
			]);

			await expect(domain.add('1', '1')).rejects.toThrow('self-dependency');
		});

		it('should prevent circular dependencies', async () => {
			storage.setTasks([
				{
					id: '1',
					title: 'Task 1',
					status: 'pending',
					dependencies: ['2']
				} as Task,
				{ id: '2', title: 'Task 2', status: 'pending' } as Task
			]);

			await expect(domain.add('2', '1')).rejects.toThrow(
				'circular dependency'
			);
		});
	});

	describe('remove', () => {
		it('should remove a dependency', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{
					id: '2',
					title: 'Task 2',
					status: 'pending',
					dependencies: ['1']
				} as Task
			]);

			await domain.remove('2', '1');

			const tasks = await storage.loadTasks();
			const task2 = tasks.find((t) => String(t.id) === '2');

			expect(task2?.dependencies).not.toContain('1');
		});
	});

	describe('getDependencies', () => {
		it('should return all dependencies for a task', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{ id: '2', title: 'Task 2', status: 'pending' } as Task,
				{
					id: '3',
					title: 'Task 3',
					status: 'pending',
					dependencies: ['1', '2']
				} as Task
			]);

			const deps = await domain.getDependencies('3');

			expect(deps).toEqual(['1', '2']);
		});
	});

	describe('getDependents', () => {
		it('should return all tasks that depend on a given task', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{
					id: '2',
					title: 'Task 2',
					status: 'pending',
					dependencies: ['1']
				} as Task,
				{
					id: '3',
					title: 'Task 3',
					status: 'pending',
					dependencies: ['1']
				} as Task
			]);

			const dependents = await domain.getDependents('1');

			expect(dependents).toContain('2');
			expect(dependents).toContain('3');
			expect(dependents).toHaveLength(2);
		});
	});

	describe('fix', () => {
		it('should remove invalid dependencies', async () => {
			storage.setTasks([
				{
					id: '1',
					title: 'Task 1',
					status: 'pending',
					dependencies: ['1', '999']
				} as Task
			]);

			const result = await domain.fix();

			expect(result.removedCount).toBe(2); // Self + missing
			const tasks = await storage.loadTasks();
			expect(tasks[0].dependencies).toHaveLength(0);
		});

		it('should remove duplicate dependencies', async () => {
			storage.setTasks([
				{ id: '1', title: 'Task 1', status: 'pending' } as Task,
				{
					id: '2',
					title: 'Task 2',
					status: 'pending',
					dependencies: ['1', '1', '1']
				} as Task
			]);

			const result = await domain.fix();

			expect(result.duplicatesRemoved).toBe(2);
			const tasks = await storage.loadTasks();
			const task2 = tasks.find((t) => String(t.id) === '2');
			expect(task2?.dependencies).toEqual(['1']);
		});
	});
});
