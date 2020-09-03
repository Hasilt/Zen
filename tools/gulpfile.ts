import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import * as del from 'del';
import * as gulp from 'gulp';
import { Gulpclass, SequenceTask, Task } from 'gulpclass';

const execAsync = promisify(exec);
const readdirAsync = promisify(fs.readdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

//=============================================================================
// Configuration
//=============================================================================
const CONFIG = {
  cleanGlobs: ['dist/apps/'],

  gql: {
    apiPath: 'apps/api/src/app/graphql',
  },

  // handlebars: {
  //   src: 'apps/api/src/app/mail/templates/**/*.hbs',
  //   destApi: 'dist/apps/api/mail/templates',
  //   destCron: 'dist/apps/api-cron/mail/templates',
  // },
};

//=============================================================================
// Gulp
//=============================================================================
@Gulpclass()
export class Gulpfile {
  //---------------------------------------------------------------------------
  @Task('increment-version')
  async incrementVersion(cb) {
    const packageFile = await readFileAsync('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const currentVersion: string = packageJson.version;
    const minorVersionIndex = 1 + currentVersion.lastIndexOf('.');
    const currentMinorVersion = +currentVersion.substr(minorVersionIndex, currentVersion.length);
    const newVersion = currentVersion.substr(0, minorVersionIndex) + (currentMinorVersion + 1);
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson));
    await this.execLocal(`prettier --write package.json`);
    console.log('Incremented project version to', newVersion);
    cb();
  }

  @Task('deploy:api')
  async deployApi(cb) {
    const packageFile = await readFileAsync('package.json');
    const packageJson = JSON.parse(packageFile.toString());
    const versionAddress = `zen.azurecr.io/api:${packageJson.version}`;
    const latestAddress = `zen.azurecr.io/api:latest`;
    await this.execGlobal(`docker tag tu-api ${versionAddress}`);
    await this.execGlobal(`docker tag tu-api ${latestAddress}`);
    await this.execGlobal(`docker push ${versionAddress}`);
    await this.execGlobal(`docker push ${latestAddress}`);
    await this.execGlobal(`kubectl set image deployments/zen-api zen-api=${versionAddress}`);
    cb();
  }
  //---------------------------------------------------------------------------
  @Task('clean')
  clean() {
    return del(CONFIG.cleanGlobs, { force: true });
  }

  //---------------------------------------------------------------------------
  @Task('gen:gql')
  async genGqlApi(cb) {
    const PRISMA_PATH = `${CONFIG.gql.apiPath}/prisma`;
    const RESOLVERS_PATH = `${CONFIG.gql.apiPath}/resolvers`;

    console.log(`---------------- @paljs/cli generate ----------------`);
    await this.execGlobal(path.join(__dirname, 'node_modules/.bin/pal') + ' g'); //
    // await this.execLocal(`prettier --write "${PRISMA_PATH}/**/*.ts"`);

    console.log(`---------- Generate Nest GraphQL Resolvers ----------`);
    if (!fs.existsSync(RESOLVERS_PATH)) fs.mkdirSync(RESOLVERS_PATH);

    // Get Prisma type names via the directory names under the 'prisma' folder;
    const dirents = await readdirAsync(PRISMA_PATH, { withFileTypes: true });
    let prismaNames = dirents.filter(d => d.isDirectory()).map(d => d.name);

    const QUERY_TOKEN = 'Query: {';
    const MUTATION_TOKEN = 'Mutation: {';
    const regExpHasResolverName = new RegExp(/^[ \t]*[a-zA-Z0-9_]+\:/);

    let wroteCount = 0;
    for (const prismaName of prismaNames) {
      const outPath = path.join(__dirname, CONFIG.gql.apiPath, 'resolvers', `${prismaName}.ts`);

      // Guard to prevent the overwriting of existing files
      if (!fs.existsSync(outPath)) {
        const pathName = path.join(__dirname, PRISMA_PATH, prismaName, 'resolvers.ts');
        const prismaScript = fs.readFileSync(pathName).toString();

        const queryStartIndex = prismaScript.indexOf(QUERY_TOKEN) + QUERY_TOKEN.length + 1;
        const queryEndIndex = prismaScript.indexOf(MUTATION_TOKEN) - MUTATION_TOKEN.length;
        const querySection = prismaScript.substr(
          queryStartIndex,
          queryEndIndex - queryStartIndex + 2
        );
        const querySectionLines = querySection.split('\n');

        const resolverNames = [];
        for (const line of querySectionLines) {
          if (regExpHasResolverName.test(line)) {
            resolverNames.push(line.substr(0, line.indexOf(':')).trim());
          }
        }

        let querySource = '';
        for (const resolverName of resolverNames) {
          querySource += `  @Query()
  async ${resolverName}(@Parent() parent, @Info() info, @Args() args, @Context() context) {
    return resolvers.Query.${resolverName}(parent, PrismaSelectArgs(info, args), context);
  }\n\n`;
        }

        const mutationStartIndex = prismaScript.indexOf(MUTATION_TOKEN) + MUTATION_TOKEN.length + 1;
        const mutationEndIndex = prismaScript.length - mutationStartIndex - 1;
        const mutationSection = prismaScript.substr(mutationStartIndex, mutationEndIndex);
        const mutationSectionLines = mutationSection.split('\n');
        const mutationNames = [];
        for (const line of mutationSectionLines) {
          if (regExpHasResolverName.test(line)) {
            mutationNames.push(line.substr(0, line.indexOf(':')).trim());
          }
        }

        let mutationSource = '';
        for (const mutationName of mutationNames) {
          mutationSource += `  @Mutation()
  async ${mutationName}(@Parent() parent, @Info() info, @Args() args, @Context() context) {
    return resolvers.Mutation.${mutationName}(parent, PrismaSelectArgs(info, args), context);
  }\n\n`;
        }
        mutationSource = mutationSource.trimRight();

        const outSource = `import { Args, Context, Info, Mutation, Parent, Query, Resolver } from '@nestjs/graphql';
import gql from 'graphql-tag';

import { PrismaSelectArgs } from '../prisma-select-args';
import resolvers from '../prisma/${prismaName}/resolvers';

export const ${prismaName}TypeDef = null;
// export const ${prismaName}TypeDef = gql\`
//   extend type Query {
//     sample${prismaName}Query: ${prismaName}!
//   }
//   extend type Mutation {
//     sample${prismaName}Mutation(args: Int!): Boolean
//   }
//   extend type ${prismaName} {
//     sample${prismaName}Field: String
//   }
// \`;

@Resolver('${prismaName}')
export class ${prismaName}Resolver {
${querySource}${mutationSource}
}
`;
        await writeFileAsync(outPath, outSource);
        console.log(`- Wrote: ${outPath}`);
        wroteCount++;
      }
    }

    console.log(`* Total resolver files wrote: ${wroteCount}`);

    // Get the data type names via the filename of the "resolvers" directory
    let dataTypeNames = (await readdirAsync(RESOLVERS_PATH))
      .filter(f => path.basename(f) !== 'index.ts') // Filter out any "index.ts"
      .map(f => path.basename(f, '.ts')); // Remove ".ts" extension from all names

    let indexSource = `import { makeExecutableSchema } from 'graphql-tools';
import { mergeTypes } from 'merge-graphql-schemas';

import PRISMA_TYPE_DEFS from '../prisma/typeDefs';\n`;

    // Construct the "resolvers" directory's "index.ts"
    indexSource += dataTypeNames
      .map(n => `import { ${n}Resolver, ${n}TypeDef } from './${n}';`)
      .reduce((prev, curr, i, []) => prev + '\n' + curr);

    // Create an ES6 export to automate the importing of all Nest resolvers in bulk
    const bulkExportString = dataTypeNames
      .map(n => `${n}Resolver`)
      .toString()
      .replace(/,/g, ',\n  ');
    indexSource += `\n\nexport const NEST_RESOLVERS = [\n  ${bulkExportString}\n];`;

    const bulkTypeDefExportString = dataTypeNames
      .map(n => `${n}TypeDef`)
      .toString()
      .replace(/,/g, ',\n  ');
    indexSource += `\n\nexport const NEST_TYPE_DEFS = [\n  ${bulkTypeDefExportString}\n].filter(x => x);\n\n`;

    indexSource += `export const ALL_TYPE_DEFS = mergeTypes([PRISMA_TYPE_DEFS, ...NEST_TYPE_DEFS]);\n
export const GRAPHQL_SCHEMA = makeExecutableSchema({ typeDefs: ALL_TYPE_DEFS });
export const PRISMA_SCHEMA = makeExecutableSchema({ typeDefs: PRISMA_TYPE_DEFS });\n`;

    const indexPath = `${RESOLVERS_PATH}/index.ts`;
    await writeFileAsync(indexPath, indexSource);
    console.log(`- Wrote: ${indexPath}\n`);

    cb();
  }
  //---------------------------------------------------------------------------
  // async parseResolverNames(sourcePath: string) {
  //   const QUERY_TOKEN = '@Query(';
  //   const MUTATION_TOKEN = '@Mutation(';

  //   const source = (await readFileAsync(sourcePath)).toString();

  //   const lines = source.split('\n');

  //   for (const line of lines) {
  //     if (line.includes(QUERY_TOKEN)) {
  //     }

  //     if (line.includes(MUTATION_TOKEN)) {
  //     }
  //   }

  //   return { queries: [], mutations: [] };
  // }
  //---------------------------------------------------------------------------
  // @Task('handlebars:copy')
  // handlebarsCopy() {
  //   return gulp
  //     .src(CONFIG.handlebars.src)
  //     .pipe(flatten())
  //     .pipe(gulp.dest(CONFIG.handlebars.destApi))
  //     .pipe(gulp.dest(CONFIG.handlebars.destCron));
  // }

  // @Task('handlebars:watch')
  // handlebarsWatch() {
  //   gulp.watch(CONFIG.handlebars.src, gulp.parallel('handlebars:copy'));
  // }
  //---------------------------------------------------------------------------
  private execGlobal(command: string) {
    console.log(command);
    return execAsync(command).then(({ stdout, stderr }) => {
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
    });
  }

  private execLocal(command: string) {
    console.log(command);
    return execAsync('npx --no-install ' + command).then(({ stdout, stderr }) => {
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
    });
  }
}