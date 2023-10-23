import { Adapter } from "@sveltejs/kit";

interface AdapterInjectsTarget {
    [head?: string]: AdapterInjectsPositions;
    [body?: string]: AdapterInjectsPositions;
}

interface AdapterInjectsPositions {
    [beforeBegin?: string]: string | string[];
    [afterBegin?: string]: string | string[];
    [beforeEnd?: string]: string | string[];
    [afterEnd?: string]: string | string[];
}

export interface AdapterOptions {
    pages?: string;
    assets?: string[] | string;
    fallback?: string;
    precompress?: boolean;
    strict?: boolean;
}

interface AdapterReplace {
    from: string;
    to: string;
    many?: boolean;
}


interface AdapterOptions {
    assets?: string | string[];
    fallback?: string;
    injectTo: AdapterInjectsTarget;
    minify?: boolean;
    pages?: string;
    precompress?: boolean;
    prettify?: boolean;
    replace?: AdapterReplace[];
    targetExtension: string;
}

export default function plugin(options?: AdapterOptions): Adapter;
