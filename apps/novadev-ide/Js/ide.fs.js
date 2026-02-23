// ide.fs.js
// Supabase Cloud File System

import { getSupabase } from "./ide.auth.js";

/* ==============================
   Helpers
============================== */

function getClient() {
  return getSupabase();
}

/* ==============================
   Projects
============================== */

export async function createProject(name) {

  const supabase = getClient();

  const { data, error } = await supabase
    .from("projects")
    .insert([{ name }])
    .select()
    .single();

  if (error) throw error;

  return data.id;
}

export async function listProjects() {

  const supabase = getClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function deleteProject(projectId) {

  const supabase = getClient();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}

/* ==============================
   Files
============================== */

export async function writeFile(projectId, path, content) {

  const supabase = getClient();

  const { error } = await supabase
    .from("files")
    .upsert({
      project_id: projectId,
      path,
      content,
      type: "file"
    });

  if (error) throw error;
}

export async function readFile(projectId, path) {

  const supabase = getClient();

  const { data, error } = await supabase
    .from("files")
    .select("content")
    .eq("project_id", projectId)
    .eq("path", path)
    .single();

  if (error) return "";

  return data?.content || "";
}

export async function listEntries(projectId) {

  const supabase = getClient();

  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;

  return data || [];
}

export async function deleteFile(projectId, path) {

  const supabase = getClient();

  const { error } = await supabase
    .from("files")
    .delete()
    .eq("project_id", projectId)
    .eq("path", path);

  if (error) throw error;
}

/* ==============================
   Delete Folder (Recursive)
============================== */

export async function deleteFolder(projectId, folderPath) {

  const supabase = getClient();

  const { data, error } = await supabase
    .from("files")
    .select("path")
    .eq("project_id", projectId);

  if (error) throw error;

  const targets = data.filter(file =>
    file.path === folderPath ||
    file.path.startsWith(folderPath + "/")
  );

  for (const file of targets) {
    await deleteFile(projectId, file.path);
  }
}
