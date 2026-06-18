import { getSupabaseClient } from '@/lib/supabase';
import type { ScratchMapState } from '@/types';

type MapStateRow = {
  user_id: string;
  scratch_percentage: number | null;
  visited_countries: string[] | null;
  country_colors: Record<string, string> | null;
  country_labels: Record<string, string> | null;
  country_cities: ScratchMapState['countryCities'] | null;
  last_updated: string | null;
  updated_at: string | null;
};

export type CloudMapState = ScratchMapState & {
  userId: string;
  syncedAt: string;
};

function mapRowToState(row: MapStateRow): CloudMapState {
  const lastUpdated = row.last_updated ?? row.updated_at ?? new Date().toISOString();

  return {
    userId: row.user_id,
    syncedAt: row.updated_at ?? lastUpdated,
    scratchPercentage: row.scratch_percentage ?? 0,
    visitedCountries: row.visited_countries ?? [],
    countryColors: row.country_colors ?? {},
    countryLabels: row.country_labels ?? {},
    countryCities: row.country_cities ?? {},
    lastUpdated,
  };
}

export async function fetchCloudMapState(userId: string): Promise<CloudMapState | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('map_states')
    .select(
      'user_id,scratch_percentage,visited_countries,country_colors,country_labels,country_cities,last_updated,updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToState(data as MapStateRow) : null;
}

export async function saveCloudMapState(userId: string, state: ScratchMapState): Promise<CloudMapState> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('map_states')
    .upsert(
      {
        user_id: userId,
        scratch_percentage: state.scratchPercentage,
        visited_countries: state.visitedCountries,
        country_colors: state.countryColors,
        country_labels: state.countryLabels,
        country_cities: state.countryCities ?? {},
        last_updated: state.lastUpdated,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    .select(
      'user_id,scratch_percentage,visited_countries,country_colors,country_labels,country_cities,last_updated,updated_at'
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToState(data as MapStateRow);
}
