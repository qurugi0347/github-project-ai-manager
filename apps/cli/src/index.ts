import { Command } from 'commander';
import { getAppContext, closeAppContext } from './utils/bootstrap';
import { AppService } from '@gpm/backend/dist/app.service';

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
  .action(() => {
    console.log('gpm init - not yet implemented');
  });

program
  .command('auth')
  .description('Check GitHub authentication status')
  .action(() => {
    console.log('gpm auth - not yet implemented');
  });

const taskCmd = program
  .command('task')
  .description('Manage tasks');

taskCmd
  .command('list')
  .description('List tasks')
  .option('--status <status>', 'Filter by status')
  .option('--label <label>', 'Filter by label')
  .option('--json', 'Output as JSON')
  .option('--limit <n>', 'Limit results', '20')
  .action((options) => {
    console.log('gpm task list - not yet implemented', options);
  });

taskCmd
  .command('show <id>')
  .description('Show task details')
  .option('--json', 'Output as JSON')
  .action((id, options) => {
    console.log(`gpm task show ${id} - not yet implemented`, options);
  });

taskCmd
  .command('create <title>')
  .description('Create a new task')
  .option('--body <body>', 'Task body')
  .option('--status <status>', 'Initial status')
  .option('--label <label>', 'Label (can be repeated)', (val: string, acc: string[]) => [...acc, val], [] as string[])
  .option('--json', 'Output as JSON')
  .action((title, options) => {
    console.log(`gpm task create "${title}" - not yet implemented`, options);
  });

taskCmd
  .command('update <id>')
  .description('Update a task')
  .option('--title <title>', 'New title')
  .option('--status <status>', 'New status')
  .option('--add-label <label>', 'Add label')
  .option('--remove-label <label>', 'Remove label')
  .option('--json', 'Output as JSON')
  .action((id, options) => {
    console.log(`gpm task update ${id} - not yet implemented`, options);
  });

taskCmd
  .command('delete <id>')
  .description('Delete a task')
  .action((id) => {
    console.log(`gpm task delete ${id} - not yet implemented`);
  });

taskCmd
  .command('status <id> <status>')
  .description('Quick status change')
  .action((id, status) => {
    console.log(`gpm task status ${id} "${status}" - not yet implemented`);
  });

const syncCmd = program
  .command('sync')
  .description('Sync with GitHub Project')
  .option('--pull', 'Pull from GitHub only')
  .option('--push', 'Push to GitHub only')
  .option('--force', 'Force sync')
  .action((options) => {
    console.log('gpm sync - not yet implemented', options);
  });

syncCmd
  .command('status')
  .description('Show sync status')
  .option('--json', 'Output as JSON')
  .action((options) => {
    console.log('gpm sync status - not yet implemented', options);
  });

program
  .command('server')
  .description('Start the web server')
  .option('--port <port>', 'Server port', '3000')
  .option('--no-open', 'Do not open browser')
  .action((options) => {
    console.log('gpm server - not yet implemented', options);
  });

const labelCmd = program
  .command('label')
  .description('Manage labels');

labelCmd
  .command('list')
  .description('List labels')
  .option('--json', 'Output as JSON')
  .action((options) => {
    console.log('gpm label list - not yet implemented', options);
  });

labelCmd
  .command('create <name>')
  .description('Create a label')
  .option('--color <hex>', 'Label color')
  .option('--description <desc>', 'Label description')
  .action((name, options) => {
    console.log(`gpm label create "${name}" - not yet implemented`, options);
  });

const milestoneCmd = program
  .command('milestone')
  .description('Manage milestones');

milestoneCmd
  .command('list')
  .description('List milestones')
  .option('--json', 'Output as JSON')
  .action((options) => {
    console.log('gpm milestone list - not yet implemented', options);
  });

milestoneCmd
  .command('create <title>')
  .description('Create a milestone')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--description <desc>', 'Milestone description')
  .action((title, options) => {
    console.log(`gpm milestone create "${title}" - not yet implemented`, options);
  });

program.parse();
