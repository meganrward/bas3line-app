import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { loadAthleteSponsorId, loadActivePostTypes } from "../../lib/queries";
import { PostType } from "../../lib/types";

export function CreatePost() {
  const { user } = useAuth();
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const sponsorId = await loadAthleteSponsorId(user!.id);
      if (!sponsorId) return;
      const rows = await loadActivePostTypes(sponsorId);
      setPostTypes(rows);
      if (rows[0]) setSelectedTypeId(rows[0].id);
    }
    load();
  }, [user]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!user || !selectedTypeId) return;
    setError(null);
    setSubmitting(true);

    const insertResult = await supabase.from("posts").insert({
      athlete_id: user.id,
      post_type_id: selectedTypeId,
      title,
      content: content || null,
      link_url: linkUrl || null,
    } as any);

    if (insertResult.error) {
      setError(insertResult.error.message);
    } else {
      setSuccess(true);
      setTitle("");
      setContent("");
      setLinkUrl("");
    }

    setSubmitting(false);
  }

  const selectedType = postTypes.find((t) => t.id === selectedTypeId);

  if (postTypes.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="heading-page mb-6">Submit a Post</h1>
        <p className="text-sm text-gray-500">
          No post types have been set up by your sponsor yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="heading-page mb-6">Submit a Post</h1>

      {success && (
        <div className="alert-success mb-6 flex items-center justify-between">
          <p className="font-medium">
            Post submitted! Your sponsor will review it shortly.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-green-500 hover:text-green-700 text-xs underline ml-3"
          >
            Submit another
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="input-label">Post type</label>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="input"
          >
            {postTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.points_value} pts)
              </option>
            ))}
          </select>
          {selectedType?.description && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedType.description}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="input-label">
            Description{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add any extra context…"
            className="input"
          />
        </div>

        <div>
          <label className="input-label">
            Link <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/…"
            className="input"
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full flex justify-center"
        >
          {submitting ? "Submitting…" : "Submit post"}
        </button>
      </form>
    </div>
  );
}
