import { OpenAPI } from '@scalar/nextjs-openapi';

const openApiHandler = OpenAPI({
  /**
   * If we reorganize our API routes we can update this path.
   * For now we rely on the default `app/api`, but passing it
   * explicitly avoids any ambiguity.
   */
  apiDirectory: 'app/api',
});

export const GET = openApiHandler.GET;
