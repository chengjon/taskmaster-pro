/**
 * @fileoverview Swagger UI Configuration Middleware
 *
 * Serves OpenAPI/Swagger documentation UI and raw specification
 */

import { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load OpenAPI specification from YAML file
 */
function loadOpenApiSpec() {
	try {
		const specPath = resolve(__dirname, '../..', 'openapi.yaml');
		const specContent = readFileSync(specPath, 'utf-8');
		return parse(specContent);
	} catch (error) {
		console.error('Failed to load OpenAPI specification:', error);
		return {
			openapi: '3.0.3',
			info: {
				title: 'Task Master API',
				version: '1.0.0',
				description: 'API documentation unavailable'
			},
			paths: {}
		};
	}
}

/**
 * Configure Swagger UI middleware
 */
export function setupSwaggerUI(app: Express): void {
	const spec = loadOpenApiSpec();

	// Swagger UI options
	const options = {
		customCss: `
			.swagger-ui .topbar {
				background-color: #1f2937;
			}
			.swagger-ui .info .title {
				color: #111827;
			}
			.swagger-ui .btn {
				background-color: #3b82f6;
			}
			.swagger-ui .btn:hover {
				background-color: #2563eb;
			}
			.swagger-ui .model-box {
				background-color: #f9fafb;
			}
		`,
		swaggerOptions: {
			url: '/api/v1/docs/spec.json',
			urls: [
				{
					url: '/api/v1/docs/spec.json',
					name: 'OpenAPI 3.0 (JSON)'
				},
				{
					url: '/api/v1/docs/spec.yaml',
					name: 'OpenAPI 3.0 (YAML)'
				}
			],
			displayOperationId: true,
			filter: true,
			showRequestHeaders: true,
			supportedSubmitMethods: [
				'get',
				'post',
				'put',
				'delete',
				'patch',
				'options',
				'head',
				'trace'
			],
			withCredentials: true
		}
	};

	// Serve Swagger UI at /api/v1/docs
	app.use(
		'/api/v1/docs',
		swaggerUi.serve,
		swaggerUi.setup(spec, options)
	);

	// Serve raw OpenAPI spec as JSON
	app.get('/api/v1/docs/spec.json', (_req, res) => {
		res.setHeader('Content-Type', 'application/json');
		res.json(spec);
	});

	// Serve raw OpenAPI spec as YAML
	app.get('/api/v1/docs/spec.yaml', (_req, res) => {
		const specPath = resolve(__dirname, '../..', 'openapi.yaml');
		try {
			const specContent = readFileSync(specPath, 'utf-8');
			res.setHeader('Content-Type', 'application/yaml');
			res.send(specContent);
		} catch (error) {
			res.status(500).json({
				error: 'Failed to load OpenAPI specification'
			});
		}
	});

	// Redirect root docs path to Swagger UI
	app.get('/api/v1/docs/', (_req, res) => {
		res.redirect('/api/v1/docs');
	});

	console.log('Swagger UI available at http://localhost:3000/api/v1/docs');
}
