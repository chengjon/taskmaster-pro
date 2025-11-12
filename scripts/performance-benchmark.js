#!/usr/bin/env node

/**
 * Performance Benchmark Script
 *
 * 运行API性能基准测试
 *
 * 使用:
 *   node scripts/performance-benchmark.js --url http://localhost:3000 --token <jwt>
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// 性能测试配置
const config = {
	baseUrl: process.env.API_URL || 'http://localhost:3000',
	token: process.env.AUTH_TOKEN || '',
	concurrency: 10,
	duration: 30,           // 秒
	warmupRequests: 100
};

// 性能统计
const stats = {
	totalRequests: 0,
	successRequests: 0,
	failureRequests: 0,
	totalTime: 0,
	responseTimes: [],
	cacheHits: 0,
	cacheMisses: 0,
	errors: new Map()
};

/**
 * 发送HTTP请求
 */
function makeRequest(path, options = {}) {
	return new Promise((resolve, reject) => {
		const url = new URL(path, config.baseUrl);
		const protocol = url.protocol === 'https:' ? https : http;

		const requestOptions = {
			method: options.method || 'GET',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Performance-Benchmark/1.0',
				...(config.token && { 'Authorization': `Bearer ${config.token}` }),
				...options.headers
			}
		};

		const startTime = Date.now();

		const req = protocol.request(url, requestOptions, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				const duration = Date.now() - startTime;
				const cacheHeader = res.headers['x-cache'];

				stats.totalRequests++;
				stats.totalTime += duration;
				stats.responseTimes.push(duration);

				if (cacheHeader === 'HIT') {
					stats.cacheHits++;
				} else if (cacheHeader === 'MISS') {
					stats.cacheMisses++;
				}

				if (res.statusCode >= 200 && res.statusCode < 300) {
					stats.successRequests++;
					resolve({ status: res.statusCode, duration, data });
				} else {
					stats.failureRequests++;
					reject(new Error(`HTTP ${res.statusCode}`));
				}
			});
		});

		req.on('error', (err) => {
			stats.failureRequests++;
			const errorName = err.code || 'UNKNOWN';
			stats.errors.set(errorName, (stats.errors.get(errorName) || 0) + 1);
			reject(err);
		});

		if (options.body) {
			req.write(JSON.stringify(options.body));
		}

		req.end();
	});
}

/**
 * 计算百分位数
 */
function calculatePercentile(arr, p) {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const index = Math.ceil(sorted.length * (p / 100)) - 1;
	return sorted[Math.max(0, index)];
}

/**
 * 预热测试
 */
async function warmup() {
	console.log(`\n🔥 预热测试 (${config.warmupRequests} 个请求)...`);
	let completed = 0;

	for (let i = 0; i < config.warmupRequests; i++) {
		try {
			await makeRequest('/api/v1/tasks');
			completed++;
		} catch (err) {
			// 忽略预热错误
		}
	}

	console.log(`✓ 预热完成 (${completed}/${config.warmupRequests})`);
}

/**
 * 性能测试基准
 */
async function benchmark() {
	console.log(`\n⚡ 性能基准测试`);
	console.log(`📊 配置:`);
	console.log(`   URL: ${config.baseUrl}`);
	console.log(`   并发: ${config.concurrency}`);
	console.log(`   持续时间: ${config.duration}s`);

	const startTime = Date.now();
	const endTime = startTime + config.duration * 1000;
	let requestCount = 0;

	// 创建并发任务
	const workers = [];
	for (let i = 0; i < config.concurrency; i++) {
		workers.push((async () => {
			while (Date.now() < endTime) {
				try {
					await makeRequest('/api/v1/tasks');
					requestCount++;
				} catch (err) {
					// 继续下一个请求
				}
			}
		})());
	}

	// 等待所有任务完成
	await Promise.all(workers);

	return Date.now() - startTime;
}

/**
 * 测试缓存效率
 */
async function cacheTest() {
	console.log(`\n💾 缓存效率测试`);

	const testPaths = [
		'/api/v1/tasks',
		'/api/v1/tasks',
		'/api/v1/tasks?status=pending',
		'/api/v1/tasks?status=pending'
	];

	for (const path of testPaths) {
		try {
			const response = await makeRequest(path);
			const cacheStatus = response.duration < 10 ? '✓' : '✗';
			console.log(`${cacheStatus} ${path} - ${response.duration}ms`);
		} catch (err) {
			console.log(`✗ ${path} - Error: ${err.message}`);
		}
	}
}

/**
 * 测试速率限制
 */
async function rateLimitTest() {
	console.log(`\n🚦 速率限制测试`);

	const requests = [];
	const startTime = Date.now();

	// 发送30个并发请求
	for (let i = 0; i < 30; i++) {
		requests.push(
			makeRequest('/api/v1/tasks')
				.catch(() => ({ status: 429 }))
		);
	}

	const results = await Promise.all(requests);
	const duration = Date.now() - startTime;

	const success = results.filter(r => r.status < 400).length;
	const rateLimited = results.filter(r => r.status === 429).length;

	console.log(`✓ 成功请求: ${success}`);
	console.log(`⚠ 限流请求: ${rateLimited}`);
	console.log(`⏱ 总耗时: ${duration}ms`);
}

