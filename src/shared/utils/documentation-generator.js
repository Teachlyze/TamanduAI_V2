/**
 * API Documentation Generator for TamanduAI Platform
 * Automatically generates API documentation from code comments
 */

// ============================================
// DOCUMENTATION GENERATOR
// ============================================

class DocumentationGenerator {
  constructor() {
    this.endpoints = new Map();
    this.schemas = new Map();
    this.components = new Map();
  }

  /**
   * Extract JSDoc comments from code
   */
  extractJSDoc(sourceCode) {
    const jsdocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
    const comments = [];

    let match;
    while ((match = jsdocRegex.exec(sourceCode)) !== null) {
      comments.push(match[1]);
    }

    return comments;
  }

  /**
   * Parse JSDoc comment into structured data
   */
  parseJSDoc(comment) {
    const lines = comment.split('\n');
    const parsed = {
      description: '',
      params: [],
      returns: null,
      examples: [],
      tags: {},
    };

    let currentSection = 'description';
    let paramDescription = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and asterisks
      if (!trimmed || trimmed === '*') continue;

      // Remove leading asterisk and whitespace
      const cleanLine = trimmed.replace(/^\*\s?/, '');

      // Check for tags
      if (cleanLine.startsWith('@')) {
        const [tag, ...content] = cleanLine.substring(1).split(' ');
        const value = content.join(' ');

        switch (tag) {
          case 'param':
            if (value.includes(' - ')) {
              const [paramName, ...descParts] = value.split(' - ');
              parsed.params.push({
                name: paramName.trim(),
                type: 'any',
                description: descParts.join(' - ').trim(),
                required: !paramName.includes('='),
              });
            }
            break;

          case 'returns':
          case 'return':
            const [returnType, returnDesc] = value.split(' - ');
            parsed.returns = {
              type: returnType?.trim() || 'any',
              description: returnDesc?.trim() || '',
            };
            break;

          case 'example':
            parsed.examples.push(value);
            break;

          default:
            parsed.tags[tag] = value;
        }
        currentSection = 'tags';
      } else if (currentSection === 'description') {
        parsed.description += cleanLine + ' ';
      }
    }

