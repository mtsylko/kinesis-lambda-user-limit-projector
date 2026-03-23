import { AppConfig, loadAppConfig } from './app-config';
import { createUserLimitRepository } from './user-limit-repository-factory';
import { createHandler } from './handler';
import { UserLimitProjector } from './user-limit-projector';

export interface UserLimitApp {
    config: AppConfig;
    projector: UserLimitProjector;
    handler: ReturnType<typeof createHandler>;
}

export function createUserLimitApp(config: AppConfig = loadAppConfig()): UserLimitApp {
    const repository = createUserLimitRepository(config);
    const projector = new UserLimitProjector(repository);

    return {
        config,
        projector,
        handler: createHandler(projector),
    };
}
