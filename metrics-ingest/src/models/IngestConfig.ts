import { type Result, ok, err } from "./Result.js";

export type Port = number & { readonly __brand: "Port" };

export type IngestConfig = {
  readonly vmImportUrl: URL;
  readonly port: Port;
};

const ENV_VARS = ["VM_IMPORT_URL", "PORT"] as const;
export type EnvVarName = (typeof ENV_VARS)[number];

export type ConfigError =
  | { readonly kind: "missing-env-var"; readonly name: EnvVarName }
  | { readonly kind: "invalid-url"; readonly name: "VM_IMPORT_URL"; readonly received: string }
  | { readonly kind: "invalid-port"; readonly name: "PORT"; readonly received: string };

export function ingestConfigFromEnv(
  env: NodeJS.ProcessEnv
): Result<IngestConfig, ConfigError> {
  for (const name of ENV_VARS) {
    if (env[name] === undefined) return err({ kind: "missing-env-var", name });
  }
  const vmImportUrl = parsedUrl(env["VM_IMPORT_URL"] as string);
  if (!vmImportUrl.ok) return vmImportUrl;
  const port = parsedPort(env["PORT"] as string);
  if (!port.ok) return port;
  return ok({ vmImportUrl: vmImportUrl.value, port: port.value });
}

function parsedUrl(raw: string): Result<URL, ConfigError> {
  try {
    return ok(new URL(raw));
  } catch {
    return err({ kind: "invalid-url", name: "VM_IMPORT_URL", received: raw });
  }
}

function parsedPort(raw: string): Result<Port, ConfigError> {
  const invalid = err<ConfigError>({ kind: "invalid-port", name: "PORT", received: raw });
  if (!/^\d+$/.test(raw)) return invalid;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return invalid;
  if (parsed < 1 || parsed > 65535) return invalid;
  return ok(parsed as Port);
}
