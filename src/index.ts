
import type { OnLoadArgs, PluginBuild, OnLoadResult } from 'esbuild';
import type { InputOptions } from '@babel/core';
import process from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadOptionsSync, transform } from '@babel/core';

const pluginBabel = (options : { filter : RegExp, namespace : string, config : InputOptions }) => ({
	name: 'babel',
	setup(build : PluginBuild, arg : any) {
		const { filter = /.*/, namespace = '', config } = options;
		const a  = /.*/
		const transformContents = ({ args, contents } : { args: OnLoadArgs, contents : string }) => {
			const babelOptions = loadOptionsSync({
				...config,
				filename: args.path,
				caller: {
					name: 'esbuild-plugin-babel',
					supportsStaticESM: true
				}
			})
			if (!babelOptions) 
				return { contents } satisfies OnLoadResult;

			if (babelOptions.sourceMaps) {
				const filename = path.relative(process.cwd(), args.path);

				babelOptions.sourceFileName = filename;
			}

			return new Promise<OnLoadResult>((resolve, reject) => {
				transform(contents, (error, result) => {
					error ? reject(error) : resolve({ contents: result?.code ?? "" });
				});
			});
		};

		if (arg?.transform) return transformContents(arg.transform);

		build.onLoad({ filter, namespace }, async args => {
			const contents = await fs.readFile(args.path, 'utf8');

			return transformContents({ args, contents });
		});
	}
});

export default pluginBabel;
