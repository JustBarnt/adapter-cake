import { mkdir } from 'node:fs';
import { transformFiles } from './adapter.js';
import path, { join } from 'node:path';

/** @type {import('.').default} */
export default function (options){
    return {
        name: 'svelte-adapter-cake',
        async adapt(builder){
            if (!options?.fallback) {
				const dynamic_routes = builder.routes.filter((route) => route.prerender !== true);
				if (dynamic_routes.length > 0 && options?.strict !== false) {
					const prefix = path.relative('.', builder.config.kit.files.routes);
					const has_param_routes = builder.routes.some((route) => route.id.includes('['));
					const config_option =
						has_param_routes || JSON.stringify(builder.config.kit.prerender.entries) !== '["*"]'
							? `  - adjust the \`prerender.entries\` config option ${
									has_param_routes
										? '(routes with parameters are not part of entry points by default)'
										: ''
							  } — see https://kit.svelte.dev/docs/configuration#prerender for more info.`
							: '';

					builder.log.error(
						`@sveltejs/adapter-static: all routes must be fully prerenderable, but found the following routes that are dynamic:
${dynamic_routes.map((route) => `  - ${path.posix.join(prefix, route.id)}`).join('\n')}

You have the following options:
  - set the \`fallback\` option — see https://kit.svelte.dev/docs/single-page-apps#usage for more info.
  - add \`export const prerender = true\` to your root \`+layout.js/.ts\` or \`+layout.server.js/.ts\` file. This will try to prerender all pages.
  - add \`export const prerender = true\` to any \`+server.js/ts\` files that are not fetched by page \`load\` functions.
${config_option}
  - pass \`strict: false\` to \`adapter-static\` to ignore this error. Only do this if you are sure you don't need the routes in question in your final app, as they will be unavailable. See https://github.com/sveltejs/kit/tree/master/packages/adapter-static#strict for more info.

If this doesn't help, you may need to use a different adapter. @sveltejs/adapter-static can only be used for sites that don't need a server for dynamic rendering, and can run on just a static file server.
See https://kit.svelte.dev/docs/page-options#prerender for more details`
					);
					throw new Error('Encountered dynamic routes');
				}
			}

            const { 
                pages = 'build',
                assets = pages,
                precompress,
            } = options /** @type {import('./index').AdapterOptions} */ ?? ({});

            // TODO: Update to split into potential string[]
            // currently assuming only a css/js folder will exist in assets dir
            builder.rimraf(assets)
            builder.rimraf(pages);
            
            builder.mkdirp(join(assets, builder.config.kit.appDir, 'css'));
            builder.mkdirp(join(assets, builder.config.kit.appDir, 'js'))

            builder.writeClient(assets);
            builder.writePrerendered(pages);

            if (precompress) {
				if (pages === assets) {
					builder.log.minor('Compressing assets and pages');
					await builder.compress(assets);
				} else {
					builder.log.minor('Compressing assets');
					await builder.compress(assets);

					builder.log.minor('Compressing pages');
					await builder.compress(pages);
				}
			}

			if (pages === assets) {
				builder.log(`Wrote site to "${pages}"`);
			} else {
				builder.log(`Wrote pages to "${pages}" and assets to "${assets}"`);
			}

            builder.log('Running CAKEPHP conversion scripts now: ');
            transformFiles(builder, options);
        }
    }
}
