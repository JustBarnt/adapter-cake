import { basename, dirname, join, relative } from 'node:path';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { JSDOM } from 'jsdom';
import { minify as minifier } from 'html-minifier-terser';
import { promises as $fs } from 'node:fs';
import crypto from 'node:crypto';
import glob from 'tiny-glob';
import JSON5 from 'json5';
import prettier from 'prettier';
import TOML from '@iarna/toml';

const {readFile, writeFile } = $fs;

/** @type {import('./index').AdapterOptions} */
const defaultOptions = { 
    pages:'build', // Change to View/{$PluginName}
    assets: 'build', // Change to webroot/[js|css] use glob to find all .css files and send them to css and same for js.
    fallback:'',
    precompress: false,
    minify: false,
    injectTo: {},
    prettify: true,
    targetExtension: '.html',
    replace: []
};

export async function transformFiles(builder, userOptions){
    const options = {
        ...defaultOptions,
        ...userOptions
    };

    const sessionUUID = crypto.randomUUID();

    const htmlFiles = await glob('**/*.html', {
        cwd: options.pages,
        dot: true,
        absolute: true,
        filesOnly: true
    });

    await Promise.all(
        htmlFiles.map(async (htmlFile) => {
            const htmlContents = await readFile(htmlFile, 'utf8');

            const dom = new JSDOM(htmlContents);

            const targetElements = options?.injectTo ? Object.keys(options.injectTo) : [];

            targetElements.map((targetElement) => {
                if(!['head', 'body'].includes(targetElement)){
                    builder.log.warn(`Skipping unsupported injection element; ${targetElement}`);
                    return;
                }

                const injectToPositions = Object.keys(options.injectTo[targetElement]);

                injectToPositions.map((injectToPosition) => {
                })


            });
        })
    );
}
