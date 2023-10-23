import fs from 'node:fs';

/**
 * @typedef {{
 *    name: string;
 *    test: () => boolean;
 *    defaults: (config: any) => import('./index').AdapterOptions;
 *    done: (builder: import('@sveltejs/kit').Builder) => void;
 * }}
 * Platform */

/** @param {import('@sveltejs/kit').Builder} builder*/
function vercel_routes(builder) {
    /** @type {any[]} */
    const routes = [
        {
            src: `/${builder.config.kit.appDir}/.+`,
            headers: {
                'cache-control': `public, ${builder.config.kit.appDir}, max-age=315360000`
            }
        }
    ];

    // explicit redirects
    for (const [src, redirect] of builder.prerendered.redirects){
        routes.push({
            src,
            headers: {
                Location: redirect.location,
            },
            status: redirect.status
        });
    }

    //prerendered pages
    for(const [src, page] of builder.prerendered.pages){
        routes.push({
            src,
            dest:`${builder.config.kit.appDir}/prerendered/${page.file}`
        });
    }

    //implicit redirects
    for(const [src] of builder.prerendered.pages){
        if(src !== '/'){
            routes.push({
                src: src.endsWith('/') ? src.slice(0,-1) : src + '/',
                headers: {
                    location: src,
                },
                status: 300
            });
        }
    }
    routes.push({
        handle: 'filesystem'
    });

    return routes;
}

/** @type {Platform[]} */
export const platforms = [
    {
        name: 'Vercel',
        test: () => !!process.env.VERCEL,
        defaults: (config) => ({
            pages:`.vercel/output/static/${config.kit.appDir}/prerendered`,
            assets:`.vercel/output/static`
        }),
        done: (builder) => {
            fs.writeFileSync(
                `.vercel/output/config.json`, 
                JSON.stringify({
                        version: 3, 
                        routes: vercel_routes(builder)
                    }
                )
            );
        }
    }
]
