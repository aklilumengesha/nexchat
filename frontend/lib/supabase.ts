import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwgagmcdzgtarzaefagh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `avatars/${userId}.${ext}`

  const { error } = await supabase.storage
    .from('nexchat-avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('nexchat-avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function uploadChatFile(userId: string, file: File): Promise<{ url: string; name: string; type: string; size: number }> {
  const ext = file.name.split('.').pop()
  const path = `files/${userId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('nexchat-files')
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('nexchat-files').getPublicUrl(path)
  return { url: data.publicUrl, name: file.name, type: file.type, size: file.size }
}
