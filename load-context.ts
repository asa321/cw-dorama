import { type PlatformProxy } from "wrangler";

type GetLoadContextArgs = {
	request: Request;
	context: {
		cloudflare: Omit<PlatformProxy<Env>, "dispose" | "caches" | "cf"> & {
			caches: PlatformProxy<Env>["caches"] | CacheStorage;
			cf: any;
		};
	};
};

// type Cloudflare = Omit<PlatformProxy<Env>, "dispose">; // This type is no longer needed

declare module "@remix-run/cloudflare" {
	interface AppLoadContext {
		cloudflare: GetLoadContextArgs["context"]["cloudflare"]; // Changed to use the specific type from GetLoadContextArgs
	}
}

export function getLoadContext({ context }: GetLoadContextArgs) {
	return context;
}
