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

interface AdapterReplace {
    from: string;
    to: string;
    many?: boolean;
}


export interface AdapterOptions {
    assets?: string;
    pages?: string;
    fallback?: string;
    precompress?: boolean;
    replace?: AdapterReplace[];
    injectTo?: AdapterInjectsTarget;
    strict: boolean;
    targetExtension?: string;
    viewName: string;
    moduleName: string;
    routeName: string;
    cssDirName: string;
    jsDirName: string;
}

export default function plugin(options?: AdapterOptions): Adapter;