    return parsed;
  }

  /**
   * Generate API endpoint documentation
   */
  generateEndpointDocs(sourceCode) {
    const endpointRegex = /export\s+(?:const|function)\s+(\w+)|\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(/g;
    const docs = [];

    let match;
    while ((match = endpointRegex.exec(sourceCode)) !== null) {
      const [fullMatch, functionName, methodMatch] = match;

      if (functionName) {
        // Extract function documentation
        const funcRegex = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*(?:export\\s+)?(?:const|function)\\s+${functionName}\\s*\\([^)]*\\)\\s*{`, 'g');
        const funcMatch = funcRegex.exec(sourceCode);

        if (funcMatch) {
          const jsdoc = this.parseJSDoc(funcMatch[1]);
          docs.push({
            name: functionName,
            type: 'function',
            documentation: jsdoc,
          });
        }
      }
    }

    return docs;
  }

  /**
   * Generate component documentation
   */
  generateComponentDocs(sourceCode) {
    const componentRegex = /export\s+(?:const|function)\s+(\w+).*React\.forwardRef|export\s+(?:const|function)\s+(\w+)/g;
    const docs = [];

    let match;
    while ((match = componentRegex.exec(sourceCode)) !== null) {
      const [, componentName] = match;

      // Extract component documentation
      const compRegex = new RegExp(`\\/\\*\\*([\\s\\S]*?)\\*\\/\\s*(?:export\\s+)?(?:const|function)\\s+${componentName}`, 'g');
      const compMatch = compRegex.exec(sourceCode);

      if (compMatch) {
        const jsdoc = this.parseJSDoc(compMatch[1]);
        docs.push({
          name: componentName,
          type: 'component',
          documentation: jsdoc,
        });
      }
    }

    return docs;
  }

  /**
   * Generate OpenAPI schema
   */
  generateOpenAPISchema(endpoints) {
    const schema = {
      openapi: '3.0.0',
      info: {
        title: 'TamanduAI API',
        version: '1.0.0',
        description: 'API documentation for TamanduAI educational platform',
      },
      servers: [
        {
          url: 'https://api.tamanduai.com',
          description: 'Production server',
        },
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };

    // Generate paths from endpoints
    endpoints.forEach(endpoint => {
      if (!schema.paths[endpoint.path]) {
        schema.paths[endpoint.path] = {};
      }

      schema.paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: [endpoint.category],
        security: endpoint.authRequired ? [{ bearerAuth: [] }] : [],
        parameters: endpoint.parameters || [],
        requestBody: endpoint.requestBody || undefined,
        responses: endpoint.responses || {
          200: {
            description: 'Success',
          },
        },
      };
    });

    return schema;
  }

  /**
   * Generate Storybook stories
   */
  generateStorybookStories(component) {
    const stories = [];

    // Basic story
    stories.push({
      name: 'Default',
      template: `
        <${component.name}>
          Default ${component.name}
        </${component.name}>
      `,
    });

    // Variant stories based on props
    if (component.props) {
      Object.entries(component.props).forEach(([propName, propConfig]) => {
        stories.push({
          name: `${propName}Variants`,
          template: propConfig.variants?.map(variant => `
            <${component.name} ${propName}="${variant}">
              ${component.name} with ${propName}="${variant}"
            </${component.name}>
          `).join('\n') || `
            <${component.name} ${propName}={${JSON.stringify(propConfig.defaultValue)}}>
              ${component.name} with ${propName}
            </${component.name}>
          `,
        });
      });
    }

    return stories;
  }
}

// ============================================
// DOCUMENTATION EXPORTER
// ============================================

/**
 * Export documentation in various formats
 */
export class DocumentationExporter {
  constructor() {
    this.generator = new DocumentationGenerator();
  }

  /**
   * Export to Markdown
   */
  exportToMarkdown(docs) {
    let markdown = '# TamanduAI API Documentation\n\n';

    // API Endpoints
    if (docs.endpoints) {
      markdown += '## API Endpoints\n\n';
      docs.endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        markdown += `${endpoint.description}\n\n`;

        if (endpoint.parameters) {
          markdown += '**Parameters:**\n';
          endpoint.parameters.forEach(param => {
            markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          });
          markdown += '\n';
        }

        if (endpoint.responses) {
          markdown += '**Responses:**\n';
          Object.entries(endpoint.responses).forEach(([code, response]) => {
            markdown += `- ${code}: ${response.description}\n`;
          });
          markdown += '\n';
        }

        markdown += '---\n\n';
      });
    }

    // Components
    if (docs.components) {
      markdown += '## Components\n\n';
      docs.components.forEach(component => {
        markdown += `### ${component.name}\n\n`;
        markdown += `${component.documentation.description}\n\n`;

        if (component.documentation.params.length > 0) {
          markdown += '**Props:**\n';
          component.documentation.params.forEach(param => {
            markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          });
          markdown += '\n';
        }

        markdown += '---\n\n';
      });
    }

    return markdown;
  }

  /**
   * Export to JSON
   */
  exportToJSON(docs) {
    return JSON.stringify(docs, null, 2);
  }

  /**
   * Export to HTML
   */
  exportToHTML(docs) {
    const markdown = this.exportToMarkdown(docs);
    // In a real implementation, this would use a markdown-to-HTML converter
    return `<html><body><pre>${markdown}</pre></body></html>`;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Generate documentation for the entire codebase
 */
export const generateProjectDocs = async () => {
  const generator = new DocumentationGenerator();
  const exporter = new DocumentationExporter();

  // In a real implementation, this would scan the codebase
  const mockSourceCode = `
    /**
     * Get user profile information
     * @param {string} userId - The ID of the user
     * @returns {Promise<Object>} User profile data
     * @example
     * const user = await getUser('user123');
     */
    export const getUser = async (userId) => {
      // Implementation
    };

    /**
     * LoginButton component for user authentication
     * @param {Object} props - Component props
     * @param {string} props.variant - Button style variant
     * @param {boolean} props.loading - Show loading state
     */
    export const LoginButton = ({ variant = 'primary', loading = false }) => {
      // Implementation
    };
  `;

  const endpointDocs = generator.generateEndpointDocs(mockSourceCode);
  const componentDocs = generator.generateComponentDocs(mockSourceCode);

  const docs = {
    endpoints: endpointDocs,
    components: componentDocs,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  return {
    markdown: exporter.exportToMarkdown(docs),
    json: exporter.exportToJSON(docs),
    html: exporter.exportToHTML(docs),
  };
};

/**
 * Auto-generate API schema from endpoints
 */
export const generateAPISchema = (endpoints) => {
  const generator = new DocumentationGenerator();
  return generator.generateOpenAPISchema(endpoints);
};

/**
 * Generate component stories for Storybook
 */
export const generateComponentStories = (component) => {
  const generator = new DocumentationGenerator();
  return generator.generateStorybookStories(component);
};

// ============================================
// DOCUMENTATION VALIDATOR
// ============================================

/**
 * Validate documentation completeness
 */
export const validateDocumentation = (sourceCode) => {
  const generator = new DocumentationGenerator();
  const issues = [];

  // Extract all JSDoc comments
  const comments = generator.extractJSDoc(sourceCode);

  comments.forEach((comment, index) => {
    const parsed = generator.parseJSDoc(comment);

    // Check for required fields
    if (!parsed.description.trim()) {
      issues.push({
        type: 'missing-description',
        line: index + 1,
        message: 'JSDoc comment missing description',
      });
    }

    // Check for @param tags without descriptions
    parsed.params.forEach(param => {
      if (!param.description.trim()) {
        issues.push({
          type: 'missing-param-description',
          line: index + 1,
          message: `Parameter '${param.name}' missing description`,
        });
      }
    });

    // Check for @returns tag without type
    if (parsed.returns && !parsed.returns.type) {
      issues.push({
        type: 'missing-return-type',
        line: index + 1,
        message: 'Return value missing type annotation',
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 10)), // Score out of 100
  };
};

// ============================================
// EXPORTS
// ============================================

export {
  DocumentationGenerator,
  DocumentationExporter,
  generateProjectDocs,
  generateAPISchema,
  generateComponentStories,
  validateDocumentation,
};

export default DocumentationGenerator;
