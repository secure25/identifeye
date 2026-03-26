import { createApplication, runMigrations, logger as frameworkLogger } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerApplicationRoutes } from './routes/applications.js';
import { registerHomeAffairsRoutes } from './routes/homeaffairs.js';

const schema = { ...appSchema, ...authSchema };

// Run migrations before starting the server
await runMigrations({ logger: frameworkLogger });

export const app = await createApplication(schema);

export type App = typeof app;

app.withAuth();

registerProfileRoutes(app);
registerApplicationRoutes(app);
registerHomeAffairsRoutes(app);

await app.run();
app.logger.info('Application running');
