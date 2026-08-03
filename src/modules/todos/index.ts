import fp from 'fastify-plugin';
import { registerTodoRoutes } from './routes.ts';
import { TodoService } from './service.ts';

// Reference module: delete this directory when starting a real project.
export default fp(
  async app => {
    const service = new TodoService();

    registerTodoRoutes(app, service);
  },
  { name: 'todos', dependencies: ['env', 'sensible', 'error-handler'] },
);
