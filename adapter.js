import { basename, dirname, join, relative } from 'node:path';
import { JSDOM } from 'jsdom';
import { promises as $fs } from 'node:fs';
import crypto from 'node:crypto';
import glob from 'tiny-glob';

const {readFile, writeFile, rename, mkdir, access } = $fs;
const cssFilesArray = [];
/** @type { {jsDirName:string, assets: string, appDir: string, rootDir: string, moduleDir: string, outputDir:string, fileName:string }[] | any[] } */
const jsFilesArray = [];

/** @type {import('./index').AdapterOptions} */
const defaultOptions = { 
    pages:`build`, // Change to View/{$PluginName}
    assets: 'build', // Change to webroot/[js|css] use glob to find all .css files and send them to css and same for js.
    fallback:'',
    precompress: false,
    injectTo: {},
    targetExtension: '.html',
    replace: [],
    strict: true,
    cssDirName: 'css',
    jsDirName: 'js',
    viewName: 'SvelteKit',
    routeName:"svelte_kit_module",
    moduleName: 'SvelteKitModule'
};

/**
 * 
 * @param {import('@sveltejs/kit').Builder} builder 
 * @param {import('./index').AdapterOptions} userOptions 
 */
export async function transformFiles(builder, userOptions ){
    const options = {
        ...defaultOptions,
        ...userOptions 
    };

    const sessionUUID = crypto.randomUUID();

    //Grab all html Files for injection.
    const htmlFiles = await glob('**/*.html', {
        cwd: options.pages,
        dot: true,
        absolute: true,
        filesOnly: true
    });

    // Grab all CSS Files for relocation
    const cssFiles = await glob('**/*.css', {
        cwd: options.assets,
        dot: true,
        absolute: true,
        filesOnly: true,
    });
    
    // Grab all JS Files for relocation
    const jsFiles = await glob('**/*.js', {
        cwd: options.assets,
        dot: true,
        absolute: true,
        filesOnly: true,
    })

    await Promise.all([
        cssFiles.map(async (cssFile) => {
            //TODO OutputCSS to js files under css/ as well
            // Ideally I would just look through the js files and update the css link there.
            const cssDir = userOptions?.cssDirName ?? defaultOptions.cssDirName;
            const assets = userOptions?.assets ?? defaultOptions.assets;
            const appDir = builder.config.kit.appDir;
            const rootDir = dirname(cssFile).split(`${assets}`)[0];
            const newPath = join(rootDir, assets, appDir, cssDir);

            const outFile = `${basename(cssFile, '.css')}.css`; 
            cssFilesArray.push(outFile);
            const outPath = join(newPath, outFile);
            const oldPath = join(dirname(cssFile), outFile);
           
            await rename(oldPath, outPath);
            
        }),

        jsFiles.map(async (jsFile) => {
            const dirObj = {
                jsDirName: userOptions.jsDirName ?? defaultOptions.jsDirName,
                assets: userOptions.assets ?? defaultOptions.assets,
                appDir: builder.config.kit.appDir,
                rootDir: dirname(jsFile).split(`${userOptions.assets ?? defaultOptions.assets}`)[0],
                moduleDir: dirname(jsFile).split("immutable\\")[1].split("\\")[0],
                outputDir: '',
                fileName: '',
            }

            //Look into reading the JS Files and editing the CSS links there.
            const outFile = `${basename(jsFile, '.js')}.js`;
            
            dirObj.fileName = outFile;
            dirObj.outputDir = join(dirObj.rootDir, dirObj.assets, dirObj.appDir, dirObj.jsDirName, dirObj.moduleDir);
            jsFilesArray.push(dirObj);
            
            const oldPath = join(dirname(jsFile), outFile);
            const outPath = join(dirObj.outputDir, outFile);

            try{
                await mkdir(dirObj.outputDir);
            } 
            catch {
                console.log(`Output directory: ${dirObj.outputDir} already exists, skipping`);
            } 
            finally {
                await rename(oldPath, outPath);

            }
        }),


        // Will need to rewrite html file? 
        // THIS WILL BE THE HARDEST PART
        htmlFiles.map(async (htmlFile) => {
            const htmlContents = await readFile(htmlFile, 'utf8');
            const options = userOptions ?? defaultOptions;

            const dom = new JSDOM(htmlContents);
            const head = dom.window.document.head;
            const body = dom.window.document.body;

            injectIntoHeader(head, options);
            replaceSvelteKitImports(body, options);

            const updatedHtml = dom.serialize();

            console.log(updatedHtml)

            const outFile = `${basename(htmlFile, '.html')}${options.targetExtension}`;
            const outPath = join(dirname(htmlFile), outFile);

            try{
                builder.log.minor(`Writing to: ${relative(options.pages, outPath)} `);
                await writeFile(outPath, updatedHtml);

                if(outPath !== htmlFile){
                    builder.log.minor(`Deleting ${relative(options.pages, htmlFile)}`);
                    builder.rimraf(htmlFile);
                }
            } 
            catch(error){
                throw Error(error);
            }
        })
    ]);
}

/**
 * Injects PHP into the header
 * @param {HTMLHeadElement} head 
 * @param {import('./index').AdapterOptions} options
 */
function injectIntoHeader(head, options){
    const children = head.children;
    //wipe out old tags
    Array.from(children).forEach(child => {if(child.tagName === 'LINK') child.remove()});


    const injectableData = 
    `
        <link rel="icon" href="/entry_validation/favicon.png" />
		
        ${cssFilesArray.map(cssFile => {
            if(!cssFile.includes('_'))
                `<link href="/${options.routeName}/css/${cssFile}" rel="stylesheet">`;
        })}
        
        ${jsFilesArray.map(file => {
            `<link rel="modulepreload" href="/${options.routeName}/js/${file.moduleDir}/${file.fileName}">`;
        })}
    `;

    console.log(injectableData)
    head.insertAdjacentHTML('beforeend', injectableData);
}

/**
 * 
 * @param {HTMLElement} body 
 * @param {import('./index').AdapterOptions} options 
 */
function replaceSvelteKitImports(body, options){
    const script = body.children[0].getElementsByTagName('script')[0];
    const content = script.textContent = "";
    const entryFiles = jsFilesArray.filter(item => item.moduleDir === 'entry');

    const phpScript = 
    `
                                {
                                        __sveltekit_q0s2wu = {
                                                base: new URL(".", location).pathname.slice(0, -1),
                                                env: {}
                                        };

                                        const element = document.currentScript.parentElement;

                                        const data = [null,null];

                                        Promise.all([
                                                import('/${options.routeName}/entry/${entryFiles[1].fileName}'),
                                                import('/${options.routeName}/entry/${entryFiles[0].fileName}')
                                        ]).then(([kit, app]) => {
                                                kit.start(app, element, {
                                                        node_ids: [0, 2],
                                                        data,
                                                        form: null,
                                                        error: null
                                                });
                                        });
                                }
    `
    script.insertAdjacentText('beforeend', phpScript);
}
