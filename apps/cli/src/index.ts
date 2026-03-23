import { Command } from 'commander';
import { getAppContext, closeAppContext } from './utils/bootstrap';
import { AppService } from '@gpm/backend/dist/app.service';
import { runInit } from './commands/init';
import { apiRequest } from './utils/api-client';

const program = new Command();

program
  .name('gpm')
  .description('GitHub Project Manager - CLI for managing GitHub Projects')
  .version('0.0.1');

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
  .action(async () => {
    await runInit();
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
      const tasks = await apiRequest<any[]>('/tasks');
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
      const task = await apiRequest<any>(`/tasks/${id}`);
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
      await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
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
      });
      console.log(`✓ Task #${id} status → "${status}"`);
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`);
      process.exit(1);
    }
  });

// --- Sync ---
const syncCmd = program
  .command('sync')
  .description('Sync with GitHub Project')
  .option('--pull', 'Pull from GitHub only')
  .option('--push', 'Push to GitHub only')
  .option('--force', 'Force sync')
  .action(() => {
    console.log('gpm sync - not yet implemented');
  });

syncCmd
  .command('status')
  .description('Show sync status')
  .option('--json', 'Output as JSON')
  .action(() => {
    console.log('gpm sync status - not yet implemented');
  });

// --- Server ---
program
  .command('server')
  .description('Start the web server')
  .option('--port <port>', 'Server port', '3000')
  .option('--no-open', 'Do not open browser')
  .action(() => {
    console.log('gpm server - not yet implemented');
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
