import { Command } from 'commander';
import { getAppContext, closeAppContext } from './utils/bootstrap';
import { AppService } from '@gpm/backend/dist/app.service';
import { runInit } from './commands/init';
import { runServer } from './commands/server';
import { runHooksList, runHooksInstall, runHooksRemove } from './commands/hooks';
import { registerProjectCommand } from './commands/project';
import { apiRequest } from './utils/api-client';
import { loadGpmrc, getAllProjectAliases } from './utils/gpmrc';

const program = new Command();

program
  .name('gpm')
  .description('GitHub Project Manager - CLI for managing GitHub Projects')
  .version('0.0.1')
  .option('-p, --project <alias>', 'Target project alias from .gpmrc');

program
  .command('health')
  .description('Check backend service health (standalone mode)')
  .action(async () => {
    const app = await getAppContext();
    const appService = app.get(AppService);
    const result = appService.getHealth();
    console.log(JSON.stringify(result, null, 2));
    await closeAppContext();
  });

program
  .command('init')
  .description('Initialize GPM with a GitHub Project')
  .option('--no-hooks', 'Skip Claude Code Hooks installation')
  .action(async (options) => {
    await runInit({ hooks: options.hooks });
  });

program
  .command('auth')
  .description('Check GitHub authentication status')
  .action(() => {
    console.log('gpm auth - not yet implemented');
  });

// --- Task ---
const taskCmd = program.command('task').description('Manage tasks');

