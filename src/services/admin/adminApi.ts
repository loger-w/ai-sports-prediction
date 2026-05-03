import { supabase } from '@/lib/supabase'
import { makeAdminGamesApi } from './games'
import { makeAdminRecommendationsApi } from './recommendations'

export const adminGamesApi = makeAdminGamesApi(supabase)
export const adminRecommendationsApi = makeAdminRecommendationsApi(supabase)
