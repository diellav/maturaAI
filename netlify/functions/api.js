import serverless from 'serverless-http';
import { app } from '../../server/app.js';

const expressHandler = serverless(app);
const functionPath = '/.netlify/functions/api';

export const handler = (event, context) => {
  const path = event.path || event.rawPath || '/';
  const routePath = path === functionPath || path.startsWith(`${functionPath}/`)
    ? path.slice(functionPath.length) || '/'
    : path;
  const apiPath = routePath === '/api' || routePath.startsWith('/api/')
    ? routePath.replace(/^\/api\/api(?=\/|$)/, '/api')
    : `/api${routePath.startsWith('/') ? routePath : `/${routePath}`}`;

  return expressHandler({ ...event, path: apiPath }, context);
};
