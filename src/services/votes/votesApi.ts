import { supabase } from '@/lib/supabase'
import { makeVotesApi } from './api'

export const votesApi = makeVotesApi(supabase)
