export type SonarrEpisode = {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  hasFile: boolean;
  monitored: boolean;
  episodeFileId?: number;
};

type SonarrCommandResponse = {
  id: number;
  name: string;
  state: string;
};

export class SonarrClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sonarr request failed (${response.status}): ${body}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async getSeriesEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
    return this.request<SonarrEpisode[]>(`/api/v3/episode?seriesId=${seriesId}`);
  }

  async monitorEpisodes(episodeIds: number[], monitored: boolean): Promise<void> {
    if (!episodeIds.length) {
      return;
    }

    await this.request('/api/v3/episode/monitor', {
      method: 'PUT',
      body: JSON.stringify({ episodeIds, monitored })
    });
  }

  async triggerEpisodeSearch(episodeIds: number[]): Promise<SonarrCommandResponse> {
    return this.request<SonarrCommandResponse>('/api/v3/command', {
      method: 'POST',
      body: JSON.stringify({ name: 'EpisodeSearch', episodeIds })
    });
  }

  async deleteEpisodeFile(episodeFileId: number): Promise<void> {
    await this.request(`/api/v3/episodefile/${episodeFileId}`, {
      method: 'DELETE'
    });
  }
}
