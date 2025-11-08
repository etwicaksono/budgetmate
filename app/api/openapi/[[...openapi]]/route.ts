import { generateResponses, getJSDocFromNode, getSchemaFromTypeNode } from '@scalar/ts-to-openapi';
import { sync } from 'fast-glob';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  JSDocParsingMode,
  ScriptKind,
  ScriptTarget,
  createProgram,
  createSourceFile,
  isFunctionDeclaration,
  isIdentifier,
  isParameter,
  isPropertySignature,
  isTypeLiteralNode,
  isVariableStatement,
  type Identifier,
  type JSDocTag,
  type Node,
  type Program,
  type SourceFile,
} from 'typescript';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = process.cwd();
const API_DIRECTORY = process.env.OPENAPI_API_DIR ?? 'app/api';
const TAG_REFERENCE_PATH = path.join(ROOT, 'docs', 'api-tags.md');
type HttpMethod = OpenAPIV3.HttpMethods;
const HTTP_METHOD_REGEX = /^(get|post|put|patch|delete|head|options|trace)$/;
const SCALAR_CDN_URL = process.env.SCALAR_CDN_URL ?? 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';

type ResponseDescriptionMap = Record<string, string | undefined>;

const toPosix = (value: string) => value.replace(/\\/g, '/');
const resolveFile = (filePath: string) =>
  path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderReferenceHtml = (schemaUrl: string, pageTitle: string) => {
  const serializedConfig = JSON.stringify(
    {
      spec: { url: schemaUrl },
      layout: 'modern',
      theme: 'default',
    },
    null,
    2
  );

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle)}</title>
  </head>
  <body>
    <div id="scalar-reference"></div>
    <script src="${SCALAR_CDN_URL}"></script>
    <script>
      (function initScalar() {
        if (window.Scalar?.createApiReference) {
          window.Scalar.createApiReference('#scalar-reference', ${serializedConfig});
        } else {
          document.addEventListener('scalar:loaded', () => {
            window.Scalar?.createApiReference('#scalar-reference', ${serializedConfig});
          });
        }
      })();
    </script>
  </body>
