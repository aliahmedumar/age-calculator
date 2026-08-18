import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type QualityDefinition = {
  id: number;
  name: string;
  minSize: number;
  preferredSize: number;
  maxSize: number;
};

type QualityDefinitionResponse = {
  id: number;
  quality: { id: number; name: string };
  minSize: number;
  preferredSize: number;
  maxSize: number;
};

type ServiceConfig = {
  baseUrl: string;
  apiKey: string;
  qualityDefinitions: QualityDefinition[];
};

type ProfileConfig = {
  radarr: { qualityDefinitions: QualityDefinition[] };
  sonarr: { qualityDefinitions: QualityDefinition[] };
};

const __dirname = dirname(fileURLToPath(import.meta.url));

async function request<T>(url: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${body}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

async function applyQualityDefinitions(serviceName: string, config: ServiceConfig): Promise<void> {
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/api/v3/qualitydefinition`;
  const currentDefinitions = await request<QualityDefinitionResponse[]>(endpoint, config.apiKey);

  const updatesById = new Map(config.qualityDefinitions.map((definition) => [definition.id, definition]));

  const updatedDefinitions = currentDefinitions.map((definition) => {
    const update = updatesById.get(definition.quality.id);
    if (!update) {
      return definition;
    }

    return {
      ...definition,
      minSize: update.minSize,
      preferredSize: update.preferredSize,
      maxSize: update.maxSize
    };
  });

  await request(`${endpoint}/update`, config.apiKey, {
    method: 'PUT',
    body: JSON.stringify(updatedDefinitions)
  });

  console.log(`[${serviceName}] Updated ${config.qualityDefinitions.length} quality definitions`);
}

async function main(): Promise<void> {
  const configPath = resolve(__dirname, 'profiles', 'quality-definitions.json');
  const profileConfig = JSON.parse(await readFile(configPath, 'utf8')) as ProfileConfig;

  const sonarrUrl = process.env.SONARR_URL ?? 'http://localhost:8989';
  const radarrUrl = process.env.RADARR_URL ?? 'http://localhost:7878';
  const sonarrApiKey = process.env.SONARR_API_KEY;
  const radarrApiKey = process.env.RADARR_API_KEY;

  if (!sonarrApiKey || !radarrApiKey) {
    throw new Error('SONARR_API_KEY and RADARR_API_KEY are required');
  }

  await applyQualityDefinitions('sonarr', {
    baseUrl: sonarrUrl,
    apiKey: sonarrApiKey,
    qualityDefinitions: profileConfig.sonarr.qualityDefinitions
  });

  await applyQualityDefinitions('radarr', {
    baseUrl: radarrUrl,
    apiKey: radarrApiKey,
    qualityDefinitions: profileConfig.radarr.qualityDefinitions
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
