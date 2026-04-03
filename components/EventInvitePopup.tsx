'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import {
  captureEventInviteShown,
  captureEventInviteDismissed,
  captureEventInviteCtaClicked,
} from '@/lib/analytics';

const STORAGE_KEY = 'hana_event_invite_v1';
const DWELL_MS = 20_000;
const EVENT_URL = 'https://lu.ma/uwiq7oeu';

type UIState = 'idle' | 'open' | 'minimized' | 'dismissed';

interface StoredState {
  autoShown: boolean;
  ui: 'minimized' | 'dismissed' | null;
}

function readStorage(): StoredState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : null;
  } catch {
    return null;
  }
}

function writeStorage(state: StoredState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — fail silently
  }
}

interface Props {
  /** Pass true while a job deep-link is loading to defer the dwell timer */
  skipWhileJobLoading?: boolean;
}

export default function EventInvitePopup({ skipWhileJobLoading = false }: Props) {
  const { t } = useLocale();
  const [ui, setUi] = useState<UIState>('idle');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // On mount: decide initial state from storage
  useEffect(() => {
    const stored = readStorage();
    if (stored?.ui === 'dismissed') {
      setUi('dismissed');
      return;
    }
    if (stored?.ui === 'minimized') {
      setUi('minimized');
      return;
    }
  }, []);

  // Dwell timer: only fires if we haven't auto-shown yet and no job is loading
  useEffect(() => {
    if (skipWhileJobLoading) return;

    const stored = readStorage();
    if (stored?.autoShown || stored?.ui === 'dismissed') return;

    // Check current UI — if already open/minimized/dismissed, skip
    // (ui is 'idle' at this point since the above effect ran first and those
    //  conditions returned early when stored?.ui was set)

    let visible = !document.hidden;

    function onVisibilityChange() {
      visible = !document.hidden;
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    const timer = setTimeout(() => {
      if (!visible) return; // don't pop in a background tab
      setUi('open');
      captureEventInviteShown();
      writeStorage({ autoShown: true, ui: null });
    }, DWELL_MS);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [skipWhileJobLoading]);

  // Focus management: trap focus in modal when open
  useEffect(() => {
    if (ui === 'open') {
      previousFocusRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (ui === 'minimized') {
      // Return focus to the trigger (FAB will mount; give it a frame)
      requestAnimationFrame(() => fabRef.current?.focus());
    } else if (ui === 'dismissed') {
      // Return focus to whatever had it before
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
  }, [ui]);

  function handleMinimize() {
    setUi('minimized');
    captureEventInviteDismissed('minimize');
    writeStorage({ autoShown: true, ui: 'minimized' });
  }

  function handleDismissForever() {
    setUi('dismissed');
    captureEventInviteDismissed('dismiss_forever');
    writeStorage({ autoShown: true, ui: 'dismissed' });
  }

  function handleFabClick() {
    setUi('open');
    writeStorage({ autoShown: true, ui: null });
  }

  function handleCtaClick() {
    captureEventInviteCtaClicked();
  }

  // Trap Tab/Shift+Tab inside the modal
  function handleModalKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      handleMinimize();
    }
    if (e.key !== 'Tab') return;

    const modal = e.currentTarget;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  if (ui === 'dismissed' || ui === 'idle') return null;

  return (
    <>
      {ui === 'open' && (
        <>
          {/* Backdrop */}
          <div
            className="event-invite-backdrop"
            onClick={handleMinimize}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="event-invite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-invite-title"
            aria-describedby="event-invite-desc"
            onKeyDown={handleModalKeyDown}
          >
            {/* Seal floats above the envelope card */}
          <div className="event-invite-seal" aria-hidden="true">
            <img src="/logo.png" alt="" aria-hidden="true" />
          </div>

          <div className="event-invite-envelope">
              {/* Flap (decorative only) */}
              <div className="event-invite-flap" aria-hidden="true" />

              {/* Letter body */}
              <div className="event-invite-body">
                <p id="event-invite-title" className="event-invite-title">
                  {t('eventInviteTitle')}
                </p>

                <hr className="event-invite-rule" aria-hidden="true" />

                <p id="event-invite-desc" className="event-invite-text">
                  {t('eventInviteBody')}
                </p>

                <hr className="event-invite-rule" aria-hidden="true" />

                <a
                  href={EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-invite-cta"
                  onClick={handleCtaClick}
                >
                  {t('eventInviteCta')}
                </a>

                <div className="event-invite-controls">
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="event-invite-btn-close"
                    onClick={handleMinimize}
                  >
                    {t('eventInviteClose')}
                  </button>
                  <button
                    type="button"
                    className="event-invite-btn-dismiss"
                    onClick={handleDismissForever}
                  >
                    {t('eventInviteDismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {ui === 'minimized' && (
        <button
          ref={fabRef}
          type="button"
          className="event-invite-fab"
          aria-label={t('eventInviteFabLabel')}
          onClick={handleFabClick}
        >
          <img src="/logo.png" alt="" aria-hidden="true" />
          <span className="event-invite-fab-dot" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
