declare module 'cloudflare:test' {
	interface GlobalProps {
		mainModule: typeof import("./../src/index");
	}
	interface ProvidedEnv extends Env {
		API_KEY: string;
		DB: D1Database;
	}
}

declare module '*.sql?raw' {
  const content: string;
  export default content;
}