taskCmd
  .command('list')
  .description('List tasks')
  .option('--status <status>', 'Filter by status')
  .option('--json', 'Output as JSON')
  .option('--limit <n>', 'Limit results', '20')
  .action(async (options) => {
    try {
      const tasks = await apiRequest<any[]>('/tasks', {
        projectAlias: program.opts().project,
      });
      if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
      } else {
        if (tasks.length === 0) {
          console.log('No tasks found.');
          return;
        }
        console.log('ID\tStatus\t\tTitle');
        console.log('--\t------\t\t-----');
        tasks.slice(0, Number(options.limit)).forEach((t: any) => {
          console.log(`${t.id}\t${t.status}\t\t${t.title}`);
        });
      }
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

taskCmd
  .command('show <id>')
  .description('Show task details')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const task = await apiRequest<any>(`/tasks/${id}`, {
        projectAlias: program.opts().project,
      });
      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(`#${task.id} ${task.title}`);
        console.log(`Status: ${task.status}`);
        console.log(`Type: ${task.contentType}`);
        if (task.body) console.log(`\n${task.body}`);
      }
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

taskCmd
  .command('create <title>')
  .description('Create a new task')
  .option('--body <body>', 'Task body')
  .option('--status <status>', 'Initial status')
  .option('--json', 'Output as JSON')
  .action(async (title, options) => {
    try {
      const task = await apiRequest<any>('/tasks', {
        method: 'POST',
        body: { title, body: options.body, status: options.status },
        projectAlias: program.opts().project,
      });
      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(`✓ Task #${task.id} created: ${task.title}`);
      }
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

taskCmd
  .command('update <id>')
  .description('Update a task')
  .option('--title <title>', 'New title')
  .option('--body <body>', 'New body')
  .option('--status <status>', 'New status')
  .option('--json', 'Output as JSON')
  .action(async (id, options) => {
    try {
      const { json, ...data } = options;
      const task = await apiRequest<any>(`/tasks/${id}`, {
        method: 'PATCH',
        body: data,
        projectAlias: program.opts().project,
      });
      if (json) {
        console.log(JSON.stringify(task, null, 2));
      } else {
        console.log(`✓ Task #${task.id} updated`);
      }
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

taskCmd
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id) => {
    try {
      await apiRequest(`/tasks/${id}`, {
        method: 'DELETE',
        projectAlias: program.opts().project,
      });
      console.log(`✓ Task #${id} deleted`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

taskCmd
  .command('status <id> <status>')
  .description('Quick status change')
  .action(async (id, status) => {
    try {
      await apiRequest(`/tasks/${id}`, {
        method: 'PATCH',
        body: { status },
        projectAlias: program.opts().project,
      });
      console.log(`✓ Task #${id} status → "${status}"`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- Hooks ---
const hooksCmd = program.command('hooks').description('Manage Claude Code hooks');

hooksCmd
  .command('list')
  .description('List installed hooks')
  .action(() => {
    runHooksList();
  });

hooksCmd
  .command('install [name]')
  .description('Install hooks (all or specific)')
  .action((name?: string) => {
    runHooksInstall(name);
  });

hooksCmd
  .command('remove [name]')
  .description('Remove hooks (all or specific)')
  .action((name?: string) => {
    runHooksRemove(name);
  });

// --- Sync ---
async function syncProject(alias: string): Promise<{ alias: string; success: boolean; result?: any; error?: string }> {
  try {
    const result = await apiRequest<any>('/sync/pull', {
      method: 'POST',
      projectAlias: alias,
    });
    return { alias, success: true, result };
  } catch (err) {
    return { alias, success: false, error: (err as Error).message };
  }
}

async function syncAllProjects(): Promise<void> {
  const projectAlias = program.opts().project;

  if (projectAlias) {
    // --project 옵션이 지정된 경우: 해당 project만 sync
    try {
      console.log('Syncing with GitHub Project...');
      const result = await apiRequest<any>('/sync/pull', {
        method: 'POST',
        projectAlias,
      });
      console.log(`✓ Sync completed: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);
      console.log(`  Total items from GitHub: ${result.pulled}`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }

  // 전체 project 순회
  const config = loadGpmrc();
  const aliases = getAllProjectAliases(config);

  console.log(`Syncing ${aliases.length} project(s) with GitHub...`);

  let successCount = 0;
  const failed: { alias: string; error: string }[] = [];

  for (const alias of aliases) {
    console.log(`\n▶ Syncing project "${alias}"...`);
    const { success, result, error } = await syncProject(alias);

    if (success) {
      console.log(`  ✓ "${alias}" synced: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);
      successCount++;
    } else {
      console.error(`  ✗ "${alias}" failed: ${error}`);
      failed.push({ alias, error: error! });
    }
  }

  console.log(`\nSync complete: ${successCount}/${aliases.length} projects synced successfully`);
  if (failed.length > 0) {
    console.error('Failed projects:');
    for (const { alias, error } of failed) {
      console.error(`  - ${alias}: ${error}`);
    }
    process.exit(1);
  }
}

const syncCmd = program
  .command('sync')
  .description('Sync with GitHub Project')
  .action(async () => {
    await syncAllProjects();
  });

syncCmd
  .command('pull')
  .description('Pull latest data from GitHub Project')
  .action(async () => {
    await syncAllProjects();
  });

syncCmd
  .command('status')
  .description('Show sync status')
  .option('--json', 'Output as JSON')
  .action(() => {
    console.log('gpm sync status - not yet implemented');
  });

// --- Project ---
registerProjectCommand(program);

// --- Server ---
program
  .command('server')
  .description('Start the web server (API + Web UI)')
  .option('--port <port>', 'Server port', '6170')
  .option('--no-open', 'Do not open browser')
  .action(async (options) => {
    await runServer(options);
  });

// --- Label ---
const labelCmd = program.command('label').description('Manage labels');

labelCmd
  .command('list')
  .description('List labels')
  .option('--json', 'Output as JSON')
  .action(() => {
    console.log('gpm label list - not yet implemented');
  });

labelCmd
  .command('create <name>')
  .description('Create a label')
  .option('--color <hex>', 'Label color')
  .option('--description <desc>', 'Label description')
  .action((name) => {
    console.log(`gpm label create "${name}" - not yet implemented`);
  });

// --- Milestone ---
const milestoneCmd = program.command('milestone').description('Manage milestones');

milestoneCmd
  .command('list')
  .description('List milestones')
  .option('--json', 'Output as JSON')
  .action(() => {
    console.log('gpm milestone list - not yet implemented');
  });

milestoneCmd
  .command('create <title>')
  .description('Create a milestone')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--description <desc>', 'Milestone description')
  .action((title) => {
    console.log(`gpm milestone create "${title}" - not yet implemented`);
  });

program.parse();
