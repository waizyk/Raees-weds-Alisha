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

export async function sendRsvp({ code, name, attending, guests, note }) {
  const { data, error } = await requireClient().rpc('submit_rsvp', {
    p_code: code,
    p_respondent_name: name,
    p_email: '',
    p_attending: attending,
    p_guest_count: Number(guests),
    p_meal: '',
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
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This account is signed in but has not been authorised as a wedding host.');
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
    guests: row.guest_count,
    status: row.status,
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
    const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!mediaType) throw new Error(`${file.name} is not a supported image or video.`);
    const maxSize = mediaType === 'video' ? 100 : 15;
    if (file.size > maxSize * 1024 * 1024) throw new Error(`${file.name} is larger than ${maxSize} MB.`);
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (mediaType === 'video' ? 'mp4' : 'jpg');
    const path = `${code}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage.from('wedding-photos').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: photoId, error: registerError } = await client.rpc('register_guest_media', {
      p_code: code,
      p_storage_path: path,
      p_uploaded_by: uploadedBy,
      p_caption: '',
      p_media_type: mediaType,
    });
    if (registerError) {
      await client.storage.from('wedding-photos').remove([path]);
      throw registerError;
    }
    uploaded.push({ id: photoId, path, name: file.name, media_type: mediaType });
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

export async function deleteGuestMedia(media) {
  const client = requireClient();
  const { error: storageError } = await client.storage.from('wedding-photos').remove([media.storage_path]);
  if (storageError) throw storageError;
  const { error } = await client.from('guest_photos').delete().eq('id', media.id);
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

export async function getFamilyTree(code = null) {
  const { data, error } = await requireClient().rpc('get_family_tree', { p_code: code || null });
  if (error) throw error;
  return data || { members: [], links: [] };
}

export async function listFamilyMembersForHost() {
  const client = requireClient();
  const [{ data: members, error: memberError }, { data: links, error: linkError }] = await Promise.all([
    client.from('family_members').select('*').order('generation').order('sort_order'),
    client.from('family_links').select('*'),
  ]);
  if (memberError) throw memberError;
  if (linkError) throw linkError;
  return { members: members || [], links: links || [] };
}

export async function saveFamilyMember(member) {
  const client = requireClient();
  const payload = {
    name: member.name.trim(), side: member.side, generation: Number(member.generation),
    relationship_label: member.relationship_label.trim(), details: member.details || '',
    photo_url: member.photo_url || null, sort_order: Number(member.sort_order) || 0,
    is_visible: member.is_visible !== false, updated_at: new Date().toISOString(),
  };
  const query = member.id
    ? client.from('family_members').update(payload).eq('id', member.id)
    : client.from('family_members').insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteFamilyMember(id) {
  const { error } = await requireClient().from('family_members').delete().eq('id', id);
  if (error) throw error;
}

export async function saveFamilyLink(link) {
  const { data, error } = await requireClient().from('family_links').insert({
    from_member_id: link.from_member_id, to_member_id: link.to_member_id, link_type: link.link_type,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFamilyLink(id) {
  const { error } = await requireClient().from('family_links').delete().eq('id', id);
  if (error) throw error;
}

export async function submitFamilySuggestion(suggestion) {
  const { data, error } = await requireClient().rpc('submit_family_suggestion', {
    p_code: suggestion.code, p_suggested_by: suggestion.suggestedBy,
    p_suggested_name: suggestion.suggestedName, p_relationship_label: suggestion.relationship,
    p_placement_notes: suggestion.placement, p_details: suggestion.details || '',
  });
  if (error) throw error;
  return data;
}

export async function listFamilySuggestions() {
  const { data, error } = await requireClient().from('family_suggestions')
    .select('*, invitations(guest_names,code)').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateFamilySuggestion(id, status) {
  const { error } = await requireClient().from('family_suggestions').update({
    status, reviewed_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function getEventDetails(code = null) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireClient().rpc('get_event_details', { p_code: code || null });
  if (error) throw error;
  return data;
}

export async function saveWeddingSettings(settings) {
  const { data: { user } } = await requireClient().auth.getUser();
  const { data, error } = await requireClient().from('wedding_settings').upsert({
    ...settings, id: 1, updated_by: user?.id || null, updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listProceedingsForHost() {
  const { data, error } = await requireClient().from('event_proceedings').select('*')
    .order('event_date').order('start_time', { nullsFirst: false }).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function saveProceeding(proceeding) {
  const payload = {
    title: proceeding.title.trim(), event_date: proceeding.event_date,
    start_time: proceeding.start_time || null, end_time: proceeding.end_time || null,
    venue_name: proceeding.venue_name || '', address: proceeding.address || '',
    description: proceeding.description || '', attire: proceeding.attire || '',
    location_private: proceeding.location_private !== false,
    is_visible: proceeding.is_visible !== false, sort_order: Number(proceeding.sort_order) || 0,
    updated_at: new Date().toISOString(),
  };
  const query = proceeding.id
    ? requireClient().from('event_proceedings').update(payload).eq('id', proceeding.id)
    : requireClient().from('event_proceedings').insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteProceeding(id) {
  const { error } = await requireClient().from('event_proceedings').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteRsvp(id) {
  const { error } = await requireClient().from('rsvps').delete().eq('id', id);
  if (error) throw error;
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
