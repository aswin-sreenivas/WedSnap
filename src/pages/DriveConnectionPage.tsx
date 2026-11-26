import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Folder, FolderOpen, HardDrive, Search } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { getEventById, updateWeddingEvent } from '../lib/eventsService';
import { DriveFolder, WeddingEvent } from '../types/wedsnap';

export function DriveConnectionPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { driveAccessToken, getIdToken, signInWithGoogle, isSigningIn } = useAuth();

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savingFolderId, setSavingFolderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!eventId) return;
    getEventById(eventId)
      .then((evt) => setEvent(evt))
      .catch((err) => setErrorMsg(err instanceof Error ? err.message : 'Unable to load event.'))
      .finally(() => setLoadingEvent(false));
  }, [eventId]);

  const currentParent = folderStack[folderStack.length - 1];

  const loadFolders = async (parentId: string, search = '') => {
    if (!driveAccessToken) return;
    setLoadingFolders(true);
    setErrorMsg('');
    try {
      const idToken = await getIdToken();
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('search', search.trim());
      } else if (parentId) {
        params.set('parentId', parentId);
      }

      const res = await fetch(`/api/drive/folders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Drive-Access-Token': driveAccessToken,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not load Google Drive folders.');
      }
      setFolders(Array.isArray(data.folders) ? data.folders : []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to list Google Drive folders.');
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    if (driveAccessToken) {
      void loadFolders(currentParent.id, '');
    }
  }, [driveAccessToken, currentParent.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadFolders(currentParent.id, searchQuery);
  };

  const handleSelectFolder = async (folder: DriveFolder) => {
    if (!event) return;
    setSavingFolderId(folder.id);
    setErrorMsg('');
    try {
      await updateWeddingEvent(event.id, {
        driveFolderId: folder.id,
        driveFolderName: folder.name,
      });
      setEvent({ ...event, driveFolderId: folder.id, driveFolderName: folder.name });
      navigate(`/admin/events/${event.id}/sync`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save selected Drive folder.');
    } finally {
      setSavingFolderId(null);
    }
  };

  return (
    <AdminLayout
      eventId={eventId}
      eventTitle={event?.title}
      breadcrumbs={[
        { label: 'Organizer Studio', to: '/admin' },
        { label: event?.title || 'Event', to: `/admin/events/${eventId}/sync` },
        { label: 'Google Drive' },
      ]}
    >
      <SeoHead
        title="Connect Google Drive | WedSnap Studio"
        description="Connect a Google Drive wedding photo folder on WedSnap."
        path={`/admin/events/${eventId || ''}/drive`}
        robots="noindex, nofollow"
      />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-1">
              Connect Google Drive Folder
            </h1>
            <p className="text-sm text-[#57534E]">
              Choose the Google Drive folder containing wedding photographs for{' '}
              <span className="font-medium text-[#1C1917]">{event?.coupleNames || 'this event'}</span>.
            </p>
          </div>
          {event?.driveFolderId && (
            <Link
              to={`/admin/events/${event.id}/sync`}
              className="px-4 py-2 text-xs font-medium bg-[#1C1917] text-white rounded-lg hover:bg-[#9A742D] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Go to Photo Sync</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {!loadingEvent && event?.driveFolderName && (
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <HardDrive className="w-5 h-5 text-[#9A742D] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#78716C]">Currently Linked Folder</p>
                <p className="text-sm font-medium text-[#1C1917] truncate">
                  {event.driveFolderName}
                </p>
              </div>
            </div>
            <Link
              to={`/admin/events/${event.id}/sync`}
              className="text-xs font-medium text-[#9A742D] hover:underline whitespace-nowrap shrink-0"
            >
              Sync photos from this folder
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {!driveAccessToken ? (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl p-8 sm:p-10 text-center max-w-xl">
            <div className="w-12 h-12 rounded-xl bg-[#F3F0EA] border border-[#E7E2D8] flex items-center justify-center mx-auto mb-4">
              <HardDrive className="w-6 h-6 text-[#9A742D]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#1C1917] mb-2">
              Grant Google Drive Read Access
            </h2>
            <p className="text-sm text-[#57534E] leading-relaxed mb-6">
              For security, Drive access tokens are kept only in memory during your browser session. Reconnect with Google to browse your folders and sync wedding photos.
            </p>
            <GoogleSignInButton
              onClick={() => void signInWithGoogle()}
              disabled={isSigningIn}
              label={isSigningIn ? 'Connecting Google Drive...' : 'Connect Google Drive'}
            />
          </div>
        ) : (
          <div className="bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden">
            {/* Folder Navigation & Search Toolbar */}
            <div className="p-4 sm:p-5 border-b border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {folderStack.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <span className="text-[#A8A29E]">/</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFolderStack(folderStack.slice(0, idx + 1));
                      }}
                      className={`px-2 py-1 rounded hover:bg-[#F3F0EA] transition-colors ${
                        idx === folderStack.length - 1
                          ? 'font-semibold text-[#1C1917]'
                          : 'text-[#57534E]'
                      }`}
                    >
                      {item.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Drive folders..."
                    className="h-9 pl-8 pr-3 bg-[#FAF9F6] border border-[#D6D3CD] rounded-lg text-xs focus:outline-none focus:border-[#9A742D]"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-3.5 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] whitespace-nowrap"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Folder List */}
            {loadingFolders ? (
              <div className="p-10 text-center text-sm text-[#57534E]">
                Loading folders from Google Drive...
              </div>
            ) : folders.length === 0 ? (
              <div className="p-10 text-center">
                <FolderOpen className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#1C1917] mb-1">
                  No subfolders found here
                </p>
                <p className="text-xs text-[#57534E]">
                  Try navigating back to My Drive or searching for your wedding album folder name.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E7E2D8]">
                {folders.map((folder) => {
                  const isLinked = event?.driveFolderId === folder.id;
                  return (
                    <li
                      key={folder.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF9F6] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
                        }}
                        className="flex items-center gap-3 min-w-0 text-left group"
                      >
                        <Folder className="w-5 h-5 text-[#9A742D] shrink-0" />
                        <span className="text-sm font-medium text-[#1C1917] group-hover:underline truncate">
                          {folder.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={savingFolderId === folder.id}
                        onClick={() => void handleSelectFolder(folder)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          isLinked
                            ? 'bg-[#F3F0EA] text-[#1C1917] border border-[#B8924A]'
                            : 'bg-[#1C1917] text-white hover:bg-[#9A742D]'
                        }`}
                      >
                        {isLinked && <Check className="w-3.5 h-3.5 text-[#9A742D]" />}
                        <span>
                          {savingFolderId === folder.id
                            ? 'Saving...'
                            : isLinked
                              ? 'Selected'
                              : 'Use This Folder'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