</html>`;
};

const compilerHost = {
  fileExists: () => true,
  getCanonicalFileName: (filename: string) => filename,
  getCurrentDirectory: () => '',
  getDefaultLibFileName: () => '',
  getNewLine: () => '\n',
  getSourceFile: (filename: string) =>
    createSourceFile(
      filename,
      readFileSync(resolveFile(filename), 'utf8'),
      ScriptTarget.Latest,
      false,
      ScriptKind.TS
    ),
  jsDocParsingMode: JSDocParsingMode.ParseAll,
  readFile: () => undefined,
  useCaseSensitiveFileNames: () => true,
  writeFile: () => null,
};

const checkForMethod = (identifier?: Identifier | null): HttpMethod | null => {
  const method = identifier?.escapedText?.toString().toLowerCase();
  if (!method || !HTTP_METHOD_REGEX.test(method)) {
    return null;
  }
  return method as HttpMethod;
};

const fileNameResolver = (source: string, target: string) => {
  const sourceExt = path.extname(source);
  const targetExt = path.extname(target);
  const targetRelative = target + (targetExt ? '' : sourceExt);
  return path.join(source.replace(/\/([^/]+)$/, ''), targetRelative);
};

const extractPathParams = (node: Node | undefined, program: Program): OpenAPIV3.ParameterObject[] => {
  if (
    node &&
    isParameter(node) &&
    node.type &&
    isTypeLiteralNode(node.type) &&
    node.type.members[0] &&
    isPropertySignature(node.type.members[0]) &&
    isIdentifier(node.type.members[0].name) &&
    node.type.members[0].name.escapedText === 'params' &&
    node.type.members[0].type &&
    isTypeLiteralNode(node.type.members[0].type)
  ) {
    return node.type.members[0].type.members.flatMap<OpenAPIV3.ParameterObject>((member) => {
      if (!isPropertySignature(member) || !member.type) {
        return [];
      }

      const name = member.name?.getText();
      if (!name) {
        return [];
      }

      const schema = getSchemaFromTypeNode(member.type, program, fileNameResolver) as OpenAPIV3.SchemaObject;

      const parameter: OpenAPIV3.ParameterObject = {
        name,
        schema,
        in: 'path',
        required: true,
      };

      return [parameter];
    });
  }
  return [];
};

const parseSecurityTag = (comment: string) => {
  const [scheme, ...rest] = comment.split(/\s+/);
  if (!scheme) {
    return null;
  }

  const scopes = rest
    .join(' ')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return { [scheme]: scopes };
};

const parseResponseTag = (comment: string) => {
  const explicitMatch = comment.match(/^(\w+)\s*-\s*(.+)$/);
  if (explicitMatch) {
    return { status: explicitMatch[1], description: explicitMatch[2].trim() };
  }

  const [statusPart, ...rest] = comment.split(/\s+/);
  return {
    status: statusPart,
    description: rest.join(' ').trim() || undefined,
  };
};

const extractOperationMeta = (node: Node) => {
  const { title: summary, description } = getJSDocFromNode(node);
  const tags: string[] = [];
  const security: OpenAPIV3.SecurityRequirementObject[] = [];
  const responseDocs: ResponseDescriptionMap = {};

  if ('jsDoc' in node && Array.isArray(node.jsDoc)) {
    const jsDoc = node.jsDoc[node.jsDoc.length - 1];
    jsDoc?.tags?.forEach((tag: JSDocTag) => {
      const tagName = tag.tagName?.escapedText?.toString().toLowerCase();
      const comment = tag.comment?.toString().trim();
      if (!tagName || !comment) {
        return;
      }

      if (tagName === 'tag') {
        tags.push(comment);
      } else if (tagName === 'security') {
        const requirement = parseSecurityTag(comment);
        if (requirement) {
          security.push(requirement);
        }
      } else if (tagName === 'response') {
        const parsed = parseResponseTag(comment);
        if (parsed.status) {
          responseDocs[parsed.status] = parsed.description;
        }
      }
    });
  }

  return { summary, description, tags, security, responseDocs };
};

const applyResponseDescriptions = (
  responses: OpenAPIV3.ResponsesObject,
  responseDocs: ResponseDescriptionMap
) => {
  const normalized: OpenAPIV3.ResponsesObject = { ...responses };

  Object.entries(normalized).forEach(([status, response]) => {
    if (!response || '$ref' in response) {
      return;
    }

    const docDescription = responseDocs[status];
    if (docDescription) {
      response.description = docDescription;
      return;
    }

    if (!response.description || response.description.startsWith('TODO')) {
      response.description = status === 'unknown' ? 'Unhandled response type' : 'Response';
    }
  });

  if ('unknown' in normalized && Object.keys(normalized).length > 1) {
    delete normalized['unknown'];
  }

  return normalized;
};

const buildOperation = (
  node: Node,
  responseSource: Node | undefined,
  program: Program,
  typeChecker: ReturnType<Program['getTypeChecker']>,
  parameterNodes?: readonly Node[]
) => {
  const meta = extractOperationMeta(node);
  const rawResponses = responseSource
    ? (generateResponses(responseSource, typeChecker) as OpenAPIV3_1.ResponsesObject)
    : ({} as OpenAPIV3_1.ResponsesObject);
  const normalizedResponses = applyResponseDescriptions(
    rawResponses as unknown as OpenAPIV3.ResponsesObject,
    meta.responseDocs
  );

  const operation: OpenAPIV3.OperationObject = {
    summary: meta.summary,
    description: meta.description,
    responses: normalizedResponses,
  };

  if (meta.tags.length) {
    operation.tags = meta.tags;
  }

  if (meta.security.length) {
    operation.security = meta.security;
  }
  const contextNode = parameterNodes?.[1];
  if (contextNode) {
    const params = extractPathParams(contextNode, program);
    if (params.length) {
      operation.parameters = params;
    }
  }

  return operation;
};

const buildPathSchema = (sourceFile: SourceFile, program: Program) => {
  const pathItem: OpenAPIV3.PathItemObject = {};
  const typeChecker = program.getTypeChecker();

  sourceFile.statements.forEach((statement) => {
    if (isFunctionDeclaration(statement) && statement.name) {
      const method = checkForMethod(statement.name);
      if (!method) {
        return;
      }

      pathItem[method] = buildOperation(statement, statement.body, program, typeChecker, statement.parameters);
    } else if (isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations[0];
      if (!declaration || !isIdentifier(declaration.name)) {
        return;
      }

      const method = checkForMethod(declaration.name);
      if (!method) {
        return;
      }

      pathItem[method] = buildOperation(statement, statement, program, typeChecker);
    }
  });

  return pathItem;
};

const loadTagReference = () => {
  try {
    const content = readFileSync(TAG_REFERENCE_PATH, 'utf8');
    const tableLines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|'));

    if (tableLines.length < 2) {
      return [] as OpenAPIV3.TagObject[];
    }

    const dataRows = tableLines.filter((line) => !line.includes('---')).slice(1);

    return dataRows
      .map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()))
      .filter((cells) => cells.length >= 2 && cells[0])
      .map(
        ([name, description]): OpenAPIV3.TagObject => ({
          name,
          description,
        })
      );
  } catch {
    return [];
  }
};

const buildSpec = (): OpenAPIV3.Document => {
  const programFileNames = sync(`${toPosix(API_DIRECTORY)}/**/*.ts`);
  const routeFileNames = sync(`${toPosix(API_DIRECTORY)}/**/route.ts`);
  const program = createProgram(
    programFileNames,
    {
      noResolve: true,
      target: ScriptTarget.Latest,
    },
    compilerHost
  );

  const paths: OpenAPIV3.PathsObject = {};

  routeFileNames.forEach((fileName) => {
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
      return;
    }

    const pathSchema = buildPathSchema(sourceFile, program);
    const normalizedName = toPosix(fileName);
    const rawPath = normalizedName
      .replace(/^(?:src\/)?app/, '')
      .replace(/\/route\.ts$/g, '')
      .replace(/\[/g, '{')
      .replace(/\/\(\w+\)/g, '')
      .replace(/]/g, '}');
    const pathKey = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

    paths[pathKey] = pathSchema;
  });

  return {
    openapi: '3.0.3',
    info: {
      title: `${process.env.npm_package_name ?? 'Finance API'} OpenAPI`,
      description:
        process.env.npm_package_description ?? 'Autogenerated OpenAPI description for the Finance API.',
      version: process.env.npm_package_version ?? '0.0.0',
    },
    servers: [],
    tags: loadTagReference(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths,
  };
};

let cachedSpec: OpenAPIV3.Document | null = null;

const getSpec = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!cachedSpec) {
      cachedSpec = buildSpec();
    }
    return cachedSpec;
  }

  return buildSpec();
};

export async function GET(request: Request) {
  const spec = getSpec();
  const url = new URL(request.url);

  if (url.pathname.endsWith('.json')) {
    return Response.json({
      ...spec,
      servers: [{ url: url.origin }],
    });
  }

  const schemaUrl = new URL(url.href);
  schemaUrl.pathname = `${schemaUrl.pathname.replace(/\/$/, '')}/schema.json`;

  const html = renderReferenceHtml(schemaUrl.href, `${spec.info.title} Reference`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}