/**
 * 打印统计信息
 */
function printStats() {
	if (stats.totalRequests === 0) {
		console.log('\n❌ 没有成功的请求');
		return;
	}

	const avgResponseTime = stats.totalTime / stats.totalRequests;
	const p50 = calculatePercentile(stats.responseTimes, 50);
	const p95 = calculatePercentile(stats.responseTimes, 95);
	const p99 = calculatePercentile(stats.responseTimes, 99);
	const rps = (stats.totalRequests / (stats.totalTime / 1000)).toFixed(2);
	const successRate = ((stats.successRequests / stats.totalRequests) * 100).toFixed(2);
	const cacheHitRate = ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(2);

	console.log(`\n📊 性能统计结果:`);
	console.log(`────────────────────────────────────`);
	console.log(`总请求数: ${stats.totalRequests}`);
	console.log(`成功请求: ${stats.successRequests} (${successRate}%)`);
	console.log(`失败请求: ${stats.failureRequests}`);
	console.log(`````);
	console.log(`响应时间统计:`);
	console.log(`  平均: ${avgResponseTime.toFixed(2)}ms`);
	console.log(`  P50:  ${p50}ms`);
	console.log(`  P95:  ${p95}ms`);
	console.log(`  P99:  ${p99}ms`);
	console.log(`````);
	console.log(`吞吐量: ${rps} req/s`);
	console.log(`````);
	console.log(`缓存统计:`);
	console.log(`  命中: ${stats.cacheHits}`);
	console.log(`  未中: ${stats.cacheMisses}`);
	console.log(`  命中率: ${cacheHitRate}%`);
	console.log(`────────────────────────────────────\n`);

	// 打印错误汇总
	if (stats.errors.size > 0) {
		console.log(`❌ 错误汇总:`);
		for (const [error, count] of stats.errors.entries()) {
			console.log(`  ${error}: ${count}`);
		}
		console.log('');
	}
}

/**
 * 主函数
 */
async function main() {
	console.log(`
╔════════════════════════════════════════╗
║   Task Master Pro - 性能基准测试      ║
║          Performance Benchmark          ║
╚════════════════════════════════════════╝
	`);

	// 解析命令行参数
	const args = process.argv.slice(2);
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--url' && args[i + 1]) {
			config.baseUrl = args[++i];
		}
		if (args[i] === '--token' && args[i + 1]) {
			config.token = args[++i];
		}
		if (args[i] === '--concurrency' && args[i + 1]) {
			config.concurrency = parseInt(args[++i]);
		}
		if (args[i] === '--duration' && args[i + 1]) {
			config.duration = parseInt(args[++i]);
		}
	}

	try {
		// 预热
		await warmup();

		// 重置统计
		stats.totalRequests = 0;
		stats.responseTimes = [];
		stats.cacheHits = 0;
		stats.cacheMisses = 0;

		// 基准测试
		const elapsedTime = await benchmark();

		// 缓存测试
		await cacheTest();

		// 速率限制测试
		await rateLimitTest();

		// 打印结果
		printStats();

		// 性能评级
		const rps = stats.totalRequests / (elapsedTime / 1000);
		const avgResponseTime = stats.totalTime / stats.totalRequests;

		console.log(`🎯 性能评级:`);
		if (rps > 5000) {
			console.log(`  吞吐量: ⭐⭐⭐⭐⭐ 优秀 (${rps.toFixed(0)} req/s)`);
		} else if (rps > 1000) {
			console.log(`  吞吐量: ⭐⭐⭐⭐ 良好 (${rps.toFixed(0)} req/s)`);
		} else if (rps > 500) {
			console.log(`  吞吐量: ⭐⭐⭐ 可接受 (${rps.toFixed(0)} req/s)`);
		} else {
			console.log(`  吞吐量: ⭐⭐ 需改进 (${rps.toFixed(0)} req/s)`);
		}

		if (avgResponseTime < 20) {
			console.log(`  响应时间: ⭐⭐⭐⭐⭐ 优秀 (${avgResponseTime.toFixed(2)}ms)`);
		} else if (avgResponseTime < 50) {
			console.log(`  响应时间: ⭐⭐⭐⭐ 良好 (${avgResponseTime.toFixed(2)}ms)`);
		} else if (avgResponseTime < 100) {
			console.log(`  响应时间: ⭐⭐⭐ 可接受 (${avgResponseTime.toFixed(2)}ms)`);
		} else {
			console.log(`  响应时间: ⭐⭐ 需改进 (${avgResponseTime.toFixed(2)}ms)`);
		}

		process.exit(0);
	} catch (err) {
		console.error(`\n❌ 测试失败: ${err.message}`);
		process.exit(1);
	}
}

// 运行
main();
