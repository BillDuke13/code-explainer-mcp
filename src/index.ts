/**
 * Code Explainer MCP - A Cloudflare Worker that analyzes and explains code
 */

// Define the environment interface
interface Env {
	SHARED_SECRET: string;
  }
  
  /**
   * Analyzes and explains code with a comprehensive breakdown of structure and functionality.
   * 
   * @param code {string} The source code to analyze
   * @param programming_language {string} The programming language of the code
   * @return {string} A detailed analysis of the code
   */
  async function explainCode(code: string, programming_language: string): Promise<string> {
	// Create a basic architecture diagram (ASCII)
	const architectureDiagram = generateArchitectureDiagram(code, programming_language);
	
	// Extract core functionality
	const coreFunctionality = extractCoreFunctionality(code, programming_language);
	
	// Extract main classes and functions
	const { mainClasses, mainFunctions } = extractComponents(code, programming_language);
	
	// Format the response according to the prompt template
	const response = `
  # Code Analysis for ${programming_language} Code
  
  ## Architecture Diagram
  \`\`\`
  ${architectureDiagram}
  \`\`\`
  
  ## Core Functionality
  ${coreFunctionality}
  
  ## Main Classes:
  ${mainClasses.map(c => `- ${c.name}: ${c.description}`).join('\n')}
  
  ## Main Functions:
  ${mainFunctions.map(f => `- ${f.name}: ${f.description}`).join('\n')}
  
  Would you like me to explain all the functions and classes in detail? Or are you more interested in a specific part?
  `;
	
	return response;
  }
  
  /**
   * Generates a comprehensive ASCII architecture diagram based on code analysis.
   * 
   * @param code {string} The source code to analyze
   * @param programming_language {string} The programming language of the code
   * @return {string} An ASCII diagram representing the code architecture
   */
  function generateArchitectureDiagram(code: string, programming_language: string): string {
	// Detect language-specific patterns
	let classRegex, functionRegex, methodRegex, importRegex;
	
	switch(programming_language.toLowerCase()) {
	  case 'javascript':
	  case 'typescript':
	  case 'js':
	  case 'ts':
		classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
		functionRegex = /function\s+(\w+)/g;
		methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
		importRegex = /import\s+(?:{[^}]*}|[^{;]*)(?:\s+from)?\s+['"]([^'"]+)['"]/g;
		break;
	  case 'python':
		classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
		functionRegex = /def\s+(\w+)/g;
		methodRegex = /def\s+(\w+)\s*\(self,?[^)]*\):/g;
		importRegex = /(?:from\s+(\w+(?:\.\w+)*)\s+import|import\s+(\w+(?:\.\w+)*))/g;
		break;
	  case 'java':
	  case 'c#':
	  case 'csharp':
		classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;
		functionRegex = /(?:public|private|protected|static)?\s+\w+\s+(\w+)\s*\([^)]*\)\s*{/g;
		methodRegex = /(?:public|private|protected|static)?\s+\w+\s+(\w+)\s*\([^)]*\)\s*{/g;
		importRegex = /import\s+([^;]+);/g;
		break;
	  default:
		// Generic patterns for other languages
		classRegex = /class\s+(\w+)/g;
		functionRegex = /function\s+(\w+)|def\s+(\w+)|(\w+)\s*\([^)]*\)\s*{/g;
		methodRegex = /(\w+)\s*\([^)]*\)\s*{|def\s+(\w+)/g;
		importRegex = /import|require|include|using/g;
	}
	
	// Extract components
	let match;
	
	// Reset regex lastIndex
	classRegex.lastIndex = 0;
	functionRegex.lastIndex = 0;
	importRegex.lastIndex = 0;
	
	// Extract classes with inheritance
	interface ClassInfo {
	  name: string;
	  parent: string | null;
	  index: number;
	}
	
	const classes: ClassInfo[] = [];
	while ((match = classRegex.exec(code)) !== null) {
	  classes.push({
		name: match[1],
		parent: match[2] || null,
		index: match.index
	  });
	}
	
	// Extract functions
	interface FunctionInfo {
	  name: string;
	  index: number;
	}
	
	const functions: FunctionInfo[] = [];
	while ((match = functionRegex.exec(code)) !== null) {
	  // Skip if inside a class
	  let isInsideClass = false;
	  for (const cls of classes) {
		const classCode = extractBlock(code, cls.index);
		if (match.index > cls.index && match.index < cls.index + classCode.length) {
		  isInsideClass = true;
		  break;
		}
	  }
	  
	  if (!isInsideClass) {
		functions.push({
		  name: match[1] || match[2] || match[3],
		  index: match.index
		});
	  }
	}
	
	// Extract imports/dependencies
	const imports: string[] = [];
	while ((match = importRegex.exec(code)) !== null) {
	  imports.push(match[1] || match[2] || "external dependency");
	}
	
	// Analyze relationships between components
	interface Relationship {
	  from: string;
	  to: string;
	  type: string;
	}
	
	const relationships: Relationship[] = [];
	
	// Check for class inheritance
	for (const cls of classes) {
	  if (cls.parent) {
		relationships.push({
		  from: cls.name,
		  to: cls.parent,
		  type: 'inherits'
		});
	  }
	}
	
	// Check for function calls
	for (const func of functions) {
	  const functionCode = extractBlock(code, func.index);
	  
	  // Check if this function calls other functions
	  for (const otherFunc of functions) {
		if (func.name !== otherFunc.name && 
			functionCode.includes(`${otherFunc.name}(`)) {
		  relationships.push({
			from: func.name,
			to: otherFunc.name,
			type: 'calls'
		  });
		}
	  }
	}
	
	// Generate the diagram
	let diagram = '';
	
	// Add header
	diagram += '+----------------------+\n';
	diagram += '|    Code Structure    |\n';
	diagram += '+----------------------+\n';
	
	// Add imports/dependencies if found
	if (imports.length > 0) {
	  diagram += '\n    Dependencies:\n';
	  for (let i = 0; i < Math.min(imports.length, 3); i++) {
		diagram += `    [${imports[i]}]\n`;
	  }
	  if (imports.length > 3) {
		diagram += '    [...more dependencies...]\n';
	  }
	  diagram += '\n        |\n        v\n';
	}
	
	// Add classes with inheritance
	if (classes.length > 0) {
	  diagram += '\n    Classes:\n';
	  
	  // First add parent classes
	  const parentClasses = classes.filter(c => !c.parent);
	  for (const cls of parentClasses) {
		diagram += `    +------------------+\n`;
		diagram += `    |  ${cls.name.padEnd(14)}  |\n`;
		diagram += `    +------------------+\n`;
		
		// Add child classes
		const childClasses = classes.filter(c => c.parent === cls.name);
		if (childClasses.length > 0) {
		  for (let i = 0; i < childClasses.length; i++) {
			const isLast = i === childClasses.length - 1;
			diagram += `    ${isLast ? '└' : '├'}──extends──┐\n`;
			diagram += `                 +------------------+\n`;
			diagram += `                 |  ${childClasses[i].name.padEnd(14)}  |\n`;
			diagram += `                 +------------------+\n`;
		  }
		}
		
		diagram += '\n';
	  }
	  
	  // Add standalone classes (no inheritance)
	  const standaloneClasses = classes.filter(c => !c.parent && !classes.some(other => other.parent === c.name));
	  if (standaloneClasses.length > 0) {
		for (const cls of standaloneClasses) {
		  diagram += `    +------------------+\n`;
		  diagram += `    |  ${cls.name.padEnd(14)}  |\n`;
		  diagram += `    +------------------+\n`;
		}
	  }
	}
	
	// Add functions and their relationships
	if (functions.length > 0) {
	  diagram += '\n    Functions:\n';
	  
	  // Group functions by relationships
	  const processedFunctions = new Set();
	  
	  // First process functions that call other functions
	  for (const rel of relationships.filter(r => r.type === 'calls')) {
		if (!processedFunctions.has(rel.from)) {
		  diagram += `    [${rel.from}] ──calls──> [${rel.to}]\n`;
		  processedFunctions.add(rel.from);
		  processedFunctions.add(rel.to);
		}
	  }
	  
	  // Then add remaining functions
	  for (const func of functions) {
		if (!processedFunctions.has(func.name)) {
		  diagram += `    [${func.name}]\n`;
		  processedFunctions.add(func.name);
		}
	  }
	}
	
	// If no classes or functions found, show generic structure
	if (classes.length === 0 && functions.length === 0) {
	  diagram += '\n    +------------------+\n';
	  diagram += '    |  Implementation  |\n';
	  diagram += '    +------------------+\n';
	}
	
	return diagram;
  }
  
  /**
   * Extracts and summarizes the core functionality of the code.
   * 
   * @param code {string} The source code to analyze
   * @param programming_language {string} The programming language of the code
   * @return {string} A description of the core functionality
   */
  function extractCoreFunctionality(code: string, programming_language: string): string {
	// Define language-specific patterns
	const patterns: Record<string, RegExp[]> = {
	  network: [
		/fetch\s*\(/i, 
		/http/i, 
		/request/i, 
		/api/i, 
		/url/i, 
		/endpoint/i
	  ],
	  ui: [
		/render/i, 
		/component/i, 
		/view/i, 
		/display/i, 
		/ui/i, 
		/interface/i, 
		/dom/i
	  ],
	  dataProcessing: [
		/map\s*\(/i, 
		/filter\s*\(/i, 
		/reduce\s*\(/i, 
		/transform/i, 
		/convert/i, 
		/parse/i
	  ],
	  authentication: [
		/auth/i, 
		/login/i, 
		/password/i, 
		/credential/i, 
		/token/i, 
		/permission/i
	  ],
	  database: [
		/database/i, 
		/db\./i, 
		/query/i, 
		/sql/i, 
		/mongo/i, 
		/store/i, 
		/save/i, 
		/repository/i
	  ],
	  testing: [
		/test/i, 
		/assert/i, 
		/expect/i, 
		/mock/i, 
		/spec/i
	  ],
	  algorithm: [
		/algorithm/i, 
		/sort/i, 
		/search/i, 
		/calculate/i, 
		/compute/i
	  ],
	  fileSystem: [
		/file/i, 
		/read/i, 
		/write/i, 
		/path/i, 
		/directory/i, 
		/folder/i
	  ]
	};
	
	// Add language-specific patterns
	switch(programming_language.toLowerCase()) {
	  case 'javascript':
	  case 'typescript':
	  case 'js':
	  case 'ts':
		patterns.ui.push(/react/i, /angular/i, /vue/i, /component/i, /jsx/i, /tsx/i);
		patterns.network.push(/axios/i, /fetch/i, /xhr/i);
		patterns.database.push(/mongoose/i, /sequelize/i, /typeorm/i);
		break;
		
	  case 'python':
		patterns.ui.push(/flask/i, /django/i, /template/i);
		patterns.network.push(/requests/i, /urllib/i);
		patterns.database.push(/sqlalchemy/i, /django\.db/i, /cursor/i);
		break;
		
	  case 'java':
		patterns.ui.push(/swing/i, /javafx/i, /awt/i);
		patterns.network.push(/httpclient/i, /urlconnection/i);
		patterns.database.push(/jdbc/i, /repository/i, /entity/i);
		break;
		
	  case 'c#':
	  case 'csharp':
		patterns.ui.push(/wpf/i, /xaml/i, /winforms/i);
		patterns.network.push(/httpclient/i, /webclient/i);
		patterns.database.push(/entity\s*framework/i, /dbcontext/i);
		break;
	}
	
	// Check for patterns in the code
	const matches: Record<string, boolean> = {
	  network: false,
	  ui: false,
	  dataProcessing: false,
	  authentication: false,
	  database: false,
	  testing: false,
	  algorithm: false,
	  fileSystem: false
	};
	
	// Count matches for each category
	const matchCounts: Record<string, number> = {};
	
	for (const category in patterns) {
	  matchCounts[category] = 0;
	  for (const pattern of patterns[category]) {
		if (pattern.test(code)) {
		  matchCounts[category]++;
		  matches[category] = true;
		}
	  }
	}
	
	// Determine primary and secondary purposes based on match counts
	const sortedCategories = Object.entries(matchCounts)
	  .sort((a, b) => b[1] - a[1])
	  .filter(entry => entry[1] > 0)
	  .map(entry => entry[0]);
	
	const primaryPurpose = sortedCategories[0];
	const secondaryPurpose = sortedCategories[1];
	
	// Generate description
	let functionality = 'This code appears to ';
	
	if (!primaryPurpose) {
	  functionality += 'provide general utility functions or core logic for the application.';
	  return functionality;
	}
	
	// Primary purpose description
	switch(primaryPurpose) {
	  case 'ui':
		functionality += 'implement a user interface ';
		if (matches.network) {
		  functionality += 'that communicates with external services. ';
		} else if (matches.database) {
		  functionality += 'that interacts with a database. ';
		} else {
		  functionality += 'for displaying and interacting with data. ';
		}
		break;
		
	  case 'network':
		functionality += 'handle network communication, ';
		if (matches.api) {
		  functionality += 'likely serving as an API or service layer. ';
		} else {
		  functionality += 'facilitating data exchange with external systems. ';
		}
		break;
		
	  case 'dataProcessing':
		functionality += 'process and transform data, ';
		if (matches.algorithm) {
		  functionality += 'implementing specific algorithms for data manipulation. ';
		} else {
		  functionality += 'implementing business logic or data transformation. ';
		}
		break;
		
	  case 'database':
		functionality += 'interact with a database, ';
		if (matches.dataProcessing) {
		  functionality += 'performing data operations and transformations. ';
		} else {
		  functionality += 'managing data persistence and retrieval. ';
		}
		break;
		
	  case 'authentication':
		functionality += 'handle authentication and authorization, ';
		if (matches.ui) {
		  functionality += 'providing secure user access to the interface. ';
		} else if (matches.network) {
		  functionality += 'securing API endpoints or network resources. ';
		} else {
		  functionality += 'managing user credentials and permissions. ';
		}
		break;
		
	  case 'testing':
		functionality += 'implement tests for ';
		if (matches.ui) {
		  functionality += 'user interface components. ';
		} else if (matches.network) {
		  functionality += 'network communication. ';
		} else if (matches.database) {
		  functionality += 'database operations. ';
		} else {
		  functionality += 'application functionality. ';
		}
		break;
		
	  case 'algorithm':
		functionality += 'implement specific algorithms ';
		if (matches.dataProcessing) {
		  functionality += 'for data processing and transformation. ';
		} else {
		  functionality += 'to solve computational problems. ';
		}
		break;
		
	  case 'fileSystem':
		functionality += 'handle file system operations, ';
		if (matches.dataProcessing) {
		  functionality += 'processing file data. ';
		} else {
		  functionality += 'managing file reading, writing, or organization. ';
		}
		break;
		
	  default:
		functionality += 'provide utility functions or core logic for the application. ';
	}
	
	// Add secondary purpose if available
	if (secondaryPurpose && matchCounts[secondaryPurpose] > 1) {
	  functionality += 'It also includes functionality for ';
	  
	  switch(secondaryPurpose) {
		case 'ui':
		  functionality += 'user interface presentation';
		  break;
		case 'network':
		  functionality += 'network communication';
		  break;
		case 'dataProcessing':
		  functionality += 'data processing and transformation';
		  break;
		case 'database':
		  functionality += 'database interaction';
		  break;
		case 'authentication':
		  functionality += 'authentication and security';
		  break;
		case 'testing':
		  functionality += 'testing and validation';
		  break;
		case 'algorithm':
		  functionality += 'algorithmic computation';
		  break;
		case 'fileSystem':
		  functionality += 'file system operations';
		  break;
	  }
	  
	  functionality += '.';
	}
	
	return functionality;
  }
  
  /**
   * Extracts main classes and functions from the code.
   * 
   * @param code {string} The source code to analyze
   * @param programming_language {string} The programming language of the code
   * @return {Object} Object containing arrays of main classes and functions with descriptions
   */
  function extractComponents(code: string, programming_language: string): { 
	mainClasses: Array<{name: string, description: string}>,
	mainFunctions: Array<{name: string, description: string}>
  } {
	const mainClasses: Array<{name: string, description: string}> = [];
	const mainFunctions: Array<{name: string, description: string}> = [];
	
	// Simple regex to find class names
	const classRegex = /class\s+(\w+)/g;
	let classMatch;
	while ((classMatch = classRegex.exec(code)) !== null) {
	  const className = classMatch[1];
	  const classCode = extractBlock(code, classMatch.index);
	  const description = generateComponentDescription(classCode, 'class');
	  mainClasses.push({ name: className, description });
	}
	
	// Simple regex to find function names
	const functionRegex = /function\s+(\w+)/g;
	let functionMatch;
	while ((functionMatch = functionRegex.exec(code)) !== null) {
	  const functionName = functionMatch[1];
	  const functionCode = extractBlock(code, functionMatch.index);
	  const description = generateComponentDescription(functionCode, 'function');
	  mainFunctions.push({ name: functionName, description });
	}
	
	// For languages like JavaScript, also look for arrow functions assigned to variables
	const arrowFunctionRegex = /const\s+(\w+)\s*=\s*(\([^)]*\)|[^=]*)\s*=>/g;
	let arrowMatch;
	while ((arrowMatch = arrowFunctionRegex.exec(code)) !== null) {
	  const functionName = arrowMatch[1];
	  const functionCode = extractBlock(code, arrowMatch.index);
	  const description = generateComponentDescription(functionCode, 'function');
	  mainFunctions.push({ name: functionName, description });
	}
	
	return { mainClasses, mainFunctions };
  }
  
  /**
   * Extracts a code block starting from a given position.
   * 
   * @param code {string} The full source code
   * @param startIndex {number} The starting index of the block
   * @return {string} The extracted code block
   */
  function extractBlock(code: string, startIndex: number): string {
	// Find the opening brace after the start index
	const openingBraceIndex = code.indexOf('{', startIndex);
	if (openingBraceIndex === -1) return '';
	
	// Count braces to find the matching closing brace
	let braceCount = 1;
	let currentIndex = openingBraceIndex + 1;
	
	while (braceCount > 0 && currentIndex < code.length) {
	  if (code[currentIndex] === '{') {
		braceCount++;
	  } else if (code[currentIndex] === '}') {
		braceCount--;
	  }
	  currentIndex++;
	}
	
	return code.substring(startIndex, currentIndex);
  }
  
  /**
   * Generates a detailed description for a code component based on its content.
   * 
   * @param componentCode {string} The code of the component
   * @param type {string} The type of component ('class' or 'function')
   * @return {string} A description of the component's purpose
   */
  function generateComponentDescription(componentCode: string, type: string): string {
	// First, look for JSDoc or other documentation comments
	let commentRegex: RegExp | null = null;
	
	// Different comment styles for different languages
	if (componentCode.includes('"""') || componentCode.includes("'''")) {
	  // Python docstring
	  commentRegex = /(?:'''|""")([^]*?)(?:'''|""")/;
	} else if (componentCode.includes('/**')) {
	  // JSDoc style comment
	  commentRegex = /\/\*\*([^]*?)\*\//;
	} else if (componentCode.includes('//')) {
	  // Single line comments (try to find consecutive ones)
	  const lines = componentCode.split('\n');
	  const commentLines: string[] = [];
	  let inCommentBlock = false;
	  
	  for (const line of lines) {
		const trimmedLine = line.trim();
		if (trimmedLine.startsWith('//')) {
		  commentLines.push(trimmedLine.substring(2).trim());
		  inCommentBlock = true;
		} else if (inCommentBlock && trimmedLine.length === 0) {
		  // Allow empty lines in comment blocks
		  continue;
		} else {
		  inCommentBlock = false;
		  if (commentLines.length > 0) {
			break;
		  }
		}
	  }
	  
	  if (commentLines.length > 0) {
		return commentLines.join(' ');
	  }
	}
	
	// Try to extract comment if regex was set
	if (commentRegex) {
	  const commentMatch = componentCode.match(commentRegex);
	  if (commentMatch) {
		// Clean up the comment
		const comment = commentMatch[1]
		  .replace(/\s*\*\s*/g, ' ') // Remove asterisks from JSDoc
		  .replace(/\s+/g, ' ')      // Normalize whitespace
		  .replace(/@\w+\s+[^\n]+/g, '') // Remove JSDoc tags
		  .trim();
		
		if (comment.length > 0) {
		  return comment;
		}
	  }
	}
	
	// If no comment is found, analyze the code to generate a description
	
	// Extract the component name
	let componentName = '';
	if (type === 'class') {
	  const classNameMatch = componentCode.match(/class\s+(\w+)/);
	  if (classNameMatch) {
		componentName = classNameMatch[1];
	  }
	} else {
	  const functionNameMatch = componentCode.match(/function\s+(\w+)|def\s+(\w+)/);
	  if (functionNameMatch) {
		componentName = functionNameMatch[1] || functionNameMatch[2];
	  }
	}
	
	// Convert camelCase or PascalCase to words
	if (componentName) {
	  componentName = componentName
		.replace(/([A-Z])/g, ' $1') // Add space before capital letters
		.replace(/^./, str => str.toUpperCase()) // Capitalize first letter
		.trim();
	}
	
	// Analyze code patterns
	const patterns: Record<string, RegExp[]> = {
	  ui: [/render/i, /component/i, /view/i, /display/i, /dom/i, /element/i, /ui/i],
	  data: [/data/i, /state/i, /store/i, /model/i, /entity/i, /repository/i],
	  network: [/fetch/i, /http/i, /request/i, /api/i, /url/i, /endpoint/i],
	  utility: [/util/i, /helper/i, /format/i, /convert/i, /transform/i],
	  event: [/event/i, /listener/i, /handler/i, /callback/i, /click/i, /change/i],
	  auth: [/auth/i, /login/i, /permission/i, /role/i, /access/i, /token/i],
	  file: [/file/i, /read/i, /write/i, /save/i, /load/i, /path/i],
	  math: [/calc/i, /compute/i, /sum/i, /average/i, /math/i, /formula/i]
	};
	
	// Count matches for each category
	const matchCounts: Record<string, number> = {};
	for (const category in patterns) {
	  matchCounts[category] = 0;
	  for (const pattern of patterns[category]) {
		if (pattern.test(componentCode)) {
		  matchCounts[category]++;
		}
	  }
	}
	
	// Find the primary purpose based on the most matches
	const primaryPurpose = Object.entries(matchCounts)
	  .sort((a, b) => b[1] - a[1])
	  .filter(entry => entry[1] > 0)[0]?.[0];
	
	// Generate description based on component type and primary purpose
	if (type === 'class') {
	  switch (primaryPurpose) {
		case 'ui':
		  return `${componentName ? componentName + ' - ' : ''}A UI component that handles rendering and user interaction`;
		case 'data':
		  return `${componentName ? componentName + ' - ' : ''}Manages data and state for the application`;
		case 'network':
		  return `${componentName ? componentName + ' - ' : ''}Provides services or API interactions`;
		case 'auth':
		  return `${componentName ? componentName + ' - ' : ''}Handles authentication and authorization`;
		case 'file':
		  return `${componentName ? componentName + ' - ' : ''}Manages file operations and storage`;
		default:
		  // Check if it's a base/parent class
		  if (componentCode.includes('extends') || componentCode.includes('implements')) {
			return `${componentName ? componentName + ' - ' : ''}A base class that defines core functionality`;
		  }
		  return `${componentName ? componentName + ' - ' : ''}Encapsulates related functionality and data`;
	  }
	} else { // function
	  // Check for parameters and return values
	  const hasParameters = /\([^)]+\)/.test(componentCode);
	  const hasReturn = /return/.test(componentCode);
	  
	  switch (primaryPurpose) {
		case 'ui':
		  return `${componentName ? componentName + ' - ' : ''}${hasReturn ? 'Generates' : 'Renders'} UI elements${hasParameters ? ' based on input parameters' : ''}`;
		case 'data':
		  return `${componentName ? componentName + ' - ' : ''}${hasReturn ? 'Processes and transforms' : 'Manages'} data${hasParameters ? ' from input parameters' : ''}`;
		case 'network':
		  return `${componentName ? componentName + ' - ' : ''}Handles network communication${hasParameters ? ' with specified endpoints' : ''}`;
		case 'utility':
		  return `${componentName ? componentName + ' - ' : ''}Utility function that ${hasReturn ? 'processes input and returns a result' : 'performs operations'}`;
		case 'event':
		  return `${componentName ? componentName + ' - ' : ''}Event handler that responds to user interactions`;
		case 'auth':
		  return `${componentName ? componentName + ' - ' : ''}Manages authentication or authorization processes`;
		case 'file':
		  return `${componentName ? componentName + ' - ' : ''}Handles file system operations`;
		case 'math':
		  return `${componentName ? componentName + ' - ' : ''}Performs mathematical calculations${hasParameters ? ' on input values' : ''}`;
		default:
		  if (hasReturn && hasParameters) {
			return `${componentName ? componentName + ' - ' : ''}Processes input parameters and returns a result`;
		  } else if (hasReturn) {
			return `${componentName ? componentName + ' - ' : ''}Computes and returns a value`;
		  } else if (hasParameters) {
			return `${componentName ? componentName + ' - ' : ''}Performs operations based on input parameters`;
		  } else {
			return `${componentName ? componentName + ' - ' : ''}Performs a specific operation or task`;
		  }
	  }
	}
  }
  
  // Main worker handler
  export default {
	async fetch(request: Request, env: Env): Promise<Response> {
	  // Check if this is a POST request
	  if (request.method === 'POST') {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		const expectedAuth = `Bearer ${env.SHARED_SECRET}`;
		
		if (!authHeader || authHeader !== expectedAuth) {
		  return new Response('Unauthorized', { status: 401 });
		}
		
		// Parse the request body
		try {
		  const body = await request.json() as { 
			method: string; 
			params: string[];
		  };
		  
		  // Check if this is an MCP request
		  if (body.method === 'explainCode' && Array.isArray(body.params) && body.params.length >= 2) {
			const code = body.params[0];
			const language = body.params[1];
			
			// Call the explainCode function
			const result = await explainCode(code, language);
			
			// Return the result
			return new Response(JSON.stringify({ result }), {
			  headers: { 'Content-Type': 'application/json' }
			});
		  } else {
			return new Response('Invalid method or parameters', { status: 400 });
		  }
		} catch (error: any) {
		  const errorMessage = error?.message || 'Unknown error';
		  return new Response(`Error processing request: ${errorMessage}`, { status: 500 });
		}
	  }
	  
	  // Return a simple HTML page for GET requests
	  return new Response(`
		<!DOCTYPE html>
		<html>
		  <head>
			<title>Code Explainer MCP</title>
			<style>
			  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
			  h1 { color: #333; }
			  pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
			</style>
		  </head>
		  <body>
			<h1>Code Explainer MCP</h1>
			<p>This is a Cloudflare Worker that analyzes and explains code.</p>
			<p>To use it, send a POST request with the following JSON body:</p>
			<pre>
  {
	"method": "explainCode",
	"params": ["your code here", "programming language"]
  }
			</pre>
			<p>Make sure to include the Authorization header with your shared secret.</p>
		  </body>
		</html>
	  `, {
		headers: { 'Content-Type': 'text/html' }
	  });
	}
  };
  