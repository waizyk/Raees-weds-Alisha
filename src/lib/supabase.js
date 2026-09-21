import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project'));
export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

function requireClient() {
  if (!supabase) throw new Error('The wedding database is not connected yet.');
  return supabase;
}

export async function findInvitation(code) {
  const { data, error } = await requireClient().rpc('get_invitation', { p_code: code });
  if (error) throw error;
  return data?.[0] || null;
}

export async function sendRsvp({ code, name, email, attending, guests, meal, note }) {
  const { data, error } = await requireClient().rpc('submit_rsvp', {
    p_code: code,
    p_respondent_name: name,
    p_email: email,
    p_attending: attending,
    p_guest_count: Number(guests),
    p_meal: meal,
    p_note: note || '',
  });
  if (error) throw error;
  return data;
}

export async function signInHost(email, password) {
  const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await requireClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function setNewPassword(password) {
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutHost() {
  if (supabase) await supabase.auth.signOut();
}

export async function getHostSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getHostProfile() {
  const { data, error } = await requireClient()
    .from('wedding_hosts')
    .select('display_name')
    .single();
  if (error) throw error;
  return data;
}

export async function listRsvps() {
  const { data, error } = await requireClient()
    .from('rsvps')
    .select('*, invitations!inner(code,guest_names,max_guests)')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    household: row.invitations.guest_names,
    invitedAs: row.invitations.guest_names,
    inviteCode: row.invitations.code,
    name: row.respondent_name,
    email: row.email,
    guests: row.guest_count,
    status: row.status,
    meal: row.meal,
    note: row.note,
    table: row.table_number,
    checkedIn: row.checked_in,
  }));
}

export async function saveInvitation({ code, guestNames, phone, limit }) {
  const { data, error } = await requireClient()
    .from('invitations')
    .upsert({
      code,
      guest_names: guestNames,
      whatsapp_number: phone || null,
      max_guests: Number(limit),
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'code' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadGuestPhotos(files, { code, uploadedBy }) {
  const client = requireClient();
  const uploaded = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
    if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB.`);
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${code}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from('wedding-photos').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: photoId, error: registerError } = await client.rpc('register_guest_photo', {
      p_code: code,
      p_storage_path: path,
      p_uploaded_by: uploadedBy,
      p_caption: '',
    });
    if (registerError) {
      await client.storage.from('wedding-photos').remove([path]);
      throw registerError;
    }
    uploaded.push({ id: photoId, path, name: file.name });
  }
  return uploaded;
}

export async function listApprovedPhotos(code) {
  const client = requireClient();
  const { data, error } = await client.rpc('list_approved_photos', { p_code: code });
  if (error) throw error;
  return Promise.all((data || []).map(async photo => {
    const { data: signed, error: signError } = await client.storage.from('wedding-photos').createSignedUrl(photo.storage_path, 3600);
    if (signError) throw signError;
    return { ...photo, url: signed.signedUrl };
  }));
}

export async function listPhotoQueue() {
  const client = requireClient();
  const { data, error } = await client.from('guest_photos').select('*, invitations(guest_names,code)').order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(async photo => {
    const { data: signed } = await client.storage.from('wedding-photos').createSignedUrl(photo.storage_path, 3600);
    return { ...photo, url: signed?.signedUrl || '' };
  }));
}

export async function moderatePhoto(id, status) {
  const { error } = await requireClient().from('guest_photos').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getSiteSettings() {
  if (!isSupabaseConfigured) return { album_visibility: 'everyone', tree_visibility: 'everyone' };
  const { data, error } = await requireClient().rpc('get_site_settings');
  if (error) throw error;
  return data?.[0] || { album_visibility: 'invited', tree_visibility: 'invited' };
}

export async function saveSiteSettings(settings) {
  const { data: { user } } = await requireClient().auth.getUser();
  const { data, error } = await requireClient().from('site_settings').upsert({
    id: 1,
    album_visibility: settings.album_visibility,
    tree_visibility: settings.tree_visibility,
    updated_by: user?.id || null,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRsvp(id, changes) {
  const dbChanges = {};
  if ('status' in changes) dbChanges.status = changes.status;
  if ('table' in changes) dbChanges.table_number = changes.table;
  if ('checkedIn' in changes) dbChanges.checked_in = changes.checkedIn;
  dbChanges.updated_at = new Date().toISOString();
  const { error } = await requireClient().from('rsvps').update(dbChanges).eq('id', id);
  if (error) throw error;
}
